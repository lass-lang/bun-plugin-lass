/**
 * Type definitions for bun-plugin-lass
 */

export interface LassPluginOptions {
  /** Enable verbose logging */
  verbose?: boolean;

  /**
   * Use JavaScript mode instead of TypeScript mode.
   *
   * Default: `false` (TypeScript is the first-class citizen)
   *
   * When `false` (default):
   * - If `tsconfig.json` exists: TypeScript mode with type-checking
   * - If no `tsconfig.json`: TypeScript mode without type-checking (transpilation only)
   *
   * When `true`:
   * - JavaScript mode (no type-checking regardless of `tsconfig.json`)
   *
   * **Note:** This is architecture preparation. The transpiler core does not yet
   * differentiate TS vs JS — both produce identical output. This flag will be wired
   * to actual TypeScript support when the core adds it. The TextMate grammar always
   * uses `source.ts` for highlighting (JS is valid TS, so highlighting works for both).
   */
  useJS?: boolean;
}
