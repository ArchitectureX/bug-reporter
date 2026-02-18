
import { useMemo, useRef, useState } from "react";
import { loadScreenshotCapture } from "../core/lazy";
import { blobToObjectUrl, uid } from "../core/utils";
import { validateScreenshotSize } from "../core/validation";
import { useBugReporter } from "../hooks";
import { AnnotationCanvas, type AnnotationCanvasHandle } from "./AnnotationCanvas";

type StepScreenshotProps = {
  onBack: () => void;
  onNext: () => void;
};

export function StepScreenshot({ onBack, onNext }: StepScreenshotProps) {
  const {
    config,
    state: { assets },
    setScreenshot
  } = useBugReporter();

  const screenshot = useMemo(() => assets.find((asset) => asset.type === "screenshot"), [assets]);
  const annotationRef = useRef<AnnotationCanvasHandle | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCapture = async () => {
    setError(null);
    setIsCapturing(true);
    try {
      const capture = await loadScreenshotCapture();
      const blob = await capture.captureScreenshotArea({
        maskSelectors: config.privacy.maskSelectors,
        redactTextPatterns: config.privacy.redactTextPatterns
      });
      validateScreenshotSize(blob.size, config.storage.limits.maxScreenshotBytes);
      setScreenshot({
        id: uid("screenshot"),
        type: "screenshot",
        blob,
        previewUrl: blobToObjectUrl(blob),
        mimeType: blob.type || "image/png",
        filename: `screenshot-${Date.now()}.png`,
        size: blob.size
      });
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : "Screenshot capture failed.");
    } finally {
      setIsCapturing(false);
    }
  };

  const continueToNext = async () => {
    if (!screenshot) {
      setError("Take a screenshot or skip this step in config.");
      return;
    }

    if (config.features.annotations && annotationRef.current?.hasAnnotations()) {
      const annotatedBlob = await annotationRef.current.exportBlob();
      validateScreenshotSize(annotatedBlob.size, config.storage.limits.maxScreenshotBytes);
      setScreenshot({
        ...screenshot,
        blob: annotatedBlob,
        previewUrl: blobToObjectUrl(annotatedBlob),
        mimeType: annotatedBlob.type || "image/png",
        size: annotatedBlob.size
      });
    }

    onNext();
  };

  return (
    <div className="br-step">
      <h2>Capture screenshot</h2>
      <p>Select an area of the screen to capture.</p>

      <div className="br-actions">
        <button type="button" className="br-btn br-btn-secondary" onClick={onBack}>
          Back
        </button>
        <button type="button" className="br-btn br-btn-primary" onClick={startCapture} disabled={isCapturing}>
          {isCapturing ? "Capturing..." : screenshot ? "Retake screenshot" : "Capture area"}
        </button>
      </div>

      {screenshot ? (
        <div className="br-preview-wrapper">
          <img src={screenshot.previewUrl} alt="Screenshot preview" className="br-preview" />
          {config.features.annotations ? <AnnotationCanvas ref={annotationRef} imageUrl={screenshot.previewUrl} /> : null}
        </div>
      ) : null}

      {error ? <p className="br-error">{error}</p> : null}

      <div className="br-actions">
        <button type="button" className="br-btn br-btn-primary" onClick={continueToNext}>
          Continue
        </button>
      </div>
    </div>
  );
}
