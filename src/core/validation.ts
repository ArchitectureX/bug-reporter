import { BugReporterError } from "../types";

export function validateScreenshotSize(size: number, maxBytes: number): void {
  if (size > maxBytes) {
    throw new BugReporterError(
      "VALIDATION_ERROR",
      `Screenshot exceeds max size (${Math.round(maxBytes / 1024 / 1024)}MB).`
    );
  }
}

export function validateVideoSize(size: number, maxBytes: number): void {
  if (size > maxBytes) {
    throw new BugReporterError("VALIDATION_ERROR", `Recording exceeds max size (${Math.round(maxBytes / 1024 / 1024)}MB).`);
  }
}
