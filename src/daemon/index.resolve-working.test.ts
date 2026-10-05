import { describe, expect, it, mock } from "bun:test";
import { join } from "path";
import { tmpdir } from "os";

/** Redirect STATE_FILE to a temp dir so tests don't touch real ~/.config/ccmux/state.json */
const tempRoot = join(
  tmpdir(),
  `ccmux-resolve-test-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
);
process.env.CCMUX_HOME = tempRoot;

const actualConfig = await import("../lib/config");
mock.module("../lib/config", () => ({
  ...actualConfig,
  STATE_FILE: join(tempRoot, "state.json"),
}));

import { Daemon } from "./index";
import { SessionManager } from "./sessions";
import { reconcileAll } from "./state-reconciler";
import type {
  ProcessInfo,
  SessionState,
  TmuxPane,
} from "../types/session";

function fakePane(overrides: Partial<TmuxPane> = {}): TmuxPane {
  return {
    paneId: "%1",
    panePid: 1000,
    sessionName: "ccmux",
    windowIndex: 2,
    paneIndex: 1,
    target: "ccmux:2.1",
    tty: "ttys001",
    startTime: null,
    windowActivity: null,
    paneTitle: "✳ Claude Code",
    currentCommand: "2.1.50",
    currentPath: "/Users/test/proj",
    ...overrides,
  };
}

function fakeClaudeProcess(pid: number): ProcessInfo {
  return {
    pid,
    command: "claude",
    agentType: "claude",
    tty: "ttys001",
    cwd: "/Users/test/proj",
    startTime: Date.now() - 60_000,
  };
}

function createStaleClaudeSession(
  manager: SessionManager,
  status: "working" | "waiting",
): string {
  const sessionId = "session-1";
  manager.createSession(
    sessionId,
    "/Users/test/.claude/projects/-Users-test-proj/session-1.jsonl",
    "claude",
  );
  manager.setTmuxPane(sessionId, "%1");
  manager.setPid(sessionId, 12345);
  manager.updateSession(sessionId, {
    status,
    attentionType: status === "waiting" ? "permission" : null,
    pendingTool: status === "waiting" ? "Bash" : null,
    lastActivityAt: new Date(Date.now() - 2 * 60_000).toISOString(),
  });
  return sessionId;
}

function makeDeps(sessionManager: SessionManager) {
  return {
    sessionManager,
    watcher: { isRecentlyProcessed: () => false },
    hookManager: {
      getMarkerForSession: () => null,
      getMarkersByAgentAndPid: () => [],
    },
    agents: [],
    logAdapters: new Map(),
    now: Date.now,
    getLogFileMtime: () => 0,
  };
}

describe("reconcileAll: native Claude state resolution", () => {
  it("does not downgrade waiting sessions to idle from pane heuristics", async () => {
    const daemon = new Daemon();
    const sessionManager = (
      daemon as unknown as { sessionManager: SessionManager }
    ).sessionManager;
    const sessionId = createStaleClaudeSession(sessionManager, "waiting");

    await reconcileAll(makeDeps(sessionManager), {
      processes: [fakeClaudeProcess(12345)],
      panes: [fakePane()],
      processTree: { findShellDescendants: () => [] },
    });

    const session = sessionManager.getSession(sessionId)!;
    expect(session.status).toBe("waiting");
    expect(session.attentionType).toBe("permission");
  });

  it("still downgrades stale working sessions when pane indicates not working", async () => {
    const daemon = new Daemon();
    const sessionManager = (
      daemon as unknown as { sessionManager: SessionManager }
    ).sessionManager;
    const sessionId = createStaleClaudeSession(sessionManager, "working");

    await reconcileAll(makeDeps(sessionManager), {
      processes: [fakeClaudeProcess(12345)],
      panes: [fakePane()],
      processTree: { findShellDescendants: () => [] },
    });

    const session = sessionManager.getSession(sessionId)!;
    expect(session.status).toBe("idle");
    expect(session.attentionType).toBeNull();
  });

  it("downgrades working sessions with no lastActivityAt when pane indicates not working", async () => {
    const daemon = new Daemon();
    const sessionManager = (
      daemon as unknown as { sessionManager: SessionManager }
    ).sessionManager;

    const sessionId = "session-1";
    sessionManager.createSession(
      sessionId,
      "/Users/test/.claude/projects/-Users-test-proj/session-1.jsonl",
      "claude",
    );
    sessionManager.setTmuxPane(sessionId, "%1");
    sessionManager.setPid(sessionId, 12345);
    sessionManager.updateSession(sessionId, {
      status: "working",
      attentionType: null,
      pendingTool: null,
      lastActivityAt: undefined,
    });

    await reconcileAll(makeDeps(sessionManager), {
      processes: [fakeClaudeProcess(12345)],
      panes: [fakePane()],
      processTree: { findShellDescendants: () => [] },
    });

    const session = sessionManager.getSession(sessionId)!;
    expect(session.status).toBe("idle");
    expect(session.attentionType).toBeNull();
  });

  it("preserves Bash execution upgrades through status reconciliation", async () => {
    const daemon = new Daemon();
    const sessionManager = (
      daemon as unknown as { sessionManager: SessionManager }
    ).sessionManager;

    const pane = fakePane({
      paneTitle: "⠂ Claude Code",
      currentCommand: "claude",
    });

    const sessionId = "session-1";
    sessionManager.createSession(
      sessionId,
      "/Users/test/.claude/projects/-Users-test-proj/session-1.jsonl",
      "claude",
    );
    sessionManager.setTmuxPane(sessionId, "%1");
    sessionManager.setPid(sessionId, 12345);
    sessionManager.updateSession(sessionId, {
      status: "waiting",
      attentionType: "permission",
      pendingTool: "Bash",
      lastActivityAt: new Date().toISOString(),
    });

    await reconcileAll(makeDeps(sessionManager), {
      processes: [fakeClaudeProcess(12345)],
      panes: [pane],
      processTree: { findShellDescendants: () => [99999] },
    });

    const session = sessionManager.getSession(sessionId)!;
    expect(session.status).toBe("working");
    expect(session.attentionType).toBeNull();
  });

  describe("a session the log adapter seeded idle over a working log", () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60_000).toISOString();
    const cappedWorkingState: SessionState = {
      status: "working",
      attentionType: null,
      pendingTool: "Bash",
      inPlanMode: false,
      lastActivityAt: tenMinutesAgo,
    };

    function createCappedSession(manager: SessionManager): string {
      const sessionId = "session-1";
      manager.createSession(
        sessionId,
        "/Users/test/.claude/projects/-Users-test-proj/session-1.jsonl",
        "claude",
      );
      manager.setTmuxPane(sessionId, "%1");
      manager.setPid(sessionId, 12345);
      manager.updateSession(sessionId, {
        status: "idle",
        attentionType: null,
        pendingTool: null,
        lastActivityAt: tenMinutesAgo,
      });
      return sessionId;
    }

    function makeCappedDeps(sessionManager: SessionManager) {
      const cappedWorkingStates = new Map([["session-1", cappedWorkingState]]);
      return {
        cappedWorkingStates,
        deps: {
          ...makeDeps(sessionManager),
          watcher: {
            isRecentlyProcessed: () => false,
            getCappedWorkingState: (id: string) => cappedWorkingStates.get(id),
            clearCappedWorkingState: (id: string) => {
              cappedWorkingStates.delete(id);
            },
          },
        },
      };
    }

    it("restores the working state when the pane shows work", async () => {
      const daemon = new Daemon();
      const sessionManager = (
        daemon as unknown as { sessionManager: SessionManager }
      ).sessionManager;
      const sessionId = createCappedSession(sessionManager);
      const { deps, cappedWorkingStates } = makeCappedDeps(sessionManager);

      await reconcileAll(deps, {
        processes: [fakeClaudeProcess(12345)],
        panes: [fakePane({ paneTitle: "⠂ Claude Code" })],
        processTree: { findShellDescendants: () => [] },
      });

      const session = sessionManager.getSession(sessionId)!;
      expect(session.status).toBe("working");
      expect(session.pendingTool).toBe("Bash");
      expect(session.lastActivityAt).toBe(tenMinutesAgo);
      expect(cappedWorkingStates.has(sessionId)).toBe(false);
    });

    it("stays idle when the pane shows no agent running", async () => {
      const daemon = new Daemon();
      const sessionManager = (
        daemon as unknown as { sessionManager: SessionManager }
      ).sessionManager;
      const sessionId = createCappedSession(sessionManager);
      const { deps, cappedWorkingStates } = makeCappedDeps(sessionManager);

      await reconcileAll(deps, {
        processes: [fakeClaudeProcess(12345)],
        panes: [fakePane({ currentCommand: "zsh" })],
        processTree: { findShellDescendants: () => [] },
      });

      expect(sessionManager.getSession(sessionId)!.status).toBe("idle");
      expect(cappedWorkingStates.has(sessionId)).toBe(false);
    });

    it("keeps the capped state for a later tick when the session has no pane yet", async () => {
      const daemon = new Daemon();
      const sessionManager = (
        daemon as unknown as { sessionManager: SessionManager }
      ).sessionManager;
      const sessionId = createCappedSession(sessionManager);
      sessionManager.setTmuxPane(sessionId, null);
      const { deps, cappedWorkingStates } = makeCappedDeps(sessionManager);

      await reconcileAll(deps, {
        processes: [fakeClaudeProcess(12345)],
        panes: [],
        processTree: { findShellDescendants: () => [] },
      });

      expect(sessionManager.getSession(sessionId)!.status).toBe("idle");
      expect(cappedWorkingStates.has(sessionId)).toBe(true);
    });
  });
});
