export type TargetProbe = {
  /** This frame holds a focusable text entry point. */
  hasTarget: boolean;
  /** This frame is the one the user is typing in. */
  focused: boolean;
};

/**
 * Runs in the page. Reports whether this frame owns the caret.
 *
 * Every frame keeps its own `activeElement` even while unfocused, so pasting
 * into "any frame that looks editable" would paste into several at once. This
 * probe runs first so exactly one frame is chosen.
 *
 * MUST stay self-contained (see readSelection).
 */
export function probeTarget(): TargetProbe {
  function deepActiveElement(): Element | null {
    let node: Element | null = document.activeElement;
    for (;;) {
      const root = (node as { shadowRoot?: ShadowRoot | null } | null)?.shadowRoot;
      if (!root?.activeElement) return node;
      node = root.activeElement;
    }
  }

  const target = deepActiveElement();
  const tag = target?.tagName;
  const hasTarget =
    !!target &&
    (tag === "INPUT" || tag === "TEXTAREA" || (target as HTMLElement).isContentEditable === true);

  return { hasTarget, focused: document.hasFocus() };
}
