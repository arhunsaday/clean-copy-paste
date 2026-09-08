import Browser from "webextension-polyfill";
import { DEFAULT_SETTINGS, type Settings } from "./settings";

/**
 * Persistence for {@link Settings}.
 *
 * Split from the settings themselves so the types and defaults stay importable
 * from anywhere - `webextension-polyfill` throws on import outside an extension,
 * which would otherwise drag the browser runtime into every test and page.
 */

/** `sync` so preferences follow a signed-in profile; `local` where sync is unavailable. */
const area = Browser.storage.sync ?? Browser.storage.local;

export async function getSettings(): Promise<Settings> {
  const stored = await area.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...(stored as Partial<Settings>) };
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  await area.set(patch);
}

export async function resetSettings(): Promise<void> {
  await area.set(DEFAULT_SETTINGS);
}

export function onSettingsChanged(listener: (settings: Settings) => void): () => void {
  const handler = () => void getSettings().then(listener);
  Browser.storage.onChanged.addListener(handler);
  return () => Browser.storage.onChanged.removeListener(handler);
}
