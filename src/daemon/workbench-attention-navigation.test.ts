import { describe, expect, it } from "bun:test";
import type { Session } from "../types";
import { ProcessTree } from "./process-tree";
import {
  verifyWorkbenchAttentionNavigation,
  type WorkbenchAttentionEvidence,
} from "./workbench-attention-navigation";

function session(): Session {
  return {
    id: "remote-row",
    agentType: "codex",
    trackingMode: "imported",
    nativeSessionId: "runtime-remote",
    project: "ccmux",
    cwd: "/workspace/ccmux",
    logPath: null,
    status: "waiting",
    attentionType: "question",
    pendingTool: null,
    inPlanMode: false,
    tmuxPane: null,
    updatedAt: new Date("2024-01-15T12:00:00Z"),
    lastActivityAt: null,
    lastUserInputAt: null,
    subagents: [],
    gitBranch: null,
    version: null,
    pid: null,
    statusChangedAt: null,
    attentionGeneration: 0,
    previousStatus: null,
    attentionState: "unread",
    lastSeenAt: null,
    lastPrompt: null,
    prompts: [],
    codexAttention: {
      identity: {
        sourceId: "workbench:payments",
        runtimeSessionId: "runtime-remote",
      },
      source: {
        sourceId: "workbench:payments",
        sourceKind: "workbench",
        sourceLabel: "Workbench payments",
        workbenchName: "payments",
      },
      project: { name: "ccmux", directory: "/workspace/ccmux" },
      workState: "waiting",
      coverage: {
        sourceId: "workbench:payments",
        sourceKind: "workbench",
        coverage: "available",
        observedAt: "2024-01-15T12:00:00Z",
      },
      pendingItems: [],
      localActionEligibility: "ineligible",
    },
  };
}

function evidence(): WorkbenchAttentionEvidence {
  return {
    state: {
      name: "payments",
      id: "workbench-id",
      ownerId: "owner-id",
      ready: true,
    },
    isContainerRunning: true,
    labels: {
      "dev.agentic.workbench": "payments",
      "dev.agentic.workbench.id": "workbench-id",
      "dev.agentic.workbench.owner": "owner-id",
      "dev.agentic.workbench.role": "agent",
    },
    markers: [
      {
        agent_type: "codex",
        pid: 42,
        tty: "/dev/pts/7",
        session_id: "runtime-remote",
        timestamp: 1,
      },
    ],
    panes: [
      {
        sessionName: "main",
        windowIndex: 2,
        paneId: "%8",
        panePid: 7,
        tty: "/dev/pts/7",
      },
    ],
    processTree: ProcessTree.fromPsOutput(
      "PID PPID COMM\n7 1 bash\n42 7 codex\n",
    ),
  };
}

describe("Workbench attention navigation verification", () => {
  it("returns the exact remote pane when ownership, marker, tty, and process ancestry agree", () => {
    expect(verifyWorkbenchAttentionNavigation(session(), evidence())).toEqual({
      ok: true,
      target: {
        kind: "workbench",
        workbenchName: "payments",
        containerName: "workbench-payments",
        sessionName: "main",
        windowIndex: 2,
        paneId: "%8",
      },
    });
  });

  it("treats grouped-session aliases for one pane as one exact remote target", () => {
    const grouped = evidence();
    grouped.panes.unshift({
      sessionName: "ccmux-123-devttys001",
      windowIndex: 2,
      paneId: "%8",
      panePid: 7,
      tty: "/dev/pts/7",
    });

    expect(verifyWorkbenchAttentionNavigation(session(), grouped)).toEqual({
      ok: true,
      target: {
        kind: "workbench",
        workbenchName: "payments",
        containerName: "workbench-payments",
        sessionName: "main",
        windowIndex: 2,
        paneId: "%8",
      },
    });
  });

  it("refuses a recycled container identity", () => {
    const recycled = evidence();
    recycled.labels = {
      ...(recycled.labels as Record<string, string>),
      "dev.agentic.workbench.id": "replacement-id",
    };
    expect(verifyWorkbenchAttentionNavigation(session(), recycled)).toEqual({
      ok: false,
      reason: "workbench-ownership-mismatch",
    });
  });

  it("refuses a marker whose process does not descend from the matched pane", () => {
    const mismatched = evidence();
    mismatched.processTree = ProcessTree.fromPsOutput(
      "PID PPID COMM\n7 1 bash\n42 9 codex\n",
    );
    expect(verifyWorkbenchAttentionNavigation(session(), mismatched)).toEqual({
      ok: false,
      reason: "remote-process-unavailable",
    });
  });

  it("refuses unavailable source coverage before accepting remote evidence", () => {
    const unavailable = session();
    unavailable.codexAttention!.coverage = {
      ...unavailable.codexAttention!.coverage!,
      coverage: "unavailable",
    };
    expect(
      verifyWorkbenchAttentionNavigation(unavailable, evidence()),
    ).toEqual({ ok: false, reason: "source-unavailable" });
  });
});
