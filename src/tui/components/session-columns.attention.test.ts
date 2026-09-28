import { describe, expect, it } from "bun:test";
import type { CodexAttentionMetadata, CodexPendingItem } from "../../types";
import { mockEnrichedSession } from "./test-helpers";
import { theme } from "../theme";
import {
  attentionActivityColor,
  attentionNextActionColor,
  attentionSourceColor,
} from "./AttentionDashboard";
import {
  attentionContextRemainingLabel,
  attentionContextUsageLabel,
  attentionCumulativeUsageLabel,
  attentionIdleLabel,
  attentionNextActionLabel,
  attentionRuntimeSessionLabel,
  attentionSourceLabel,
  attentionWorkStateLabel,
  formatAttentionAge,
  sourceCoverageLabel,
} from "./session-columns";

function item(
  eventId: string,
  reason: CodexPendingItem["reason"],
  waitingMilliseconds: number,
  inputKind?: CodexPendingItem["inputKind"],
): CodexPendingItem {
  return {
    eventId,
    sourceId: "host",
    sourceKind: "host",
    sourceLabel: "Mac",
    project: { name: "ccmux", directory: "/work/ccmux" },
    runtimeDirectory: "/work/ccmux",
    runtimeSessionId: "runtime-1",
    reason,
    priority: reason === "reply-ready" ? "lower" : "required",
    ...(inputKind === undefined ? {} : { inputKind }),
    waitingMilliseconds,
    recoveryInstructions: [],
  };
}

function metadata(pendingItems: CodexPendingItem[]): CodexAttentionMetadata {
  return {
    identity: { sourceId: "host", runtimeSessionId: "runtime-1" },
    source: { sourceId: "host", sourceKind: "host", sourceLabel: "Mac" },
    project: { name: "ccmux", directory: "/work/ccmux" },
    runtimeSessionName: "Improve attention dashboard",
    model: "gpt-5.6-sol",
    workState: pendingItems.length > 0 ? "waiting" : "not-working",
    nativeUpdatedAt: Date.parse("2024-01-15T10:00:00Z") / 1000,
    latestTokenUsage: {
      inputTokens: 88_000,
      cachedInputTokens: 80_000,
      outputTokens: 1_000,
      reasoningOutputTokens: 1_000,
      totalTokens: 90_000,
    },
    cumulativeTokenUsage: {
      inputTokens: 480_000,
      cachedInputTokens: 400_000,
      outputTokens: 15_000,
      reasoningOutputTokens: 5_000,
      totalTokens: 500_000,
    },
    modelContextWindow: 258_400,
    coverage: null,
    pendingItems,
    localActionEligibility: "eligible",
  };
}

describe("attention session columns", () => {
  it("formats source and work-state regions from native metadata", () => {
    const pendingItems = [
      item("approval", "input-required", 720_000, "approval"),
    ];
    const session = mockEnrichedSession({
      status: "waiting",
      codexAttention: metadata(pendingItems),
    });

    expect(attentionSourceLabel(session)).toBe("Mac");
    expect(attentionWorkStateLabel(session)).toBe("Waiting");
  });

  it("keeps required action separate from wait age", () => {
    const pendingItems = [
      item("input", "input-required", 720_000, "user-input"),
      item("approval", "input-required", 660_000, "approval"),
    ];
    const session = mockEnrichedSession({
      codexAttention: metadata(pendingItems),
    });

    expect(attentionNextActionLabel(session)).toBe("Answer / approve (2)");
    expect(formatAttentionAge(720_000)).toBe("12m");
  });

  it("keeps activity separate from error and reply actions", () => {
    const error = mockEnrichedSession({
      codexAttention: metadata([item("error", "error", 240_000)]),
    });
    const reply = mockEnrichedSession({
      codexAttention: metadata([item("reply", "reply-ready", 120_000)]),
    });

    expect(attentionWorkStateLabel(error)).toBe("Waiting");
    expect(attentionNextActionLabel(error)).toBe("Inspect error");
    expect(attentionWorkStateLabel(reply)).toBe("Waiting");
    expect(attentionNextActionLabel(reply)).toBe("Read reply");
  });

  it("uses ccmux attention state for Claude actions", () => {
    const approval = mockEnrichedSession({
      agentType: "claude",
      status: "waiting",
      attentionType: "permission",
      codexAttention: undefined,
    });
    const reply = mockEnrichedSession({
      agentType: "claude",
      status: "idle",
      attentionState: "unread",
      codexAttention: undefined,
    });

    expect(attentionNextActionLabel(approval)).toBe("Review approval");
    expect(attentionNextActionLabel(reply)).toBe("Read reply");
  });

  it("uses distinct colors for activity, urgency, and source identity", () => {
    const required = mockEnrichedSession({
      status: "waiting",
      codexAttention: metadata([
        item("approval", "input-required", 120_000, "approval"),
      ]),
    });
    const reply = mockEnrichedSession({
      status: "idle",
      codexAttention: {
        ...metadata([item("reply", "reply-ready", 60_000)]),
        workState: "not-working",
      },
    });
    const workbench = mockEnrichedSession({
      codexAttention: {
        ...metadata([]),
        source: {
          sourceId: "workbench:payments",
          sourceKind: "workbench",
          sourceLabel: "Workbench WB-payments",
          workbenchName: "WB-payments",
        },
      },
    });

    expect(attentionActivityColor(required)).toBe(theme.red);
    expect(attentionNextActionColor(required)).toBe(theme.yellow);
    expect(attentionActivityColor(reply)).toBe(theme.overlay);
    expect(attentionNextActionColor(reply)).toBe(theme.green);
    expect(attentionSourceColor(required)).toBe(theme.blue);
    expect(attentionSourceColor(workbench)).toBe(theme.mauve);
  });

  it("shows the Runtime Session name instead of the tmux target", () => {
    const attached = mockEnrichedSession({
      tmuxTarget: "DevAutonomy:2.1",
      codexAttention: metadata([]),
    });
    const detached = mockEnrichedSession({
      nativeSessionId: undefined,
      codexAttention: {
        ...metadata([]),
        runtimeSessionName: undefined,
      },
    });

    expect(attentionRuntimeSessionLabel(attached)).toBe(
      "Improve attention dashboard",
    );
    expect(attentionRuntimeSessionLabel(detached)).toBe("ID …untime-1");
  });

  it("uses the agent summary as the Claude Runtime Session name", () => {
    const session = mockEnrichedSession({
      agentType: "claude",
      summary: "Trace the daemon resume failure",
      nativeSessionId: "claude-runtime-1",
      codexAttention: undefined,
    });

    expect(attentionRuntimeSessionLabel(session)).toBe(
      "Trace the daemon resume failure",
    );
  });

  it("formats context, cumulative usage, and idle duration", () => {
    const session = mockEnrichedSession({ codexAttention: metadata([]) });

    expect(attentionContextRemainingLabel(session)).toBe("68% left");
    expect(attentionContextUsageLabel(session)).toBe("68% left · 90k / 258k");
    expect(attentionCumulativeUsageLabel(session)).toBe(
      "500k total · 400k cached input",
    );
    expect(
      attentionIdleLabel(session, Date.parse("2024-01-15T12:00:00Z")),
    ).toBe("2h");
  });

  it("uses tracked transcript activity before collector update time", () => {
    const session = mockEnrichedSession({
      lastActivityAt: "2024-01-15T11:43:00Z",
      codexAttention: metadata([]),
    });

    expect(
      attentionIdleLabel(session, Date.parse("2024-01-15T12:00:00Z")),
    ).toBe("17m");
  });

  it("reports available, unavailable, and unchecked source coverage", () => {
    const now = Date.parse("2024-01-15T12:00:00Z");
    expect(
      sourceCoverageLabel(
        {
          sourceId: "host",
          coverage: "available",
          observedAt: "2024-01-15T11:59:57Z",
        },
        now,
      ),
    ).toBe("Mac: updated 3s ago");
    expect(
      sourceCoverageLabel(
        {
          sourceId: "workbench:payments",
          sourceKind: "workbench",
          coverage: "unavailable",
          reason: "stopped",
          observedAt: "2024-01-15T11:58:00Z",
        },
        now,
        "Workbench WB-payments",
      ),
    ).toBe("Workbench WB-payments: unavailable; last updated 2m ago");
    expect(sourceCoverageLabel(null, now, "Workbench WB-sandbox")).toBe(
      "Workbench WB-sandbox: Not checked yet",
    );
  });
});
