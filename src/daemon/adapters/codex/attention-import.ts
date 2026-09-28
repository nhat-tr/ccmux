import { Buffer } from "node:buffer";
import type {
  CodexAttentionSnapshot,
  CodexPendingItem,
  CodexRuntimeSessionIdentity,
  CodexRuntimeSessionSnapshot,
  CodexRuntimeSessionSourceKind,
  CodexSourceCoverage,
  CodexTokenUsageBreakdown,
} from "../../../types/session";

export type CodexAttentionSnapshotParseResult =
  | { ok: true; snapshot: CodexAttentionSnapshot }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => isSafeText(entry));
}

function isSafeText(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    // Imported values render in a terminal. Control characters are not data.
    !/[\u0000-\u001f\u007f]/u.test(value)
  );
}

function isOptionalSafeText(value: unknown): value is string | undefined {
  return value === undefined || isSafeText(value);
}

function isOptionalNonNegativeInteger(
  value: unknown,
): value is number | undefined {
  return (
    value === undefined || (Number.isSafeInteger(value) && Number(value) >= 0)
  );
}

function parseSourceKind(value: unknown): CodexRuntimeSessionSourceKind | null {
  return value === "host" || value === "workbench" ? value : null;
}

function parseProject(
  value: unknown,
): { name: string; directory: string } | null {
  if (
    !isRecord(value) ||
    !isSafeText(value.name) ||
    !isSafeText(value.directory)
  ) {
    return null;
  }
  return { name: value.name, directory: value.directory };
}

function parseTokenUsageBreakdown(
  value: unknown,
): CodexTokenUsageBreakdown | undefined | null {
  if (value === undefined) return undefined;
  if (!isRecord(value)) return null;
  const fields = [
    "inputTokens",
    "cachedInputTokens",
    "outputTokens",
    "reasoningOutputTokens",
    "totalTokens",
  ] as const;
  if (!fields.every((field) => isOptionalNonNegativeInteger(value[field]))) {
    return null;
  }
  if (fields.some((field) => value[field] === undefined)) return null;
  return {
    inputTokens: Number(value.inputTokens),
    cachedInputTokens: Number(value.cachedInputTokens),
    outputTokens: Number(value.outputTokens),
    reasoningOutputTokens: Number(value.reasoningOutputTokens),
    totalTokens: Number(value.totalTokens),
  };
}

function hasValidRuntimeSessionSource(
  value: Record<string, unknown>,
  sourceKind: CodexRuntimeSessionSourceKind,
): value is Record<string, unknown> & {
  sourceId: string;
  sourceLabel: string;
  workbenchName?: string;
} {
  if (!isSafeText(value.sourceId) || !isSafeText(value.sourceLabel)) {
    return false;
  }
  if (sourceKind === "host") {
    return value.sourceId === "host" && value.workbenchName === undefined;
  }
  return (
    isSafeText(value.workbenchName) &&
    value.sourceId === `workbench:${value.workbenchName}`
  );
}

function parseRuntimeSession(
  value: unknown,
): CodexRuntimeSessionSnapshot | null {
  if (!isRecord(value)) return null;
  const sourceKind = parseSourceKind(value.sourceKind);
  const project = parseProject(value.project);
  const latestTokenUsage = parseTokenUsageBreakdown(value.latestTokenUsage);
  const cumulativeTokenUsage = parseTokenUsageBreakdown(
    value.cumulativeTokenUsage,
  );
  if (
    sourceKind === null ||
    project === null ||
    !hasValidRuntimeSessionSource(value, sourceKind) ||
    !isSafeText(value.runtimeDirectory) ||
    !isSafeText(value.runtimeSessionId) ||
    !isOptionalSafeText(value.runtimeSessionName) ||
    !isOptionalSafeText(value.model) ||
    (value.workState !== "waiting" &&
      value.workState !== "working" &&
      value.workState !== "not-working") ||
    !isOptionalNonNegativeInteger(value.nativeUpdatedAt) ||
    latestTokenUsage === null ||
    cumulativeTokenUsage === null ||
    !isOptionalNonNegativeInteger(value.modelContextWindow) ||
    value.modelContextWindow === 0
  ) {
    return null;
  }
  return {
    sourceId: value.sourceId,
    sourceKind,
    sourceLabel: value.sourceLabel,
    ...(value.workbenchName === undefined
      ? {}
      : { workbenchName: value.workbenchName }),
    project,
    runtimeDirectory: value.runtimeDirectory,
    runtimeSessionId: value.runtimeSessionId,
    ...(value.runtimeSessionName === undefined
      ? {}
      : { runtimeSessionName: value.runtimeSessionName }),
    ...(value.model === undefined ? {} : { model: value.model }),
    workState: value.workState,
    ...(value.nativeUpdatedAt === undefined
      ? {}
      : { nativeUpdatedAt: value.nativeUpdatedAt }),
    ...(latestTokenUsage === undefined ? {} : { latestTokenUsage }),
    ...(cumulativeTokenUsage === undefined
      ? {}
      : { cumulativeTokenUsage }),
    ...(value.modelContextWindow === undefined
      ? {}
      : { modelContextWindow: Number(value.modelContextWindow) }),
  };
}

function parseSourceCoverage(value: unknown): CodexSourceCoverage | null {
  if (!isRecord(value)) return null;
  const sourceKind =
    value.sourceKind === undefined
      ? undefined
      : parseSourceKind(value.sourceKind);
  if (
    !isSafeText(value.sourceId) ||
    sourceKind === null ||
    (sourceKind === "host" && value.sourceId !== "host") ||
    (sourceKind === "workbench" && !value.sourceId.startsWith("workbench:")) ||
    (value.coverage !== "available" && value.coverage !== "unavailable") ||
    !isSafeText(value.observedAt) ||
    !isOptionalSafeText(value.reason) ||
    !isOptionalSafeText(value.providerVersion) ||
    !isOptionalNonNegativeInteger(value.threadCount) ||
    !isOptionalSafeText(value.lastSuccessfulAt) ||
    !isOptionalSafeText(value.lastSuccessfulProviderVersion) ||
    !isOptionalNonNegativeInteger(value.lastSuccessfulThreadCount)
  ) {
    return null;
  }
  return {
    sourceId: value.sourceId,
    ...(sourceKind === undefined ? {} : { sourceKind }),
    coverage: value.coverage,
    ...(value.reason === undefined ? {} : { reason: value.reason }),
    ...(value.providerVersion === undefined
      ? {}
      : { providerVersion: value.providerVersion }),
    ...(value.threadCount === undefined
      ? {}
      : { threadCount: value.threadCount }),
    observedAt: value.observedAt,
    ...(value.lastSuccessfulAt === undefined
      ? {}
      : { lastSuccessfulAt: value.lastSuccessfulAt }),
    ...(value.lastSuccessfulProviderVersion === undefined
      ? {}
      : { lastSuccessfulProviderVersion: value.lastSuccessfulProviderVersion }),
    ...(value.lastSuccessfulThreadCount === undefined
      ? {}
      : { lastSuccessfulThreadCount: value.lastSuccessfulThreadCount }),
  };
}

function parsePendingItem(value: unknown): CodexPendingItem | null {
  if (!isRecord(value)) return null;
  const sourceKind = parseSourceKind(value.sourceKind);
  const project = parseProject(value.project);
  if (
    sourceKind === null ||
    project === null ||
    !isSafeText(value.eventId) ||
    !hasValidRuntimeSessionSource(value, sourceKind) ||
    !isSafeText(value.runtimeDirectory) ||
    !isSafeText(value.runtimeSessionId) ||
    !isOptionalSafeText(value.nativeTurnId) ||
    (value.reason !== "input-required" &&
      value.reason !== "error" &&
      value.reason !== "reply-ready") ||
    (value.priority !== "required" && value.priority !== "lower") ||
    (value.inputKind !== undefined &&
      value.inputKind !== "user-input" &&
      value.inputKind !== "approval") ||
    (value.reason === "input-required" && value.inputKind === undefined) ||
    (value.reason !== "input-required" && value.inputKind !== undefined) ||
    (value.priority === "lower") !== (value.reason === "reply-ready") ||
    !isOptionalSafeText(value.nativeThreadStatus) ||
    !isOptionalSafeText(value.nativeTurnStatus) ||
    !Number.isSafeInteger(value.waitingMilliseconds) ||
    Number(value.waitingMilliseconds) < 0 ||
    !isStringArray(value.recoveryInstructions)
  ) {
    return null;
  }
  return {
    eventId: value.eventId,
    sourceId: value.sourceId,
    sourceKind,
    sourceLabel: value.sourceLabel,
    ...(value.workbenchName === undefined
      ? {}
      : { workbenchName: value.workbenchName }),
    project,
    runtimeDirectory: value.runtimeDirectory,
    runtimeSessionId: value.runtimeSessionId,
    ...(value.nativeTurnId === undefined
      ? {}
      : { nativeTurnId: value.nativeTurnId }),
    reason: value.reason,
    priority: value.priority,
    ...(value.inputKind === undefined ? {} : { inputKind: value.inputKind }),
    ...(value.nativeThreadStatus === undefined
      ? {}
      : { nativeThreadStatus: value.nativeThreadStatus }),
    ...(value.nativeTurnStatus === undefined
      ? {}
      : { nativeTurnStatus: value.nativeTurnStatus }),
    waitingMilliseconds: Number(value.waitingMilliseconds),
    recoveryInstructions: value.recoveryInstructions,
  };
}

function hasUniqueIdentity(
  runtimeSessions: CodexRuntimeSessionSnapshot[],
): boolean {
  const identities = new Set<string>();
  for (const runtimeSession of runtimeSessions) {
    const key = importedCodexSessionId(runtimeSession);
    if (identities.has(key)) return false;
    identities.add(key);
  }
  return true;
}

function hasUniqueStrings(values: string[]): boolean {
  return new Set(values).size === values.length;
}

function hasConsistentSources(
  runtimeSessions: CodexRuntimeSessionSnapshot[],
  sourceReports: CodexSourceCoverage[],
  pendingItems: CodexPendingItem[],
): boolean {
  const sourceReportsById = new Map(
    sourceReports.map((sourceReport) => [sourceReport.sourceId, sourceReport]),
  );
  for (const runtimeSession of runtimeSessions) {
    const sourceReport = sourceReportsById.get(runtimeSession.sourceId);
    if (
      sourceReport !== undefined &&
      sourceReport.sourceKind !== undefined &&
      sourceReport.sourceKind !== runtimeSession.sourceKind
    ) {
      return false;
    }
  }
  for (const pendingItem of pendingItems) {
    const sourceReport = sourceReportsById.get(pendingItem.sourceId);
    if (
      sourceReport === undefined ||
      (sourceReport.sourceKind !== undefined &&
        sourceReport.sourceKind !== pendingItem.sourceKind)
    ) {
      return false;
    }
  }
  return true;
}

export function parseCodexAttentionSnapshot(
  value: unknown,
): CodexAttentionSnapshotParseResult {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    return {
      ok: false,
      error: "Codex attention snapshot must use schema version 1.",
    };
  }
  if (
    !Number.isSafeInteger(value.recordCount) ||
    Number(value.recordCount) < 0 ||
    !Array.isArray(value.runtimeSessions) ||
    !Array.isArray(value.sourceReports) ||
    !Array.isArray(value.pendingItems)
  ) {
    return {
      ok: false,
      error: "Codex attention snapshot is missing required collection fields.",
    };
  }

  const runtimeSessions = value.runtimeSessions.map(parseRuntimeSession);
  const sourceReports = value.sourceReports.map(parseSourceCoverage);
  const pendingItems = value.pendingItems.map(parsePendingItem);
  if (
    runtimeSessions.some((entry) => entry === null) ||
    sourceReports.some((entry) => entry === null) ||
    pendingItems.some((entry) => entry === null)
  ) {
    return {
      ok: false,
      error: "Codex attention snapshot contains an invalid row.",
    };
  }

  const parsedRuntimeSessions = runtimeSessions.filter(
    (entry): entry is CodexRuntimeSessionSnapshot => entry !== null,
  );
  const parsedSourceReports = sourceReports.filter(
    (entry): entry is CodexSourceCoverage => entry !== null,
  );
  const parsedPendingItems = pendingItems.filter(
    (entry): entry is CodexPendingItem => entry !== null,
  );
  if (
    !hasUniqueIdentity(parsedRuntimeSessions) ||
    !hasUniqueStrings(parsedSourceReports.map((entry) => entry.sourceId)) ||
    !hasUniqueStrings(parsedPendingItems.map((entry) => entry.eventId))
  ) {
    return {
      ok: false,
      error:
        "Codex attention snapshot contains duplicate Runtime Session identities.",
    };
  }
  if (
    !hasConsistentSources(
      parsedRuntimeSessions,
      parsedSourceReports,
      parsedPendingItems,
    )
  ) {
    return {
      ok: false,
      error:
        "Codex attention snapshot contains inconsistent source identities.",
    };
  }

  return {
    ok: true,
    snapshot: {
      schemaVersion: 1,
      recordCount: Number(value.recordCount),
      runtimeSessions: parsedRuntimeSessions,
      sourceReports: parsedSourceReports,
      pendingItems: parsedPendingItems,
    },
  };
}

export function importedCodexSessionId(
  identity: CodexRuntimeSessionIdentity,
): string {
  const scopedIdentity = JSON.stringify([
    identity.sourceId,
    identity.runtimeSessionId,
  ]);
  return `codex-import:${Buffer.from(scopedIdentity).toString("base64url")}`;
}
