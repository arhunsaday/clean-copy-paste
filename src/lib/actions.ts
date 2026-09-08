import Browser from "webextension-polyfill";
import { runInDomContext } from "./dom-context";
import { report } from "./feedback";
import { insertText } from "./inject/insert-text";
import { probeTarget } from "./inject/probe-target";
import { readSelection, type SelectionOptions, type SelectionPayload } from "./inject/read-selection";
import { runInAllFrames, runInFrame, type FrameResult } from "./inject-runner";
import { ACTION_LABELS, type ActionId, type ActionOutcome, type MarkdownOptions } from "./messages";
import { toPlainText } from "./plain-text";
import { restrictionFor } from "./restricted";
import { getSettings } from "./settings-store";
import type { Settings } from "./settings";

const TOP_FRAME = 0;

function selectionOptions(settings: Settings): SelectionOptions {
  return {
    keepEmphasis: settings.keepEmphasis,
    keepHeadings: settings.keepHeadings,
    keepLists: settings.keepLists,
    keepLinks: settings.keepLinks,
    keepTables: settings.keepTables,
    keepCode: settings.keepCode,
    keepImages: settings.keepImages,
  };
}

function markdownOptions(settings: Settings): MarkdownOptions {
  return {
    bulletListMarker: settings.markdownBullet,
    headingStyle: settings.markdownHeadingStyle,
    codeBlockStyle: settings.markdownCodeBlockStyle,
    emDelimiter: settings.markdownEmphasis,
  };
}

async function activeTab(): Promise<Browser.Tabs.Tab | undefined> {
  const [tab] = await Browser.tabs.query({ active: true, currentWindow: true });
  if (tab) return tab;
  // A focused popup or devtools window can make `currentWindow` miss the page.
  const [fallback] = await Browser.tabs.query({ active: true, lastFocusedWindow: true });
  return fallback;
}

/** Prefer the frame the user is actually looking at, then anything that answered. */
function pickFocused<T extends { focused: boolean }>(
  results: FrameResult<T>[],
): FrameResult<T> | undefined {
  return results.find((entry) => entry.result.focused) ?? results[0];
}

type Context = { tabId: number; frameId: number | undefined };

async function readSelectionIn(
  context: Context,
  settings: Settings,
): Promise<FrameResult<SelectionPayload> | undefined> {
  const options = selectionOptions(settings);

  // A context-menu click tells us the exact frame; a keyboard shortcut does not,
  // so every reachable frame is asked and the focused one wins.
  if (context.frameId !== undefined) {
    const [only] = await runInFrame(context.tabId, context.frameId, readSelection, [options]);
    return only;
  }
  return pickFocused(await runInAllFrames(context.tabId, readSelection, [options]));
}

async function copyAction(
  action: Exclude<ActionId, "paste_plain">,
  context: Context,
  settings: Settings,
): Promise<ActionOutcome> {
  const found = await readSelectionIn(context, settings);
  if (!found) return { ok: false, message: "Select some text first." };

  const { text, html } = found.result;

  if (action === "copy_plain") {
    const plain = toPlainText(text, settings);
    if (!plain) return { ok: false, message: "That selection is only whitespace." };
    const written = await runInDomContext({ kind: "clipboard-write", text: plain });
    return written.ok
      ? { ok: true, message: "Copied as plain text." }
      : { ok: false, message: written.error };
  }

  if (action === "copy_clean") {
    // The plain flavour keeps its line structure here: the point of this action
    // is to preserve readable structure, not to flatten it.
    const written = await runInDomContext({
      kind: "clipboard-write",
      text: toPlainText(text, { ...settings, collapseNewlines: false, collapseSpaces: false }),
      html,
    });
    return written.ok
      ? { ok: true, message: "Copied with clean formatting." }
      : { ok: false, message: written.error };
  }

  const converted = await runInDomContext({
    kind: "html-to-markdown",
    html,
    options: markdownOptions(settings),
  });
  if (!converted.ok) return { ok: false, message: converted.error };
  if (!converted.value) return { ok: false, message: "That selection produced no Markdown." };

  const written = await runInDomContext({ kind: "clipboard-write", text: converted.value });
  return written.ok
    ? { ok: true, message: "Copied as Markdown." }
    : { ok: false, message: written.error };
}

async function pasteAction(context: Context, settings: Settings): Promise<ActionOutcome> {
  const read = await runInDomContext({ kind: "clipboard-read" });
  if (!read.ok) return { ok: false, message: read.error };

  const plain = toPlainText(read.value, settings);
  if (!plain) return { ok: false, message: "The clipboard is empty." };

  let frameId = context.frameId;
  if (frameId === undefined) {
    const probes = await runInAllFrames(context.tabId, probeTarget, []);
    const usable = probes.filter((entry) => entry.result.hasTarget);
    frameId = pickFocused(usable)?.frameId ?? TOP_FRAME;
  }

  const [inserted] = await runInFrame(context.tabId, frameId, insertText, [plain]);
  if (!inserted?.result.ok) {
    return { ok: false, message: "Click into a text field first." };
  }
  return { ok: true, message: "Pasted as plain text." };
}

/** Turns the browser's internal injection errors into something actionable. */
function explain(action: ActionId, error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error);

  if (/cannot access|missing host permission|cannot be scripted/i.test(detail)) {
    return "The browser blocked access to this page. For local files, enable “Allow access to file URLs” in the extension's details.";
  }
  if (/no tab with id|no frame with id/i.test(detail)) {
    return "That tab closed before the action finished.";
  }
  return `${ACTION_LABELS[action]} failed: ${detail}`;
}

export async function runAction(
  action: ActionId,
  origin: { frameId?: number } = {},
): Promise<ActionOutcome> {
  const settings = await getSettings();

  async function refuse(message: string): Promise<ActionOutcome> {
    const outcome: ActionOutcome = { ok: false, message };
    await report(outcome, settings);
    return outcome;
  }

  const tab = await activeTab();
  if (tab?.id === undefined) return refuse("No page is open to work on.");

  const blocked = restrictionFor(tab.url);
  if (blocked) return refuse(blocked);

  const context: Context = { tabId: tab.id, frameId: origin.frameId };

  let outcome: ActionOutcome;
  try {
    outcome =
      action === "paste_plain"
        ? await pasteAction(context, settings)
        : await copyAction(action, context, settings);
  } catch (error) {
    outcome = { ok: false, message: explain(action, error) };
  }

  await report(outcome, settings, { tabId: context.tabId });
  return outcome;
}
