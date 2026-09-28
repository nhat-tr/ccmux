import {
  chmodSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { CodexAttentionSnapshot } from "../types/session";

const ATTENTION_CACHE_FILE = "attention-cache.json";
const ATTENTION_PREPAINT_FILE = "attention-prepaint.txt";

function getCcmuxDirectory(): string {
  return process.env.CCMUX_HOME ?? join(homedir(), ".config", "ccmux");
}

export function getAttentionCachePath(): string {
  return join(getCcmuxDirectory(), ATTENTION_CACHE_FILE);
}

export function getAttentionPrepaintPath(): string {
  return join(getCcmuxDirectory(), ATTENTION_PREPAINT_FILE);
}

function writePrivateFileAtomically(path: string, contents: string): void {
  const directory = path.slice(0, path.lastIndexOf("/"));
  const temporaryPath = `${path}.${process.pid}.tmp`;
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  try {
    writeFileSync(temporaryPath, contents, { mode: 0o600 });
    chmodSync(temporaryPath, 0o600);
    renameSync(temporaryPath, path);
  } finally {
    rmSync(temporaryPath, { force: true });
  }
}

function attentionPrepaint(snapshot: CodexAttentionSnapshot): string {
  const lines = snapshot.runtimeSessions.slice(0, 8).map((session) => {
    const pendingItems = snapshot.pendingItems.filter(
      (item) => item.runtimeSessionId === session.runtimeSessionId,
    );
    const reasons = new Set(pendingItems.map((item) => item.reason));
    const pending =
      pendingItems.length === 0
        ? "none"
        : `${pendingItems.length} ${[...reasons].join("+")}`;
    return `  ${session.project.name}  ${session.sourceLabel}  ${session.workState}  ${pending}`;
  });
  const unavailable = snapshot.sourceReports.filter(
    (report) => report.coverage === "unavailable",
  ).length;
  return [
    `Agent attention    ${snapshot.pendingItems.length} pending items / ${snapshot.runtimeSessions.length} rows`,
    "Cached partial list. Connecting to ccmux daemon...",
    `Source coverage    ${snapshot.sourceReports.length - unavailable} available / ${unavailable} unavailable`,
    "",
    ...lines,
  ].join("\n");
}

export function writeAttentionCache(snapshot: CodexAttentionSnapshot): void {
  writePrivateFileAtomically(
    getAttentionCachePath(),
    `${JSON.stringify(snapshot)}\n`,
  );
  writePrivateFileAtomically(
    getAttentionPrepaintPath(),
    `${attentionPrepaint(snapshot)}\n`,
  );
}

export function readAttentionCache(): unknown | null {
  try {
    return JSON.parse(readFileSync(getAttentionCachePath(), "utf8"));
  } catch {
    return null;
  }
}

export function readAttentionPrepaint(): string | null {
  try {
    return readFileSync(getAttentionPrepaintPath(), "utf8");
  } catch {
    return null;
  }
}
