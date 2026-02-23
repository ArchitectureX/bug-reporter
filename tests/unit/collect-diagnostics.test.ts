import { describe, expect, it } from "vitest";
import { collectDiagnostics } from "../../src/diagnostics/collect";
import { withDefaults } from "../../src/core/defaults";

describe("collectDiagnostics", () => {
  it("includes only error-level logs", () => {
    const config = withDefaults({
      storage: {
        mode: "proxy"
      }
    });

    const diagnostics = collectDiagnostics(config, {
      logs: [
        { level: "log", message: "plain log", timestamp: new Date().toISOString() },
        { level: "warn", message: "warning", timestamp: new Date().toISOString() },
        { level: "error", message: "error one", timestamp: new Date().toISOString() },
        { level: "info", message: "info", timestamp: new Date().toISOString() },
        { level: "error", message: "error two", timestamp: new Date().toISOString() }
      ]
    });

    expect(diagnostics.logs).toEqual([
      expect.objectContaining({ level: "error", message: "error one" }),
      expect.objectContaining({ level: "error", message: "error two" })
    ]);
  });

  it("includes only failed/error requests", () => {
    const config = withDefaults({
      storage: {
        mode: "proxy"
      }
    });

    const diagnostics = collectDiagnostics(config, {
      requests: [
        {
          transport: "fetch",
          method: "GET",
          url: "/ok",
          status: 200,
          ok: true,
          durationMs: 10,
          timestamp: new Date().toISOString()
        },
        {
          transport: "fetch",
          method: "GET",
          url: "/bad-request",
          status: 400,
          ok: false,
          durationMs: 9,
          timestamp: new Date().toISOString()
        },
        {
          transport: "xhr",
          method: "POST",
          url: "/network-failure",
          durationMs: 7,
          timestamp: new Date().toISOString(),
          error: "network error"
        }
      ]
    });

    expect(diagnostics.requests).toEqual([
      expect.objectContaining({ url: "/bad-request" }),
      expect.objectContaining({ url: "/network-failure" })
    ]);
  });
});
