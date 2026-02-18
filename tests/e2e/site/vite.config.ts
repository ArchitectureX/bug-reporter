import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: {
      "bug-reporter": path.resolve(__dirname, "../../../src/index.ts")
    }
  }
});
