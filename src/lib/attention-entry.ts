/**
 * Return the arguments for the dedicated attention-picker startup path.
 *
 * The ordinary program imports every command so Commander can build complete
 * help and completion metadata. The popup opens one known surface, so it can
 * load only the picker command and avoid that unrelated startup work.
 */
export function attentionPickerArguments(
  argumentsList: readonly string[],
): string[] | null {
  const firstArgument = argumentsList[0];
  if (
    firstArgument !== undefined &&
    firstArgument !== "picker" &&
    !firstArgument.startsWith("-")
  ) {
    return null;
  }

  const pickerArguments =
    firstArgument === "picker"
      ? argumentsList.slice(1)
      : [...argumentsList];
  return pickerArguments.includes("--attention") ? pickerArguments : null;
}
