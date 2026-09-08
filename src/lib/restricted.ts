/**
 * Pages no extension may script. Detected up front so the user gets a real
 * explanation instead of a silent no-op.
 */
const RESTRICTED_SCHEMES =
  /^(chrome|chrome-untrusted|chrome-extension|moz-extension|extension|about|edge|devtools|view-source|resource|data|blob|opera|vivaldi|brave):/i;

const RESTRICTED_HOSTS = [
  "chromewebstore.google.com",
  "addons.mozilla.org",
  "microsoftedge.microsoft.com",
];

/**
 * Returns why this page cannot be scripted, or null to go ahead and try.
 *
 * An unknown url is deliberately *not* a restriction: without the `tabs` or host
 * permissions the url is hidden until activeTab is granted, so treating "unknown"
 * as "blocked" would reject ordinary pages. Let the injection raise the real
 * error instead of guessing.
 */
export function restrictionFor(url: string | undefined): string | null {
  if (!url) return null;

  if (RESTRICTED_SCHEMES.test(url)) {
    return "Browser-internal pages can't be scripted by extensions.";
  }

  try {
    const { hostname, pathname } = new URL(url);
    if (RESTRICTED_HOSTS.includes(hostname)) {
      return "The browser blocks extensions on its own add-on store.";
    }
    if (hostname === "chrome.google.com" && pathname.startsWith("/webstore")) {
      return "The browser blocks extensions on its own add-on store.";
    }
  } catch {
    // Not parseable as a url; let the injection attempt produce the real error.
    return null;
  }

  return null;
}
