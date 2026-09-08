import React, { useEffect, useMemo, useState } from "react";
import { Choice, Section, Toggle } from "@src/components/controls";
import { currentShortcuts, openShortcutSettings } from "@src/components/shortcuts";
import { ACTION_LABELS, type ActionId } from "@src/lib/messages";
import { toPlainText } from "@src/lib/plain-text";
import { DEFAULT_SETTINGS, type Settings } from "@src/lib/settings";
import { getSettings, resetSettings, saveSettings } from "@src/lib/settings-store";

const SAMPLE = "  Quarterly  results\n\nRevenue grew 12%.\nMargins held steady.  ";

const SHORTCUT_ORDER: ActionId[] = [
  "copy_plain",
  "copy_clean",
  "copy_markdown",
  "paste_plain",
];

export default function Options(): JSX.Element {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [shortcuts, setShortcuts] = useState<Partial<Record<ActionId, string>>>({});

  useEffect(() => {
    void getSettings().then(setSettings);
    void currentShortcuts().then(setShortcuts);
  }, []);

  function update<K extends keyof Settings>(key: K, value: Settings[K]): void {
    setSettings((current) => (current ? { ...current, [key]: value } : current));
    void saveSettings({ [key]: value } as Partial<Settings>);
  }

  const preview = useMemo(
    () => (settings ? toPlainText(SAMPLE, settings) : ""),
    [settings],
  );

  if (!settings) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10 text-sm text-slate-500">Loading…</main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
          Better Copy Paste
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Settings apply to the keyboard shortcuts, the context menu and the toolbar popup alike.
        </p>
      </header>

      <div className="space-y-5">
        <Section
          title="Plain text"
          hint="Applies to “Copy without formatting” and “Paste without formatting”."
        >
          <Toggle
            label="Collapse line breaks into spaces"
            hint="On: the selection becomes a single line — handy for search boxes and address bars. Off: paragraphs survive."
            checked={settings.collapseNewlines}
            onChange={(next) => update("collapseNewlines", next)}
          />
          <Toggle
            label="Collapse runs of spaces and tabs"
            checked={settings.collapseSpaces}
            onChange={(next) => update("collapseSpaces", next)}
          />
          <Toggle
            label="Trim leading and trailing whitespace"
            checked={settings.trimResult}
            onChange={(next) => update("trimResult", next)}
          />

          <div className="rounded-lg bg-slate-100 p-3 dark:bg-slate-900/70">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Preview
            </p>
            <pre className="mt-1.5 whitespace-pre-wrap break-words font-mono text-xs text-slate-700 dark:text-slate-300">
              {preview || "(empty)"}
            </pre>
          </div>
        </Section>

        <Section
          title="Clean formatting"
          hint="What survives “Copy with clean formatting” and “Copy as Markdown”. Everything else — fonts, colours, sizes, backgrounds, classes — is always discarded."
        >
          <Toggle
            label="Bold, italic, underline and strikethrough"
            checked={settings.keepEmphasis}
            onChange={(next) => update("keepEmphasis", next)}
          />
          <Toggle
            label="Headings"
            checked={settings.keepHeadings}
            onChange={(next) => update("keepHeadings", next)}
          />
          <Toggle
            label="Lists"
            checked={settings.keepLists}
            onChange={(next) => update("keepLists", next)}
          />
          <Toggle
            label="Links"
            hint="Only http, https, mailto and tel addresses are carried over."
            checked={settings.keepLinks}
            onChange={(next) => update("keepLinks", next)}
          />
          <Toggle
            label="Tables"
            checked={settings.keepTables}
            onChange={(next) => update("keepTables", next)}
          />
          <Toggle
            label="Inline code and code blocks"
            checked={settings.keepCode}
            onChange={(next) => update("keepCode", next)}
          />
          <Toggle
            label="Images"
            hint="Off by default: image references are rarely wanted in pasted prose."
            checked={settings.keepImages}
            onChange={(next) => update("keepImages", next)}
          />
        </Section>

        <Section title="Markdown style">
          <Choice
            label="Bullet marker"
            value={settings.markdownBullet}
            options={[
              { value: "-", label: "- dash" },
              { value: "*", label: "* asterisk" },
              { value: "+", label: "+ plus" },
            ]}
            onChange={(next) => update("markdownBullet", next)}
          />
          <Choice
            label="Headings"
            value={settings.markdownHeadingStyle}
            options={[
              { value: "atx", label: "## ATX" },
              { value: "setext", label: "Underlined" },
            ]}
            onChange={(next) => update("markdownHeadingStyle", next)}
          />
          <Choice
            label="Code blocks"
            value={settings.markdownCodeBlockStyle}
            options={[
              { value: "fenced", label: "``` fenced" },
              { value: "indented", label: "Indented" },
            ]}
            onChange={(next) => update("markdownCodeBlockStyle", next)}
          />
          <Choice
            label="Emphasis"
            value={settings.markdownEmphasis}
            options={[
              { value: "_", label: "_underscore_" },
              { value: "*", label: "*asterisk*" },
            ]}
            onChange={(next) => update("markdownEmphasis", next)}
          />
        </Section>

        <Section title="Context menu" hint="Choose which entries appear on right-click.">
          <Toggle
            label={ACTION_LABELS.copy_plain}
            checked={settings.menuCopyPlain}
            onChange={(next) => update("menuCopyPlain", next)}
          />
          <Toggle
            label={ACTION_LABELS.copy_clean}
            checked={settings.menuCopyClean}
            onChange={(next) => update("menuCopyClean", next)}
          />
          <Toggle
            label={ACTION_LABELS.copy_markdown}
            checked={settings.menuCopyMarkdown}
            onChange={(next) => update("menuCopyMarkdown", next)}
          />
          <Toggle
            label={ACTION_LABELS.paste_plain}
            checked={settings.menuPastePlain}
            onChange={(next) => update("menuPastePlain", next)}
          />
        </Section>

        <Section title="Feedback">
          <Toggle
            label="Flash a tick or cross on the toolbar icon"
            checked={settings.showBadge}
            onChange={(next) => update("showBadge", next)}
          />
          <Choice
            label="On-page message"
            hint="Errors explain themselves; the toolbar badge cannot."
            value={settings.toastMode}
            options={[
              { value: "errors", label: "Errors only" },
              { value: "always", label: "Every action" },
              { value: "never", label: "Never" },
            ]}
            onChange={(next) => update("toastMode", next)}
          />
        </Section>

        <Section
          title="Keyboard shortcuts"
          hint="Shortcuts are assigned by the browser, not the extension. Unassigned actions can be given a key of your choice."
        >
          <ul className="space-y-2">
            {SHORTCUT_ORDER.map((action) => (
              <li key={action} className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-800 dark:text-slate-200">
                  {ACTION_LABELS[action]}
                </span>
                {shortcuts[action] ? (
                  <kbd className="shrink-0 rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300">
                    {shortcuts[action]}
                  </kbd>
                ) : (
                  <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                    not assigned
                  </span>
                )}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            onClick={() => void openShortcutSettings()}
          >
            Edit shortcuts
          </button>
        </Section>
      </div>

      <footer className="mt-8 flex items-center justify-between border-t border-slate-200 pt-5 dark:border-slate-700">
        <p className="text-xs text-slate-500 dark:text-slate-400">Changes save as you make them.</p>
        <button
          type="button"
          className="rounded-lg px-3 py-1.5 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
          onClick={() => {
            void resetSettings();
            setSettings(DEFAULT_SETTINGS);
          }}
        >
          Reset to defaults
        </button>
      </footer>
    </main>
  );
}
