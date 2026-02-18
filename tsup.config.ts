import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/styles/index.css"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: true,
  treeshake: true,
  minify: false,
  external: ["react", "react-dom"],
  outDir: "dist"
});
