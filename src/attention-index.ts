#!/usr/bin/env bun
import { renderCachedAttentionPrepaint } from "./lib/attention-prepaint";

renderCachedAttentionPrepaint();

const { createPickerCommand } = await import("./commands/picker");
await createPickerCommand().parseAsync(
  ["--attention", ...process.argv.slice(2)],
  { from: "user" },
);
