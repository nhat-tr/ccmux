import { afterEach, describe, expect, it } from "bun:test";
import { testRender } from "@opentui/solid";
import type { CodexAttentionMetadata, CodexPendingItem } from "../../types";
import { AttentionDashboard } from "./AttentionDashboard";
import { mockEnrichedSession } from "./test-helpers";

const renderers: Array<{ destroy(): void }> = [];

afterEach(() => {
  for (const renderer of renderers.splice(0)) renderer.destroy();
});

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
    project: {
      name: "architectural-reference-documentation",
      directory: "/work/docs",
    },
    runtimeDirectory: "/work/docs",
    runtimeSessionId: "0195a100-0000-7000-8000-000000000001",
    reason,
    priority: reason === "reply-ready" ? "lower" : "required",
    ...(inputKind === undefined ? {} : { inputKind }),
    waitingMilliseconds,
    recoveryInstructions: [],
  };
}

function attention(pendingItems: CodexPendingItem[]): CodexAttentionMetadata {
  return {
    identity: {
      sourceId: "host",
      runtimeSessionId: "0195a100-0000-7000-8000-000000000001",
    },
    source: { sourceId: "host", sourceKind: "host", sourceLabel: "Mac" },
    project: {
      name: "architectural-reference-documentation",
      directory: "/work/docs",
    },
    runtimeSessionName: "Review architecture notes",
    model: "gpt-5.6-sol",
    workState: "waiting",
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
    coverage: {
      sourceId: "host",
      sourceKind: "host",
      coverage: "available",
      observedAt: "2024-01-15T11:59:57Z",
    },
    pendingItems,
    localActionEligibility: "eligible",
  };
}

const selected = mockEnrichedSession({
  id: "selected",
  agentType: "codex",
  project: "architectural-reference-documentation",
  status: "waiting",
  tmuxTarget: "Docs:2.1",
  lastPrompt: "Please review the architecture notes and list the risks.",
  codexAttention: attention([
    item("input", "input-required", 720_000, "user-input"),
    item("approval", "input-required", 660_000, "approval"),
  ]),
});

describe("AttentionDashboard", () => {
  it("renders every required wide-screen region", async () => {
    const setup = await testRender(
      () => (
        <AttentionDashboard
          sessions={[selected]}
          selectedIndex={0}
          pendingOnly={false}
          searchMode={false}
          searchQuery=""
          nowMilliseconds={Date.parse("2024-01-15T12:00:00Z")}
          recovery={null}
          conversationPreview={{
            sessionId: "selected",
            lastPrompt: "This completed prompt must not replace current work.",
            lastResponse: "The review is complete. Two risks remain.",
          }}
        />
      ),
      { width: 120, height: 30 },
    );
    renderers.push(setup.renderer);
    await setup.renderOnce();
    const frame = setup.captureCharFrame();

    expect(frame).toContain("Agent attention");
    expect(frame).toContain("2 attention items / 1 session");
    expect(frame).toContain("Data sources");
    expect(frame).toContain("Mac: updated 3s ago");
    expect(frame).toContain("PROJECT");
    expect(frame).toContain("RUNTIME SESSION");
    expect(frame).toContain("SOURCE");
    expect(frame).toContain("ACTIVITY");
    expect(frame).toContain("NEXT ACTION");
    expect(frame).toContain("CONTEXT");
    expect(frame).toContain("LAST ACTIVE");
    expect(frame).toContain("Review architecture notes");
    expect(frame).toContain("68% left");
    expect(frame).toContain("500k total · 400k cached input");
    expect(frame).toContain("Model: gpt-5.6-sol");
    expect(frame).toContain(
      "Last prompt: Please review the architecture notes and list the risks.",
    );
    expect(frame).toContain(
      "Last response: The review is complete. Two risks remain.",
    );
    expect(frame).toContain("Selected: architectural-reference-documentation");
    expect(frame).toContain("Answer needed (12m); approval needed (11m)");
    expect(frame).toContain(
      "Next: Open the conversation to answer and review the approval request.",
    );
    expect(frame).toContain(
      "Runtime Session ID: 0195a100-0000-7000-8000-000000000001",
    );
    expect(frame).toContain("c Dismiss attention");
  });

  it("aligns extra-wide row values with their column headers", async () => {
    const setup = await testRender(
      () => (
        <AttentionDashboard
          sessions={[selected]}
          selectedIndex={0}
          pendingOnly={false}
          searchMode={false}
          searchQuery=""
          nowMilliseconds={Date.parse("2024-01-15T12:00:00Z")}
          recovery={null}
        />
      ),
      { width: 276, height: 45 },
    );
    renderers.push(setup.renderer);
    await setup.renderOnce();
    const lines = setup.captureCharFrame().split("\n");
    const header = lines.find((line) => line.includes("PROJECT"));
    const row = lines.find((line) => line.includes("Answer / approve (2)"));

    expect(header).toBeDefined();
    expect(row).toBeDefined();
    expect(row!.indexOf("architectural")).toBe(header!.indexOf("PROJECT"));
    expect(row!.indexOf("Review architecture notes")).toBe(
      header!.indexOf("RUNTIME SESSION"),
    );
    expect(row!.indexOf("Codex")).toBe(header!.indexOf("AGENT"));
    expect(row!.indexOf("Mac")).toBe(header!.indexOf("SOURCE"));
    expect(row!.indexOf("Waiting")).toBe(header!.indexOf("ACTIVITY"));
    expect(row!.indexOf("Answer / approve (2)")).toBe(
      header!.indexOf("NEXT ACTION"),
    );
    expect(row!.indexOf("68% left")).toBe(header!.indexOf("CONTEXT"));
    expect(row!.indexOf("2h")).toBe(header!.indexOf("LAST ACTIVE"));
    expect(header!.trimEnd().endsWith("LAST ACTIVE")).toBe(true);
    expect(header!.indexOf("RUNTIME SESSION")).toBeLessThan(30);
    expect(header!.trimEnd().length).toBeLessThanOrEqual(150);
  });

  it("keeps required details and actions reachable in the compact layout", async () => {
    const setup = await testRender(
      () => (
        <AttentionDashboard
          sessions={[selected]}
          selectedIndex={0}
          pendingOnly
          searchMode={false}
          searchQuery=""
          nowMilliseconds={Date.parse("2024-01-15T12:00:00Z")}
          recovery={null}
        />
      ),
      { width: 64, height: 18 },
    );
    renderers.push(setup.renderer);
    await setup.renderOnce();
    const frame = setup.captureCharFrame();

    expect(frame).toContain(
      "Identity / activity / next action / context / idle",
    );
    expect(frame).toContain("Rows 1–1 of 1");
    expect(frame).toContain("Runtime Session ID");
    expect(frame).toContain("Enter Go to conversation");
    expect(frame).toContain("Esc Close");
  });

  it("shows Claude identity, attention, prompt, and response data", async () => {
    const claude = mockEnrichedSession({
      id: "claude-session",
      agentType: "claude",
      status: "idle",
      attentionState: "unread",
      summary: "Trace the daemon resume failure",
      lastPrompt: "Find why the daemon drops this session on resume.",
      lastActivityAt: "2024-01-15T11:43:00Z",
      codexAttention: undefined,
    });
    const setup = await testRender(
      () => (
        <AttentionDashboard
          sessions={[claude]}
          selectedIndex={0}
          pendingOnly
          searchMode={false}
          searchQuery=""
          nowMilliseconds={Date.parse("2024-01-15T12:00:00Z")}
          recovery={null}
          conversationPreview={{
            sessionId: "claude-session",
            lastPrompt: null,
            lastResponse: "The resume path discards the daemon identity.",
          }}
        />
      ),
      { width: 120, height: 30 },
    );
    renderers.push(setup.renderer);
    await setup.renderOnce();
    const frame = setup.captureCharFrame();

    expect(frame).toContain("Trace the daemon resume failure");
    expect(frame).toContain("Read reply");
    expect(frame).toContain("Last active: 17m ago");
    expect(frame).toContain(
      "Last prompt: Find why the daemon drops this session on resume.",
    );
    expect(frame).toContain(
      "Last response: The resume path discards the daemon identity.",
    );
  });

  it("replaces selected details with exact recovery and no-resume text", async () => {
    const setup = await testRender(
      () => (
        <AttentionDashboard
          sessions={[selected]}
          selectedIndex={0}
          pendingOnly={false}
          searchMode={false}
          searchQuery=""
          nowMilliseconds={Date.parse("2024-01-15T12:00:00Z")}
          recovery={{
            sessionId: "selected",
            source: "Workbench WB-payments (unavailable 2m)",
            directory: "/workspace/api-workers",
            runtimeSessionId: "0195a100-0000-7000-8000-000000000002",
            failureReason: "marker-missing",
            instructions: [
              "Host: workbench attach WB-payments",
              "Inside: cd /workspace/api-workers",
              "codex resume 0195a100-0000-7000-8000-000000000002",
            ],
          }}
        />
      ),
      { width: 64, height: 18 },
    );
    renderers.push(setup.renderer);
    await setup.renderOnce();
    const frame = setup.captureCharFrame();

    expect(frame).toContain(
      "Pane verification failed: identity marker missing",
    );
    expect(frame).toContain("Directory: /workspace/api-workers");
    expect(frame).toContain("workbench attach WB-payments");
    expect(frame).toContain("no resume performed");
  });
});
