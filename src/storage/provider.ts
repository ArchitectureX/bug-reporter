import type { AssetReference, StorageProvider, UploadFile, UploadInstruction } from "../types";

export type { AssetReference, StorageProvider, UploadFile, UploadInstruction };

export type PresignResponse = {
  uploads: UploadInstruction[];
};
