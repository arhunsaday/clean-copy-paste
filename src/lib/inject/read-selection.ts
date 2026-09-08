export type SelectionOptions = {
  keepEmphasis: boolean;
  keepHeadings: boolean;
  keepLists: boolean;
  keepLinks: boolean;
  keepTables: boolean;
  keepCode: boolean;
  keepImages: boolean;
};

export type SelectionPayload = {
  text: string;
  html: string;
  /** True only in the frame the user is actually looking at. */
  focused: boolean;
};

/**
 * Runs in the page. Reads the current selection and serialises it twice: as
 * plain text, and as a whitelist-only HTML tree.
 *
 * The HTML is built by walking the *live* DOM rather than `range.cloneContents()`,
 * because emphasis on sites like Google Docs and Word Online exists only in
 * computed styles - and computed styles of a detached clone are always the
 * defaults, so a clone-then-inspect approach silently loses all bold and italic.
 *
 * MUST stay self-contained: `executeScript` serialises it with
 * `Function.prototype.toString()`, so it can only touch its own arguments,
 * nested declarations, and web globals.
 */
export function readSelection(options: SelectionOptions): SelectionPayload | null {
  const focused = document.hasFocus();

  // --- shadow DOM: hop through nested roots to the element that really has focus
  function deepActiveElement(): Element | null {
    let node: Element | null = document.activeElement;
    for (;;) {
      const root = (node as { shadowRoot?: ShadowRoot | null } | null)?.shadowRoot;
      if (!root?.activeElement) return node;
      node = root.activeElement;
    }
  }

  const active = deepActiveElement();

  function escapeText(value: string): string {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function escapeAttribute(value: string): string {
    return escapeText(value).replace(/"/g, "&quot;");
  }

  // --- 1. text selected inside an <input> or <textarea>
  //     window.getSelection() reports nothing for these, so read them directly.
  if (active) {
    const tag = active.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") {
      const field = active as HTMLInputElement | HTMLTextAreaElement;
      try {
        const start = field.selectionStart;
        const end = field.selectionEnd;
        if (start !== null && end !== null && end > start) {
          const raw = field.value.slice(start, end);
          return { text: raw, html: escapeText(raw), focused };
        }
      } catch {
        // selectionStart throws on input types that don't support it (email, number)
      }
    }
  }

  // --- 2. locate a non-collapsed selection, including inside shadow roots
  function findSelection(): Selection | null {
    const own = document.getSelection();
    if (own && !own.isCollapsed && own.rangeCount > 0) return own;

    let node: Element | null = document.activeElement;
    while (node) {
      const root = (node as { shadowRoot?: ShadowRoot | null }).shadowRoot as
        | (ShadowRoot & { getSelection?: () => Selection | null })
        | null
        | undefined;
      if (!root) return null;
      const inner = root.getSelection?.();
      if (inner && !inner.isCollapsed && inner.rangeCount > 0) return inner;
      node = root.activeElement;
    }
    return null;
  }

  const selection = findSelection();
  if (!selection) return null;

  const range = selection.getRangeAt(0);
  const text = selection.toString();

  // --- 3. serialise the selected slice of the live tree
  const SKIP = ["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "IFRAME", "OBJECT", "SVG", "CANVAS"];
  const BLOCKISH = [
    "P", "DIV", "SECTION", "ARTICLE", "HEADER", "FOOTER", "MAIN", "ASIDE",
    "NAV", "FIGURE", "FIGCAPTION", "ADDRESS", "FORM", "FIELDSET", "DL", "DT", "DD",
  ];
  const TABLE_TAGS = ["TABLE", "THEAD", "TBODY", "TFOOT", "TR", "TH", "TD", "CAPTION"];

  function safeUrl(value: string, allowData: boolean): string | null {
    // Never carry javascript: or unexpected data: payloads into another app's editor.
    const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(value.trim());
    if (!scheme) return value;
    const name = scheme[1].toLowerCase();
    if (name === "http" || name === "https" || name === "mailto" || name === "tel") return value;
    if (allowData && name === "data" && /^data:image\//i.test(value.trim())) return value;
    return null;
  }

  function numericWeight(value: string): number {
    if (value === "bold" || value === "bolder") return 700;
    if (value === "normal" || value === "lighter") return 400;
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? 400 : parsed;
  }

  function sliceOf(node: Text): string {
    let start = 0;
    let end = node.data.length;
    if (node === range.startContainer) start = range.startOffset;
    if (node === range.endContainer) end = range.endOffset;
    return node.data.slice(start, end);
  }

  function serializeChildren(element: Element): string {
    let out = "";
    element.childNodes.forEach((child) => {
      out += serialize(child);
    });
    return out;
  }

  function serialize(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return range.intersectsNode(node) ? escapeText(sliceOf(node as Text)) : "";
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const element = node as Element;
    const tag = element.tagName.toUpperCase();
    if (SKIP.indexOf(tag) !== -1) return "";
    if (!range.intersectsNode(element)) return "";

    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") return "";

    if (tag === "BR") return "<br>";
    if (tag === "HR") return "<hr>";
    if (tag === "IMG") {
      if (!options.keepImages) return "";
      const image = element as HTMLImageElement;
      const src = safeUrl(image.currentSrc || image.src || "", true);
      if (!src) return "";
      const alt = escapeAttribute(image.getAttribute("alt") || "");
      return '<img src="' + escapeAttribute(src) + '" alt="' + alt + '">';
    }

    const open: string[] = [];
    const close: string[] = [];
    function wrap(name: string, attributes?: string) {
      open.push("<" + name + (attributes || "") + ">");
      close.unshift("</" + name + ">");
    }

    // Structural tags, kept only when the user opted in.
    if (options.keepHeadings && /^H[1-6]$/.test(tag)) {
      wrap(tag.toLowerCase());
    } else if (options.keepLists && (tag === "UL" || tag === "OL" || tag === "LI")) {
      wrap(tag.toLowerCase());
    } else if (options.keepLinks && tag === "A") {
      const href = safeUrl((element as HTMLAnchorElement).href || "", false);
      wrap("a", href ? ' href="' + escapeAttribute(href) + '"' : undefined);
    } else if (options.keepCode && (tag === "CODE" || tag === "PRE" || tag === "KBD" || tag === "SAMP")) {
      wrap(tag === "PRE" ? "pre" : "code");
    } else if (options.keepTables && TABLE_TAGS.indexOf(tag) !== -1) {
      wrap(tag.toLowerCase());
    } else if (tag === "BLOCKQUOTE") {
      wrap("blockquote");
    }

    if (options.keepEmphasis) {
      const parent = element.parentElement;
      const inherited = parent ? window.getComputedStyle(parent) : null;

      // font-weight and font-style inherit, so only emit a tag where the value
      // *changes* - otherwise every descendant re-wraps and output nests forever.
      if (
        numericWeight(style.fontWeight) >= 600 &&
        (!inherited || numericWeight(inherited.fontWeight) < 600)
      ) {
        wrap("strong");
      }
      const italic = style.fontStyle === "italic" || style.fontStyle === "oblique";
      const parentItalic =
        inherited?.fontStyle === "italic" || inherited?.fontStyle === "oblique";
      if (italic && !parentItalic) wrap("em");

      // text-decoration propagates through boxes rather than inheriting, so the
      // computed value is unreliable here - trust the tags instead.
      if (tag === "U" || tag === "INS") wrap("u");
      if (tag === "S" || tag === "STRIKE" || tag === "DEL") wrap("s");
      if (tag === "MARK") wrap("mark");
      if (tag === "SUP") wrap("sup");
      if (tag === "SUB") wrap("sub");
    }

    const inner = serializeChildren(element);
    if (!inner && tag !== "TD" && tag !== "TH") return "";

    let html = open.join("") + inner + close.join("");

    // Give bare block containers a paragraph break, but never wrap content that
    // already contains block-level tags (that would produce invalid HTML).
    const isBlock =
      BLOCKISH.indexOf(tag) !== -1 ||
      style.display === "block" ||
      style.display === "flex" ||
      style.display === "grid";
    if (
      open.length === 0 &&
      isBlock &&
      !/<(p|ul|ol|li|h[1-6]|table|tr|td|th|blockquote|pre|hr)\b/i.test(html)
    ) {
      html = "<p>" + html + "</p>";
    }

    return html;
  }

  const anchor =
    range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? (range.commonAncestorContainer as Element)
      : range.commonAncestorContainer.parentElement;

  const html = anchor ? serialize(anchor) : escapeText(text);

  if (!text.trim() && !html.trim()) return null;

  return { text, html: html || escapeText(text), focused };
}
