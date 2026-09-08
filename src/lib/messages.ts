export type ActionId = "copy_plain" | "copy_clean" | "copy_markdown" | "paste_plain";

export const ACTION_LABELS: Record<ActionId, string> = {
  copy_plain: "Copy without formatting",
  copy_clean: "Copy with clean formatting",
  copy_markdown: "Copy as Markdown",
  paste_plain: "Paste without formatting",
};

export type MarkdownOptions = {
  bulletListMarker: "-" | "*" | "+";
  headingStyle: "atx" | "setext";
  codeBlockStyle: "fenced" | "indented";
  emDelimiter: "_" | "*";
};

/** Popup -> background */
export type ActionRequest = { kind: "run-action"; action: ActionId };

export type ActionOutcome = { ok: boolean; message: string };

/**
 * background -> DOM context. The service worker has no DOM, so clipboard access
 * and Markdown conversion are delegated to an offscreen document (Chrome) or
 * run directly in the background page (Firefox).
 */
export type DomRequest =
  | { kind: "clipboard-read" }
  | { kind: "clipboard-write"; text: string; html?: string }
  | { kind: "html-to-markdown"; html: string; options: MarkdownOptions };

export type DomResponse = { ok: true; value: string } | { ok: false; error: string };

/** Tag that routes a message to the offscreen document instead of the background. */
export const OFFSCREEN_TARGET = "bcp-offscreen";

export function isActionRequest(value: unknown): value is ActionRequest {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as ActionRequest).kind === "run-action"
  );
}
