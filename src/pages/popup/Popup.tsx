import React, { useEffect, useState } from "react";
import Browser from "webextension-polyfill";
import { currentShortcuts, openShortcutSettings } from "@src/components/shortcuts";
import {
  ACTION_LABELS,
  type ActionId,
  type ActionOutcome,
  type ActionRequest,
} from "@src/lib/messages";

const ACTIONS: { id: ActionId; description: string }[] = [
  { id: "copy_plain", description: "Strip every trace of styling" },
  { id: "copy_clean", description: "Keep structure, drop the noise" },
  { id: "copy_markdown", description: "Convert the selection to Markdown" },
  { id: "paste_plain", description: "Insert the clipboard as plain text" },
];

export default function Popup(): JSX.Element {
  const [shortcuts, setShortcuts] = useState<Partial<Record<ActionId, string>>>({});
  const [busy, setBusy] = useState<ActionId | null>(null);
  const [outcome, setOutcome] = useState<ActionOutcome | null>(null);

  useEffect(() => {
    void currentShortcuts().then(setShortcuts);
  }, []);

  async function run(action: ActionId): Promise<void> {
    setBusy(action);
    setOutcome(null);
    const request: ActionRequest = { kind: "run-action", action };
    try {
      const result = (await Browser.runtime.sendMessage(request)) as ActionOutcome | undefined;
      setOutcome(result ?? { ok: false, message: "The extension did not respond." });
    } catch (error) {
      setOutcome({
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex h-full flex-col bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <header className="px-4 pb-2 pt-4">
        <h1 className="text-sm font-semibold">Better Copy Paste</h1>
      </header>

      <div className="flex-1 space-y-1.5 px-3">
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled={busy !== null}
            onClick={() => void run(action.id)}
            className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-emerald-500 dark:hover:bg-slate-700"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">
                {ACTION_LABELS[action.id]}
              </span>
              <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
                {action.description}
              </span>
            </span>
            {shortcuts[action.id] && (
              <kbd className="shrink-0 rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300">
                {shortcuts[action.id]}
              </kbd>
            )}
          </button>
        ))}
      </div>

      <div className="px-4 pt-2.5" aria-live="polite">
        {outcome && (
          <p
            className={`text-[11px] leading-snug ${
              outcome.ok
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-red-700 dark:text-red-400"
            }`}
          >
            {outcome.message}
          </p>
        )}
      </div>

      <footer className="flex items-center gap-3 px-4 pb-3 pt-2 text-[11px]">
        <button
          type="button"
          className="text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-100"
          onClick={() => void Browser.runtime.openOptionsPage()}
        >
          Settings
        </button>
        <button
          type="button"
          className="text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-100"
          onClick={() => void openShortcutSettings()}
        >
          Shortcuts
        </button>
      </footer>
    </div>
  );
}
