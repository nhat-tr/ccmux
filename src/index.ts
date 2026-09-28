#!/usr/bin/env bun
import { attentionPickerArguments } from "./lib/attention-entry";

const argumentsList = process.argv.slice(2);
const pickerArguments = attentionPickerArguments(argumentsList);

if (pickerArguments) {
  const { createPickerCommand } = await import("./commands/picker");
  await createPickerCommand().parseAsync(pickerArguments, { from: "user" });
} else {
  const { createProgram } = await import("./program");
  await createProgram().parseAsync(argumentsList, { from: "user" });
}
