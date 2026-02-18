import { afterEach, describe, expect, it } from "vitest";
import { ConsoleBuffer } from "../../src/diagnostics/console-buffer";

describe("ConsoleBuffer", () => {
  const buffer = new ConsoleBuffer(2);

  afterEach(() => {
    buffer.uninstall();
    buffer.clear();
  });

  it("keeps only bounded entries", () => {
    buffer.install();
    console.log("first");
    console.log("second");
    console.log("third");
    const snapshot = buffer.snapshot();
    expect(snapshot).toHaveLength(2);
    expect(snapshot[0].message).toContain("second");
    expect(snapshot[1].message).toContain("third");
  });
});
