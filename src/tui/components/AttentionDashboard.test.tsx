import { afterEach, describe, expect, it } from "bun:test";
import { testRender } from "@opentui/solid";
import type { CodexAttentionMetadata, CodexPendingItem } from "../../types";
import {
  AttentionDashboard,
  attentionRowIndexForKey,
} from "./AttentionDashboard";
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
  it("renders a concise wide-screen dashboard", async () => {
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
      { width: 150, height: 16 },
    );
    renderers.push(setup.renderer);
    await setup.renderOnce();
    const frame = setup.captureCharFrame();

    expect(frame).toContain("Attention  2 pending · 1 session");
    expect(frame).toContain("architectural-reference-documentation");
    expect(frame).toContain("RUNTIME SESSION");
    expect(frame).toContain("ACTION");
    expect(frame).toContain("CONTEXT");
    expect(frame).toContain("LAST ACTIVE");
    expect(frame).toContain("Review architecture notes");
    expect(frame).toContain("68% left");
    expect(frame).toContain(
      "Context 68% left · 90k / 258k · 500k total · 400k cached input · gpt-5.6-sol",
    );
    expect(frame).toContain(
      "Prompt: Please review the architecture notes and list the risks.",
    );
    expect(frame).toContain("Reply: The review is complete. Two risks remain.");
    expect(frame).toContain("c Dismiss");
    expect(frame).not.toContain("Data sources");
    expect(frame).not.toContain("Context is Codex context left");
    expect(frame).not.toContain("Selected:");
    expect(frame).not.toContain("Opening the conversation");
    expect(frame).not.toContain("Runtime Session ID:");
    expect(frame).not.toContain("PROJECT");
    expect(frame).not.toContain("AGENT");
    expect(frame).not.toContain("SOURCE");
    expect(frame).not.toContain("ACTIVITY");
  });

  it("shows identity columns only when their values differ", async () => {
    const remote = mockEnrichedSession({
      id: "remote",
      agentType: "claude",
      project: "payments",
      status: "idle",
      codexAttention: {
        ...attention([]),
        identity: {
          sourceId: "workbench-payments",
          runtimeSessionId: "0195a100-0000-7000-8000-000000000099",
        },
        source: {
          sourceId: "workbench-payments",
          sourceKind: "workbench",
          sourceLabel: "WB-payments",
        },
        project: { name: "payments", directory: "/work/payments" },
        runtimeSessionName: "Check payment retries",
      },
    });
    const setup = await testRender(
      () => (
        <AttentionDashboard
          sessions={[selected, remote]}
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
    expect(row!.indexOf("Answer / approve (2)")).toBe(
      header!.indexOf("ACTION"),
    );
    expect(row!.indexOf("68% left")).toBe(header!.indexOf("CONTEXT"));
    expect(row!.indexOf("2h")).toBe(header!.indexOf("LAST ACTIVE"));
    expect(header!.trimEnd().endsWith("LAST ACTIVE")).toBe(true);
    expect(header!.indexOf("RUNTIME SESSION")).toBeGreaterThan(
      header!.indexOf("PROJECT"),
    );
    expect(header!.trimEnd().length).toBeLessThanOrEqual(147);
  });

  it("numbers the first nine rows and marks pinned rows", async () => {
    const sessions = Array.from({ length: 10 }, (_, index) =>
      mockEnrichedSession({
        id: `session-${index + 1}`,
        agentType: "claude",
        project: "ccmux",
        summary: `Task ${String(index + 1).padStart(2, "0")}`,
        codexAttention: undefined,
      }),
    );
    const setup = await testRender(
      () => (
        <AttentionDashboard
          sessions={sessions}
          selectedIndex={0}
          pendingOnly={false}
          searchMode={false}
          searchQuery=""
          nowMilliseconds={Date.parse("2024-01-15T12:00:00Z")}
          recovery={null}
          pinnedSessionIds={["session-1"]}
        />
      ),
      { width: 120, height: 30 },
    );
    renderers.push(setup.renderer);
    await setup.renderOnce();
    const lines = setup.captureCharFrame().split("\n");
    const header = lines.find((line) => line.includes("RUNTIME SESSION"));
    const rowLine = (summary: string) =>
      lines.find((line) => line.includes(summary));

    expect(rowLine("Task 01")).toStartWith(" >1* Task 01");
    expect(rowLine("Task 02")).toStartWith("  2  Task 02");
    expect(rowLine("Task 09")).toStartWith("  9  Task 09");
    expect(rowLine("Task 10")).toStartWith("     Task 10");
    expect(rowLine("Task 01")!.indexOf("Task 01")).toBe(
      header!.indexOf("RUNTIME SESSION"),
    );
    expect(setup.captureCharFrame()).toContain("Enter/1-9 Open  p Pin");
  });

  it("maps the number keys 1 to 9 to row indexes and ignores other keys", () => {
    expect(attentionRowIndexForKey("1")).toBe(0);
    expect(attentionRowIndexForKey("9")).toBe(8);
    expect(attentionRowIndexForKey("0")).toBeNull();
    expect(attentionRowIndexForKey("j")).toBeNull();
    expect(attentionRowIndexForKey("f1")).toBeNull();
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

    expect(frame).toContain("SESSION / ACTION / CONTEXT / ACTIVE");
    expect(frame).toContain("1–1 / 1");
    expect(frame).not.toContain("Runtime Session ID");
    expect(frame).toContain("Enter/1-9 Open");
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
    expect(frame).toContain("17m");
    expect(frame).toContain(
      "Prompt: Find why the daemon drops this session on resume.",
    );
    expect(frame).toContain(
      "Reply: The resume path discards the daemon identity.",
    );
  });

  it("uses the session ID when no runtime session name is available", async () => {
    const unnamed = mockEnrichedSession({
      id: "0195a100-0000-7000-8000-123456789abc",
      summary: null,
      nativeSessionId: undefined,
      codexAttention: undefined,
    });
    const setup = await testRender(
      () => (
        <AttentionDashboard
          sessions={[unnamed]}
          selectedIndex={0}
          pendingOnly={false}
          searchMode={false}
          searchQuery=""
          nowMilliseconds={Date.parse("2024-01-15T12:00:00Z")}
          recovery={null}
        />
      ),
      { width: 120, height: 24 },
    );
    renderers.push(setup.renderer);
    await setup.renderOnce();
    const frame = setup.captureCharFrame();

    expect(frame).toContain("ID …56789abc");
    expect(frame).not.toContain("Unavailable");
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
    expect(frame).toContain("No resume performed; attention retained.");
  });
});
