import { BugReporterError } from "../types";
import html2canvas from "html2canvas";
import { runCaptureCountdown } from "./capture-countdown";

type CaptureOptions = {
  maskSelectors: string[];
  redactTextPatterns: Array<string | RegExp>;
  allowDisplayMediaFallback?: boolean;
};

type SelectionRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type RectLike = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function waitForNextVideoFrame(video: HTMLVideoElement): Promise<void> {
  const withVideoFrameCallback = video as HTMLVideoElement & {
    requestVideoFrameCallback?: (callback: () => void) => number;
  };

  if (typeof withVideoFrameCallback.requestVideoFrameCallback === "function") {
    await new Promise<void>((resolve) => {
      withVideoFrameCallback.requestVideoFrameCallback?.(() => resolve());
    });
    return;
  }

  await wait(50);
}

function applyMasking(selectors: string[]): Array<{ element: HTMLElement; previous: string }> {
  const masked: Array<{ element: HTMLElement; previous: string }> = [];
  for (const selector of selectors) {
    document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
      masked.push({ element, previous: element.style.filter });
      element.style.filter = "blur(12px)";
    });
  }
  return masked;
}

function resetMasking(masked: Array<{ element: HTMLElement; previous: string }>): void {
  masked.forEach(({ element, previous }) => {
    element.style.filter = previous;
  });
}

function scrubText(root: HTMLElement, patterns: Array<string | RegExp>): Array<{ node: Text; previous: string }> {
  if (!patterns.length) {
    return [];
  }

  const walkers: Array<{ node: Text; previous: string }> = [];
  const regexes = patterns.map((pattern) => (typeof pattern === "string" ? new RegExp(pattern, "g") : pattern));
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const text = walker.currentNode as Text;
    let replaced = text.textContent ?? "";
    for (const regex of regexes) {
      replaced = replaced.replace(regex, "[redacted]");
    }
    if (replaced !== text.textContent) {
      walkers.push({ node: text, previous: text.textContent ?? "" });
      text.textContent = replaced;
    }
  }
  return walkers;
}

function restoreText(changed: Array<{ node: Text; previous: string }>): void {
  changed.forEach(({ node, previous }) => {
    node.textContent = previous;
  });
}

function createSelectionOverlay(): Promise<SelectionRect> {
  return new Promise((resolve, reject) => {
    const overlay = document.createElement("div");
    overlay.setAttribute("data-bug-reporter-overlay", "true");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0,0,0,0.35)";
    overlay.style.cursor = "crosshair";
    overlay.style.zIndex = "2147483647";

    const box = document.createElement("div");
    box.style.position = "fixed";
    box.style.border = "2px solid #ffffff";
    box.style.background = "rgba(27, 116, 228, 0.2)";
    box.style.pointerEvents = "none";
    box.style.display = "none";
    overlay.appendChild(box);

    const cleanup = () => {
      overlay.removeEventListener("mousedown", onMouseDown);
      overlay.removeEventListener("mousemove", onMouseMove);
      overlay.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("keydown", onKeyDown);
      overlay.remove();
    };

    let startX = 0;
    let startY = 0;
    let isDragging = false;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        cleanup();
        reject(new BugReporterError("ABORTED", "Screenshot capture cancelled."));
      }
    };

    const onMouseDown = (event: MouseEvent) => {
      isDragging = true;
      startX = event.clientX;
      startY = event.clientY;
      box.style.display = "block";
      box.style.left = `${startX}px`;
      box.style.top = `${startY}px`;
      box.style.width = "0px";
      box.style.height = "0px";
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!isDragging) {
        return;
      }
      const left = Math.min(startX, event.clientX);
      const top = Math.min(startY, event.clientY);
      const width = Math.abs(startX - event.clientX);
      const height = Math.abs(startY - event.clientY);
      box.style.left = `${left}px`;
      box.style.top = `${top}px`;
      box.style.width = `${width}px`;
      box.style.height = `${height}px`;
    };

    const onMouseUp = (event: MouseEvent) => {
      if (!isDragging) {
        return;
      }
      isDragging = false;
      const left = Math.min(startX, event.clientX);
      const top = Math.min(startY, event.clientY);
      const width = Math.abs(startX - event.clientX);
      const height = Math.abs(startY - event.clientY);
      cleanup();
      if (width < 8 || height < 8) {
        reject(new BugReporterError("CAPTURE_ERROR", "Selection area is too small."));
        return;
      }
      resolve({ left, top, width, height });
    };

    overlay.addEventListener("mousedown", onMouseDown);
    overlay.addEventListener("mousemove", onMouseMove);
    overlay.addEventListener("mouseup", onMouseUp);
    window.addEventListener("keydown", onKeyDown);
    document.body.appendChild(overlay);
  });
}

function rectsIntersect(a: RectLike, b: RectLike): boolean {
  return !(a.left + a.width <= b.left || b.left + b.width <= a.left || a.top + a.height <= b.top || b.top + b.height <= a.top);
}

function intersectsCrossOriginIframe(selection: SelectionRect): boolean {
  const iframes = Array.from(document.querySelectorAll("iframe"));
  for (const iframe of iframes) {
    const rect = iframe.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      continue;
    }

    if (
      !rectsIntersect(selection, {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      })
    ) {
      continue;
    }

    try {
      if (!iframe.contentWindow || !iframe.contentDocument) {
        return true;
      }

      // Accessing document on cross-origin iframes throws.
      void iframe.contentDocument.location.href;
    } catch {
      return true;
    }
  }

  return false;
}

async function captureWithDisplayMedia(selection: SelectionRect): Promise<Blob> {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new BugReporterError("CAPTURE_ERROR", "Screen-capture permission is not available in this browser.");
  }

  let stream: MediaStream | null = null;
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;

  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false
    });

    video.srcObject = stream;
    await video.play();

    if (!video.videoWidth || !video.videoHeight) {
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => resolve();
      });
    }

    if (!video.videoWidth || !video.videoHeight) {
      throw new BugReporterError("CAPTURE_ERROR", "Could not read screen-capture frame.");
    }

    await runCaptureCountdown({ mode: "screenshot", seconds: 3 });

    // Wait for fresh post-permission frames so browser permission UI does not leak into the capture.
    await waitForNextVideoFrame(video);
    await waitForNextVideoFrame(video);
    await wait(120);

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack || videoTrack.readyState === "ended") {
      throw new BugReporterError("ABORTED", "Screenshot capture cancelled.");
    }

    const scaleX = video.videoWidth / window.innerWidth;
    const scaleY = video.videoHeight / window.innerHeight;
    const sx = Math.max(0, Math.round(selection.left * scaleX));
    const sy = Math.max(0, Math.round(selection.top * scaleY));
    const sw = Math.max(1, Math.round(selection.width * scaleX));
    const sh = Math.max(1, Math.round(selection.height * scaleY));

    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new BugReporterError("CAPTURE_ERROR", "Canvas 2D context unavailable.");
    }

    context.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
    return await canvasToBlob(canvas);
  } catch (error) {
    if (error instanceof BugReporterError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "NotAllowedError") {
      throw new BugReporterError("PERMISSION_DENIED", "Permission denied for screen capture.", error);
    }

    throw new BugReporterError("CAPTURE_ERROR", "Screen-capture fallback failed.", error);
  } finally {
    stream?.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  }
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new BugReporterError("CAPTURE_ERROR", "Failed to build screenshot blob."));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

export async function captureScreenshotArea(options: CaptureOptions): Promise<Blob> {
  const selection = await createSelectionOverlay();
  const masked = applyMasking(options.maskSelectors);
  const textChanges = scrubText(document.body, options.redactTextPatterns);
  const hasCrossOriginIframeIntersection = intersectsCrossOriginIframe(selection);

  try {
    if (hasCrossOriginIframeIntersection) {
      if (options.allowDisplayMediaFallback) {
        return await captureWithDisplayMedia(selection);
      }

      throw new BugReporterError(
        "CAPTURE_ERROR",
        "Screenshot capture cannot include cross-origin iframe content. Select an area outside embedded third-party frames."
      );
    }

    await runCaptureCountdown({ mode: "screenshot", seconds: 3 });

    const baseCanvas = await html2canvas(document.documentElement, {
      useCORS: true,
      scrollX: -window.scrollX,
      scrollY: -window.scrollY,
      backgroundColor: null,
      logging: false,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight
    });

    const scaleX = baseCanvas.width / window.innerWidth;
    const scaleY = baseCanvas.height / window.innerHeight;

    const sx = Math.round(selection.left * scaleX);
    const sy = Math.round(selection.top * scaleY);
    const sw = Math.round(selection.width * scaleX);
    const sh = Math.round(selection.height * scaleY);

    const cropped = document.createElement("canvas");
    cropped.width = sw;
    cropped.height = sh;

    const context = cropped.getContext("2d");
    if (!context) {
      throw new BugReporterError("CAPTURE_ERROR", "Canvas 2D context unavailable.");
    }

    context.drawImage(baseCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
    return await canvasToBlob(cropped);
  } catch (error) {
    if (error instanceof BugReporterError) {
      throw error;
    }
    throw new BugReporterError("CAPTURE_ERROR", "Screenshot capture failed.", error);
  } finally {
    resetMasking(masked);
    restoreText(textChanges);
  }
}
