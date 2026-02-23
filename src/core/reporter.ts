import type { Reporter } from "../types";

type ReporterInput = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  ip?: string;
  anonymous?: boolean;
};

const IP_ENDPOINTS = ["https://api64.ipify.org?format=json", "https://api.ipify.org?format=json"];
const IP_LOOKUP_TIMEOUT_MS = 1800;

let cachedIp: string | undefined;
let ipLookupPromise: Promise<string | undefined> | null = null;

function isLikelyIp(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  const ipv4 = /^(25[0-5]|2[0-4]\d|[01]?\d?\d)(\.(25[0-5]|2[0-4]\d|[01]?\d?\d)){3}$/;
  if (ipv4.test(trimmed)) {
    return true;
  }

  const ipv6 = /^[0-9a-fA-F:]+$/;
  return trimmed.includes(":") && ipv6.test(trimmed);
}

async function fetchIpFromEndpoint(url: string): Promise<string | undefined> {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : undefined;
  const timeout = typeof window !== "undefined" ? window.setTimeout(() => controller?.abort(), IP_LOOKUP_TIMEOUT_MS) : undefined;

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller?.signal
    });

    if (!response.ok) {
      return undefined;
    }

    const body = (await response.json().catch(() => undefined)) as { ip?: unknown } | undefined;
    const ip = typeof body?.ip === "string" ? body.ip.trim() : "";
    return isLikelyIp(ip) ? ip : undefined;
  } catch {
    return undefined;
  } finally {
    if (typeof timeout === "number") {
      window.clearTimeout(timeout);
    }
  }
}

async function resolvePublicIp(): Promise<string | undefined> {
  if (cachedIp) {
    return cachedIp;
  }

  if (ipLookupPromise) {
    return ipLookupPromise;
  }

  ipLookupPromise = (async () => {
    for (const endpoint of IP_ENDPOINTS) {
      const ip = await fetchIpFromEndpoint(endpoint);
      if (ip) {
        cachedIp = ip;
        return ip;
      }
    }
    return undefined;
  })();

  try {
    return await ipLookupPromise;
  } finally {
    ipLookupPromise = null;
  }
}

export async function resolveReporter(input?: ReporterInput): Promise<Reporter> {
  const ip = input?.ip ?? (await resolvePublicIp());
  const anonymous = input?.anonymous ?? !(input?.id || input?.email || input?.name);

  return {
    id: input?.id,
    name: input?.name,
    email: input?.email,
    role: input?.role,
    ip,
    anonymous
  };
}
