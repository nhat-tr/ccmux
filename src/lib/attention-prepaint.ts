import { readAttentionCache } from "./attention-cache";

interface CachedRuntimeSession {
  sourceLabel: string;
  project: { name: string };
  runtimeSessionId: string;
  workState: string;
}

interface CachedPendingItem {
  eventId: string;
  runtimeSessionId: string;
  reason: string;
}

interface CachedSourceReport {
  sourceId: string;
  coverage: string;
}

interface CachedSnapshot {
  runtimeSessions: CachedRuntimeSession[];
  pendingItems: CachedPendingItem[];
  sourceReports: CachedSourceReport[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function cachedSnapshot(value: unknown): CachedSnapshot | null {
  if (!isRecord(value)) return null;
  if (
    !Array.isArray(value.runtimeSessions) ||
    !Array.isArray(value.pendingItems) ||
    !Array.isArray(value.sourceReports)
  ) {
    return null;
  }
  const runtimeSessions = value.runtimeSessions.filter(
    (session): session is CachedRuntimeSession =>
      isRecord(session) &&
      typeof session.sourceLabel === "string" &&
      isRecord(session.project) &&
      typeof session.project.name === "string" &&
      typeof session.runtimeSessionId === "string" &&
      typeof session.workState === "string",
  );
  const pendingItems = value.pendingItems.filter(
    (item): item is CachedPendingItem =>
      isRecord(item) &&
      typeof item.eventId === "string" &&
      typeof item.runtimeSessionId === "string" &&
      typeof item.reason === "string",
  );
  const sourceReports = value.sourceReports.filter(
    (report): report is CachedSourceReport =>
      isRecord(report) &&
      typeof report.sourceId === "string" &&
      typeof report.coverage === "string",
  );
  return { runtimeSessions, pendingItems, sourceReports };
}

function pendingLabel(items: CachedPendingItem[]): string {
  if (items.length === 0) return "none";
  const reasons = new Set(items.map((item) => item.reason));
  return `${items.length} ${[...reasons].join("+")}`;
}

/**
 * Paint a populated cache-only frame before the interactive renderer loads.
 * The frame is replaced by the live dashboard and never performs discovery.
 */
export function renderCachedAttentionPrepaint(
  output: Pick<NodeJS.WriteStream, "isTTY" | "write"> = process.stdout,
): boolean {
  if (!output.isTTY) return false;
  const snapshot = cachedSnapshot(readAttentionCache());
  if (!snapshot || snapshot.runtimeSessions.length === 0) return false;

  const lines = snapshot.runtimeSessions.slice(0, 8).map((session) => {
    const items = snapshot.pendingItems.filter(
      (item) => item.runtimeSessionId === session.runtimeSessionId,
    );
    return `  ${session.project.name}  ${session.sourceLabel}  ${session.workState}  ${pendingLabel(items)}`;
  });
  const unavailable = snapshot.sourceReports.filter(
    (report) => report.coverage === "unavailable",
  ).length;
  const frame = [
    `Agent attention    ${snapshot.pendingItems.length} pending items / ${snapshot.runtimeSessions.length} rows`,
    "Cached partial list. Connecting to ccmux daemon...",
    `Source coverage    ${snapshot.sourceReports.length - unavailable} available / ${unavailable} unavailable`,
    "",
    ...lines,
  ].join("\n");
  output.write(`\x1b[?1049h\x1b[2J\x1b[H${frame}\x1b[0m`);
  return true;
}
