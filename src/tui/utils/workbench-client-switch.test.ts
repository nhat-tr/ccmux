import { afterEach, describe, expect, it } from "bun:test";
import { setPinnedTmuxClientTty } from "../../lib/tmux-client";

const REAL_CLIENT_SWITCH_SPECIFIER = "./client-switch" + "?workbench-real";
const { switchToWorkbenchPane } = (await import(
  REAL_CLIENT_SWITCH_SPECIFIER
)) as typeof import("./client-switch");

interface SpawnResponse {
  exitCode?: number;
}

function withSpawn(responses: SpawnResponse[]): {
  calls: string[][];
  restore: () => void;
} {
  const original = Bun.spawn;
  const calls: string[][] = [];
  Bun.spawn = ((argv: string[]) => {
    calls.push([...argv]);
    const response = responses.shift() ?? {};
    return { exited: Promise.resolve(response.exitCode ?? 0) };
  }) as unknown as typeof Bun.spawn;
  return { calls, restore: () => (Bun.spawn = original) };
}

afterEach(() => setPinnedTmuxClientTty(undefined));

describe("switchToWorkbenchPane", () => {
  it("selects the verified remote pane and replaces only the invoking client", async () => {
    setPinnedTmuxClientTty("/dev/ttys005");
    const spawn = withSpawn([{}, {}]);
    try {
      const result = await switchToWorkbenchPane(
        {
          kind: "workbench",
          workbenchName: "payments",
          sessionName: "main",
          windowIndex: 2,
          paneId: "%8",
        },
        "/usr/local/bin/workbench",
      );
      expect(result).toBe(true);
      expect(spawn.calls).toEqual([
        [
          "/usr/local/bin/workbench",
          "exec",
          "payments",
          "--",
          "tmux",
          "new-session",
          "-d",
          "-s",
          expect.stringMatching(/^ccmux-[0-9]+-devttys005$/u),
          "-t",
          "main",
          ";",
          "select-window",
          "-t",
          expect.stringMatching(/^ccmux-[0-9]+-devttys005:2$/u),
          ";",
          "select-pane",
          "-t",
          "%8",
        ],
        [
          "tmux",
          "detach-client",
          "-t",
          "/dev/ttys005",
          "-E",
          expect.stringMatching(
            /^exec '\/usr\/local\/bin\/workbench' exec 'payments' -- tmux attach-session -t 'ccmux-[0-9]+-devttys005' \\; set-option -t 'ccmux-[0-9]+-devttys005' destroy-unattached on$/u,
          ),
        ],
      ]);
    } finally {
      spawn.restore();
    }
  });

  it("does not detach when the verified remote pane has disappeared", async () => {
    setPinnedTmuxClientTty("/dev/ttys005");
    const spawn = withSpawn([{ exitCode: 1 }, {}]);
    try {
      const result = await switchToWorkbenchPane(
        {
          kind: "workbench",
          workbenchName: "payments",
          sessionName: "main",
          windowIndex: 2,
          paneId: "%8",
        },
        "/usr/local/bin/workbench",
      );
      expect(result).toBe("workbench-select-failed");
      expect(spawn.calls).toHaveLength(2);
      expect(spawn.calls[1]).toEqual([
        "/usr/local/bin/workbench",
        "exec",
        "payments",
        "--",
        "tmux",
        "kill-session",
        "-t",
        expect.stringMatching(/^ccmux-[0-9]+-devttys005$/u),
      ]);
    } finally {
      spawn.restore();
    }
  });

  it("removes the temporary viewer when the invoking client cannot detach", async () => {
    setPinnedTmuxClientTty("/dev/ttys005");
    const spawn = withSpawn([{}, { exitCode: 1 }, {}]);
    try {
      const result = await switchToWorkbenchPane(
        {
          kind: "workbench",
          workbenchName: "payments",
          sessionName: "main",
          windowIndex: 2,
          paneId: "%8",
        },
        "/usr/local/bin/workbench",
      );
      expect(result).toBe("switch-failed");
      expect(spawn.calls[2]).toEqual([
        "/usr/local/bin/workbench",
        "exec",
        "payments",
        "--",
        "tmux",
        "kill-session",
        "-t",
        expect.stringMatching(/^ccmux-[0-9]+-devttys005$/u),
      ]);
    } finally {
      spawn.restore();
    }
  });
});
