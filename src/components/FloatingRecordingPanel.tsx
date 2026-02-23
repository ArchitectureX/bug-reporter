import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { ThemeMode } from "../types";
import { getSharedRecordingState, stopSharedRecording, subscribeToSharedRecording } from "./StepRecording";

type FloatingRecordingPanelProps = {
  isMainPanelOpen: boolean;
  themeMode: ThemeMode;
  zIndex: number;
};

function formatSeconds(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

const THEME: Record<ThemeMode, { background: string; border: string; text: string; muted: string }> = {
  dark: {
    background: "rgba(7, 10, 14, 0.9)",
    border: "rgba(202, 219, 243, 0.28)",
    text: "#e9eff8",
    muted: "#a8b5c7"
  },
  light: {
    background: "rgba(248, 250, 252, 0.94)",
    border: "rgba(15, 23, 42, 0.22)",
    text: "#0f172a",
    muted: "#475569"
  }
};

export function FloatingRecordingPanel({ isMainPanelOpen, themeMode, zIndex }: FloatingRecordingPanelProps) {
  const [recordingState, setRecordingState] = useState(getSharedRecordingState);

  useEffect(() => {
    return subscribeToSharedRecording(() => {
      setRecordingState(getSharedRecordingState());
    });
  }, []);

  if (typeof document === "undefined" || !recordingState.isRecording || isMainPanelOpen) {
    return null;
  }

  const theme = THEME[themeMode];

  const containerStyle: CSSProperties = {
    position: "fixed",
    top: "calc(env(safe-area-inset-top, 0px) + 16px)",
    right: "calc(env(safe-area-inset-right, 0px) + 16px)",
    zIndex,
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 12px",
    borderRadius: "12px",
    border: `1px solid ${theme.border}`,
    background: theme.background,
    color: theme.text,
    boxShadow: "0 14px 32px rgba(0, 0, 0, 0.32)",
    backdropFilter: "blur(8px)"
  };

  const timerStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    fontWeight: 600
  };

  const labelStyle: CSSProperties = {
    color: theme.muted,
    fontSize: "12px",
    fontWeight: 500
  };

  const dotStyle: CSSProperties = {
    width: "8px",
    height: "8px",
    borderRadius: "999px",
    background: "#ef4444",
    boxShadow: "0 0 0 4px rgba(239, 68, 68, 0.18)"
  };

  const stopButtonStyle: CSSProperties = {
    border: "1px solid #dc2626",
    borderRadius: "10px",
    padding: "7px 10px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 700,
    color: "#ffffff",
    background: "#dc2626"
  };

  return createPortal(
    <div style={containerStyle}>
      <div style={timerStyle}>
        <span style={dotStyle} aria-hidden="true" />
        <span style={labelStyle}>Recording</span>
        <span>{formatSeconds(recordingState.seconds)}</span>
      </div>
      <button type="button" onClick={stopSharedRecording} style={stopButtonStyle}>
        Stop
      </button>
    </div>,
    document.body
  );
}
