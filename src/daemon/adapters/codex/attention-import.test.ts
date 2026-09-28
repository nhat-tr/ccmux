import { describe, expect, it } from "bun:test";
import {
  importedCodexSessionId,
  parseCodexAttentionSnapshot,
} from "./attention-import";

function snapshotFixture(): unknown {
  return {
    schemaVersion: 1,
    recordCount: 1,
    runtimeSessions: [
      {
        sourceId: "workbench:alpha",
        sourceKind: "workbench",
        sourceLabel: "Workbench alpha",
        workbenchName: "alpha",
        project: {
          name: "remote-project",
          directory: "/host/remote-project",
        },
        runtimeDirectory: "/workspace/remote-project",
        runtimeSessionId: "native-shared",
        runtimeSessionName: "Review remote project",
        model: "gpt-5.6-sol",
        workState: "not-working",
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
    ],
    sourceReports: [
      {
        sourceId: "workbench:alpha",
        sourceKind: "workbench",
        coverage: "available",
        providerVersion: "0.157.1",
        threadCount: 1,
        observedAt: "2026-09-27T10:00:00.000Z",
        lastSuccessfulAt: "2026-09-27T10:00:00.000Z",
      },
    ],
    pendingItems: [
      {
        eventId: "workbench:alpha:native-shared:turn-one:reply-ready:",
        sourceId: "workbench:alpha",
        sourceKind: "workbench",
        sourceLabel: "Workbench alpha",
        workbenchName: "alpha",
        project: {
          name: "remote-project",
          directory: "/host/remote-project",
        },
        runtimeDirectory: "/workspace/remote-project",
        runtimeSessionId: "native-shared",
        nativeTurnId: "turn-one",
        reason: "reply-ready",
        priority: "lower",
        nativeThreadStatus: "idle",
        nativeTurnStatus: "completed",
        waitingMilliseconds: 15_000,
        recoveryInstructions: [
          "workbench open 'alpha'",
          "cd '/workspace/remote-project'",
          "codex resume 'native-shared'",
        ],
      },
    ],
  };
}

describe("Codex attention import contract", () => {
  it("AC-10 accepts collector rows with non-pending metadata", () => {
    const result = parseCodexAttentionSnapshot(snapshotFixture());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.runtimeSessions[0]).toMatchObject({
      sourceId: "workbench:alpha",
      runtimeSessionId: "native-shared",
      runtimeSessionName: "Review remote project",
      model: "gpt-5.6-sol",
      workState: "not-working",
      modelContextWindow: 258_400,
      project: {
        name: "remote-project",
        directory: "/host/remote-project",
      },
    });
    expect(result.snapshot.pendingItems).toHaveLength(1);
  });

  it("AC-10 scopes equal native IDs by source", () => {
    expect(
      importedCodexSessionId({
        sourceId: "workbench:alpha",
        runtimeSessionId: "native-shared",
      }),
    ).not.toBe(
      importedCodexSessionId({
        sourceId: "workbench:beta",
        runtimeSessionId: "native-shared",
      }),
    );
  });

  it("accepts a tracked Runtime Session whose source has not been checked yet", () => {
    const fixture = snapshotFixture() as {
      sourceReports: unknown[];
      pendingItems: unknown[];
    };
    fixture.sourceReports = [];
    fixture.pendingItems = [];

    const result = parseCodexAttentionSnapshot(fixture);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.runtimeSessions).toHaveLength(1);
    expect(result.snapshot.sourceReports).toHaveLength(0);
  });

  it("rejects an unsupported snapshot without echoing its values", () => {
    const invalid = snapshotFixture() as {
      schemaVersion: number;
      runtimeSessions: Array<{ runtimeSessionId: string }>;
    };
    invalid.schemaVersion = 2;
    invalid.runtimeSessions[0].runtimeSessionId = "secret-session-value";

    const result = parseCodexAttentionSnapshot(invalid);

    expect(result).toEqual({
      ok: false,
      error: "Codex attention snapshot must use schema version 1.",
    });
    expect(JSON.stringify(result)).not.toContain("secret-session-value");
  });
});
