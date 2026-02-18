import { BugReporterError } from "../types";
import type { AssetReference, StorageProvider, UploadFile, UploadInstruction } from "../types";

type LocalPublicProviderOptions = {
  uploadEndpoint: string;
  publicBaseUrl?: string;
  authHeaders?: Record<string, string>;
  withCredentials?: boolean;
};

export class LocalPublicProvider implements StorageProvider {
  constructor(private readonly options: LocalPublicProviderOptions) {}

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
    const form = new FormData();
    form.append("file", blob, instruction.id);
    form.append("id", instruction.id);
    form.append("type", instruction.type);

    const response = await fetch(instruction.uploadUrl, {
      method: "POST",
      headers: instruction.headers,
      credentials: this.options.withCredentials ? "include" : "same-origin",
      body: form
    });

    if (!response.ok) {
      throw new BugReporterError("UPLOAD_ERROR", `Local upload failed (${response.status}).`);
    }

    const payload = (await response.json()) as { url: string; key?: string };
    onProgress?.(1);

    return {
      id: instruction.id,
      type: instruction.type,
      url:
        payload.url ||
        (payload.key && this.options.publicBaseUrl
          ? `${this.options.publicBaseUrl.replace(/\/$/, "")}/${payload.key}`
          : instruction.uploadUrl),
      key: payload.key,
      mimeType: blob.type,
      size: blob.size
    };
  }
}
