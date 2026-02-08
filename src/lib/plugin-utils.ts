/**
 * Plugin utilities for bun-plugin-lass
 *
 * Re-exports shared utilities from @lass-lang/plugin-utils
 * and provides Bun-specific CSS injection.
 */

import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';

// Re-export all shared utilities
export {
  LASS_EXT,
  VIRTUAL_CSS_EXT,
  VIRTUAL_MODULE_CSS_EXT,
  IMPORT_STATEMENT_RE,
  toVirtualCssPath,
  fromVirtualCssPath,
  isVirtualCssPath,
  isVirtualModuleCssPath,
  normalizePath,
  rewriteImportsForExecution,
} from '@lass-lang/plugin-utils';

// ============================================================================
// CSS INJECTION (Bun-specific)
// ============================================================================

/**
 * Execute transpiled Lass JS module and extract the CSS string.
 *
 * Uses a temp file + dynamic import to avoid Bun's "NameTooLong" error
 * with data: URLs. The temp file is cleaned up after execution.
 *
 * Uses indirect Function() to prevent Bun's bundler from statically
 * analyzing the import() call.
 *
 * @param jsCode - Transpiled JS module code
 * @returns The CSS string from the module's default export
 */
export async function injectStyle(jsCode: string): Promise<string> {
  // Generate unique temp file path
  const tempPath = join(tmpdir(), `lass-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`);

  try {
    await writeFile(tempPath, jsCode, 'utf-8');
    const fileUrl = pathToFileURL(tempPath).href;

    // Use indirect Function to prevent Bun's bundler from static analysis
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const dynamicImport = new Function('url', 'return import(url)') as (
      url: string
    ) => Promise<{ default: string }>;
    const module = await dynamicImport(fileUrl);

    return module.default;
  } finally {
    // Clean up temp file
    try {
      await unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
  }
}
