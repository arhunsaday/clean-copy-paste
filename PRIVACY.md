# Privacy policy

**Better Copy Paste collects no data, and transmits none.**

Last updated: 8 September 2026

## What the extension does with your data

| Data | What happens to it |
| --- | --- |
| The text you select | Read only when you invoke an action, converted in memory, written to your clipboard, then discarded |
| Your clipboard contents | Read only when you invoke *Paste without formatting*, inserted at your caret, then discarded |
| Your settings | Stored with the browser's own `storage.sync`, so they follow your signed-in browser profile |

Nothing is written to a server. The extension makes no network requests of any
kind, contains no analytics, no telemetry, no crash reporting, no advertising and
no third-party SDKs. There is no account, and nothing to sign in to.

## Access to web pages

The extension requests **no host permissions**. It cannot read a page until you
act on it. Clicking its toolbar button, choosing one of its right-click entries,
or pressing one of its keyboard shortcuts grants
[`activeTab`](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)
— access to that one tab, for that one invocation. Access lapses immediately
afterwards, and no other tab is ever readable.

## Your settings

Settings are the only thing the extension stores. If you have browser sync
enabled, your browser — not this extension — syncs them across your devices
through your browser account, under your browser vendor's privacy policy.

Removing the extension removes its settings.

## Permissions, and why each is needed

- `activeTab` — read the selection, or insert text, in the tab you invoked the action on.
- `scripting` — run that read/insert code in that tab.
- `contextMenus` — add the right-click entries.
- `clipboardRead` — read the clipboard for *Paste without formatting*.
- `clipboardWrite` — place the converted result on the clipboard.
- `storage` — save your settings.
- `offscreen` (Chrome only) — Chrome's service workers have no document, and
  clipboard access requires one. This permission creates a hidden, empty
  extension document used solely for clipboard access and HTML-to-Markdown
  conversion. It loads no remote content.

## Contact

Please raise an issue in the project's repository.
