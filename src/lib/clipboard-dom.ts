import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import type { DomRequest, DomResponse, MarkdownOptions } from "./messages";

/**
 * Clipboard and HTML primitives that need a real `document`.
 *
 * Imported by the offscreen document (Chrome) and, via dynamic import, by the
 * background page (Firefox). Never imported into a service worker.
 */

function withHiddenTextarea<T>(use: (element: HTMLTextAreaElement) => T): T {
  const element = document.createElement("textarea");
  element.style.cssText =
    "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;";
  element.setAttribute("aria-hidden", "true");
  document.body.appendChild(element);
  try {
    return use(element);
  } finally {
    element.remove();
  }
}

/**
 * `navigator.clipboard.readText()` requires a focused document, which an
 * offscreen document never is. `execCommand("paste")` into a focused textarea
 * is the supported path for extensions holding the `clipboardRead` permission.
 */
export async function readClipboardText(): Promise<string> {
  const viaCommand = withHiddenTextarea((element) => {
    element.focus();
    return document.execCommand("paste") ? element.value : null;
  });
  if (viaCommand !== null) return viaCommand;

  return await navigator.clipboard.readText();
}

/**
 * Writes plain text and, optionally, an HTML flavour in one clipboard entry, so
 * pasting into a rich editor keeps structure while a plain field gets text.
 */
export function writeClipboard(payload: { text: string; html?: string }): boolean {
  return withHiddenTextarea((element) => {
    // execCommand("copy") only fires when something is selected; the listener
    // below replaces whatever this placeholder would have contributed.
    element.value = payload.text || " ";
    element.select();

    const onCopy = (event: ClipboardEvent) => {
      if (!event.clipboardData) return;
      event.clipboardData.setData("text/plain", payload.text);
      if (payload.html) event.clipboardData.setData("text/html", payload.html);
      event.preventDefault();
    };

    document.addEventListener("copy", onCopy, true);
    try {
      return document.execCommand("copy");
    } finally {
      document.removeEventListener("copy", onCopy, true);
    }
  });
}

export function htmlToMarkdown(html: string, options: MarkdownOptions): string {
  const service = new TurndownService({
    headingStyle: options.headingStyle,
    bulletListMarker: options.bulletListMarker,
    codeBlockStyle: options.codeBlockStyle,
    emDelimiter: options.emDelimiter,
    hr: "---",
    linkStyle: "inlined",
  });
  service.use(gfm);
  return service.turndown(html).replace(/\n{3,}/g, "\n\n").trim();
}

export async function handleDomRequest(request: DomRequest): Promise<DomResponse> {
  try {
    switch (request.kind) {
      case "clipboard-read":
        return { ok: true, value: await readClipboardText() };
      case "clipboard-write":
        return writeClipboard({ text: request.text, html: request.html })
          ? { ok: true, value: "" }
          : { ok: false, error: "The browser refused the clipboard write." };
      case "html-to-markdown":
        return { ok: true, value: htmlToMarkdown(request.html, request.options) };
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
