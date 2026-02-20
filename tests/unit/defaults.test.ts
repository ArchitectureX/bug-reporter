import { describe, expect, it } from "vitest";
import { withDefaults } from "../../src/core/defaults";

describe("withDefaults", () => {
  it("applies expected defaults", () => {
    const config = withDefaults({
      apiEndpoint: "/api/bug-reports",
      storage: {
        mode: "proxy",
        proxy: {
          uploadEndpoint: "/api/assets"
        }
      }
    });

    expect(config.features.screenshot).toBe(true);
    expect(config.features.recordingEntireScreenOnly).toBe(false);
    expect(config.storage.limits.maxVideoSeconds).toBe(21);
    expect(config.auth.withCredentials).toBe(false);
    expect(config.theme.position).toBe("bottom-right");
  });

  it("caps maxVideoSeconds to 21", () => {
    const config = withDefaults({
      storage: {
        mode: "proxy",
        limits: {
          maxVideoSeconds: 60
        }
      }
    });

    expect(config.storage.limits.maxVideoSeconds).toBe(21);
  });
});
