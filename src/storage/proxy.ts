import { BugReporterError } from "../types";
import type { AssetReference, StorageProvider, UploadFile, UploadInstruction } from "../types";

type ProxyProviderOptions = {
  uploadEndpoint: string;
  authHeaders?: Record<string, string>;
  withCredentials?: boolean;
};

export class ProxyProvider implements StorageProvider {
  constructor(private readonly options: ProxyProviderOptions) {}

  async prepareUploads(files: UploadFile[]): Promise<UploadInstruction[]> {
    return files.map((file) => ({
      id: file.id,
      method: "POST",
      uploadUrl: this.options.uploadEndpoint,
      headers: this.options.authHeaders,
      type: file.type
    }));
  }

  async upload(instruction: UploadInstruction, blob: Blob, onProgress?: (progress: number) => void): Promise<AssetReference> {
    onProgress?.(0);
    const response = await fetch(instruction.uploadUrl, {
      method: "POST",
      headers: {
        "content-type": blob.type || "application/octet-stream",
        "x-bug-reporter-asset-id": instruction.id,
        "x-bug-reporter-asset-type": instruction.type,
        ...instruction.headers
      },
      credentials: this.options.withCredentials ? "include" : "same-origin",
      body: blob
    });

    if (!response.ok) {
      throw new BugReporterError("UPLOAD_ERROR", `Proxy upload failed (${response.status}).`);
    }

    const payload = (await response.json()) as { url: string; key?: string };
    onProgress?.(1);

    return {
      id: instruction.id,
      type: instruction.type,
      url: payload.url,
      key: payload.key,
      mimeType: blob.type,
      size: blob.size
    };
  }
}
