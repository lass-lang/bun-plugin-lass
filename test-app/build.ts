/**
 * Build script for the test app.
 * Uses Bun.build with the lass plugin to compile .lass files.
 */
import lass from "../src/index.js";

const result = await Bun.build({
  entrypoints: ["./src/server.ts"],
  outdir: "./dist",
  plugins: [lass({ verbose: true })],
  target: "bun",
  minify: false,
});

if (!result.success) {
  console.error("Build failed:");
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

console.log("Build succeeded!");
console.log("Outputs:", result.outputs.map(o => o.path));
