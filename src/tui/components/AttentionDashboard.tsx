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

interface WideColumnVisibility {
  agent: boolean;
  project: boolean;
  source: boolean;
}

function wideColumnVisibility(
  sessions: EnrichedSession[],
): WideColumnVisibility {
  return {
    agent: new Set(sessions.map((session) => session.agentType)).size > 1,
    project: new Set(sessions.map((session) => session.project)).size > 1,
    source:
      new Set(sessions.map((session) => attentionSourceLabel(session))).size >
      1,
  };
}

function wideColumnWidths(width: number, visibility: WideColumnVisibility) {
  const markerWidth = 2;
  const gap = " ";
  const visibleColumnCount =
    4 +
    Number(visibility.project) +
    Number(visibility.agent) +
    Number(visibility.source);
  const gapWidth = gap.length * (visibleColumnCount - 1);
  const contentWidth = Math.max(84, width - markerWidth - gapWidth);
  const agentWidth = 6;
  const contextWidth = 10;
  const idleWidth = 11;
  const sourceWidth = 10;
  const projectWidth = 20;
  const actionWidth = 22;
  const optionalWidth =
    (visibility.project ? projectWidth : 0) +
    (visibility.agent ? agentWidth : 0) +
    (visibility.source ? sourceWidth : 0);
  const runtimeSessionWidth = Math.min(
    56,
    Math.max(
      30,
      contentWidth - optionalWidth - actionWidth - contextWidth - idleWidth,
    ),
  );
  return {
    actionWidth,
    agentWidth,
    contextWidth,
    gap,
    idleWidth,
    projectWidth,
    runtimeSessionWidth,
    sourceWidth,
  };
}

function wideHeader(width: number, visibility: WideColumnVisibility): string {
  const widths = wideColumnWidths(width, visibility);
  const cells: string[] = [];
  if (visibility.project) cells.push(padCell("PROJECT", widths.projectWidth));
  cells.push(padCell("RUNTIME SESSION", widths.runtimeSessionWidth));
  if (visibility.agent) cells.push(padCell("AGENT", widths.agentWidth));
  if (visibility.source) cells.push(padCell("SOURCE", widths.sourceWidth));
  cells.push(
    padCell("ACTION", widths.actionWidth),
    padCell("CONTEXT", widths.contextWidth),
    padCell("LAST ACTIVE", widths.idleWidth),
  );
  return `  ${cells.join(widths.gap)}`;
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
  visibility: WideColumnVisibility,
): WideAttentionCell[] {
  const widths = wideColumnWidths(width, visibility);
  const cells: WideAttentionCell[] = [];
  if (visibility.project) {
    cells.push({
      color: theme.text,
      text: padCell(session.project, widths.projectWidth),
      width: widths.projectWidth,
    });
  }
  cells.push({
    color: theme.teal,
    text: padCell(
      attentionRuntimeSessionLabel(session),
      widths.runtimeSessionWidth,
    ),
    width: widths.runtimeSessionWidth,
  });
  if (visibility.agent) {
    cells.push({
      color: agentColorFor(session.agentType),
      text: padCell(getAgentDisplayName(session.agentType), widths.agentWidth),
      width: widths.agentWidth,
    });
  }
  if (visibility.source) {
    cells.push({
      color: attentionSourceColor(session),
      text: padCell(attentionSourceLabel(session), widths.sourceWidth),
      width: widths.sourceWidth,
    });
  }
  const nextAction = attentionNextActionLabel(session);
  const action =
    nextAction === "—" ? attentionWorkStateLabel(session) : nextAction;
  cells.push(
    {
      color:
        nextAction === "—"
          ? attentionActivityColor(session)
          : attentionNextActionColor(session),
      text: padCell(action === "Idle" ? "—" : action, widths.actionWidth),
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
  );
  return cells;
}

function compactPendingDetail(
  session: EnrichedSession,
  nowMilliseconds: number,
): string {
  const nextAction = attentionNextActionLabel(session);
  const action =
    nextAction === "—" ? attentionWorkStateLabel(session) : nextAction;
  return `${action} · ${attentionContextRemainingLabel(session)} · ${attentionIdleLabel(session, nowMilliseconds)} active`;
}

function singleLinePreview(value: string | null | undefined): string {
  if (value === undefined) return "loading";
  if (value === null) return "unavailable";
  const preview = value.replace(/\s+/gu, " ").trim();
  return preview || "unavailable";
}

function selectedSessionMetadata(session: EnrichedSession): string | null {
  const details: string[] = [];
  const contextUsage = attentionContextUsageLabel(session);
  if (contextUsage !== "unavailable") details.push(`Context ${contextUsage}`);
  const cumulativeUsage = attentionCumulativeUsageLabel(session);
  if (cumulativeUsage !== "unavailable") details.push(cumulativeUsage);
  const model = session.codexAttention?.model;
  if (model) details.push(model);
  return details.length > 0 ? details.join(" · ") : null;
}

function compactRowLines(
  session: EnrichedSession,
  width: number,
  selected: boolean,
  forceTwoLines: boolean,
  nowMilliseconds: number,
): Array<{ color: string; text: string }> {
  const marker = selected ? "> " : "  ";
  const identity = `${marker}${session.project} / ${attentionRuntimeSessionLabel(session)}`;
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
  const compact = () => dimensions().width < 100 || dimensions().height < 16;
  const selectedSession = () => props.sessions[props.selectedIndex] ?? null;
  const trackedSessions = () => props.trackedSessions ?? props.sessions;
  const totalPending = () =>
    trackedSessions().reduce(
      (count, session) => count + attentionItemCount(session),
      0,
    );
  const coverage = createMemo(() =>
    coverageRows(trackedSessions(), props.nowMilliseconds),
  );
  const coverageWarnings = createMemo(() =>
    coverage().filter(
      (value) => value.includes("unavailable") || value.includes("Not checked"),
    ),
  );
  const packedCoverage = createMemo(() => {
    const availableWidth = Math.max(1, dimensions().width - 2);
    const packed: string[] = [];
    for (const value of coverageWarnings()) {
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
  const columnVisibility = createMemo(() =>
    wideColumnVisibility(trackedSessions()),
  );
  const commonProject = createMemo(() => {
    const projects = new Set(
      trackedSessions().map((session) => session.project),
    );
    return projects.size === 1 ? projects.values().next().value : undefined;
  });
  const visibleWindow = createMemo(() => {
    const reservedRows =
      (props.recovery ? 12 : 7) +
      packedCoverage().length +
      (props.searchMode ? 1 : 0);
    const rowLimit = compact()
      ? 3
      : Math.max(3, dimensions().height - reservedRows);
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
          Attention
        </text>
        <text fg={attentionCountColor(trackedSessions())}>
          {`  ${totalPending()} pending · ${trackedSessions().length} ${trackedSessions().length === 1 ? "session" : "sessions"}`}
        </text>
        <Show when={commonProject()}>
          {(project: () => string) => (
            <text fg={theme.overlay}>{` · ${project()}`}</text>
          )}
        </Show>
      </box>
      <Show when={props.searchMode}>
        <box height={1}>
          <text fg={theme.overlay}>
            {line(`Search: ${props.searchQuery || "_"} · Esc cancel`)}
          </text>
        </box>
      </Show>
      <For each={packedCoverage()}>
        {(value) => (
          <box height={1}>
            <text fg={coverageColor(value)}>{line(value)}</text>
          </box>
        )}
      </For>

      <box height={1}>
        <text fg={theme.overlay}>
          {compact()
            ? line("SESSION / ACTION / CONTEXT / ACTIVE")
            : line(wideHeader(dimensions().width - 2, columnVisibility()))}
        </text>
      </box>

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
              const widths = () =>
                wideColumnWidths(dimensions().width - 2, columnVisibility());
              const cells = () =>
                wideRowCells(
                  session,
                  dimensions().width - 2,
                  props.nowMilliseconds,
                  columnVisibility(),
                );
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
                    <For each={cells()}>
                      {(cell, cellIndex) => (
                        <>
                          <text
                            fg={cell.color}
                            width={cell.width}
                            flexShrink={0}
                          >
                            {cell.text}
                          </text>
                          <Show when={cellIndex() < cells().length - 1}>
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
              `${props.sessions.length === 0 ? 0 : visibleWindow().start + 1}–${visibleWindow().start + visibleWindow().rows.length} / ${props.sessions.length}`,
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
              <box
                flexDirection="column"
                height={selectedSessionMetadata(selected()) ? 3 : 2}
              >
                <Show when={selectedSessionMetadata(selected())}>
                  {(metadata: () => string) => (
                    <text fg={attentionContextColor(selected())}>
                      {line(metadata())}
                    </text>
                  )}
                </Show>
                <text fg={theme.text}>
                  {line(
                    `Prompt: ${singleLinePreview(
                      props.conversationPreview?.sessionId === selected().id
                        ? (selected().lastPrompt ??
                            props.conversationPreview.lastPrompt)
                        : selected().lastPrompt,
                    )}`,
                  )}
                </text>
                <text fg={theme.text}>
                  {line(
                    `Reply: ${singleLinePreview(
                      props.conversationPreview?.sessionId === selected().id
                        ? props.conversationPreview.lastResponse
                        : undefined,
                    )}`,
                  )}
                </text>
              </box>
            }
          >
            {(recovery: () => AttentionRecovery) => (
              <box flexDirection="column" height={8}>
                <text fg={theme.yellow} attributes={1}>
                  {line(recoveryTitle(recovery().failureReason))}
                </text>
                <text>{line(`Source: ${recovery().source}`)}</text>
                <text>{line(`Directory: ${recovery().directory}`)}</text>
                <text fg={theme.overlay}>
                  {line(`Runtime Session ID: ${recovery().runtimeSessionId}`)}
                </text>
                <text fg={theme.yellow}>
                  {line("No resume performed; attention retained.")}
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
      <Show
        when={compact()}
        fallback={
          <box height={1}>
            <text fg={theme.teal}>
              {line(
                props.recovery
                  ? `j/k Select  / Search  f ${props.pendingOnly ? "All" : "Pending"}  Esc Close`
                  : `j/k Select  Enter Open  c Dismiss  / Search  f ${props.pendingOnly ? "All" : "Pending"}  Esc Close`,
              )}
            </text>
          </box>
        }
      >
        <box height={1}>
          <text fg={theme.teal}>
            {line(
              `/ Search · f ${props.pendingOnly ? "All" : "Pending"} · c Dismiss`,
            )}
          </text>
        </box>
        <box height={1}>
          <text fg={theme.teal}>
            {line(
              props.recovery
                ? "j/k Select · Esc Close"
                : "j/k Select · Enter Open · Esc Close",
            )}
          </text>
        </box>
      </Show>
    </box>
  );
};
