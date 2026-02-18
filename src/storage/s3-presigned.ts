import { BugReporterError } from "../types";
import type { AssetReference, StorageProvider, UploadFile, UploadInstruction } from "../types";
import type { PresignResponse } from "./provider";

type S3PresignedProviderOptions = {
  presignEndpoint: string;
  authHeaders?: Record<string, string>;
  withCredentials?: boolean;
  publicBaseUrl?: string;
};

export class S3PresignedProvider implements StorageProvider {
  constructor(private readonly options: S3PresignedProviderOptions) {}

  async prepareUploads(files: UploadFile[]): Promise<UploadInstruction[]> {
    const response = await fetch(this.options.presignEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...this.options.authHeaders
      },
      credentials: this.options.withCredentials ? "include" : "same-origin",
      body: JSON.stringify({ files })
    });

    if (!response.ok) {
      throw new BugReporterError("UPLOAD_ERROR", `Failed to prepare uploads (${response.status}).`);
    }

    const payload = (await response.json()) as PresignResponse;
    if (!payload.uploads?.length) {
      throw new BugReporterError("UPLOAD_ERROR", "Presign endpoint did not return upload instructions.");
    }

    return payload.uploads;
  }

  async upload(instruction: UploadInstruction, blob: Blob, onProgress?: (progress: number) => void): Promise<AssetReference> {
    onProgress?.(0);

    if (instruction.method === "POST" && instruction.fields) {
      const formData = new FormData();
      Object.entries(instruction.fields).forEach(([key, value]) => formData.append(key, value));
      formData.append("file", blob);

      const response = await fetch(instruction.uploadUrl, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new BugReporterError("UPLOAD_ERROR", `S3 form upload failed (${response.status}).`);
      }
    } else {
      const response = await fetch(instruction.uploadUrl, {
        method: instruction.method,
        headers: instruction.headers,
        body: blob
      });

      if (!response.ok) {
        throw new BugReporterError("UPLOAD_ERROR", `S3 upload failed (${response.status}).`);
      }
    }

    onProgress?.(1);

    const publicUrl =
      instruction.publicUrl ??
      (this.options.publicBaseUrl && instruction.key ? `${this.options.publicBaseUrl.replace(/\/$/, "")}/${instruction.key}` : instruction.uploadUrl);

    return {
      id: instruction.id,
      type: instruction.type,
      key: instruction.key,
      url: publicUrl,
      mimeType: blob.type,
      size: blob.size
    };
  }
}
