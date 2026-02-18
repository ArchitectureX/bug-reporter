import type { NetworkRequestEntry } from "../types";

type XhrMeta = {
  method: string;
  url: string;
  startedAt: number;
  timestamp: string;
};

const xhrMeta = new WeakMap<XMLHttpRequest, XhrMeta>();

function extractUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return input.url;
}

function extractMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) {
    return String(init.method).toUpperCase();
  }
  if (typeof Request !== "undefined" && input instanceof Request) {
    return input.method.toUpperCase();
  }
  return "GET";
}

export class NetworkBuffer {
  private readonly entries: NetworkRequestEntry[] = [];
  private installed = false;
  private originalFetch?: typeof fetch;
  private originalXhrOpen?: XMLHttpRequest["open"];
  private originalXhrSend?: XMLHttpRequest["send"];

  constructor(private readonly maxEntries: number) {}

  install(): void {
    if (this.installed) {
      return;
    }

    this.installFetch();
    this.installXhr();
    this.installed = true;
  }

  uninstall(): void {
    if (!this.installed) {
      return;
    }

    if (this.originalFetch) {
      window.fetch = this.originalFetch;
    }

    if (this.originalXhrOpen) {
      XMLHttpRequest.prototype.open = this.originalXhrOpen;
    }

    if (this.originalXhrSend) {
      XMLHttpRequest.prototype.send = this.originalXhrSend;
    }

    this.installed = false;
  }

  clear(): void {
    this.entries.length = 0;
  }

  snapshot(): NetworkRequestEntry[] {
    return [...this.entries];
  }

  private installFetch(): void {
    if (typeof window === "undefined" || typeof window.fetch !== "function") {
      return;
    }

    this.originalFetch = window.fetch.bind(window);
    const originalFetch = this.originalFetch;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const timestamp = new Date().toISOString();
      const startedAt = performance.now();
      const method = extractMethod(input, init);
      const url = extractUrl(input);

      try {
        const response = await originalFetch(input, init);
        this.push({
          transport: "fetch",
          method,
          url,
          status: response.status,
          ok: response.ok,
          durationMs: Math.round(performance.now() - startedAt),
          timestamp
        });
        return response;
      } catch (error) {
        this.push({
          transport: "fetch",
          method,
          url,
          durationMs: Math.round(performance.now() - startedAt),
          timestamp,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    };
  }

  private installXhr(): void {
    if (typeof XMLHttpRequest === "undefined") {
      return;
    }

    this.originalXhrOpen = XMLHttpRequest.prototype.open;
    this.originalXhrSend = XMLHttpRequest.prototype.send;
    const buffer = this;

    XMLHttpRequest.prototype.open = function patchedOpen(
      method: string,
      url: string | URL,
      async?: boolean,
      username?: string | null,
      password?: string | null
    ): void {
      xhrMeta.set(this, {
        method: String(method || "GET").toUpperCase(),
        url: String(url),
        startedAt: 0,
        timestamp: ""
      });

      buffer.originalXhrOpen?.call(this, method, url, async ?? true, username ?? null, password ?? null);
    };

    XMLHttpRequest.prototype.send = function patchedSend(body?: Document | XMLHttpRequestBodyInit | null): void {
      const existing = xhrMeta.get(this);
      if (existing) {
        existing.startedAt = performance.now();
        existing.timestamp = new Date().toISOString();
        xhrMeta.set(this, existing);

        const onLoadEnd = () => {
          const meta = xhrMeta.get(this);
          if (!meta) {
            return;
          }

          buffer.push({
            transport: "xhr",
            method: meta.method,
            url: meta.url,
            status: this.status,
            ok: this.status >= 200 && this.status < 300,
            durationMs: Math.round(performance.now() - meta.startedAt),
            timestamp: meta.timestamp
          });

          xhrMeta.delete(this);
          this.removeEventListener("loadend", onLoadEnd);
          this.removeEventListener("error", onError);
        };

        const onError = () => {
          const meta = xhrMeta.get(this);
          if (!meta) {
            return;
          }

          buffer.push({
            transport: "xhr",
            method: meta.method,
            url: meta.url,
            status: this.status || undefined,
            ok: false,
            durationMs: Math.round(performance.now() - meta.startedAt),
            timestamp: meta.timestamp,
            error: "XMLHttpRequest failed"
          });

          xhrMeta.delete(this);
          this.removeEventListener("loadend", onLoadEnd);
          this.removeEventListener("error", onError);
        };

        this.addEventListener("loadend", onLoadEnd);
        this.addEventListener("error", onError);
      }

      buffer.originalXhrSend?.call(this, body);
    };
  }

  private push(entry: NetworkRequestEntry): void {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
  }
}
