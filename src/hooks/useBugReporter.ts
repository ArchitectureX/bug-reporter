
import { useContext } from "react";
import { BugReporterContext } from "../core/context";

export function useBugReporter() {
  const context = useContext(BugReporterContext);
  if (!context) {
    throw new Error("useBugReporter must be used inside BugReporterProvider.");
  }
  return context;
}
