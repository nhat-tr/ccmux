import { afterEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeAttentionCache } from "./attention-cache";
import { renderCachedAttentionPrepaint } from "./attention-prepaint";

const originalCcmuxHome = process.env.CCMUX_HOME;
const temporaryDirectories: string[] = [];

afterEach(() => {
  if (originalCcmuxHome === undefined) delete process.env.CCMUX_HOME;
  else process.env.CCMUX_HOME = originalCcmuxHome;
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("renderCachedAttentionPrepaint", () => {
  it("writes populated cache rows without querying a source", () => {
    const directory = mkdtempSync(join(tmpdir(), "ccmux-prepaint-"));
    temporaryDirectories.push(directory);
    process.env.CCMUX_HOME = directory;
    writeAttentionCache({
      schemaVersion: 1,
      recordCount: 1,
      runtimeSessions: [
        {
          sourceId: "workbench:payments",
          sourceKind: "workbench",
          sourceLabel: "Workbench payments",
          workbenchName: "payments",
          project: { name: "api", directory: "/workspace/api" },
          runtimeDirectory: "/workspace/api",
          runtimeSessionId: "native-1",
          workState: "waiting",
        },
      ],
      sourceReports: [
        {
          sourceId: "workbench:payments",
          sourceKind: "workbench",
          coverage: "unavailable",
          observedAt: "2026-09-28T00:00:00Z",
        },
      ],
      pendingItems: [
        {
          eventId: "event-1",
          sourceId: "workbench:payments",
          sourceKind: "workbench",
          sourceLabel: "Workbench payments",
          workbenchName: "payments",
          project: { name: "api", directory: "/workspace/api" },
          runtimeDirectory: "/workspace/api",
          runtimeSessionId: "native-1",
          reason: "input-required",
          priority: "required",
          inputKind: "user-input",
          waitingMilliseconds: 1_000,
          recoveryInstructions: [],
        },
      ],
    });
    let output = "";

    const rendered = renderCachedAttentionPrepaint({
      isTTY: true,
      write: (chunk) => {
        output += String(chunk);
        return true;
      },
    } as Pick<NodeJS.WriteStream, "isTTY" | "write">);

    expect(rendered).toBe(true);
    expect(output).toContain("Agent attention    1 pending item");
    expect(output).toContain("api  Workbench payments  waiting");
    expect(output).toContain("0 available / 1 unavailable");
  });
});
