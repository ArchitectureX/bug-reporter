import { BugReporterError } from "../types";

export type RecordingResult = {
  blob: Blob;
  mimeType: string;
  durationMs: number;
};

export type ActiveRecording = {
  stop: () => void;
  cancel: () => void;
  promise: Promise<RecordingResult>;
};

type StartRecordingOptions = {
  maxSeconds: number;
  maxBytes: number;
  entireScreenOnly?: boolean;
  onTick?: (seconds: number) => void;
};

function pickMimeType(): string {
  const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  for (const candidate of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }
  return "video/webm";
}

export async function startScreenRecording(options: StartRecordingOptions): Promise<ActiveRecording> {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new BugReporterError("RECORDING_ERROR", "Screen recording is not supported by this browser.");
  }

  let stream: MediaStream;
  try {
    const videoConstraint: MediaTrackConstraints | boolean = options.entireScreenOnly ? { displaySurface: "monitor" } : true;
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: videoConstraint,
      audio: false
    });
  } catch (error) {
    throw new BugReporterError("PERMISSION_DENIED", "Permission denied for screen recording.", error);
  }

  if (options.entireScreenOnly) {
    const videoTrack = stream.getVideoTracks()[0];
    const surface = videoTrack?.getSettings().displaySurface;
    if (surface && surface !== "monitor") {
      stream.getTracks().forEach((track) => track.stop());
      throw new BugReporterError("VALIDATION_ERROR", "Please choose Entire Screen to record.");
    }
  }

  const mimeType = pickMimeType();
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, { mimeType });
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    throw new BugReporterError("RECORDING_ERROR", "Could not initialize MediaRecorder.", error);
  }

  const chunks: Blob[] = [];
  const startedAt = Date.now();
  let latestSize = 0;
  let tickSeconds = 0;
  let completed = false;
  let isCancelled = false;

  let resolvePromise: (value: RecordingResult) => void;
  let rejectPromise: (reason?: unknown) => void;

  const promise = new Promise<RecordingResult>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  const tickInterval = window.setInterval(() => {
    tickSeconds += 1;
    options.onTick?.(tickSeconds);
  }, 1000);

  const hardStop = window.setTimeout(() => {
    if (recorder.state !== "inactive") {
      recorder.stop();
    }
  }, options.maxSeconds * 1000);

  const teardown = () => {
    if (completed) {
      return;
    }
    completed = true;
    window.clearInterval(tickInterval);
    window.clearTimeout(hardStop);
    stream.getTracks().forEach((track) => track.stop());
  };

  recorder.addEventListener("dataavailable", (event) => {
    if (!event.data || event.data.size === 0) {
      return;
    }
    chunks.push(event.data);
    latestSize += event.data.size;
    if (latestSize > options.maxBytes) {
      isCancelled = true;
      recorder.stop();
      rejectPromise(
        new BugReporterError(
          "VALIDATION_ERROR",
          `Recording exceeds max size (${Math.round(options.maxBytes / 1024 / 1024)}MB).`
        )
      );
    }
  });

  recorder.addEventListener("error", (event) => {
    teardown();
    rejectPromise(new BugReporterError("RECORDING_ERROR", "Recording failed.", event));
  });

  recorder.addEventListener("stop", () => {
    teardown();
    if (isCancelled) {
      return;
    }
    const blob = new Blob(chunks, { type: mimeType });
    resolvePromise({
      blob,
      mimeType,
      durationMs: Date.now() - startedAt
    });
  });

  recorder.start(300);

  return {
    stop: () => {
      if (recorder.state !== "inactive") {
        recorder.stop();
      }
    },
    cancel: () => {
      isCancelled = true;
      if (recorder.state !== "inactive") {
        recorder.stop();
      }
      teardown();
      rejectPromise(new BugReporterError("ABORTED", "Recording cancelled by user."));
    },
    promise
  };
}
