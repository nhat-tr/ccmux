import { describe, expect, it } from "bun:test";
import type { CodexAttentionSnapshot } from "../types/session";
import { importedCodexSessionId } from "./adapters/codex/attention-import";
import { cleanupStaleSessions } from "./session-pane-match";
import { SessionManager } from "./sessions";

function importedSnapshot(): CodexAttentionSnapshot {
  return {
    schemaVersion: 1,
    recordCount: 1,
    runtimeSessions: [
      {
        sourceId: "host",
        sourceKind: "host",
        sourceLabel: "Host",
        project: { name: "host-project", directory: "/host/project" },
        runtimeDirectory: "/host/project",
        runtimeSessionId: "native-shared",
        runtimeSessionName: "Review host project",
        model: "gpt-5.6-sol",
        workState: "waiting",
        nativeUpdatedAt: 1_796_000_000,
        latestTokenUsage: {
          inputTokens: 80_000,
          cachedInputTokens: 70_000,
          outputTokens: 2_000,
          reasoningOutputTokens: 1_000,
          totalTokens: 83_000,
        },
        cumulativeTokenUsage: {
          inputTokens: 400_000,
          cachedInputTokens: 350_000,
          outputTokens: 20_000,
          reasoningOutputTokens: 10_000,
          totalTokens: 430_000,
        },
        modelContextWindow: 258_400,
      },
      {
        sourceId: "workbench:alpha",
        sourceKind: "workbench",
        sourceLabel: "Workbench alpha",
        workbenchName: "alpha",
        project: { name: "remote-alpha", directory: "/host/alpha" },
        runtimeDirectory: "/workspace/alpha",
        runtimeSessionId: "native-shared",
        workState: "not-working",
        nativeUpdatedAt: 1_796_000_001,
      },
      {
        sourceId: "workbench:beta",
        sourceKind: "workbench",
        sourceLabel: "Workbench beta",
        workbenchName: "beta",
        project: { name: "remote-beta", directory: "/host/beta" },
        runtimeDirectory: "/workspace/beta",
        runtimeSessionId: "native-shared",
        workState: "working",
        nativeUpdatedAt: 1_796_000_002,
      },
    ],
    sourceReports: [
      {
        sourceId: "host",
        sourceKind: "host",
        coverage: "available",
        observedAt: "2026-09-27T10:00:00.000Z",
        lastSuccessfulAt: "2026-09-27T10:00:00.000Z",
      },
      {
        sourceId: "workbench:alpha",
        sourceKind: "workbench",
        coverage: "available",
        observedAt: "2026-09-27T10:00:00.000Z",
        lastSuccessfulAt: "2026-09-27T10:00:00.000Z",
      },
      {
        sourceId: "workbench:beta",
        sourceKind: "workbench",
        coverage: "unavailable",
        reason: "workbench-not-running",
        observedAt: "2026-09-27T10:00:00.000Z",
        lastSuccessfulAt: "2026-09-27T09:59:00.000Z",
      },
    ],
    pendingItems: [
      {
        eventId: "workbench:alpha:native-shared:turn-one:error:",
        sourceId: "workbench:alpha",
        sourceKind: "workbench",
        sourceLabel: "Workbench alpha",
        workbenchName: "alpha",
        project: { name: "remote-alpha", directory: "/host/alpha" },
        runtimeDirectory: "/workspace/alpha",
        runtimeSessionId: "native-shared",
        nativeTurnId: "turn-one",
        reason: "error",
        priority: "required",
        nativeThreadStatus: "systemError",
        nativeTurnStatus: "failed",
        waitingMilliseconds: 30_000,
        recoveryInstructions: [
          "workbench open 'alpha'",
          "cd '/workspace/alpha'",
          "codex resume 'native-shared'",
        ],
      },
    ],
  };
}

describe("SessionManager Codex attention import", () => {
  it("AC-10 merges the host row and keeps equal remote native IDs distinct", () => {
    const manager = new SessionManager();
    const host = manager.createPaneTrackedSession({
      paneId: "%1",
      agentType: "codex",
      cwd: "/host/project",
      pid: 101,
      nativeSessionId: "native-shared",
    });

    const result = manager.importCodexAttentionSnapshot(importedSnapshot());
    const sessions = manager.getSessions();

    expect(result).toEqual({ created: 2, updated: 1, removed: 0 });
    expect(sessions).toHaveLength(3);
    expect(manager.getSession(host.id)?.codexAttention).toMatchObject({
      identity: { sourceId: "host", runtimeSessionId: "native-shared" },
      runtimeSessionName: "Review host project",
      model: "gpt-5.6-sol",
      latestTokenUsage: { totalTokens: 83_000 },
      cumulativeTokenUsage: { totalTokens: 430_000 },
      modelContextWindow: 258_400,
      localActionEligibility: "eligible",
    });
    const remote = sessions.filter(
      (session) => session.trackingMode === "imported",
    );
    expect(remote.map((session) => session.id)).toEqual([
      importedCodexSessionId({
        sourceId: "workbench:alpha",
        runtimeSessionId: "native-shared",
      }),
      importedCodexSessionId({
        sourceId: "workbench:beta",
        runtimeSessionId: "native-shared",
      }),
    ]);
    expect(remote[0].codexAttention?.pendingItems).toHaveLength(1);
    expect(remote[1].codexAttention?.coverage).toMatchObject({
      coverage: "unavailable",
      reason: "workbench-not-running",
    });
  });

  it("AC-23 imported rows survive local process cleanup and update in place", () => {
    const manager = new SessionManager();
    manager.importCodexAttentionSnapshot(importedSnapshot());
    const remoteId = importedCodexSessionId({
      sourceId: "workbench:alpha",
      runtimeSessionId: "native-shared",
    });

    let pending = cleanupStaleSessions(manager, [], [], new Set());
    pending = cleanupStaleSessions(manager, [], [], pending);
    expect(manager.hasSession(remoteId)).toBe(true);

    const nextSnapshot = importedSnapshot();
    nextSnapshot.runtimeSessions = nextSnapshot.runtimeSessions.filter(
      (runtimeSession) => runtimeSession.sourceId === "workbench:alpha",
    );
    nextSnapshot.runtimeSessions[0].workState = "working";
    nextSnapshot.sourceReports = nextSnapshot.sourceReports.filter(
      (report) => report.sourceId === "workbench:alpha",
    );
    nextSnapshot.pendingItems = [];

    const result = manager.importCodexAttentionSnapshot(nextSnapshot);

    expect(result).toEqual({ created: 0, updated: 1, removed: 1 });
    expect(manager.getSession(remoteId)).toMatchObject({
      status: "working",
      codexAttention: {
        pendingItems: [],
        workState: "working",
      },
    });
  });

  it("omits host Runtime Sessions that have no live local pane", () => {
    const manager = new SessionManager();

    const result = manager.importCodexAttentionSnapshot(importedSnapshot());

    expect(result).toEqual({ created: 2, updated: 0, removed: 0 });
    expect(
      manager.getSession(
        importedCodexSessionId({
          sourceId: "host",
          runtimeSessionId: "native-shared",
        }),
      ),
    ).toBeUndefined();
    expect(
      manager
        .getSessions()
        .every(
          (session) => session.codexAttention?.source.sourceKind === "workbench",
        ),
    ).toBe(true);
  });

  it("local Codex marker lookup ignores imported native-ID collisions", () => {
    const manager = new SessionManager();
    const host = manager.createPaneTrackedSession({
      paneId: "%1",
      agentType: "codex",
      cwd: "/host/project",
      pid: 101,
      nativeSessionId: "native-shared",
    });
    manager.importCodexAttentionSnapshot(importedSnapshot());

    expect(manager.getSessionByNativeSessionId("native-shared")?.id).toBe(
      host.id,
    );
  });
});
