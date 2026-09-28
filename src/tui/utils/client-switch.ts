import {
  resolvePinnedTmuxClientTty,
  type ClientTtyRefusal,
} from "../../lib/tmux-client";
import { tmuxArgv } from "../../lib/tmux-exec";

/**
 * True, or why nobody moved. The refusals come straight from the resolver so
 * the toast can name the actual problem: a broken `--client-tty` capture, a
 * popup on a session two terminals share, a popup whose client could not be
 * worked out, and a plain "no client here" are four different things to tell a
 * user.
 */
export type SwitchToPaneResult = true | "switch-failed" | ClientTtyRefusal;

export type SwitchToWorkbenchPaneResult =
  | true
  | "switch-failed"
  | "workbench-not-installed"
  | "workbench-select-failed"
  | ClientTtyRefusal;

export interface WorkbenchPaneTarget {
  kind: "workbench";
  workbenchName: string;
  sessionName: "main" | "editor";
  windowIndex: number;
  paneId: string;
}

const WORKBENCH_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,47}$/u;
const TMUX_PANE_PATTERN = /^%[0-9]+$/u;

function shellQuote(value: string): string {
  return `'${value.replace(/'/gu, `'\\''`)}'`;
}

async function removeWorkbenchViewer(
  workbenchExecutable: string,
  workbenchName: string,
  viewerSession: string,
): Promise<void> {
  try {
    const cleanup = Bun.spawn(
      [
        workbenchExecutable,
        "exec",
        workbenchName,
        "--",
        "tmux",
        "kill-session",
        "-t",
        viewerSession,
      ],
      { stdout: "ignore", stderr: "ignore" },
    );
    await cleanup.exited;
  } catch {
    // The viewer is temporary; a failed best-effort cleanup must retain the
    // original switch refusal.
  }
}

export async function switchToPane(
  target: string,
): Promise<SwitchToPaneResult> {
  const resolved = await resolvePinnedTmuxClientTty();
  if (resolved.tty === null) return resolved.refusal;

  try {
    const proc = Bun.spawn(
      tmuxArgv("switch-client", "-c", resolved.tty, "-t", target),
      {
        stdout: "pipe",
        stderr: "pipe",
      },
    );

    const exitCode = await proc.exited;
    return exitCode === 0 ? true : "switch-failed";
  } catch {
    return "switch-failed";
  }
}

/**
 * Select an exact verified Workbench pane, then replace only the invoking
 * host tmux client with the matching Workbench attachment.
 */
export async function switchToWorkbenchPane(
  target: Readonly<WorkbenchPaneTarget>,
  workbenchExecutable: string | null = Bun.which("workbench"),
): Promise<SwitchToWorkbenchPaneResult> {
  if (
    !WORKBENCH_NAME_PATTERN.test(target.workbenchName) ||
    !TMUX_PANE_PATTERN.test(target.paneId) ||
    !Number.isSafeInteger(target.windowIndex) ||
    target.windowIndex < 0 ||
    (target.sessionName !== "main" && target.sessionName !== "editor")
  ) {
    return "workbench-select-failed";
  }
  if (!workbenchExecutable) return "workbench-not-installed";

  const resolved = await resolvePinnedTmuxClientTty();
  if (resolved.tty === null) return resolved.refusal;

  const viewerSession = `ccmux-${process.pid}-${resolved.tty.replace(/[^a-zA-Z0-9]/gu, "")}`;
  try {
    const prepareViewer = Bun.spawn(
      [
        workbenchExecutable,
        "exec",
        target.workbenchName,
        "--",
        "tmux",
        "new-session",
        "-d",
        "-s",
        viewerSession,
        "-t",
        target.sessionName,
        ";",
        "select-window",
        "-t",
        `${viewerSession}:${target.windowIndex}`,
        ";",
        "select-pane",
        "-t",
        target.paneId,
      ],
      { stdout: "ignore", stderr: "ignore" },
    );
    if ((await prepareViewer.exited) !== 0) {
      await removeWorkbenchViewer(
        workbenchExecutable,
        target.workbenchName,
        viewerSession,
      );
      return "workbench-select-failed";
    }

    const command = [
      "exec",
      shellQuote(workbenchExecutable),
      "exec",
      shellQuote(target.workbenchName),
      "--",
      "tmux",
      "attach-session",
      "-t",
      shellQuote(viewerSession),
      "\\;",
      "set-option",
      "-t",
      shellQuote(viewerSession),
      "destroy-unattached",
      "on",
    ].join(" ");
    const detach = Bun.spawn(
      tmuxArgv("detach-client", "-t", resolved.tty, "-E", command),
      { stdout: "ignore", stderr: "ignore" },
    );
    if ((await detach.exited) === 0) return true;
    await removeWorkbenchViewer(
      workbenchExecutable,
      target.workbenchName,
      viewerSession,
    );
    return "switch-failed";
  } catch {
    await removeWorkbenchViewer(
      workbenchExecutable,
      target.workbenchName,
      viewerSession,
    );
    return "switch-failed";
  }
}
