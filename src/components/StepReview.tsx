import { useEffect, useMemo, useState } from "react";
import type { DiagnosticsPreview } from "../types";
import { useBugReporter } from "../hooks";

type StepReviewProps = {
  onBack: () => void;
};

const EMPTY_PREVIEW: DiagnosticsPreview = {
  errorLogs: [],
  failedRequests: []
};

export function StepReview({ onBack }: StepReviewProps) {
  const {
    config,
    state: { assets, draft, isSubmitting, uploadProgress, error },
    submit,
    retrySubmit,
    getDiagnosticsPreview
  } = useBugReporter();

  const [diagnosticsPreviewState, setDiagnosticsPreviewState] = useState<DiagnosticsPreview>(EMPTY_PREVIEW);

  useEffect(() => {
    const refresh = () => {
      setDiagnosticsPreviewState(getDiagnosticsPreview());
    };

    refresh();
    const interval = window.setInterval(refresh, 500);
    return () => window.clearInterval(interval);
  }, [getDiagnosticsPreview]);

  const diagnosticsPreview = useMemo(
    () => ({
      url: typeof window === "undefined" ? "" : window.location.href,
      viewport:
        typeof window === "undefined"
          ? ""
          : `${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio || 1}`,
      language: typeof navigator === "undefined" ? "" : navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }),
    []
  );

  return (
    <div className="br-step">
      <h2>Review and submit</h2>
      <p>Confirm details, then send your report.</p>

      <div className="br-summary">
        <strong>{draft.title || "Untitled bug report"}</strong>
        <p>{draft.description || "No description provided."}</p>
      </div>

      <div className="br-assets">
        {assets.map((asset) => (
          <div key={asset.id} className="br-asset-card">
            <span className="br-asset-type">{asset.type}</span>
            {asset.type === "recording" ? (
              <video src={asset.previewUrl} controls className="br-preview" />
            ) : (
              <img src={asset.previewUrl} alt={`${asset.type} preview`} className="br-preview" />
            )}
          </div>
        ))}
      </div>

      <div className="br-diagnostics">
        <h3>Diagnostics summary</h3>
        <ul>
          <li>URL: {diagnosticsPreview.url}</li>
          <li>Viewport: {diagnosticsPreview.viewport}</li>
          <li>Language: {diagnosticsPreview.language}</li>
          <li>Timezone: {diagnosticsPreview.timezone}</li>
        </ul>
      </div>

      {config.features.consoleLogs ? (
        <div className="br-diagnostics">
          <h3>Console errors captured ({diagnosticsPreviewState.errorLogs.length})</h3>
          {diagnosticsPreviewState.errorLogs.length ? (
            <ul className="br-diagnostics-list">
              {diagnosticsPreviewState.errorLogs.slice(-20).map((entry, index) => (
                <li key={`${entry.timestamp}-${index}`}>
                  <code>{entry.timestamp}</code> {entry.message}
                </li>
              ))}
            </ul>
          ) : (
            <p>No console errors captured in this session.</p>
          )}
        </div>
      ) : null}

      {config.features.networkInfo ? (
        <div className="br-diagnostics">
          <h3>Network failures captured ({diagnosticsPreviewState.failedRequests.length})</h3>
          {diagnosticsPreviewState.failedRequests.length ? (
            <ul className="br-diagnostics-list">
              {diagnosticsPreviewState.failedRequests.slice(-20).map((request, index) => (
                <li key={`${request.timestamp}-${request.url}-${index}`}>
                  <code>{request.timestamp}</code> {request.method} {request.url} - status {request.status ?? "n/a"}
                  {request.error ? ` (${request.error})` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p>No failed requests captured in this session.</p>
          )}
        </div>
      ) : null}

      {isSubmitting ? (
        <div className="br-upload-progress" aria-live="polite">
          Uploading assets: {Math.round(uploadProgress * 100)}%
          <div className="br-progress-track">
            <div className="br-progress-fill" style={{ width: `${Math.round(uploadProgress * 100)}%` }} />
          </div>
        </div>
      ) : null}

      {error ? <p className="br-error">{error}</p> : null}

      <div className="br-actions">
        <button type="button" className="br-btn br-btn-secondary" onClick={onBack} disabled={isSubmitting}>
          Back
        </button>
        <button type="button" className="br-btn br-btn-secondary" onClick={retrySubmit} disabled={!error || isSubmitting}>
          Retry
        </button>
        <button type="button" className="br-btn br-btn-primary" onClick={submit} disabled={isSubmitting}>
          Submit report
        </button>
      </div>
    </div>
  );
}
