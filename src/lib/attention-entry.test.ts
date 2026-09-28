import { describe, expect, it } from "bun:test";
import { attentionPickerArguments } from "./attention-entry";

describe("attentionPickerArguments", () => {
  it("recognizes explicit and default attention picker invocations", () => {
    expect(
      attentionPickerArguments([
        "picker",
        "--attention",
        "--client-tty",
        "/dev/ttys001",
      ]),
    ).toEqual(["--attention", "--client-tty", "/dev/ttys001"]);
    expect(attentionPickerArguments(["--attention"])).toEqual([
      "--attention",
    ]);
  });

  it("leaves every other command on the complete program path", () => {
    expect(attentionPickerArguments(["picker"])).toBeNull();
    expect(attentionPickerArguments(["show", "--attention"])).toBeNull();
    expect(attentionPickerArguments(["--help"])).toBeNull();
  });
});
