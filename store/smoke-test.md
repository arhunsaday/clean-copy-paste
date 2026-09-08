# Manual smoke test

Automated tests cover the pure logic (`pnpm run test`) and prove the injected
functions survive bundling (`pnpm run check:injected`). What they cannot cover is
the browser itself: clipboard permissions, offscreen documents, frame targeting
and real editors. Run this list against a loaded build before publishing.

Load `dist/` at `chrome://extensions` (Developer mode → Load unpacked), and
`dist-firefox/` at `about:debugging#/runtime/this-firefox`.

## Copy

| # | Steps | Expected |
| --- | --- | --- |
| 1 | Select a styled paragraph on any article page → `⌘⇧Y` | Toolbar shows a green tick. Pasting into a plain text editor gives one unstyled line. |
| 2 | Same selection → right-click → *Copy with clean formatting* → paste into a rich editor | Bold, italic, headings, lists and links survive; fonts, colours and sizes do not. |
| 3 | Same selection → *Copy as Markdown* → paste into a plain editor | Valid Markdown, with the bullet and emphasis style set in options. |
| 4 | Select text in **Google Docs** → *Copy with clean formatting* | Bold and italic survive. This is the case a clone-based approach loses. |
| 5 | Select text inside a `<textarea>` → `⌘⇧Y` | The field's selected text is copied. `window.getSelection()` reports nothing here. |
| 6 | Select text inside an iframe (e.g. an embedded CodePen result) → `⌘⇧Y` | The iframe's selection is copied, not the outer page's. |
| 7 | Select a table → *Copy as Markdown* | A GFM pipe table. |
| 8 | Copy with nothing selected | Red cross; on-page message "Select some text first." |

## Paste

| # | Steps | Expected |
| --- | --- | --- |
| 9 | Copy rich text from a website, click into a plain `<input>` → `⌘⇧V` | Plain text inserted at the caret; surrounding text intact. |
| 10 | Same into a **React** editor (e.g. a GitHub comment box) → `⌘⇧V` | Text appears **and** the app registers it — the button enables, character counts update. This is the `input`-event path. |
| 11 | Same into a `contenteditable` (Notion, Google Docs) → `⌘⇧V` | Plain text, no styling carried over. |
| 12 | Paste, then press `⌘Z` | The paste undoes in one step. Confirms `execCommand("insertText")` kept the native undo stack. |
| 13 | Paste with the caret in no text field | Red cross; message "Click into a text field first." |
| 14 | Paste with an empty clipboard | Red cross; message "The clipboard is empty." |

## Restricted pages and errors

| # | Steps | Expected |
| --- | --- | --- |
| 15 | Any action on `chrome://settings` | Red cross; "Browser-internal pages can't be scripted by extensions." Never a silent no-op. |
| 16 | Any action on the Chrome Web Store | Red cross with the add-on-store message. |
| 17 | Any action on a `file:///` page **without** file access | Red cross pointing at "Allow access to file URLs". |
| 18 | Enable file access, retry | Works. |

## Settings

| # | Steps | Expected |
| --- | --- | --- |
| 19 | Options → turn off *Collapse line breaks* → copy a multi-paragraph selection | Paragraph breaks survive. Preview panel matched the result. |
| 20 | Options → turn off *Links* → *Copy with clean formatting* | Link text remains, `<a>` does not. |
| 21 | Options → untick a context-menu entry → right-click | That entry is gone, without reloading the extension. |
| 22 | Options → *On-page message* = *Every action* → copy | A green toast appears on success. |
| 23 | Options → *On-page message* = *Never* → copy with nothing selected | No toast; badge cross still shows. |
| 24 | Options → turn off the badge → copy | No badge. |
| 25 | Options → *Reset to defaults* | Every control returns to its default and persists after reload. |
| 26 | Change a setting, reopen options | The change persisted. |

## Popup and shortcuts

| # | Steps | Expected |
| --- | --- | --- |
| 27 | Select text, open the popup, click each of the four buttons | Each works; the status line reports the outcome. |
| 28 | Open the popup | Assigned shortcuts show next to their actions; the two unbound ones show nothing. |
| 29 | `chrome://extensions/shortcuts` → assign *Copy as Markdown* → reopen the popup | The new shortcut is listed and works. |
| 30 | Popup → *Settings*, then *Shortcuts* | Both open the right page. |

## Appearance

| # | Steps | Expected |
| --- | --- | --- |
| 31 | Switch the OS to dark mode → open popup and options | Both render dark, with readable contrast. |
| 32 | Trigger a toast on a page with aggressive CSS (e.g. a heavy news site) | The toast renders correctly — it lives in a closed shadow root. |

## Firefox specifics

Re-run 1, 2, 3, 9, 10, 12 and 13 in Firefox. Clipboard access there runs in the
background page rather than an offscreen document, so it is a genuinely
different code path.
