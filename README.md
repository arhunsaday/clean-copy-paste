# Better Copy Paste

A Chrome and Firefox extension for getting text out of one app and into another
without dragging its styling along.

Four actions, from a keyboard shortcut, the right-click menu, or the toolbar popup:

| Action | What lands on the clipboard |
| --- | --- |
| **Copy without formatting** | Plain text, with line breaks collapsed by default |
| **Copy with clean formatting** | Semantic HTML only — bold, italic, headings, lists, links, tables, code |
| **Copy as Markdown** | The selection converted to Markdown |
| **Paste without formatting** | The clipboard inserted as plain text at the caret |

## Install

### From source

```bash
pnpm install
pnpm run build:chrome     # -> dist/
pnpm run build:firefox    # -> dist-firefox/
```

- **Chrome / Edge / Brave** — open `chrome://extensions`, enable Developer mode,
  choose *Load unpacked*, and select `dist/`.
- **Firefox** — open `about:debugging#/runtime/this-firefox`, choose
  *Load Temporary Add-on*, and select any file inside `dist-firefox/`.

### Packaged

```bash
pnpm run package:all      # -> releases/better-copy-paste-{chrome,firefox}-v<version>.{zip,xpi}
```

## Default shortcuts

| Action | macOS | Windows / Linux |
| --- | --- | --- |
| Copy without formatting | `⌘⇧Y` | `Ctrl+Shift+Y` |
| Paste without formatting | `⌘⇧V` | `Ctrl+Shift+V` |

*Copy with clean formatting* and *Copy as Markdown* ship unbound, because
browsers cap how many shortcuts an extension may suggest. Assign them from the
options page, or at `chrome://extensions/shortcuts`.

## Settings

The options page controls:

- **Plain text** — whether line breaks collapse into spaces (on by default, which
  is what makes a multi-line selection paste cleanly into a search box), whether
  runs of spaces collapse, and whether the result is trimmed. A live preview
  shows the effect.
- **Clean formatting** — which semantic features survive: emphasis, headings,
  lists, links, tables, code, images. Fonts, colours, sizes, backgrounds and
  classes are always discarded.
- **Markdown style** — bullet marker, heading style, code-block style, emphasis
  delimiter.
- **Context menu** — which of the four entries appear on right-click.
- **Feedback** — the toolbar badge tick/cross, and whether on-page messages
  appear for every action, errors only, or never.

## Permissions

The extension requests no host permissions, so it never asks to "read and change
all your data on all websites".

Every entry point — clicking the toolbar action, choosing a context-menu item,
pressing a keyboard shortcut — is a gesture that grants
[`activeTab`](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)
for the current tab only, for that one invocation.

| Permission | Why |
| --- | --- |
| `activeTab` | Read the selection, or insert text, in the tab you invoked the action on |
| `scripting` | Run the read/insert code in that tab |
| `contextMenus` | Add the right-click entries |
| `clipboardRead` | Read the clipboard for *Paste without formatting* |
| `clipboardWrite` | Put the result on the clipboard for the copy actions |
| `storage` | Save your settings |
| `offscreen` | Chrome only — see below |

Nothing is collected and nothing is transmitted. See [PRIVACY.md](PRIVACY.md).

## How it works

Three details are worth knowing before changing anything.

### Injected functions must be self-contained

`chrome.scripting.executeScript({ func })` ships a function to the page by
calling `Function.prototype.toString()` on it. Anything it closes over — an
import, a module constant, a neighbouring helper — is **not** serialised, so the
injected copy throws a `ReferenceError` in the page while the extension's own
bundle stays perfectly valid. Neither TypeScript nor ESLint catches this.

Everything in `src/lib/inject/` therefore declares its helpers inside the
exported function and touches nothing but its own arguments and web globals.
`pnpm run check:injected` parses the *built* bundles and fails if any of those
functions references a name it does not declare.

### Formatting is read from computed styles, in the page

Sites like Google Docs and Word Online express bold and italic through CSS, not
through `<b>` and `<i>`. Those styles only exist on live nodes: `getComputedStyle`
on a detached `range.cloneContents()` clone returns defaults, so a
clone-then-inspect approach silently loses all emphasis. `readSelection` walks
the live tree instead and consults computed styles as it goes.

### Clipboard work happens in a document, not the worker

A Chrome service worker has no DOM, and `navigator.clipboard` needs a focused
one. Clipboard reads/writes and Turndown's HTML parsing run in an
[offscreen document](https://developer.chrome.com/docs/extensions/reference/api/offscreen);
Firefox's MV3 background scripts still run inside a document, so there they run
directly and the `offscreen` permission is omitted from that manifest.

### Layout

```
src/
  lib/
    actions.ts          orchestrates the four actions
    settings.ts         Settings type + defaults (pure — safe to import anywhere)
    settings-store.ts   storage.sync persistence
    plain-text.ts       plain-text normalisation
    clipboard-dom.ts    clipboard + Turndown primitives (needs a document)
    dom-context.ts      routes to offscreen document / background page
    inject-runner.ts    executeScript wrappers, all-frames and single-frame
    inject/             functions that run in the page — self-contained
  pages/
    background/         service worker: menus, commands, messages
    offscreen/          Chrome's clipboard/Markdown document
    popup/              toolbar popup
    options/            settings page
```

## Development

```bash
pnpm run dev              # Chrome, hot reload
pnpm run dev:firefox      # Firefox
pnpm run verify           # typecheck + lint + test + build both + check:injected
pnpm run test:watch
```

`pnpm run verify` is what CI runs.

## Browser support

- Chrome, Edge, Brave and other Chromium browsers on Manifest V3.
- Firefox 115+.

## Licence

[MIT](LICENSE)
