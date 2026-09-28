import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Session } from "../types";
import { PANE_FIELD_SEP } from "../lib/tmux-format";
import { normalizeTty } from "./pane-discovery";
import { ProcessTree } from "./process-tree";
import {
  parseMarkerFile,
  type SessionPidMarker,
} from "./session-markers";

const WORKBENCH_LABEL = "dev.agentic.workbench";
const WORKBENCH_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,47}$/u;
const WORKBENCH_SESSION_NAMES = new Set(["main", "editor"]);
const REMOTE_PROBE_TIMEOUT_MS = 2_000;

interface WorkbenchState {
  name: string;
  id: string;
  ownerId: string;
  ready: true;
}

interface WorkbenchPane {
  sessionName: string;
  windowIndex: number;
  paneId: string;
  panePid: number;
  tty: string;
}

export interface WorkbenchAttentionEvidence {
  state: unknown;
  isContainerRunning: boolean;
  labels: unknown;
  markers: SessionPidMarker[];
  panes: WorkbenchPane[];
  processTree: ProcessTree;
}

export interface WorkbenchAttentionTarget {
  kind: "workbench";
  workbenchName: string;
  containerName: string;
  sessionName: "main" | "editor";
  windowIndex: number;
  paneId: string;
}

export type WorkbenchAttentionRefusal =
  | "source-not-remote"
  | "source-unavailable"
  | "workbench-state-missing"
  | "workbench-ownership-mismatch"
  | "workbench-unavailable"
  | "remote-marker-missing"
  | "remote-marker-identity-mismatch"
  | "remote-pane-missing"
  | "remote-pane-identity-mismatch"
  | "remote-process-unavailable"
  | "remote-session-unsupported";

export type WorkbenchAttentionNavigationResult =
  | { ok: true; target: WorkbenchAttentionTarget }
  | { ok: false; reason: WorkbenchAttentionRefusal };

interface CommandResult {
  exitCode: number;
  stdout: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseWorkbenchState(value: unknown): WorkbenchState | null {
  if (
    !isRecord(value) ||
    typeof value.name !== "string" ||
    typeof value.id !== "string" ||
    typeof value.ownerId !== "string" ||
    value.ready !== true
  ) {
    return null;
  }
  return {
    name: value.name,
    id: value.id,
    ownerId: value.ownerId,
    ready: true,
  };
}

function parseWorkbenchLabels(value: unknown): Record<string, string> | null {
  if (!isRecord(value)) return null;
  const labels: Record<string, string> = {};
  for (const [key, labelValue] of Object.entries(value)) {
    if (typeof labelValue !== "string") return null;
    labels[key] = labelValue;
  }
  return labels;
}

function ownsWorkbenchContainer(
  state: WorkbenchState,
  labels: Record<string, string>,
): boolean {
  return (
    labels[WORKBENCH_LABEL] === state.name &&
    labels[`${WORKBENCH_LABEL}.id`] === state.id &&
    labels[`${WORKBENCH_LABEL}.owner`] === state.ownerId &&
    labels[`${WORKBENCH_LABEL}.role`] === "agent"
  );
}

export function verifyWorkbenchAttentionNavigation(
  session: Readonly<Session>,
  evidence: Readonly<WorkbenchAttentionEvidence>,
): WorkbenchAttentionNavigationResult {
  const attention = session.codexAttention;
  const source = attention?.source;
  const workbenchName = source?.workbenchName;
  if (
    !attention ||
    !source ||
    source.sourceKind !== "workbench" ||
    attention.localActionEligibility !== "ineligible" ||
    typeof workbenchName !== "string" ||
    !WORKBENCH_NAME_PATTERN.test(workbenchName) ||
    source.sourceId !== `workbench:${workbenchName}`
  ) {
    return { ok: false, reason: "source-not-remote" };
  }
  if (attention.coverage?.coverage === "unavailable") {
    return { ok: false, reason: "source-unavailable" };
  }

  const state = parseWorkbenchState(evidence.state);
  if (!state || state.name !== workbenchName) {
    return { ok: false, reason: "workbench-state-missing" };
  }
  const labels = parseWorkbenchLabels(evidence.labels);
  if (!labels || !ownsWorkbenchContainer(state, labels)) {
    return { ok: false, reason: "workbench-ownership-mismatch" };
  }
  if (!evidence.isContainerRunning) {
    return { ok: false, reason: "workbench-unavailable" };
  }

  const matchingMarkers = evidence.markers.filter(
    (marker) =>
      marker.agent_type === "codex" &&
      marker.session_id === attention.identity.runtimeSessionId,
  );
  if (matchingMarkers.length === 0) {
    return { ok: false, reason: "remote-marker-missing" };
  }
  if (matchingMarkers.length !== 1) {
    return { ok: false, reason: "remote-marker-identity-mismatch" };
  }
  const marker = matchingMarkers[0]!;
  if (!Number.isSafeInteger(marker.pid) || marker.pid <= 0) {
    return { ok: false, reason: "remote-marker-identity-mismatch" };
  }
  const markerTty = normalizeTty(marker.tty ?? null);
  if (!markerTty) {
    return { ok: false, reason: "remote-pane-identity-mismatch" };
  }

  const matchingPanes = evidence.panes.filter(
    (pane) => normalizeTty(pane.tty) === markerTty,
  );
  if (matchingPanes.length === 0) {
    return { ok: false, reason: "remote-pane-missing" };
  }
  const matchingPaneIds = new Set(matchingPanes.map((pane) => pane.paneId));
  if (matchingPaneIds.size !== 1) {
    return { ok: false, reason: "remote-pane-identity-mismatch" };
  }
  const pane =
    matchingPanes.find((candidate) =>
      WORKBENCH_SESSION_NAMES.has(candidate.sessionName),
    ) ?? matchingPanes[0]!;
  if (
    evidence.processTree.findAgentDescendant(
      pane.panePid,
      new Set([marker.pid]),
    ) !== marker.pid
  ) {
    return { ok: false, reason: "remote-process-unavailable" };
  }
  if (!WORKBENCH_SESSION_NAMES.has(pane.sessionName)) {
    return { ok: false, reason: "remote-session-unsupported" };
  }

  return {
    ok: true,
    target: {
      kind: "workbench",
      workbenchName,
      containerName: `workbench-${workbenchName}`,
      sessionName: pane.sessionName as "main" | "editor",
      windowIndex: pane.windowIndex,
      paneId: pane.paneId,
    },
  };
}

async function runCommand(argv: string[]): Promise<CommandResult> {
  const child = Bun.spawn(argv, { stdout: "pipe", stderr: "pipe" });
  const timer = setTimeout(() => child.kill(), REMOTE_PROBE_TIMEOUT_MS);
  try {
    const [stdout, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      child.exited,
    ]);
    return { stdout, exitCode };
  } finally {
    clearTimeout(timer);
  }
}

function workbenchStatePath(workbenchName: string): string {
  const stateRoot =
    process.env.XDG_STATE_HOME ?? join(homedir(), ".local", "state");
  return join(stateRoot, "workbench", `${workbenchName}.json`);
}

function parseMarkers(output: string): SessionPidMarker[] {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseMarkerFile)
    .filter((marker): marker is SessionPidMarker => marker !== null);
}

function parsePanes(output: string): WorkbenchPane[] {
  const panes: WorkbenchPane[] = [];
  for (const line of output.split("\n")) {
    if (!line) continue;
    const [sessionName, windowIndexText, paneId, panePidText, tty] =
      line.split(PANE_FIELD_SEP);
    const windowIndex = Number.parseInt(windowIndexText ?? "", 10);
    const panePid = Number.parseInt(panePidText ?? "", 10);
    if (
      !sessionName ||
      !Number.isSafeInteger(windowIndex) ||
      windowIndex < 0 ||
      !paneId ||
      !Number.isSafeInteger(panePid) ||
      panePid <= 0 ||
      !tty
    ) {
      continue;
    }
    panes.push({ sessionName, windowIndex, paneId, panePid, tty });
  }
  return panes;
}

async function collectWorkbenchAttentionEvidence(
  workbenchName: string,
): Promise<WorkbenchAttentionEvidence | null> {
  let state: unknown;
  try {
    state = JSON.parse(await readFile(workbenchStatePath(workbenchName), "utf8"));
  } catch {
    return null;
  }
  const containerName = `workbench-${workbenchName}`;
  const [running, labels] = await Promise.all([
    runCommand([
      "podman",
      "inspect",
      "--format",
      "{{.State.Running}}",
      containerName,
    ]),
    runCommand([
      "podman",
      "inspect",
      "--format",
      "{{json .Config.Labels}}",
      containerName,
    ]),
  ]);
  if (running.exitCode !== 0 || labels.exitCode !== 0) return null;

  let parsedLabels: unknown;
  try {
    parsedLabels = JSON.parse(labels.stdout.trim());
  } catch {
    return null;
  }
  const isContainerRunning = running.stdout.trim() === "true";
  if (!isContainerRunning) {
    return {
      state,
      isContainerRunning,
      labels: parsedLabels,
      markers: [],
      panes: [],
      processTree: ProcessTree.fromPsOutput("PID PPID COMM\n"),
    };
  }

  const [markers, panes, processes] = await Promise.all([
    runCommand([
      "podman",
      "exec",
      containerName,
      "sh",
      "-lc",
      'for file in "${CCMUX_HOME:-$HOME/.config/ccmux}"/session-pids/codex-*.json; do [ -f "$file" ] && cat "$file" && printf "\\n"; done',
    ]),
    runCommand([
      "podman",
      "exec",
      containerName,
      "tmux",
      "list-panes",
      "-a",
      "-F",
      [
        "#{session_name}",
        "#{window_index}",
        "#{pane_id}",
        "#{pane_pid}",
        "#{pane_tty}",
      ].join(PANE_FIELD_SEP),
    ]),
    runCommand([
      "podman",
      "exec",
      containerName,
      "ps",
      "-axo",
      "pid,ppid,comm",
    ]),
  ]);
  if (
    markers.exitCode !== 0 ||
    panes.exitCode !== 0 ||
    processes.exitCode !== 0
  ) {
    return null;
  }
  return {
    state,
    isContainerRunning,
    labels: parsedLabels,
    markers: parseMarkers(markers.stdout),
    panes: parsePanes(panes.stdout),
    processTree: ProcessTree.fromPsOutput(processes.stdout),
  };
}

export async function resolveWorkbenchAttentionNavigationTarget(
  session: Readonly<Session>,
): Promise<WorkbenchAttentionNavigationResult> {
  const workbenchName = session.codexAttention?.source.workbenchName;
  if (
    session.codexAttention?.source.sourceKind !== "workbench" ||
    typeof workbenchName !== "string" ||
    !WORKBENCH_NAME_PATTERN.test(workbenchName)
  ) {
    return { ok: false, reason: "source-not-remote" };
  }
  const evidence = await collectWorkbenchAttentionEvidence(workbenchName);
  if (!evidence) return { ok: false, reason: "workbench-unavailable" };
  return verifyWorkbenchAttentionNavigation(session, evidence);
}
