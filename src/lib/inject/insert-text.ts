export type InsertResult = { ok: boolean; reason?: "no-target" | "insert-failed" };

/**
 * Runs in the page. Inserts `text` at the caret of whatever is focused.
 *
 * MUST stay self-contained (see readSelection).
 */
export function insertText(text: string): InsertResult {
  function deepActiveElement(): Element | null {
    let node: Element | null = document.activeElement;
    for (;;) {
      const root = (node as { shadowRoot?: ShadowRoot | null } | null)?.shadowRoot;
      if (!root?.activeElement) return node;
      node = root.activeElement;
    }
  }

  const target = deepActiveElement();
  if (!target) return { ok: false, reason: "no-target" };

  const tag = target.tagName;
  const isField = tag === "INPUT" || tag === "TEXTAREA";
  const isEditable = (target as HTMLElement).isContentEditable === true;
  if (!isField && !isEditable) return { ok: false, reason: "no-target" };

  (target as HTMLElement).focus?.();

  // execCommand("insertText") is deprecated but remains the only insertion that
  // keeps the page's native undo stack and emits real beforeinput/input events -
  // which is what makes framework-controlled fields (React, Vue, Svelte) notice
  // the change at all.
  try {
    if (document.execCommand("insertText", false, text)) return { ok: true };
  } catch {
    // fall through to the manual paths
  }

  if (isField) {
    const field = target as HTMLInputElement | HTMLTextAreaElement;
    const value = field.value;
    let start = value.length;
    let end = value.length;
    try {
      if (field.selectionStart !== null) start = field.selectionStart;
      if (field.selectionEnd !== null) end = field.selectionEnd;
    } catch {
      // input type without selection support
    }

    const next = value.slice(0, start) + text + value.slice(end);

    // Assign through the prototype's setter: React overrides the instance
    // `value` property to track changes, and writing to it directly makes React
    // treat the new value as already-seen and skip the update.
    const prototype = tag === "INPUT" ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (setter) setter.call(field, next);
    else field.value = next;

    const caret = start + text.length;
    try {
      field.setSelectionRange(caret, caret);
    } catch {
      // input type without selection support
    }

    field.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    field.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    return { ok: true };
  }

  // contenteditable, where execCommand was refused
  const selection = document.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    target.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        composed: true,
        inputType: "insertText",
        data: text,
      }),
    );
    return { ok: true };
  }

  return { ok: false, reason: "insert-failed" };
}
