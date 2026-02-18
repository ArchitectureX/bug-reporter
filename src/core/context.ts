import { createContext } from "react";
import type { BugReporterContextValue } from "../types";

export const BugReporterContext = createContext<BugReporterContextValue | undefined>(undefined);
