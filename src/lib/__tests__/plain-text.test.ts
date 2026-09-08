import { describe, expect, it } from "vitest";
import { toPlainText } from "../plain-text";
import { DEFAULT_SETTINGS } from "../settings";

const base = {
  collapseNewlines: DEFAULT_SETTINGS.collapseNewlines,
  collapseSpaces: DEFAULT_SETTINGS.collapseSpaces,
  trimResult: DEFAULT_SETTINGS.trimResult,
};

describe("toPlainText", () => {
  it("flattens a multi-line selection by default", () => {
    expect(toPlainText("Dear Alice,\n\nFirst point.\nSecond point.", base)).toBe(
      "Dear Alice, First point. Second point.",
    );
  });

  it("keeps paragraph structure when collapsing is off", () => {
    expect(
      toPlainText("Dear Alice,\n\nFirst point.\nSecond point.", {
        ...base,
        collapseNewlines: false,
      }),
    ).toBe("Dear Alice,\n\nFirst point.\nSecond point.");
  });

  it("normalises CRLF so Windows sources do not gain blank lines", () => {
    expect(toPlainText("a\r\nb", { ...base, collapseNewlines: false })).toBe("a\nb");
  });

  it("reduces runs of blank lines rather than preserving editor padding", () => {
    expect(toPlainText("a\n\n\n\n\nb", { ...base, collapseNewlines: false })).toBe("a\n\nb");
  });

  it("replaces non-breaking spaces, which otherwise survive as invisible junk", () => {
    expect(toPlainText("a\u00a0b", base)).toBe("a b");
    expect(toPlainText("a\u202fb", base)).toBe("a b");
  });

  it("strips zero-width characters injected by rich editors", () => {
    expect(toPlainText("in\u200bvisible\ufeff", base)).toBe("invisible");
    expect(toPlainText("a\u2060b", base)).toBe("ab");
  });

  it("leaves trailing whitespace alone when trimming is off", () => {
    expect(toPlainText("  x  ", { ...base, trimResult: false })).toBe(" x ");
  });

  it("strips per-line trailing whitespace while keeping line breaks", () => {
    expect(
      toPlainText("a   \nb\t\n", {
        collapseNewlines: false,
        collapseSpaces: false,
        trimResult: true,
      }),
    ).toBe("a\nb");
  });

  it("returns an empty string for whitespace-only input", () => {
    expect(toPlainText("  \n\t \n ", base)).toBe("");
  });
});
