import { afterEach, describe, expect, it, vi } from "vitest";
import { NetworkBuffer } from "../../src/diagnostics/network-buffer";

describe("NetworkBuffer", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("captures fetch requests", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    window.fetch = fetchMock as unknown as typeof fetch;

    const buffer = new NetworkBuffer(10);
    buffer.install();

    await fetch("/api/reports", { method: "POST" });

    buffer.uninstall();
    const entries = buffer.snapshot();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.transport).toBe("fetch");
    expect(entries[0]?.method).toBe("POST");
    expect(entries[0]?.url).toContain("/api/reports");
    expect(entries[0]?.status).toBe(201);
    expect(entries[0]?.ok).toBe(true);
  });

  it("captures fetch failures", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("request failed");
    });
    vi.stubGlobal("fetch", fetchMock);
    window.fetch = fetchMock as unknown as typeof fetch;

    const buffer = new NetworkBuffer(10);
    buffer.install();

    await expect(fetch("/api/fail")).rejects.toThrow("request failed");

    buffer.uninstall();
    const entries = buffer.snapshot();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.transport).toBe("fetch");
    expect(entries[0]?.url).toContain("/api/fail");
    expect(entries[0]?.error).toContain("request failed");
  });
});
