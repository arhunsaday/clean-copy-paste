import Browser from "webextension-polyfill";
import { showToast } from "./inject/toast";
import { runInFrame } from "./inject-runner";
import type { ActionOutcome } from "./messages";
import type { Settings } from "./settings";

type ActionApi = {
  setBadgeText: (details: { text: string }) => Promise<void>;
  setBadgeBackgroundColor: (details: { color: string }) => Promise<void>;
  setBadgeTextColor?: (details: { color: string }) => Promise<void>;
  setTitle: (details: { title: string }) => Promise<void>;
};

const DEFAULT_TITLE = "Better Copy Paste";

function actionApi(): ActionApi {
  const api = Browser as unknown as { action?: ActionApi; browserAction?: ActionApi };
  const resolved = api.action ?? api.browserAction;
  if (!resolved) throw new Error("No toolbar action API available.");
  return resolved;
}

const BADGE_MS = 1700;
const TOP_FRAME = 0;
let clearTimer: ReturnType<typeof setTimeout> | undefined;

async function flashBadge(outcome: ActionOutcome): Promise<void> {
  const action = actionApi();
  await action.setBadgeBackgroundColor({ color: outcome.ok ? "#15803d" : "#b91c1c" });
  await action.setBadgeTextColor?.({ color: "#ffffff" }).catch(() => undefined);
  await action.setBadgeText({ text: outcome.ok ? "✓" : "✕" });

  // On a page that cannot be scripted there is no toast to explain the cross, so
  // the reason goes in the tooltip, which always works.
  if (!outcome.ok) {
    await action.setTitle({ title: `${DEFAULT_TITLE} — ${outcome.message}` });
  }

  if (clearTimer) clearTimeout(clearTimer);
  clearTimer = setTimeout(() => {
    void action.setBadgeText({ text: "" });
    void action.setTitle({ title: DEFAULT_TITLE });
  }, BADGE_MS);
}

/** Clears state left behind by a worker that was suspended mid-flash. */
export async function clearBadge(): Promise<void> {
  const action = actionApi();
  await action.setBadgeText({ text: "" }).catch(() => undefined);
  await action.setTitle({ title: DEFAULT_TITLE }).catch(() => undefined);
}

/**
 * Surfaces the result of an action. Previously every failure was a console
 * message in a service worker nobody has open, so a no-op looked identical to
 * success.
 *
 * The badge is the reliable channel: it still works when the page cannot be
 * scripted at all, which is exactly when something went wrong.
 */
export async function report(
  outcome: ActionOutcome,
  settings: Settings,
  where?: { tabId: number },
): Promise<void> {
  if (settings.showBadge) {
    await flashBadge(outcome).catch(() => undefined);
  }

  if (!where || settings.toastMode === "never") return;
  // A toast on every copy is noise for an action used dozens of times a day, so
  // the default only speaks up when something failed - and then it says why,
  // which a bare badge cross cannot.
  if (outcome.ok && settings.toastMode !== "always") return;

  // Always the top frame: a toast is fixed to its own frame's viewport, so one
  // rendered inside a small iframe would be clipped out of sight.
  await runInFrame(where.tabId, TOP_FRAME, showToast, [
    outcome.message,
    outcome.ok ? ("ok" as const) : ("error" as const),
  ]).catch(() => undefined);
}
