import type { Settings } from "./settings";

export type PlainTextOptions = Pick<
  Settings,
  "collapseNewlines" | "collapseSpaces" | "trimResult"
>;

/**
 * Turn a selection (or clipboard payload) into plain text.
 *
 * Rich editors litter text with non-breaking and zero-width spaces; those are
 * normalised unconditionally because they are invisible artefacts of styling,
 * not content the user chose.
 */
export function toPlainText(input: string, options: PlainTextOptions): string {
  let out = input
    .replace(/\r\n?/g, "\n")
    // NBSP and friends -> ordinary space
    .replace(/[\u00a0\u2007\u202f]/g, " ")
    // zero-width space / joiners / word-joiner / BOM -> gone
    .replace(/[\u200b-\u200d\u2060\ufeff]/g, "");

  if (options.collapseNewlines) {
    out = out.replace(/\n+/g, " ");
  } else {
    // Keep paragraph breaks, drop the runs of blank lines editors add.
    out = out.replace(/\n{3,}/g, "\n\n");
  }

  if (options.collapseSpaces) {
    // `[^\S\n]` is "whitespace except newline", so line structure survives when
    // collapseNewlines is off.
    out = out.replace(/[^\S\n]+/g, " ");
  }

  if (!options.collapseNewlines) {
    out = out
      .split("\n")
      .map((line) => line.replace(/[^\S\n]+$/, ""))
      .join("\n");
  }

  return options.trimResult ? out.trim() : out;
}
