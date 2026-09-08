import { describe, expect, it } from "vitest";
import { restrictionFor } from "../restricted";

describe("restrictionFor", () => {
  it("allows ordinary web pages", () => {
    expect(restrictionFor("https://example.com/a?b=1#c")).toBeNull();
    expect(restrictionFor("http://localhost:3000/")).toBeNull();
  });

  it("allows local files, which work once file access is granted", () => {
    expect(restrictionFor("file:///Users/me/notes.txt")).toBeNull();
  });

  it("rejects browser-internal pages", () => {
    for (const url of [
      "chrome://settings",
      "about:preferences",
      "edge://flags",
      "devtools://devtools/bundled/inspector.html",
      "view-source:https://example.com",
      "moz-extension://abc/options.html",
    ]) {
      expect(restrictionFor(url), url).not.toBeNull();
    }
  });

  it("rejects the browsers' own add-on stores", () => {
    expect(restrictionFor("https://chromewebstore.google.com/detail/x")).not.toBeNull();
    expect(restrictionFor("https://chrome.google.com/webstore/detail/x")).not.toBeNull();
    expect(restrictionFor("https://addons.mozilla.org/en-US/firefox/")).not.toBeNull();
  });

  it("does not reject the rest of chrome.google.com", () => {
    expect(restrictionFor("https://chrome.google.com/")).toBeNull();
  });

  it("does not pre-block a url it cannot see", () => {
    // tab.url stays hidden until activeTab is granted; blocking on that would
    // reject ordinary pages, so an unknown url means "try it".
    expect(restrictionFor(undefined)).toBeNull();
    expect(restrictionFor("")).toBeNull();
    expect(restrictionFor("not a url")).toBeNull();
  });
});
