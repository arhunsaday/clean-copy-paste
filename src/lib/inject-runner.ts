import Browser from "webextension-polyfill";

export type FrameResult<T> = { frameId: number; result: T };

type ScriptingTarget = { tabId: number; allFrames?: boolean; frameIds?: number[] };

type ExecuteScript = <A extends unknown[], R>(injection: {
  target: ScriptingTarget;
  func: (...args: A) => R;
  args?: A;
}) => Promise<{ frameId: number; result: R | undefined; error?: unknown }[]>;

/**
 * `webextension-polyfill`'s bundled types predate the `func`/`args` form of
 * `scripting.executeScript`, which both Chrome and Firefox MV3 support.
 */
const executeScript = (Browser.scripting as unknown as { executeScript: ExecuteScript })
  .executeScript;

async function run<A extends unknown[], R>(
  target: ScriptingTarget,
  func: (...args: A) => R,
  args: A,
): Promise<FrameResult<NonNullable<Awaited<R>>>[]> {
  const results = await executeScript({ target, func, args });
  const collected: FrameResult<NonNullable<Awaited<R>>>[] = [];
  for (const entry of results) {
    // Frames that refused injection, or answered "nothing here", drop out so
    // callers only ever see frames that produced a real result.
    if (entry.error !== undefined || entry.result === undefined || entry.result === null) continue;
    collected.push({ frameId: entry.frameId, result: entry.result as NonNullable<Awaited<R>> });
  }
  return collected;
}

/**
 * Injects into every frame the extension may touch. Frames it cannot reach
 * (cross-origin without permission) drop out rather than failing the whole call,
 * so a selection inside an accessible iframe still works.
 */
export function runInAllFrames<A extends unknown[], R>(
  tabId: number,
  func: (...args: A) => R,
  args: A,
): Promise<FrameResult<NonNullable<Awaited<R>>>[]> {
  return run({ tabId, allFrames: true }, func, args);
}

export function runInFrame<A extends unknown[], R>(
  tabId: number,
  frameId: number,
  func: (...args: A) => R,
  args: A,
): Promise<FrameResult<NonNullable<Awaited<R>>>[]> {
  return run({ tabId, frameIds: [frameId] }, func, args);
}
