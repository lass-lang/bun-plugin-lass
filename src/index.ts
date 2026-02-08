/**
 * @lass-lang/bun-plugin-lass
 *
 * Bun plugin for processing .lass files.
 * Transforms Lass source to CSS via @lass-lang/core.
 *
 * Features:
 * - Regular .lass files -> CSS
 * - CSS Modules (.module.lass) -> Scoped CSS
 * - Preamble expressions -> Interpolated values
 * - JSON/JS imports in preamble
 *
 * Limitations:
 * - No HMR (Bun's plugin API doesn't support it)
 *
 * @module @lass-lang/bun-plugin-lass
 */

import type { BunPlugin } from 'bun';
import { plugin } from 'bun';
import { dirname, resolve, isAbsolute } from 'node:path';
import { transpile } from '@lass-lang/core';
import {
  rewriteImportsForExecution,
  injectStyle,
  toVirtualCssPath,
  fromVirtualCssPath,
} from './lib/plugin-utils.js';
import type { LassPluginOptions } from './lib/types.js';

export type { LassPluginOptions } from './lib/types.js';

/** Regex to match .lass file extensions */
const LASS_FILE_RE = /\.lass$/;

/** Regex to match .module.lass file extensions */
const LASS_MODULE_RE = /\.module\.lass$/;

/** Namespace for CSS Modules virtual paths */
const LASS_MODULE_NS = 'lass-module';

/**
 * Resolve a path relative to an importer without triggering Bun.resolveSync
 * (which would cause infinite recursion in onResolve).
 */
function resolvePath(specifier: string, importer: string | undefined): string {
  if (isAbsolute(specifier)) {
    return specifier;
  }
  const base = importer ? dirname(importer) : process.cwd();
  return resolve(base, specifier);
}

/**
 * Creates a Bun plugin for processing .lass files.
 *
 * @param options - Plugin configuration options
 * @returns Bun plugin
 *
 * @example
 * ```typescript
 * import lass from "@lass-lang/bun-plugin-lass";
 *
 * await Bun.build({
 *   entrypoints: ["./src/index.ts"],
 *   outdir: "./dist",
 *   plugins: [lass()],
 * });
 * ```
 */
export function lass(options: LassPluginOptions = {}): BunPlugin {
  const { verbose = false } = options;

  return {
    name: 'bun-plugin-lass',

    setup(build) {
      // ========================================================================
      // CSS Modules: Resolve .module.lass to virtual .lass.module.css path
      // ========================================================================
      build.onResolve({ filter: LASS_MODULE_RE }, ({ path, importer }) => {
        // Resolve the actual file path using simple path resolution
        // (avoid Bun.resolveSync which would trigger this hook again)
        const resolved = resolvePath(path, importer);

        // Convert to virtual CSS Modules path using shared convention
        const virtualPath = toVirtualCssPath(resolved);

        if (verbose) {
          console.log(`[lass] resolve module: ${path} -> ${virtualPath}`);
        }

        return {
          path: virtualPath,
          namespace: LASS_MODULE_NS,
        };
      });

      // ========================================================================
      // CSS Modules: Load virtual .lass.module.css from actual .module.lass
      // ========================================================================
      build.onLoad({ filter: /.*/, namespace: LASS_MODULE_NS }, async ({ path }) => {
        // Convert virtual path back to actual .lass file
        const actualPath = fromVirtualCssPath(path);

        if (verbose) {
          console.log(`[lass] loading module: ${actualPath}`);
        }

        try {
          const source = await Bun.file(actualPath).text();
          const { code: transpiled } = transpile(source, { filename: actualPath });
          const executableCode = rewriteImportsForExecution(transpiled, dirname(actualPath));
          const css = await injectStyle(executableCode);

          return {
            contents: css,
            loader: 'css',
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`[bun-plugin-lass] Failed to load CSS module ${actualPath}: ${message}`);
        }
      });

      // ========================================================================
      // Regular .lass files: Direct load and transform
      // ========================================================================
      build.onLoad({ filter: LASS_FILE_RE }, async ({ path }) => {
        // Skip .module.lass - handled by namespace above
        if (LASS_MODULE_RE.test(path)) {
          return undefined;
        }

        if (verbose) {
          console.log(`[lass] loading: ${path}`);
        }

        try {
          const source = await Bun.file(path).text();
          const { code: transpiled } = transpile(source, { filename: path });
          const executableCode = rewriteImportsForExecution(transpiled, dirname(path));
          const css = await injectStyle(executableCode);

          return {
            contents: css,
            loader: 'css',
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`[bun-plugin-lass] Failed to load ${path}: ${message}`);
        }
      });
    },
  };
}

/**
 * Register the plugin globally for runtime usage.
 *
 * Use this in bunfig.toml preload for automatic .lass support:
 *
 * @example
 * ```toml
 * # bunfig.toml
 * preload = ["@lass-lang/bun-plugin-lass/preload"]
 * ```
 *
 * Or call programmatically:
 *
 * @example
 * ```typescript
 * import { register } from "@lass-lang/bun-plugin-lass";
 * register({ verbose: true });
 * ```
 */
export function register(options: LassPluginOptions = {}): void {
  plugin(lass(options));
}

export default lass;
