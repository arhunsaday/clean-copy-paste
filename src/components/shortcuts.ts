import Browser from "webextension-polyfill";
import type { ActionId } from "@src/lib/messages";

/** Renders a manifest shortcut string the way the platform writes it. */
function prettify(shortcut: string): string {
  const isMac = navigator.userAgent.includes("Mac OS X");
  if (!isMac) return shortcut.replace(/\+/g, " + ");
  return shortcut
    .replace("Command", "⌘")
    .replace("MacCtrl", "⌃")
    .replace("Ctrl", "⌘")
    .replace("Alt", "⌥")
    .replace("Shift", "⇧")
    .replace(/\+/g, "");
}

export async function currentShortcuts(): Promise<Partial<Record<ActionId, string>>> {
  const commands = await Browser.commands.getAll();
  const map: Partial<Record<ActionId, string>> = {};
  for (const command of commands) {
    if (command.name && command.shortcut) {
      map[command.name as ActionId] = prettify(command.shortcut);
    }
  }
  return map;
}

const isFirefox = Browser.runtime.getURL("").startsWith("moz-extension://");

/** Chrome and Firefox each keep the shortcut editor behind their own internal page. */
export async function openShortcutSettings(): Promise<void> {
  const url = isFirefox ? "about:addons" : "chrome://extensions/shortcuts";
  await Browser.tabs.create({ url });
}
