import Browser from "webextension-polyfill";
import { runAction } from "@src/lib/actions";
import { clearBadge } from "@src/lib/feedback";
import { ACTION_LABELS, isActionRequest, type ActionId } from "@src/lib/messages";
import { getSettings, onSettingsChanged } from "@src/lib/settings-store";
import type { Settings } from "@src/lib/settings";

type MenuItem = {
  action: ActionId;
  setting: keyof Settings;
  contexts: Browser.Menus.ContextType[];
};

const MENU_ITEMS: MenuItem[] = [
  // Copy entries only make sense with a selection; paste only where text can go.
  { action: "copy_plain", setting: "menuCopyPlain", contexts: ["selection"] },
  { action: "copy_clean", setting: "menuCopyClean", contexts: ["selection"] },
  { action: "copy_markdown", setting: "menuCopyMarkdown", contexts: ["selection"] },
  { action: "paste_plain", setting: "menuPastePlain", contexts: ["editable"] },
];

// Startup and a settings change can both ask for a rebuild at once; interleaving
// removeAll with create throws on duplicate ids, so rebuilds run one at a time.
let rebuilding: Promise<void> = Promise.resolve();

function rebuildMenus(): Promise<void> {
  rebuilding = rebuilding.then(async () => {
    // removeAll first: menus outlive the service worker, so a bare create()
    // would throw on duplicate ids the second time around.
    await Browser.contextMenus.removeAll();
    const settings = await getSettings();

    for (const item of MENU_ITEMS) {
      if (!settings[item.setting]) continue;
      Browser.contextMenus.create({
        id: item.action,
        title: ACTION_LABELS[item.action],
        contexts: item.contexts,
      });
    }
  });
  return rebuilding;
}

function isActionId(value: unknown): value is ActionId {
  return typeof value === "string" && value in ACTION_LABELS;
}

async function initialise(): Promise<void> {
  // The badge is cleared on a timer, which dies with a suspended worker; without
  // this a tick or cross can stay pinned to the toolbar indefinitely.
  await clearBadge();
  await rebuildMenus();
}

Browser.runtime.onInstalled.addListener(() => void initialise());
Browser.runtime.onStartup.addListener(() => void initialise());
onSettingsChanged(() => void rebuildMenus());

Browser.contextMenus.onClicked.addListener((info) => {
  if (!isActionId(info.menuItemId)) return;
  void runAction(info.menuItemId, { frameId: info.frameId });
});

Browser.commands.onCommand.addListener((command) => {
  if (!isActionId(command)) return;
  void runAction(command);
});

Browser.runtime.onMessage.addListener((message) => {
  // Offscreen traffic shares this channel; that listener owns those messages.
  if (!isActionRequest(message)) return undefined;
  return runAction(message.action);
});
