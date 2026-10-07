import { describe, expect, it } from "bun:test";
import type {
  CodexAttentionMetadata,
  CodexPendingItem,
  EnrichedSession,
} from "../types";
import { mockEnrichedSession } from "./components/test-helpers";
import { createTUIStore } from "./store";

function pendingItem(
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
    runtimeSessionId: `runtime-${eventId}`,
    reason,
    priority: reason === "reply-ready" ? "lower" : "required",
    ...(inputKind === undefined ? {} : { inputKind }),
    waitingMilliseconds,
    recoveryInstructions: ["codex resume"],
  };
}

function attentionSession(
  id: string,
  pendingItems: CodexPendingItem[],
  overrides: Partial<EnrichedSession> = {},
): EnrichedSession {
  const metadata: CodexAttentionMetadata = {
    identity: { sourceId: "host", runtimeSessionId: `runtime-${id}` },
    source: { sourceId: "host", sourceKind: "host", sourceLabel: "Mac" },
    project: { name: id, directory: `/work/${id}` },
    workState: pendingItems.length > 0 ? "waiting" : "not-working",
    coverage: {
      sourceId: "host",
      sourceKind: "host",
      coverage: "available",
      observedAt: "2024-01-15T11:59:57Z",
    },
    pendingItems,
    localActionEligibility: "eligible",
  };
  return mockEnrichedSession({
    id,
    agentType: "codex",
    project: id,
    cwd: `/work/${id}`,
    codexAttention: metadata,
    ...overrides,
  });
}

function attentionStore(
  options: Partial<Parameters<typeof createTUIStore>[0]> = {},
) {
  return createTUIStore({
    attentionMode: true,
    groupBy: "none",
    searchPaneContent: false,
    searchTranscript: false,
    onPersistState: () => {},
    ...options,
  });
}

describe("attention-mode store", () => {
  it("orders sessions that need the user first, then the latest activity", () => {
    const store = attentionStore();
    store.actions.setSessions([
      attentionSession(
        "oldest-input",
        [pendingItem("input", "input-required", 10_000, "user-input")],
        { lastActivityAt: "2024-01-15T12:01:00Z" },
      ),
      attentionSession("latest-clear", [], {
        lastActivityAt: "2024-01-15T12:04:00Z",
      }),
      attentionSession(
        "recent-reply",
        [pendingItem("reply", "reply-ready", 20_000)],
        { lastActivityAt: "2024-01-15T12:03:00Z" },
      ),
      attentionSession("older-error", [pendingItem("error", "error", 30_000)], {
        lastActivityAt: "2024-01-15T12:02:00Z",
      }),
      attentionSession("oldest-clear", [], {
        lastActivityAt: "2024-01-15T12:00:00Z",
      }),
    ]);

    expect(store.sortedSessions().map((session) => session.id)).toEqual([
      "oldest-input",
      "older-error",
      "recent-reply",
      "latest-clear",
      "oldest-clear",
    ]);
  });

  it("ranks Claude and Codex sessions that need the user above a more recent working session", () => {
    const store = attentionStore();
    store.actions.setSessions([
      mockEnrichedSession({
        id: "claude-working",
        agentType: "claude",
        status: "working",
        lastActivityAt: "2024-01-15T12:05:00Z",
      }),
      mockEnrichedSession({
        id: "claude-unread",
        agentType: "claude",
        status: "idle",
        attentionState: "unread",
        lastActivityAt: "2024-01-15T12:04:00Z",
      }),
      attentionSession(
        "codex-reply",
        [pendingItem("reply", "reply-ready", 20_000)],
        { lastActivityAt: "2024-01-15T12:03:00Z" },
      ),
      mockEnrichedSession({
        id: "claude-waiting",
        agentType: "claude",
        status: "waiting",
        attentionType: "permission",
        lastActivityAt: "2024-01-15T12:01:00Z",
      }),
    ]);

    expect(store.sortedSessions().map((session) => session.id)).toEqual([
      "claude-waiting",
      "claude-unread",
      "codex-reply",
      "claude-working",
    ]);
  });

  it("ranks working sessions above idle sessions with more recent activity", () => {
    const store = attentionStore();
    store.actions.setSessions([
      mockEnrichedSession({
        id: "idle-latest",
        agentType: "claude",
        project: "dev-autonomy",
        status: "idle",
        lastActivityAt: "2024-01-15T12:05:00Z",
      }),
      mockEnrichedSession({
        id: "working-later-project",
        agentType: "claude",
        project: "vizquiry",
        status: "working",
        lastActivityAt: "2024-01-15T12:04:00Z",
      }),
      mockEnrichedSession({
        id: "working-earlier-project",
        agentType: "claude",
        project: "CalCore",
        status: "working",
        lastActivityAt: "2024-01-15T12:01:00Z",
      }),
    ]);

    expect(store.sortedSessions().map((session) => session.id)).toEqual([
      "working-earlier-project",
      "working-later-project",
      "idle-latest",
    ]);
  });

  it("places pinned sessions first in the order they were pinned", () => {
    const store = attentionStore({
      attentionPinnedSessionIds: ["idle-pinned-first", "idle-pinned-second"],
    });
    store.actions.setSessions([
      attentionSession(
        "needs-input",
        [pendingItem("input", "input-required", 10_000, "user-input")],
        { lastActivityAt: "2024-01-15T12:05:00Z" },
      ),
      mockEnrichedSession({
        id: "working",
        agentType: "claude",
        status: "working",
        lastActivityAt: "2024-01-15T12:04:00Z",
      }),
      attentionSession("idle-pinned-second", [], {
        lastActivityAt: "2024-01-15T12:03:00Z",
      }),
      attentionSession("idle-pinned-first", [], {
        lastActivityAt: "2024-01-15T12:00:00Z",
      }),
    ]);

    expect(store.sortedSessions().map((session) => session.id)).toEqual([
      "idle-pinned-first",
      "idle-pinned-second",
      "needs-input",
      "working",
    ]);
  });

  it("pins after existing pins, unpins in place, and saves each change", () => {
    const writes: unknown[] = [];
    const store = attentionStore({
      attentionPinnedSessionIds: ["pinned"],
      onPersistState: (updates) => {
        writes.push(updates);
      },
    });
    store.actions.setSessions([
      attentionSession("latest", [], {
        lastActivityAt: "2024-01-15T12:05:00Z",
      }),
      attentionSession("oldest", [], {
        lastActivityAt: "2024-01-15T12:00:00Z",
      }),
      attentionSession("pinned", [], {
        lastActivityAt: "2024-01-15T12:01:00Z",
      }),
    ]);

    store.actions.toggleAttentionPin("oldest");
    expect(store.sortedSessions().map((session) => session.id)).toEqual([
      "pinned",
      "oldest",
      "latest",
    ]);

    store.actions.toggleAttentionPin("pinned");
    expect(store.sortedSessions().map((session) => session.id)).toEqual([
      "oldest",
      "latest",
      "pinned",
    ]);
    expect(writes).toEqual([
      { attentionPinnedSessionIds: ["pinned", "oldest"] },
      { attentionPinnedSessionIds: ["oldest"] },
    ]);
  });

  it("places sessions without activity after sessions with activity", () => {
    const store = attentionStore();
    const nativeActivity = attentionSession("native", []);
    nativeActivity.codexAttention = {
      ...nativeActivity.codexAttention!,
      nativeUpdatedAt: Date.parse("2024-01-15T12:02:00Z") / 1000,
    };
    store.actions.setSessions([
      attentionSession("unknown", []),
      nativeActivity,
      attentionSession("transcript", [], {
        lastActivityAt: "2024-01-15T12:03:00Z",
      }),
    ]);

    expect(store.sortedSessions().map((session) => session.id)).toEqual([
      "transcript",
      "native",
      "unknown",
    ]);
  });

  it("uses the longest pending wait as the tie breaker", () => {
    const store = attentionStore();
    store.actions.setSessions([
      attentionSession("newer", [pendingItem("newer", "error", 10_000)]),
      attentionSession("older", [pendingItem("older", "error", 60_000)]),
    ]);

    expect(store.sortedSessions().map((session) => session.id)).toEqual([
      "older",
      "newer",
    ]);
  });

  it("toggles between all tracked rows and rows with pending items", () => {
    const store = attentionStore();
    store.actions.setSessions([
      attentionSession("pending", [pendingItem("pending", "error", 10_000)]),
      attentionSession("clear", []),
    ]);

    expect(store.filteredSessions()).toHaveLength(2);
    store.actions.toggleAttentionPending();
    expect(store.filteredSessions().map((row) => row.session.id)).toEqual([
      "pending",
    ]);
    store.actions.toggleAttentionPending();
    expect(store.filteredSessions()).toHaveLength(2);
  });

  it("keeps Claude requests and unread replies in the attention filter", () => {
    const store = attentionStore();
    store.actions.setSessions([
      mockEnrichedSession({
        id: "claude-waiting",
        agentType: "claude",
        status: "waiting",
        attentionType: "question",
      }),
      mockEnrichedSession({
        id: "claude-reply",
        agentType: "claude",
        status: "idle",
        attentionState: "unread",
      }),
      mockEnrichedSession({
        id: "claude-idle",
        agentType: "claude",
        status: "idle",
        attentionState: null,
      }),
    ]);

    store.actions.toggleAttentionPending();

    expect(
      store
        .filteredSessions()
        .map((row) => row.session.id)
        .sort(),
    ).toEqual(["claude-reply", "claude-waiting"]);
  });

  it("omits an acknowledged Claude waiting request from the attention filter", () => {
    const store = attentionStore();
    store.actions.setSessions([
      mockEnrichedSession({
        id: "claude-acknowledged",
        agentType: "claude",
        status: "waiting",
        attentionType: "question",
        attentionState: "read",
      }),
    ]);

    store.actions.toggleAttentionPending();

    expect(store.filteredSessions()).toHaveLength(0);
  });

  it("searches source, native identity, directory, and pending reason", () => {
    const store = attentionStore();
    const row = attentionSession("payments", [
      pendingItem("approval", "input-required", 10_000, "approval"),
    ]);
    row.codexAttention = {
      ...row.codexAttention!,
      identity: {
        sourceId: "workbench:payments",
        runtimeSessionId: "0195a100-0000-7000-8000-000000000001",
      },
      source: {
        sourceId: "workbench:payments",
        sourceKind: "workbench",
        sourceLabel: "Workbench WB-payments",
        workbenchName: "WB-payments",
      },
      project: { name: "api-workers", directory: "/workspace/api-workers" },
      runtimeSessionName: "Approve payment rollout",
    };
    const claude = mockEnrichedSession({
      id: "claude-summary",
      agentType: "claude",
      summary: "Repair invoice queue",
      codexAttention: undefined,
    });
    store.actions.setSessions([row, attentionSession("other", []), claude]);

    for (const query of [
      "WB-payments",
      "0195a100",
      "/workspace/api-workers",
      "approval",
      "Approve payment rollout",
    ]) {
      store.actions.setSearchQuery(query);
      expect(
        store.filteredSessions().map((result) => result.session.id),
      ).toEqual(["payments"]);
    }

    store.actions.setSearchQuery("invoice queue");
    expect(store.filteredSessions().map((result) => result.session.id)).toEqual(
      ["claude-summary"],
    );
  });

  it("keeps the selected identity when an update changes row order", () => {
    const store = attentionStore();
    const selected = attentionSession("selected", [
      pendingItem("selected", "reply-ready", 10_000),
    ]);
    const other = attentionSession("other", [
      pendingItem("other", "error", 5_000),
    ]);
    store.actions.setSessions([selected, other]);
    store.actions.setSelectedIndex(1);
    expect(store.selectedSession()?.id).toBe("selected");

    store.actions.updateSession({
      ...selected,
      codexAttention: {
        ...selected.codexAttention!,
        pendingItems: [pendingItem("selected", "input-required", 20_000)],
      },
    });

    expect(store.sortedSessions()[0]?.id).toBe("selected");
    expect(store.selectedSession()?.id).toBe("selected");
    expect(store.selectedIndex()).toBe(0);
  });
});
