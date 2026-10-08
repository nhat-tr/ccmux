import { describe, expect, it } from "bun:test";
import type { Session, TmuxPane } from "../types";
import type { SessionPidMarker } from "./session-markers";
import { resolveAttentionNavigationTarget } from "./attention-navigation";

function session(): Session {
  return {
    id: "local-row",
    agentType: "codex",
    trackingMode: "native",
    nativeSessionId: "runtime-1",
    project: "ccmux",
    cwd: "/work/ccmux",
    logPath: null,
    status: "waiting",
    attentionType: "question",
    pendingTool: null,
    inPlanMode: false,
    tmuxPane: "%7",
    updatedAt: new Date("2024-01-15T12:00:00Z"),
    lastActivityAt: null,
    lastUserInputAt: null,
    subagents: [],
    gitBranch: null,
    version: null,
    pid: 42,
    statusChangedAt: null,
    attentionGeneration: 0,
    previousStatus: null,
    attentionState: "unread",
    lastSeenAt: null,
    lastPrompt: null,
    prompts: [],
    codexAttention: {
      identity: { sourceId: "host", runtimeSessionId: "runtime-1" },
      source: { sourceId: "host", sourceKind: "host", sourceLabel: "Mac" },
      project: { name: "ccmux", directory: "/work/ccmux" },
      workState: "waiting",
      coverage: null,
      pendingItems: [],
      localActionEligibility: "eligible",
    },
  };
}

const pane: TmuxPane = {
  paneId: "%7",
  panePid: 7,
  sessionName: "main",
  windowIndex: 0,
  paneIndex: 0,
  target: "main:0.0",
  tty: "/dev/ttys007",
  startTime: 1,
  windowActivity: 1,
  paneTitle: "ccmux",
  currentCommand: "codex",
  currentPath: "/work/ccmux",
};

const marker: SessionPidMarker = {
  agent_type: "codex",
  pid: 42,
  tty: "/dev/ttys007",
  session_id: "runtime-1",
  timestamp: 1,
};

describe("attention navigation verification", () => {
  function paneTrackedSession(): Session {
    const ordinary = session();
    ordinary.agentType = "claude";
    ordinary.trackingMode = "pane";
    delete ordinary.nativeSessionId;
    delete ordinary.codexAttention;
    return ordinary;
  }

  it("opens a pane-tracked row without a native identity when its live process belongs to the pane", () => {
    expect(
      resolveAttentionNavigationTarget(
        paneTrackedSession(),
        pane,
        null,
        false,
        () => true,
        true,
      ),
    ).toEqual({ ok: true, paneId: "%7" });
  });

  it("refuses a pane-tracked row when its process belongs to another pane", () => {
    expect(
      resolveAttentionNavigationTarget(
        paneTrackedSession(),
        pane,
        null,
        false,
        () => true,
        false,
      ),
    ).toEqual({ ok: false, reason: "pane-identity-mismatch" });
  });

  it("refuses a pane-tracked row when its process has exited", () => {
    expect(
      resolveAttentionNavigationTarget(
        paneTrackedSession(),
        pane,
        null,
        false,
        () => false,
        true,
      ),
    ).toEqual({ ok: false, reason: "process-unavailable" });
  });

  it("refuses a pane-tracked row when its saved pane is missing", () => {
    expect(
      resolveAttentionNavigationTarget(
        paneTrackedSession(),
        null,
        null,
        false,
        () => true,
        true,
      ),
    ).toEqual({ ok: false, reason: "pane-missing" });
  });

  it("requires native identity for an imported attention row even when a pane process matches", () => {
    const imported = session();
    delete imported.nativeSessionId;
    expect(
      resolveAttentionNavigationTarget(
        imported,
        pane,
        marker,
        false,
        () => true,
        true,
      ),
    ).toEqual({ ok: false, reason: "native-identity-mismatch" });
  });

  it("returns the pane only when source, native identity, marker, and process agree", () => {
    expect(
      resolveAttentionNavigationTarget(
        session(),
        pane,
        marker,
        false,
        () => true,
      ),
    ).toEqual({
      ok: true,
      paneId: "%7",
    });
  });

  it("refuses a recycled pane before switching", () => {
    expect(
      resolveAttentionNavigationTarget(
        session(),
        { ...pane, tty: "/dev/ttys099" },
        marker,
        false,
        () => true,
      ),
    ).toEqual({ ok: false, reason: "pane-identity-mismatch" });
  });

  it("uses an exact transcript identity for a live session started before hooks", () => {
    expect(
      resolveAttentionNavigationTarget(session(), pane, null, true, () => true),
    ).toEqual({
      ok: true,
      paneId: "%7",
    });
  });

  it("verifies an ordinary Codex row by its Runtime Session identity", () => {
    const ordinary = session();
    delete ordinary.codexAttention;

    expect(
      resolveAttentionNavigationTarget(
        ordinary,
        pane,
        marker,
        false,
        () => true,
      ),
    ).toEqual({ ok: true, paneId: "%7" });
  });

  it("verifies an ordinary Claude row by its transcript identity", () => {
    const ordinary = session();
    ordinary.agentType = "claude";
    ordinary.trackingMode = "pane";
    delete ordinary.codexAttention;

    expect(
      resolveAttentionNavigationTarget(
        ordinary,
        { ...pane, currentCommand: "claude" },
        null,
        true,
        () => true,
      ),
    ).toEqual({ ok: true, paneId: "%7" });
  });

  it("refuses an ordinary row whose saved pane was recycled", () => {
    const ordinary = session();
    delete ordinary.codexAttention;

    expect(
      resolveAttentionNavigationTarget(
        ordinary,
        { ...pane, tty: "/dev/ttys099" },
        marker,
        false,
        () => true,
      ),
    ).toEqual({ ok: false, reason: "pane-identity-mismatch" });
  });

  it("refuses a session with neither marker nor matching transcript identity", () => {
    expect(
      resolveAttentionNavigationTarget(
        session(),
        pane,
        null,
        false,
        () => true,
      ),
    ).toEqual({
      ok: false,
      reason: "marker-missing",
    });
  });

  it("refuses Workbench rows without invoking recovery commands", () => {
    const remote = session();
    remote.trackingMode = "imported";
    remote.tmuxPane = null;
    remote.pid = null;
    remote.codexAttention = {
      ...remote.codexAttention!,
      source: {
        sourceId: "workbench:payments",
        sourceKind: "workbench",
        sourceLabel: "Workbench WB-payments",
        workbenchName: "WB-payments",
      },
      localActionEligibility: "ineligible",
    };

    expect(
      resolveAttentionNavigationTarget(remote, null, null, false, () => true),
    ).toEqual({
      ok: false,
      reason: "source-not-local",
    });
  });
});
