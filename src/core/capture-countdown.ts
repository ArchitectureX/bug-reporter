type CaptureCountdownMode = "recording" | "screenshot";

type CaptureCountdownOptions = {
  mode: CaptureCountdownMode;
  seconds?: number;
};

function getCountdownLabel(mode: CaptureCountdownMode): string {
  if (mode === "recording") {
    return "Starting recording in";
  }
  return "Taking screenshot in";
}

export async function runCaptureCountdown(options: CaptureCountdownOptions): Promise<void> {
  const seconds = Math.max(0, Math.floor(options.seconds ?? 3));

  if (seconds <= 0 || typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const container = document.createElement("div");
  container.setAttribute("data-bug-reporter-countdown", "true");
  container.style.position = "fixed";
  container.style.inset = "0";
  container.style.zIndex = "2147483647";
  container.style.display = "flex";
  container.style.alignItems = "center";
  container.style.justifyContent = "center";
  container.style.pointerEvents = "none";
  container.style.background = "rgba(15, 23, 42, 0.28)";

  const panel = document.createElement("div");
  panel.style.minWidth = "164px";
  panel.style.padding = "16px 20px";
  panel.style.borderRadius = "16px";
  panel.style.background = "rgba(15, 23, 42, 0.84)";
  panel.style.backdropFilter = "blur(4px)";
  panel.style.textAlign = "center";
  panel.style.boxShadow = "0 16px 32px rgba(0, 0, 0, 0.3)";
  panel.style.color = "#ffffff";

  const label = document.createElement("div");
  label.textContent = getCountdownLabel(options.mode);
  label.style.fontSize = "12px";
  label.style.lineHeight = "16px";
  label.style.opacity = "0.9";
  label.style.letterSpacing = "0.04em";
  label.style.textTransform = "uppercase";

  const value = document.createElement("div");
  value.textContent = `${seconds}`;
  value.style.marginTop = "6px";
  value.style.fontSize = "40px";
  value.style.fontWeight = "700";
  value.style.lineHeight = "40px";

  panel.appendChild(label);
  panel.appendChild(value);
  container.appendChild(panel);

  const parent = document.body ?? document.documentElement;
  if (!parent) {
    return;
  }
  parent.appendChild(container);

  await new Promise<void>((resolve) => {
    let remaining = seconds;
    let timer = 0;

    const cleanup = () => {
      if (timer) {
        window.clearTimeout(timer);
      }
      container.remove();
      resolve();
    };

    const tick = () => {
      remaining -= 1;
      if (remaining <= 0) {
        cleanup();
        return;
      }
      value.textContent = `${remaining}`;
      timer = window.setTimeout(tick, 1000);
    };

    timer = window.setTimeout(tick, 1000);
  });
}
