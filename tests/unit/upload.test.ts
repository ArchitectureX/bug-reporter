import { describe, expect, it, vi } from "vitest";
import { uploadAssets } from "../../src/core/upload";
import type { CapturedAsset, StorageProvider } from "../../src/types";

describe("uploadAssets", () => {
  it("uploads assets using provider instructions", async () => {
    const provider: StorageProvider = {
      prepareUploads: vi.fn(async (files) =>
        files.map((file: { id: string; type: "screenshot" | "recording" | "attachment" }) => ({
          id: file.id,
          method: "PUT",
          uploadUrl: `/upload/${file.id}`,
          type: file.type
        }))
      ),
      upload: vi.fn(async (instruction, blob) => ({
        id: instruction.id,
        type: instruction.type,
        url: instruction.uploadUrl,
        size: blob.size
      }))
    };

    const blob = new Blob(["hello"], { type: "text/plain" });
    const assets: CapturedAsset[] = [
      {
        id: "asset-1",
        type: "screenshot",
        blob,
        previewUrl: "blob://asset-1",
        mimeType: blob.type,
        filename: "asset.txt",
        size: blob.size
      }
    ];

    const refs = await uploadAssets({ provider, assets });
    expect(refs).toHaveLength(1);
    expect(refs[0].url).toContain("/upload/asset-1");
    expect(provider.prepareUploads).toHaveBeenCalledOnce();
    expect(provider.upload).toHaveBeenCalledOnce();
  });
});
