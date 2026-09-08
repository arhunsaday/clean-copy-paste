import Browser from "webextension-polyfill";
import { handleDomRequest } from "@src/lib/clipboard-dom";
import { OFFSCREEN_TARGET, type DomRequest } from "@src/lib/messages";

/**
 * A service worker has no `document`, so clipboard reads/writes and Turndown's
 * HTML parsing happen here instead.
 */
Browser.runtime.onMessage.addListener((message) => {
  const request = message as (DomRequest & { target?: string }) | undefined;
  if (request?.target !== OFFSCREEN_TARGET) return undefined;
  return handleDomRequest(request);
});
