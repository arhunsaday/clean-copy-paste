import { describe, expect, it } from "vitest";
import { htmlToMarkdown } from "../clipboard-dom";
import type { MarkdownOptions } from "../messages";
import { DEFAULT_SETTINGS } from "../settings";

const options: MarkdownOptions = {
  bulletListMarker: DEFAULT_SETTINGS.markdownBullet,
  headingStyle: DEFAULT_SETTINGS.markdownHeadingStyle,
  codeBlockStyle: DEFAULT_SETTINGS.markdownCodeBlockStyle,
  emDelimiter: DEFAULT_SETTINGS.markdownEmphasis,
};

describe("htmlToMarkdown", () => {
  it("converts headings, emphasis and links", () => {
    const markdown = htmlToMarkdown(
      '<h2>Title</h2><p>Some <strong>bold</strong> and <em>italic</em> plus a <a href="https://example.com">link</a>.</p>',
      options,
    );
    expect(markdown).toContain("## Title");
    expect(markdown).toContain("**bold**");
    expect(markdown).toContain("_italic_");
    expect(markdown).toContain("[link](https://example.com)");
  });

  it("uses the configured bullet marker", () => {
    const html = "<ul><li>one</li><li>two</li></ul>";
    expect(htmlToMarkdown(html, options)).toContain("-   one");
    expect(htmlToMarkdown(html, { ...options, bulletListMarker: "*" })).toContain("*   one");
  });

  it("uses the configured emphasis delimiter", () => {
    expect(htmlToMarkdown("<em>x</em>", { ...options, emDelimiter: "*" })).toBe("*x*");
  });

  it("renders tables, which needs the GFM plugin", () => {
    const markdown = htmlToMarkdown(
      "<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>",
      options,
    );
    expect(markdown).toContain("| A");
    expect(markdown).toContain("| 1");
  });

  it("renders strikethrough, which also needs the GFM plugin", () => {
    expect(htmlToMarkdown("<s>gone</s>", options)).toContain("~gone~");
  });

  it("fences code blocks by default and indents them when asked", () => {
    const html = "<pre><code>const a = 1;</code></pre>";
    expect(htmlToMarkdown(html, options)).toContain("```");
    expect(htmlToMarkdown(html, { ...options, codeBlockStyle: "indented" })).not.toContain("```");
  });

  it("collapses the runs of blank lines Turndown leaves behind", () => {
    expect(htmlToMarkdown("<p>a</p><p></p><p></p><p>b</p>", options)).not.toMatch(/\n{3}/);
  });

  it("returns an empty string for empty markup", () => {
    expect(htmlToMarkdown("", options)).toBe("");
  });
});
