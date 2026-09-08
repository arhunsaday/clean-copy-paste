/**
 * `readSelection` runs inside the page, so these tests drive it against a real
 * DOM and a real Range rather than mocking either.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { readSelection, type SelectionOptions } from "../inject/read-selection";
import { DEFAULT_SETTINGS } from "../settings";

const options: SelectionOptions = {
  keepEmphasis: DEFAULT_SETTINGS.keepEmphasis,
  keepHeadings: DEFAULT_SETTINGS.keepHeadings,
  keepLists: DEFAULT_SETTINGS.keepLists,
  keepLinks: DEFAULT_SETTINGS.keepLinks,
  keepTables: DEFAULT_SETTINGS.keepTables,
  keepCode: DEFAULT_SETTINGS.keepCode,
  keepImages: DEFAULT_SETTINGS.keepImages,
};

/** Renders `html` and selects all of it, the way a user's drag would. */
function selectAll(html: string): void {
  document.body.innerHTML = `<div id="stage">${html}</div>`;
  const stage = document.getElementById("stage")!;
  const range = document.createRange();
  range.selectNodeContents(stage);
  const selection = document.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
}

function read(html: string, overrides: Partial<SelectionOptions> = {}) {
  selectAll(html);
  return readSelection({ ...options, ...overrides });
}

beforeEach(() => {
  document.body.innerHTML = "";
  document.getSelection()?.removeAllRanges();
});

describe("readSelection", () => {
  it("returns null when nothing is selected", () => {
    document.body.innerHTML = "<p>text</p>";
    expect(readSelection(options)).toBeNull();
  });

  it("keeps semantic emphasis and drops presentational styling", () => {
    const result = read('<p>plain <b>bold</b> <i>italic</i></p>');
    expect(result).not.toBeNull();
    expect(result!.html).toContain("<strong>bold</strong>");
    expect(result!.html).toContain("<em>italic</em>");
  });

  it("discards colours, fonts, sizes and classes", () => {
    const result = read(
      '<p class="fancy" style="color:red;font-size:32px;background:blue">text</p>',
    );
    expect(result!.html).not.toMatch(/color|font-size|background|class/);
  });

  it("recovers bold applied only through a style attribute", () => {
    // Google Docs and Word Online express emphasis this way, with no <b> in sight.
    const result = read('<p><span style="font-weight:700">heavy</span></p>');
    expect(result!.html).toContain("<strong>heavy</strong>");
  });

  it("does not re-wrap emphasis on every descendant", () => {
    const result = read("<b>outer <span>inner</span></b>");
    expect(result!.html.match(/<strong>/g)).toHaveLength(1);
  });

  it("never emits script or style content", () => {
    const result = read("<p>before</p><script>alert(1)</script><style>p{}</style><p>after</p>");
    expect(result!.html).not.toContain("alert");
    expect(result!.html).not.toContain("p{}");
  });

  it("refuses javascript: links while keeping the text", () => {
    const result = read('<a href="javascript:alert(1)">click</a>');
    expect(result!.html).not.toContain("javascript:");
    expect(result!.html).toContain("click");
  });

  it("keeps http links with their address", () => {
    const result = read('<a href="https://example.com/x">site</a>');
    expect(result!.html).toContain('href="https://example.com/x"');
  });

  it("honours keepLinks: false by unwrapping to text", () => {
    const result = read('<a href="https://example.com">site</a>', { keepLinks: false });
    expect(result!.html).not.toContain("<a");
    expect(result!.html).toContain("site");
  });

  it("preserves list structure", () => {
    const result = read("<ul><li>one</li><li>two</li></ul>");
    expect(result!.html).toContain("<ul>");
    expect(result!.html).toContain("<li>one</li>");
  });

  it("drops lists down to text when keepLists is off", () => {
    const result = read("<ul><li>one</li></ul>", { keepLists: false });
    expect(result!.html).not.toContain("<ul");
    expect(result!.html).toContain("one");
  });

  it("omits images by default and includes them when asked", () => {
    const markup = '<p>a<img src="https://example.com/i.png" alt="pic"></p>';
    expect(read(markup)!.html).not.toContain("<img");
    expect(read(markup, { keepImages: true })!.html).toContain('alt="pic"');
  });

  it("escapes markup found in text so it cannot inject tags", () => {
    const result = read("<p>&lt;script&gt;x&lt;/script&gt;</p>");
    expect(result!.html).toContain("&lt;script&gt;");
    expect(result!.html).not.toContain("<script>");
  });

  it("reads a partial selection inside a text input", () => {
    document.body.innerHTML = '<input id="f" value="hello world">';
    const field = document.getElementById("f") as HTMLInputElement;
    field.focus();
    field.setSelectionRange(6, 11);
    // window.getSelection() reports nothing for text inside a field.
    expect(document.getSelection()?.toString()).toBe("");
    expect(readSelection(options)?.text).toBe("world");
  });

  it("reads a partial selection inside a textarea", () => {
    document.body.innerHTML = "<textarea id=\"f\">line one\nline two</textarea>";
    const field = document.getElementById("f") as HTMLTextAreaElement;
    field.focus();
    field.setSelectionRange(0, 8);
    expect(readSelection(options)?.text).toBe("line one");
  });

  it("ignores a collapsed caret in a field", () => {
    document.body.innerHTML = '<input id="f" value="hello">';
    const field = document.getElementById("f") as HTMLInputElement;
    field.focus();
    field.setSelectionRange(2, 2);
    expect(readSelection(options)).toBeNull();
  });

  it("serialises only the selected slice of a text node", () => {
    document.body.innerHTML = "<p id=\"p\">abcdefgh</p>";
    const text = document.getElementById("p")!.firstChild!;
    const range = document.createRange();
    range.setStart(text, 2);
    range.setEnd(text, 5);
    const selection = document.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    const result = readSelection(options);
    expect(result!.text).toBe("cde");
    expect(result!.html).toContain("cde");
    expect(result!.html).not.toContain("abcdefgh");
  });

  it("keeps table structure", () => {
    const result = read("<table><tr><td>a</td><td>b</td></tr></table>");
    expect(result!.html).toContain("<td>a</td>");
  });
});
