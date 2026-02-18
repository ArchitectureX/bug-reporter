import { BugReporterError } from "../types";
import type { AssetReference, CapturedAsset, StorageProvider, UploadFile } from "../types";
import { sleep } from "./utils";

type UploadAssetsOptions = {
  provider: StorageProvider;
  assets: CapturedAsset[];
  retries?: number;
  onProgress?: (progress: number) => void;
};

async function withRetry<T>(fn: () => Promise<T>, retries: number): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(300 * (attempt + 1));
      }
    }
  }
  throw lastError;
}

export async function uploadAssets(options: UploadAssetsOptions): Promise<AssetReference[]> {
  const files: UploadFile[] = options.assets.map((asset) => ({
    id: asset.id,
    name: asset.filename,
    type: asset.type,
    mimeType: asset.mimeType,
    size: asset.size
  }));

  const instructions = await options.provider.prepareUploads(files);
  const byId = new Map(instructions.map((instruction) => [instruction.id, instruction]));

  const refs: AssetReference[] = [];
  let completed = 0;

  for (const asset of options.assets) {
    const instruction = byId.get(asset.id);
    if (!instruction) {
      throw new BugReporterError("UPLOAD_ERROR", `No upload instruction for asset ${asset.id}.`);
    }

    const ref = await withRetry(
      () => options.provider.upload(instruction, asset.blob, (inner) => {
        const aggregate = (completed + inner) / options.assets.length;
        options.onProgress?.(aggregate);
      }),
      options.retries ?? 2
    );

    refs.push(ref);
    completed += 1;
    options.onProgress?.(completed / options.assets.length);
  }

  return refs;
}
