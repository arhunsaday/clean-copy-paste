/**
 * Guards an invariant that is invisible in the source.
 *
 * `chrome.scripting.executeScript({ func })` ships a function to the page by
 * calling `Function.prototype.toString()` on it. Anything the function closes
 * over - an import, a module-level constant, a helper defined next to it - is
 * NOT serialised, so the injected copy throws a ReferenceError in the page while
 * the extension's own bundle stays perfectly valid. Nothing in the type system
 * or the linter catches it.
 *
 * This walks the built bundles, finds each injected function after minification,
 * and fails the build if any of them references a name it does not itself
 * declare (beyond the standard globals a page provides).
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const acorn = require("acorn");
const walk = require("acorn-walk");

/** Marker string unique to each injected function after minification. */
const INJECTED = {
  readSelection: "commonAncestorContainer",
  insertText: "no-target",
  probeTarget: "hasTarget:",
  showToast: "bcp-toast-host",
};

const GLOBALS = new Set([
  "Object", "Array", "String", "Number", "Boolean", "Math", "JSON", "Date", "RegExp",
  "Error", "TypeError", "Promise", "Set", "Map", "WeakMap", "WeakSet", "Symbol", "BigInt",
  "Function", "Reflect", "Proxy", "parseInt", "parseFloat", "isNaN", "undefined", "NaN",
  "Infinity", "console", "globalThis", "arguments",
  "document", "window", "navigator", "Node", "Element", "HTMLElement", "HTMLInputElement",
  "HTMLTextAreaElement", "HTMLImageElement", "HTMLAnchorElement", "ShadowRoot", "Selection",
  "Range", "Text", "Event", "InputEvent", "ClipboardEvent", "ClipboardItem", "Blob",
  "DataTransfer", "requestAnimationFrame", "setTimeout", "clearTimeout", "getSelection",
  "DOMParser", "CSS", "customElements", "location",
]);

function jsFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...jsFiles(path));
    else if (entry.endsWith(".js")) out.push(path);
  }
  return out;
}

function collectFunctions(source) {
  const ast = acorn.parse(source, { ecmaVersion: "latest", sourceType: "module" });
  const found = [];
  walk.full(ast, (node) => {
    if (/^(FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/.test(node.type)) {
      found.push(node);
    }
  });
  return found;
}

function declaredNames(fn) {
  const names = new Set();
  const addPattern = (pattern) => {
    if (!pattern) return;
    switch (pattern.type) {
      case "Identifier":
        names.add(pattern.name);
        break;
      case "ObjectPattern":
        pattern.properties.forEach((p) => addPattern(p.value ?? p.argument));
        break;
      case "ArrayPattern":
        pattern.elements.forEach(addPattern);
        break;
      case "AssignmentPattern":
        addPattern(pattern.left);
        break;
      case "RestElement":
        addPattern(pattern.argument);
        break;
    }
  };

  fn.params.forEach(addPattern);
  if (fn.id) names.add(fn.id.name);

  walk.full(fn, (node) => {
    if (node.type === "VariableDeclarator") addPattern(node.id);
    else if (node.type === "FunctionDeclaration" && node.id) names.add(node.id.name);
    else if (node.type === "ClassDeclaration" && node.id) names.add(node.id.name);
    else if (node.type === "CatchClause") addPattern(node.param);
    else if (/^(FunctionExpression|ArrowFunctionExpression|FunctionDeclaration)$/.test(node.type)) {
      node.params.forEach(addPattern);
    }
  });

  return names;
}

function freeNames(fn) {
  const declared = declaredNames(fn);
  const free = new Set();
  walk.full(fn, (node, _state, _type, parent) => {
    if (node.type !== "Identifier") return;
    if (parent?.type === "MemberExpression" && parent.property === node && !parent.computed) return;
    if (parent?.type === "Property" && parent.key === node && !parent.computed) return;
    if (parent?.type === "MethodDefinition" && parent.key === node) return;
    if (/^(LabeledStatement|BreakStatement|ContinueStatement)$/.test(parent?.type)) return;
    if (declared.has(node.name) || GLOBALS.has(node.name)) return;
    free.add(node.name);
  });
  return [...free];
}

const targets = process.argv.slice(2);
if (targets.length === 0) {
  console.error("Usage: node scripts/check-injected.mjs <dist dir> [...]");
  process.exit(1);
}

let failures = 0;

for (const target of targets) {
  let files;
  try {
    files = jsFiles(target);
  } catch {
    console.error(`✗ ${target}: not built`);
    failures += 1;
    continue;
  }

  for (const [name, marker] of Object.entries(INJECTED)) {
    const matches = [];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      if (!source.includes(marker)) continue;
      for (const fn of collectFunctions(source)) {
        if (source.slice(fn.start, fn.end).includes(marker)) matches.push({ file, fn });
      }
    }

    if (matches.length === 0) {
      console.error(`✗ ${target} ${name}: not found in the bundle`);
      failures += 1;
      continue;
    }

    // The innermost match is the function itself rather than a wrapper.
    const { fn } = matches.reduce((a, b) =>
      b.fn.end - b.fn.start < a.fn.end - a.fn.start ? b : a,
    );
    const free = freeNames(fn);

    if (free.length > 0) {
      console.error(
        `✗ ${target} ${name}: closes over ${free.join(", ")} — it will throw once injected`,
      );
      failures += 1;
    } else {
      console.log(`✓ ${target} ${name}: self-contained (${fn.end - fn.start} bytes)`);
    }
  }
}

process.exit(failures > 0 ? 1 : 0);
