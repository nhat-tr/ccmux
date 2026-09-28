import type { Session, TmuxPane } from "../types";
import type { SessionPidMarker } from "./session-markers";
import { normalizeTty } from "./pane-discovery";

export type AttentionNavigationRefusal =
  | "source-not-local"
  | "source-unavailable"
  | "native-identity-mismatch"
  | "pane-missing"
  | "pane-identity-mismatch"
  | "marker-missing"
  | "marker-identity-mismatch"
  | "process-unavailable";

export type AttentionNavigationResult =
  | { ok: true; paneId: string }
  | { ok: false; reason: AttentionNavigationRefusal };

/**
 * Verify that a dashboard row still names its live host pane. Imported Codex
 * rows use their attention identity; ordinary rows use their provider-native
 * Runtime Session identity. This function performs no switch and starts no
 * process.
 */
export function resolveAttentionNavigationTarget(
  session: Readonly<Session>,
  pane: Readonly<TmuxPane> | null,
  marker: Readonly<SessionPidMarker> | null,
  hasMatchingTranscriptIdentity: boolean,
  isProcessAlive: (pid: number) => boolean,
): AttentionNavigationResult {
  const attention = session.codexAttention;
  if (attention) {
    if (
      attention.source.sourceKind !== "host" ||
      attention.localActionEligibility !== "eligible"
    ) {
      return { ok: false, reason: "source-not-local" };
    }
    if (attention.coverage?.coverage === "unavailable") {
      return { ok: false, reason: "source-unavailable" };
    }
  } else if (
    session.trackingMode === "background" ||
    session.trackingMode === "imported"
  ) {
    return { ok: false, reason: "source-not-local" };
  }

  const runtimeSessionId =
    attention?.identity.runtimeSessionId ?? session.nativeSessionId;
  if (
    !runtimeSessionId ||
    (attention && session.nativeSessionId !== runtimeSessionId)
  ) {
    return { ok: false, reason: "native-identity-mismatch" };
  }
  if (!session.tmuxPane || !pane || pane.paneId !== session.tmuxPane) {
    return { ok: false, reason: "pane-missing" };
  }
  if (marker) {
    if (
      marker.agent_type !== session.agentType ||
      marker.session_id !== runtimeSessionId ||
      marker.pid !== session.pid
    ) {
      return { ok: false, reason: "marker-identity-mismatch" };
    }
    const paneTty = normalizeTty(pane.tty);
    const markerTty = normalizeTty(marker.tty ?? null);
    if (!paneTty || !markerTty || paneTty !== markerTty) {
      return { ok: false, reason: "pane-identity-mismatch" };
    }
  } else if (!hasMatchingTranscriptIdentity) {
    return { ok: false, reason: "marker-missing" };
  }
  if (session.pid === null || !isProcessAlive(session.pid)) {
    return { ok: false, reason: "process-unavailable" };
  }
  return { ok: true, paneId: pane.paneId };
}
