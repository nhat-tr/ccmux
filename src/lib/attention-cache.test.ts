import { afterEach, describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  getAttentionCachePath,
  getAttentionPrepaintPath,
  readAttentionCache,
  readAttentionPrepaint,
  writeAttentionCache,
} from "./attention-cache";
import type { CodexAttentionSnapshot } from "../types/session";

const originalCcmuxHome = process.env.CCMUX_HOME;
const temporaryDirectories: string[] = [];

afterEach(() => {
  if (originalCcmuxHome === undefined) delete process.env.CCMUX_HOME;
  else process.env.CCMUX_HOME = originalCcmuxHome;
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("attention cache", () => {
  it("atomically retains the last validated snapshot with private permissions", () => {
    const directory = mkdtempSync(join(tmpdir(), "ccmux-attention-cache-"));
    temporaryDirectories.push(directory);
    process.env.CCMUX_HOME = directory;
    const snapshot: CodexAttentionSnapshot = {
      schemaVersion: 1,
      recordCount: 0,
      runtimeSessions: [],
      sourceReports: [],
      pendingItems: [],
    };

    writeAttentionCache(snapshot);

    expect(readAttentionCache()).toEqual(snapshot);
    expect(JSON.parse(readFileSync(getAttentionCachePath(), "utf8"))).toEqual(
      snapshot,
    );
    expect(statSync(getAttentionCachePath()).mode & 0o777).toBe(0o600);
    expect(readAttentionPrepaint()).toContain("Agent attention");
    expect(statSync(getAttentionPrepaintPath()).mode & 0o777).toBe(0o600);
  });
});
