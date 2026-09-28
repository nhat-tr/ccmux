import { For, Show, createMemo, type Component } from "solid-js";
import type { EnrichedSession } from "../../types";
import { getAgentDisplayName } from "../../lib/agents";
import { displayWidth, truncateText } from "../utils/format";
import { useSharedTerminalDimensions } from "../utils/use-shared-dimensions";
import { theme } from "../theme";
import { agentColorFor } from "./SessionItem";
import {
  attentionContextRemainingLabel,
  attentionContextRemainingPercent,
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

export interface AttentionRecovery {
  sessionId: string;
  source: string;
  directory: string;
  runtimeSessionId: string;
  instructions: string[];
  failureReason?: string;
}

export interface AttentionConversationPreview {
  sessionId: string;
  lastPrompt: string | null | undefined;
  lastResponse: string | null | undefined;
}

interface AttentionDashboardProps {
  sessions: EnrichedSession[];
  trackedSessions?: EnrichedSession[];
  selectedIndex: number;
  pendingOnly: boolean;
  searchMode: boolean;
  searchQuery: string;
  nowMilliseconds: number;
  recovery: AttentionRecovery | null;
  conversationPreview?: AttentionConversationPreview | null;
}

function padCell(value: string, width: number): string {
  const fitted = truncateText(value, width);
  return fitted + " ".repeat(Math.max(0, width - displayWidth(fitted)));
}

function plural(count: number, singular: string): string {
  return count === 1 ? singular : `${singular}s`;
}

function pendingDetails(session: EnrichedSession): string {
  const details = (session.codexAttention?.pendingItems ?? [])
    .map((item) => {
      const reason =
        item.reason === "input-required"
          ? item.inputKind === "approval"
            ? "approval needed"
            : "answer needed"
          : item.reason === "error"
            ? "stopped after error"
            : "new reply";
      return `${reason} (${formatAttentionAge(item.waitingMilliseconds)})`;
    })
    .join("; ");
  if (details.length > 0) {
    return details[0]!.toUpperCase() + details.slice(1);
  }
  const nextAction = attentionNextActionLabel(session);
  return nextAction === "—" ? "" : nextAction;
}

function nextStepGuidance(session: EnrichedSession): string {
  const pendingItems = session.codexAttention?.pendingItems ?? [];
  const inputItems = pendingItems.filter(
    (item) => item.reason === "input-required",
  );
  const inputKinds = new Set(inputItems.map((item) => item.inputKind));
  if (inputKinds.has("user-input") && inputKinds.has("approval")) {
    return "Open the conversation to answer and review the approval request.";
  }
  if (inputKinds.has("approval")) {
    return "Open the conversation and review the approval request.";
  }
  if (inputKinds.has("user-input")) {
    return "Open the conversation and answer the request.";
  }
  if (pendingItems.some((item) => item.reason === "error")) {
    return "Open the conversation and inspect the error.";
  }
  if (pendingItems.some((item) => item.reason === "reply-ready")) {
    return "Read the reply. A response may or may not be needed.";
  }
  if (session.codexAttention) return "No action is required.";
  if (session.attentionState === "read") return "No action is required.";
  if (session.status === "waiting") {
    if (
      session.attentionType === "permission" ||
      session.attentionType === "plan_approval"
    ) {
      return "Open the conversation and review the approval request.";
    }
    if (session.attentionType === "question") {
      return "Open the conversation and answer the request.";
    }
    return "Open the conversation and inspect the request.";
  }
  if (session.attentionState === "unread") {
    return "Read the reply. A response may or may not be needed.";
  }
  return "No action is required.";
}

function attentionItemCount(session: EnrichedSession): number {
  const nativeCount = session.codexAttention?.pendingItems.length ?? 0;
  if (session.codexAttention) return nativeCount;
  if (
    (session.status === "waiting" && session.attentionState !== "read") ||
    session.attentionState === "unread"
  ) {
    return 1;
  }
  return 0;
}

/** Current work uses the same visual language as the main ccmux dashboard. */
export function attentionActivityColor(session: EnrichedSession): string {
  switch (attentionWorkStateLabel(session)) {
    case "Working":
      return theme.peach;
    case "Waiting":
      return theme.red;
    default:
      return theme.overlay;
  }
}

/** The next-action color ranks what the user should inspect first. */
export function attentionNextActionColor(session: EnrichedSession): string {
  const pendingItems = session.codexAttention?.pendingItems ?? [];
  if (pendingItems.some((item) => item.reason === "error")) return theme.red;
  if (pendingItems.some((item) => item.reason === "input-required")) {
    return theme.yellow;
  }
  if (pendingItems.some((item) => item.reason === "reply-ready")) {
    return theme.green;
  }
  if (
    !session.codexAttention &&
    session.status === "waiting" &&
    session.attentionState !== "read"
  ) {
    return theme.yellow;
  }
  if (!session.codexAttention && session.attentionState === "unread") {
    return theme.green;
  }
  return theme.overlay;
}

export function attentionSourceColor(session: EnrichedSession): string {
  return session.codexAttention?.source.sourceKind === "workbench"
    ? theme.mauve
    : theme.blue;
}

export function attentionContextColor(session: EnrichedSession): string {
  const remainingPercent = attentionContextRemainingPercent(session);
  if (remainingPercent === null) return theme.overlay;
  if (remainingPercent < 25) return theme.red;
  if (remainingPercent < 50) return theme.yellow;
  return theme.green;
}

export function attentionIdleColor(
  session: EnrichedSession,
  nowMilliseconds: number,
): string {
  if (attentionWorkStateLabel(session) === "Working") return theme.overlay;
  const nativeUpdatedAt = session.codexAttention?.nativeUpdatedAt;
  const activityTime = session.lastActivityAt
    ? Date.parse(session.lastActivityAt)
    : nativeUpdatedAt === undefined
      ? null
      : nativeUpdatedAt * 1000;
  if (activityTime === null || !Number.isFinite(activityTime)) {
    return theme.overlay;
  }
  const idleMilliseconds = Math.max(0, nowMilliseconds - activityTime);
  if (idleMilliseconds >= 2 * 60 * 60 * 1000) return theme.red;
  if (idleMilliseconds >= 60 * 60 * 1000) return theme.yellow;
  return theme.overlay;
}

function attentionCountColor(sessions: EnrichedSession[]): string {
  const pendingItems = sessions.flatMap(
    (session) => session.codexAttention?.pendingItems ?? [],
  );
  if (pendingItems.some((item) => item.reason === "error")) return theme.red;
  if (pendingItems.some((item) => item.reason === "input-required")) {
    return theme.yellow;
  }
  if (pendingItems.length > 0) return theme.green;
  if (
    sessions.some(
      (session) =>
        !session.codexAttention &&
        session.status === "waiting" &&
        session.attentionState !== "read",
    )
  ) {
    return theme.yellow;
  }
  if (
    sessions.some(
      (session) =>
        !session.codexAttention && session.attentionState === "unread",
    )
  ) {
    return theme.green;
  }
  return theme.overlay;
}

function coverageColor(label: string): string {
  if (label.includes("unavailable")) return theme.red;
  if (label.includes("Not checked")) return theme.yellow;
  return theme.green;
}

function recoveryTitle(reason: string | undefined): string {
  switch (reason) {
    case "marker-missing":
    case "remote-marker-missing":
      return "Pane verification failed: identity marker missing.";
    case "source-unavailable":
    case "workbench-unavailable":
      return "Pane verification failed: source unavailable.";
    case "pane-missing":
    case "remote-pane-missing":
      return "Pane verification failed: saved pane missing.";
    case "process-unavailable":
    case "remote-process-unavailable":
      return "Pane verification failed: process unavailable.";
    default:
      return "Pane verification failed. Selection and item retained.";
  }
}

function coverageRows(
  sessions: EnrichedSession[],
  nowMilliseconds: number,
): string[] {
  const sources = new Map<
    string,
    {
      label: string;
      coverage: NonNullable<EnrichedSession["codexAttention"]>["coverage"];
    }
  >();
  for (const session of sessions) {
    const attention = session.codexAttention;
    if (!attention) continue;
    sources.set(attention.source.sourceId, {
      label: attentionSourceLabel(session),
      coverage: attention.coverage,
    });
  }
  return [...sources.values()]
    .sort((left, right) => {
      if (left.label === "Mac") return -1;
      if (right.label === "Mac") return 1;
      return left.label.localeCompare(right.label);
    })
    .map(({ label, coverage }) =>
      sourceCoverageLabel(coverage, nowMilliseconds, label),
    );
}

function wideColumnWidths(width: number) {
  const markerWidth = 2;
  const gap = " ";
  const gapWidth = gap.length * 7;
  const contentWidth = Math.min(
    150,
    Math.max(84, width - markerWidth - gapWidth),
  );
  const agentWidth = 6;
  const activityWidth = 8;
  const contextWidth = 9;
  const idleWidth = 11;
  const sourceWidth = 9;
  const flexibleWidth =
    contentWidth -
    agentWidth -
    sourceWidth -
    activityWidth -
    contextWidth -
    idleWidth;
  const projectWidth = Math.min(
    24,
    Math.max(14, Math.floor(flexibleWidth * 0.2)),
  );
  const runtimeSessionWidth = Math.min(
    52,
    Math.max(30, Math.floor(flexibleWidth * 0.48)),
  );
  const actionWidth = Math.min(
    24,
    flexibleWidth - projectWidth - runtimeSessionWidth,
  );
  return {
    actionWidth,
    activityWidth,
    agentWidth,
    contextWidth,
    gap,
    idleWidth,
    projectWidth,
    runtimeSessionWidth,
    sourceWidth,
  };
}

function wideHeader(width: number): string {
  const widths = wideColumnWidths(width);
  return (
    "  " +
    [
      padCell("PROJECT", widths.projectWidth),
      padCell("RUNTIME SESSION", widths.runtimeSessionWidth),
      padCell("AGENT", widths.agentWidth),
      padCell("SOURCE", widths.sourceWidth),
      padCell("ACTIVITY", widths.activityWidth),
      padCell("NEXT ACTION", widths.actionWidth),
      padCell("CONTEXT", widths.contextWidth),
      padCell("LAST ACTIVE", widths.idleWidth),
    ].join(widths.gap)
  );
}

interface WideAttentionCell {
  color: string;
  text: string;
  width: number;
}

function wideRowCells(
  session: EnrichedSession,
  width: number,
  nowMilliseconds: number,
): WideAttentionCell[] {
  const widths = wideColumnWidths(width);
  return [
    {
      color: theme.text,
      text: padCell(session.project, widths.projectWidth),
      width: widths.projectWidth,
    },
    {
      color: theme.teal,
      text: padCell(
        attentionRuntimeSessionLabel(session),
        widths.runtimeSessionWidth,
      ),
      width: widths.runtimeSessionWidth,
    },
    {
      color: agentColorFor(session.agentType),
      text: padCell(getAgentDisplayName(session.agentType), widths.agentWidth),
      width: widths.agentWidth,
    },
    {
      color: attentionSourceColor(session),
      text: padCell(attentionSourceLabel(session), widths.sourceWidth),
      width: widths.sourceWidth,
    },
    {
      color: attentionActivityColor(session),
      text: padCell(attentionWorkStateLabel(session), widths.activityWidth),
      width: widths.activityWidth,
    },
    {
      color: attentionNextActionColor(session),
      text: padCell(attentionNextActionLabel(session), widths.actionWidth),
      width: widths.actionWidth,
    },
    {
      color: attentionContextColor(session),
      text: padCell(
        attentionContextRemainingLabel(session),
        widths.contextWidth,
      ),
      width: widths.contextWidth,
    },
    {
      color: attentionIdleColor(session, nowMilliseconds),
      text: padCell(
        attentionIdleLabel(session, nowMilliseconds),
        widths.idleWidth,
      ),
      width: widths.idleWidth,
    },
  ];
}

function compactPendingDetail(
  session: EnrichedSession,
  nowMilliseconds: number,
): string {
  return `${attentionWorkStateLabel(session)} · ${attentionNextActionLabel(session)} · ${attentionContextRemainingLabel(session)} · active ${attentionIdleLabel(session, nowMilliseconds)} ago`;
}

function singleLinePreview(value: string | null | undefined): string {
  if (value === undefined) return "loading";
  if (value === null) return "unavailable";
  const preview = value.replace(/\s+/gu, " ").trim();
  return preview || "unavailable";
}

function compactRowLines(
  session: EnrichedSession,
  width: number,
  selected: boolean,
  forceTwoLines: boolean,
  nowMilliseconds: number,
): Array<{ color: string; text: string }> {
  const marker = selected ? "> " : "  ";
  const identity = `${marker}${session.project} / ${attentionRuntimeSessionLabel(session)} / ${getAgentDisplayName(session.agentType)} / ${attentionSourceLabel(session)}`;
  const detail = compactPendingDetail(session, nowMilliseconds);
  if (!forceTwoLines && displayWidth(`${identity}   ${detail}`) <= width) {
    return [
      {
        color: attentionNextActionColor(session),
        text: `${identity}   ${detail}`,
      },
    ];
  }
  return [
    {
      color: selected ? theme.teal : theme.text,
      text: truncateText(identity, width),
    },
    {
      color: attentionNextActionColor(session),
      text: truncateText(`  ${detail}`, width),
    },
  ];
}

export const AttentionDashboard: Component<AttentionDashboardProps> = (
  props,
) => {
  const dimensions = useSharedTerminalDimensions();
  const compact = () => dimensions().width < 100 || dimensions().height < 24;
  const selectedSession = () => props.sessions[props.selectedIndex] ?? null;
  const trackedSessions = () => props.trackedSessions ?? props.sessions;
  const totalPending = () =>
    trackedSessions().reduce(
      (count, session) => count + attentionItemCount(session),
      0,
    );
  const pendingRows = () =>
    trackedSessions().filter((session) => attentionItemCount(session) > 0)
      .length;
  const coverage = createMemo(() =>
    coverageRows(trackedSessions(), props.nowMilliseconds),
  );
  const packedCoverage = createMemo(() => {
    const availableWidth = Math.max(1, dimensions().width - 2);
    const packed: string[] = [];
    for (const value of coverage()) {
      const previous = packed.at(-1);
      const combined = previous ? `${previous} | ${value}` : value;
      if (previous && displayWidth(combined) <= availableWidth) {
        packed[packed.length - 1] = combined;
      } else {
        packed.push(value);
      }
    }
    return packed;
  });
  const visibleWindow = createMemo(() => {
    const rowLimit = compact() ? 3 : Math.max(3, dimensions().height - 20);
    const maximumStart = Math.max(0, props.sessions.length - rowLimit);
    const start = Math.min(
      maximumStart,
      Math.max(0, props.selectedIndex - Math.floor(rowLimit / 2)),
    );
    return {
      start,
      rows: props.sessions.slice(start, start + rowLimit),
    };
  });
  const compactRows = createMemo(() => {
    const recoverySelected =
      props.recovery?.sessionId === selectedSession()?.id
        ? selectedSession()
        : null;
    if (recoverySelected) {
      return compactRowLines(
        recoverySelected,
        dimensions().width - 2,
        true,
        true,
        props.nowMilliseconds,
      );
    }
    return visibleWindow().rows.flatMap((session, rowIndex) =>
      compactRowLines(
        session,
        dimensions().width - 2,
        visibleWindow().start + rowIndex === props.selectedIndex,
        rowIndex < 2,
        props.nowMilliseconds,
      ),
    );
  });
  const line = (value: string) =>
    truncateText(value, Math.max(1, dimensions().width - 2));

  return (
    <box
      flexDirection="column"
      width="100%"
      height="100%"
      paddingLeft={1}
      paddingRight={1}
    >
      <box height={1} flexDirection="row">
        <text fg={theme.teal} attributes={1}>
          Agent attention
        </text>
        <text fg={attentionCountColor(trackedSessions())}>
          {`    ${totalPending()} attention ${plural(totalPending(), "item")} / ${pendingRows()} ${plural(pendingRows(), "session")}`}
        </text>
      </box>
      <box height={1}>
        <text fg={theme.overlay}>
          {props.searchMode
            ? line(`Search: ${props.searchQuery || "_"}    Esc Cancel`)
            : line(
                `${props.pendingOnly ? "Attention only" : "All tracked"} (${props.pendingOnly ? pendingRows() : trackedSessions().length})    / Search    f Attention / All`,
              )}
        </text>
      </box>

      <Show
        when={!compact()}
        fallback={
          <box
            height={Math.max(1, packedCoverage().length)}
            flexDirection="column"
          >
            <For each={packedCoverage()}>
              {(value) => <text fg={coverageColor(value)}>{line(value)}</text>}
            </For>
          </box>
        }
      >
        <box height={1} />
        <box height={1}>
          <text fg={theme.overlay}>Data sources</text>
        </box>
        <box
          height={Math.max(1, packedCoverage().length)}
          flexDirection="column"
        >
          <For each={packedCoverage()}>
            {(value) => <text fg={coverageColor(value)}>{line(value)}</text>}
          </For>
        </box>
      </Show>

      <box height={1}>
        <text fg={theme.overlay}>
          {compact()
            ? line("Identity / activity / next action / context / idle")
            : line(wideHeader(dimensions().width - 2))}
        </text>
      </box>

      <Show when={!compact()}>
        <box height={1}>
          <text fg={theme.overlay}>
            {line(
              "Context is Codex context left. Last active is time since the latest agent transcript activity.",
            )}
          </text>
        </box>
      </Show>

      <Show
        when={!compact()}
        fallback={
          <box flexDirection="column" height={compactRows().length}>
            <For each={compactRows()}>
              {(value) => <text fg={value.color}>{line(value.text)}</text>}
            </For>
          </box>
        }
      >
        <box flexDirection="column" height={visibleWindow().rows.length}>
          <For each={visibleWindow().rows}>
            {(session, rowIndex) => {
              const index = () => visibleWindow().start + rowIndex();
              const selected = () => index() === props.selectedIndex;
              const widths = () => wideColumnWidths(dimensions().width - 2);
              return (
                <box height={1}>
                  <box
                    flexDirection="row"
                    height={1}
                    width="100%"
                    backgroundColor={selected() ? theme.surface : undefined}
                  >
                    <text fg={theme.teal} width={2} flexShrink={0}>
                      {selected() ? "> " : "  "}
                    </text>
                    <For
                      each={wideRowCells(
                        session,
                        dimensions().width - 2,
                        props.nowMilliseconds,
                      )}
                    >
                      {(cell, cellIndex) => (
                        <>
                          <text
                            fg={cell.color}
                            width={cell.width}
                            flexShrink={0}
                          >
                            {cell.text}
                          </text>
                          <Show when={cellIndex() < 7}>
                            <text width={widths().gap.length} flexShrink={0}>
                              {widths().gap}
                            </text>
                          </Show>
                        </>
                      )}
                    </For>
                  </box>
                </box>
              );
            }}
          </For>
        </box>
      </Show>

      <Show when={compact() && !props.recovery}>
        <box height={1}>
          <text fg={theme.overlay}>
            {line(
              `Rows ${props.sessions.length === 0 ? 0 : visibleWindow().start + 1}–${visibleWindow().start + visibleWindow().rows.length} of ${props.sessions.length}    j/k scroll; selected details below`,
            )}
          </text>
        </box>
      </Show>

      <Show when={!compact()}>
        <box height={1}>
          <text fg={theme.border}>
            {"─".repeat(Math.max(1, dimensions().width - 2))}
          </text>
        </box>
      </Show>

      <Show when={selectedSession()}>
        {(selected: () => EnrichedSession) => (
          <Show
            when={
              props.recovery?.sessionId === selected().id
                ? props.recovery
                : null
            }
            fallback={
              <box flexDirection="column" height={compact() ? 7 : 10}>
                <text attributes={1}>
                  {line(
                    compact()
                      ? `${selected().project} / ${attentionRuntimeSessionLabel(selected())}`
                      : `Selected: ${selected().project} / ${attentionRuntimeSessionLabel(selected())} / ${getAgentDisplayName(selected().agentType)} / ${attentionSourceLabel(selected())}`,
                  )}
                </text>
                <text fg={attentionNextActionColor(selected())}>
                  {line(
                    compact()
                      ? pendingDetails(selected()) || "none"
                      : `Attention: ${pendingDetails(selected()) || "none"}`,
                  )}
                </text>
                <text fg={theme.teal}>
                  {line(`Next: ${nextStepGuidance(selected())}`)}
                </text>
                <text fg={attentionContextColor(selected())}>
                  {line(
                    `Context: ${attentionContextUsageLabel(selected())} · Last active: ${attentionIdleLabel(selected(), props.nowMilliseconds)} ago`,
                  )}
                </text>
                <Show when={!compact()}>
                  <text fg={theme.overlay}>
                    {line(
                      `Usage: ${attentionCumulativeUsageLabel(selected())} · Model: ${selected().codexAttention?.model ?? "unavailable"}`,
                    )}
                  </text>
                </Show>
                <text fg={theme.text}>
                  {line(
                    `Last prompt: ${singleLinePreview(
                      props.conversationPreview?.sessionId === selected().id
                        ? (selected().lastPrompt ??
                            props.conversationPreview.lastPrompt)
                        : selected().lastPrompt,
                    )}`,
                  )}
                </text>
                <text fg={theme.text}>
                  {line(
                    `Last response: ${singleLinePreview(
                      props.conversationPreview?.sessionId === selected().id
                        ? props.conversationPreview.lastResponse
                        : undefined,
                    )}`,
                  )}
                </text>
                <text fg={theme.overlay}>
                  {line(
                    `Runtime Session ID: ${selected().codexAttention?.identity.runtimeSessionId ?? selected().nativeSessionId ?? "unavailable"}`,
                  )}
                </text>
                <Show when={!compact()}>
                  <text fg={theme.overlay}>
                    Opening the conversation does not dismiss attention.
                  </text>
                  <text fg={theme.overlay}>
                    Enter opens the existing conversation after verifying its
                    pane.
                  </text>
                </Show>
              </box>
            }
          >
            {(recovery: () => AttentionRecovery) => (
              <box flexDirection="column" height={7}>
                <text fg={theme.yellow} attributes={1}>
                  {line(recoveryTitle(recovery().failureReason))}
                </text>
                <text>{line(`Source: ${recovery().source}`)}</text>
                <text>{line(`Directory: ${recovery().directory}`)}</text>
                <text fg={theme.overlay}>
                  {line(`Runtime Session ID: ${recovery().runtimeSessionId}`)}
                </text>
                <For each={recovery().instructions.slice(0, 3)}>
                  {(instruction) => (
                    <text fg={theme.teal}>{line(instruction)}</text>
                  )}
                </For>
              </box>
            )}
          </Show>
        )}
      </Show>

      <box flexGrow={1} />
      <box height={1}>
        <text fg={theme.teal}>
          {line(
            compact()
              ? "/ Search   f Attention / All   c Dismiss attention"
              : "/ Search    f Attention / All    c Dismiss attention",
          )}
        </text>
      </box>
      <box height={1}>
        <text fg={theme.teal}>
          {line(
            props.recovery
              ? "j/k Select    Esc Close (no resume performed)"
              : compact()
                ? "j/k Select   Enter Go to conversation   Esc Close"
                : "j/k Select    Enter Go to conversation    Esc Close",
          )}
        </text>
      </box>
    </box>
  );
};
