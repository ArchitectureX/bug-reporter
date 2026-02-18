import { BugReporterError } from "../types";

export function uid(prefix = "br"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function splitSteps(input: string): string[] {
  return input
    .split(/\n+/)
    .map((step) => step.trim())
    .filter(Boolean);
}

export function blobToObjectUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

export function revokeObjectUrl(url?: string): void {
  if (!url) {
    return;
  }
  URL.revokeObjectURL(url);
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new BugReporterError("SUBMIT_ERROR", `Request failed (${response.status}): ${body || response.statusText}`);
  }
  return (await response.json()) as T;
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
