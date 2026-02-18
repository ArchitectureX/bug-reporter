import { BugReporterError } from "../types";
import type {
  BugReportPayload,
  BugReportResponse,
  CapturedAsset,
  DiagnosticsSnapshot,
  ReportDraft,
  RequiredBugReporterConfig
} from "../types";
import { createStorageProvider } from "../storage";
import { uploadAssets } from "./upload";
import { splitSteps } from "./utils";

type SubmitReportOptions = {
  config: RequiredBugReporterConfig;
  draft: ReportDraft;
  diagnostics: DiagnosticsSnapshot;
  assets: CapturedAsset[];
  onUploadProgress?: (progress: number) => void;
};

export async function submitReport(options: SubmitReportOptions): Promise<BugReportResponse> {
  const provider = createStorageProvider(options.config);
  const assetReferences = await uploadAssets({
    provider,
    assets: options.assets,
    retries: 2,
    onProgress: options.onUploadProgress
  });

  const payloadBase: BugReportPayload = {
    title: options.draft.title,
    description: options.draft.description,
    steps: splitSteps(options.draft.stepsToReproduce),
    expectedBehavior: options.draft.expectedBehavior,
    actualBehavior: options.draft.actualBehavior,
    diagnostics: options.diagnostics,
    assets: assetReferences,
    projectId: options.config.projectId,
    appVersion: options.config.appVersion,
    environment: options.config.environment,
    user: options.config.user
  };

  const transformed = options.config.hooks.beforeSubmit ? await options.config.hooks.beforeSubmit(payloadBase) : payloadBase;
  if (!transformed) {
    throw new BugReporterError("ABORTED", "Submission aborted by beforeSubmit hook.");
  }

  console.log("[bug-reporter] payload to submit", transformed);
  console.log("[bug-reporter] payload to submit (json)", JSON.stringify(transformed, null, 2));

  const response = await fetch(options.config.apiEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...options.config.auth.headers
    },
    credentials: options.config.auth.withCredentials ? "include" : "same-origin",
    body: JSON.stringify(transformed)
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new BugReporterError("SUBMIT_ERROR", `Report submit failed (${response.status}): ${body || response.statusText}`);
  }

  return (await response.json()) as BugReportResponse;
}
