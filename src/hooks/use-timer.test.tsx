import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_AWAY_MS, useTimer } from "./use-timer";

// React's act() warns unless this is set.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let seen = 0;
function Probe({ running, initial }: { running: boolean; initial?: number }) {
  seen = useTimer(running, initial).elapsed;
  return null;
}

let visibility: DocumentVisibilityState = "visible";
function setVisibility(state: DocumentVisibilityState) {
  visibility = state;
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("useTimer", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    vi.useFakeTimers();
    visibility = "visible";
    vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
    container = document.createElement("div");
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const render = (running: boolean, initial?: number) =>
    act(() => root.render(<Probe running={running} initial={initial} />));
  const pass = (ms: number) => act(() => vi.advanceTimersByTime(ms));

  it("counts seconds from the resumed value while running", () => {
    render(true, 30);
    pass(10_000);
    expect(seen).toBe(40);
  });

  it("does not count while paused", () => {
    render(true);
    pass(5_000);
    render(false);
    pass(60_000);
    expect(seen).toBe(5);
    render(true);
    pass(3_000);
    expect(seen).toBe(8);
  });

  it("counts a short absence fully and caps a long one", () => {
    render(true);
    pass(10_000);
    act(() => setVisibility("hidden"));
    pass(90_000);
    act(() => setVisibility("visible"));
    expect(seen).toBe(100);

    act(() => setVisibility("hidden"));
    pass(60 * 60 * 1000);
    act(() => setVisibility("visible"));
    expect(seen).toBe(100 + MAX_AWAY_MS / 1000);
  });
});
