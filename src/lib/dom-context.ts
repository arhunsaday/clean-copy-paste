import Browser from "webextension-polyfill";
import { OFFSCREEN_TARGET, type DomRequest, type DomResponse } from "./messages";

const OFFSCREEN_URL = "src/pages/offscreen/index.html";

type OffscreenApi = {
  createDocument: (options: {
    url: string;
    reasons: string[];
    justification: string;
  }) => Promise<void>;
};

type ContextQuery = (filter: {
  contextTypes: string[];
}) => Promise<unknown[]>;

function offscreenApi(): OffscreenApi | null {
  const api = (Browser as unknown as { offscreen?: OffscreenApi }).offscreen;
  return api ?? null;
}

let pending: Promise<void> | null = null;

async function ensureOffscreenDocument(api: OffscreenApi): Promise<void> {
  // Called as a method: detaching it would drop `this`, and the polyfill passes
  // this newer API straight through rather than rebinding it.
  const runtime = Browser.runtime as unknown as { getContexts?: ContextQuery };
  if (typeof runtime.getContexts === "function") {
    const existing = await runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
    if (existing.length > 0) return;
  }

  if (pending) return pending;

  pending = api
    .createDocument({
      url: OFFSCREEN_URL,
      reasons: ["CLIPBOARD"],
      justification: "Read and write the clipboard and convert HTML to Markdown.",
    })
    .catch((error: unknown) => {
      // Two actions fired at once can both reach createDocument; the loser's
      // error just means the document it wanted already exists.
      const message = error instanceof Error ? error.message : String(error);
      if (!/single offscreen document|already exists/i.test(message)) throw error;
    })
    .finally(() => {
      pending = null;
    });

  return pending;
}

/**
 * Executes a DOM-dependent request in whichever context this browser gives us:
 * an offscreen document on Chrome, the background page itself on Firefox (where
 * MV3 background scripts still run in a document and `offscreen` does not exist).
 */
export async function runInDomContext(request: DomRequest): Promise<DomResponse> {
  const api = offscreenApi();

  if (!api) {
    // Imported lazily so Turndown is never pulled into a service worker bundle,
    // where its DOM dependencies would fail at module evaluation.
    const { handleDomRequest } = await import("./clipboard-dom");
    return handleDomRequest(request);
  }

  await ensureOffscreenDocument(api);
  const response = (await Browser.runtime.sendMessage({
    ...request,
    target: OFFSCREEN_TARGET,
  })) as DomResponse | undefined;

  return response ?? { ok: false, error: "The clipboard worker did not respond." };
}
