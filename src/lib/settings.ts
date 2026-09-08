/**
 * Every user-facing preference. Kept flat so the options UI can render it
 * generically and so `storage.get(DEFAULT_SETTINGS)` fills in missing keys.
 */
export type Settings = {
  /** Plain-text normalisation */
  collapseNewlines: boolean;
  collapseSpaces: boolean;
  trimResult: boolean;

  /** What survives "clean formatting" and Markdown conversion */
  keepEmphasis: boolean;
  keepHeadings: boolean;
  keepLists: boolean;
  keepLinks: boolean;
  keepTables: boolean;
  keepCode: boolean;
  keepImages: boolean;

  /** Markdown flavour */
  markdownBullet: "-" | "*" | "+";
  markdownHeadingStyle: "atx" | "setext";
  markdownCodeBlockStyle: "fenced" | "indented";
  markdownEmphasis: "_" | "*";

  /** Which context-menu entries to show */
  menuCopyPlain: boolean;
  menuCopyClean: boolean;
  menuCopyMarkdown: boolean;
  menuPastePlain: boolean;

  /** Feedback */
  showBadge: boolean;
  toastMode: "errors" | "always" | "never";
};

export const DEFAULT_SETTINGS: Settings = {
  collapseNewlines: true,
  collapseSpaces: true,
  trimResult: true,

  keepEmphasis: true,
  keepHeadings: true,
  keepLists: true,
  keepLinks: true,
  keepTables: true,
  keepCode: true,
  keepImages: false,

  markdownBullet: "-",
  markdownHeadingStyle: "atx",
  markdownCodeBlockStyle: "fenced",
  markdownEmphasis: "_",

  menuCopyPlain: true,
  menuCopyClean: true,
  menuCopyMarkdown: true,
  menuPastePlain: true,

  showBadge: true,
  toastMode: "errors",
};
