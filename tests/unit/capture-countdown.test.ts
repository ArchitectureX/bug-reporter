// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { runCaptureCountdown } from "../../src/core/capture-countdown";

describe("runCaptureCountdown", () => {
  it("shows a 3, 2, 1 countdown and removes the overlay", async () => {
    vi.useFakeTimers();

    const countdownPromise = runCaptureCountdown({ mode: "recording", seconds: 3 });

    const overlay = document.querySelector('[data-bug-reporter-countdown="true"]');
    expect(overlay).not.toBeNull();
    expect(overlay?.textContent).toContain("3");

    await vi.advanceTimersByTimeAsync(1000);
    expect(overlay?.textContent).toContain("2");

    await vi.advanceTimersByTimeAsync(1000);
    expect(overlay?.textContent).toContain("1");

    await vi.advanceTimersByTimeAsync(1000);
    await countdownPromise;

    expect(document.querySelector('[data-bug-reporter-countdown="true"]')).toBeNull();
    vi.useRealTimers();
  });
});
