import type { ConsoleLogEntry } from "../types";

type ConsoleLevel = "log" | "info" | "warn" | "error";

export class ConsoleBuffer {
  private readonly entries: ConsoleLogEntry[] = [];
  private readonly originals = new Map<ConsoleLevel, (...args: unknown[]) => void>();
  private installed = false;
  private readonly onWindowError = (event: ErrorEvent) => {
    this.push("error", [event.message, event.error instanceof Error ? event.error.stack ?? "" : ""]);
  };
  private readonly onUnhandledRejection = (event: PromiseRejectionEvent) => {
    this.push("error", ["Unhandled promise rejection", event.reason]);
  };

  constructor(private readonly maxEntries: number) {}

  install(): void {
    if (this.installed) {
      return;
    }

    const levels: ConsoleLevel[] = ["log", "info", "warn", "error"];
    levels.forEach((level) => {
      const original = console[level];
      this.originals.set(level, original.bind(console));
      console[level] = ((...args: unknown[]) => {
        this.push(level, args);
        original(...args);
      }) as (...args: unknown[]) => void;
    });

    if (typeof window !== "undefined") {
      window.addEventListener("error", this.onWindowError);
      window.addEventListener("unhandledrejection", this.onUnhandledRejection);
    }

    this.installed = true;
  }

  uninstall(): void {
    if (!this.installed) {
      return;
    }

    this.originals.forEach((original, level) => {
      console[level] = original as typeof console.log;
    });
    this.originals.clear();

    if (typeof window !== "undefined") {
      window.removeEventListener("error", this.onWindowError);
      window.removeEventListener("unhandledrejection", this.onUnhandledRejection);
    }

    this.installed = false;
  }

  clear(): void {
    this.entries.length = 0;
  }

  snapshot(): ConsoleLogEntry[] {
    return [...this.entries];
  }

  private push(level: ConsoleLevel, args: unknown[]): void {
    const message = args
      .map((arg) => {
        if (typeof arg === "string") {
          return arg;
        }
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      })
      .join(" ");

    this.entries.push({
      level,
      message,
      timestamp: new Date().toISOString()
    });

    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
  }
}
