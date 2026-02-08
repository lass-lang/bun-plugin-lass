/**
 * Unit tests for bun-plugin-lass
 *
 * Tests the Bun plugin for processing .lass files.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { lass } from '../src/index.js';
import { join } from 'node:path';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';

describe('bun-plugin-lass', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'lass-bun-test-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('plugin configuration', () => {
    it('should have correct plugin name', () => {
      const plugin = lass();
      expect(plugin.name).toBe('bun-plugin-lass');
    });

    it('should accept verbose option', () => {
      const plugin = lass({ verbose: true });
      expect(plugin.name).toBe('bun-plugin-lass');
    });
  });

  describe('regular .lass files', () => {
    it('should transform CSS-only .lass to CSS', async () => {
      const lassFile = join(testDir, 'style.lass');
      const entryFile = join(testDir, 'entry.ts');

      await writeFile(lassFile, '.box { color: blue; }');
      await writeFile(entryFile, `import "./style.lass";`);

      const result = await Bun.build({
        entrypoints: [entryFile],
        outdir: join(testDir, 'out'),
        plugins: [lass()],
      });

      expect(result.success).toBe(true);
      expect(result.logs.filter((l) => l.level === 'error')).toHaveLength(0);
    });

    it('should evaluate preamble expressions', async () => {
      const lassFile = join(testDir, 'expr.lass');
      const entryFile = join(testDir, 'entry.ts');

      await writeFile(
        lassFile,
        `const color = "red"
---
.box { color: {{ color }}; }`
      );
      await writeFile(entryFile, `import "./expr.lass";`);

      const result = await Bun.build({
        entrypoints: [entryFile],
        outdir: join(testDir, 'out'),
        plugins: [lass()],
      });

      expect(result.success).toBe(true);

      // Find CSS output and verify interpolation
      const cssOutput = result.outputs.find((o) => o.path.endsWith('.css'));
      if (cssOutput) {
        const css = await cssOutput.text();
        expect(css).toContain('color: red'); // Interpolated value
      }
    });

    it('should handle JSON imports in preamble', async () => {
      const tokensFile = join(testDir, 'tokens.json');
      const lassFile = join(testDir, 'themed.lass');
      const entryFile = join(testDir, 'entry.ts');

      await writeFile(tokensFile, '{ "primary": "#3b82f6" }');
      await writeFile(
        lassFile,
        `import tokens from './tokens.json' with { type: 'json' }
---
.btn { background: {{ tokens.primary }}; }`
      );
      await writeFile(entryFile, `import "./themed.lass";`);

      const result = await Bun.build({
        entrypoints: [entryFile],
        outdir: join(testDir, 'out'),
        plugins: [lass()],
      });

      expect(result.success).toBe(true);
    });

    it('should handle arithmetic expressions', async () => {
      const lassFile = join(testDir, 'math.lass');
      const entryFile = join(testDir, 'entry.ts');

      await writeFile(
        lassFile,
        `const base = 8
---
.box { padding: {{ base * 2 }}px; }`
      );
      await writeFile(entryFile, `import "./math.lass";`);

      const result = await Bun.build({
        entrypoints: [entryFile],
        outdir: join(testDir, 'out'),
        plugins: [lass()],
      });

      expect(result.success).toBe(true);
    });
  });

  describe('CSS Modules (.module.lass)', () => {
    it('should handle .module.lass files', async () => {
      const lassFile = join(testDir, 'component.module.lass');
      const entryFile = join(testDir, 'entry.ts');

      await writeFile(lassFile, '.container { display: flex; }');
      await writeFile(
        entryFile,
        `
import styles from "./component.module.lass";
console.log(styles.container);
`
      );

      const result = await Bun.build({
        entrypoints: [entryFile],
        outdir: join(testDir, 'out'),
        plugins: [lass()],
      });

      expect(result.success).toBe(true);
    });

    it('should handle .module.lass with preamble', async () => {
      const lassFile = join(testDir, 'themed.module.lass');
      const entryFile = join(testDir, 'entry.ts');

      await writeFile(
        lassFile,
        `const color = "green"
---
.button { background: {{ color }}; }`
      );
      await writeFile(
        entryFile,
        `
import styles from "./themed.module.lass";
export default styles;
`
      );

      const result = await Bun.build({
        entrypoints: [entryFile],
        outdir: join(testDir, 'out'),
        plugins: [lass()],
      });

      expect(result.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should fail for non-existent files', async () => {
      const entryFile = join(testDir, 'entry.ts');
      await writeFile(entryFile, `import "./nonexistent.lass";`);

      const result = await Bun.build({
        entrypoints: [entryFile],
        outdir: join(testDir, 'out'),
        plugins: [lass()],
        throw: false, // Don't throw, return result with errors
      });

      // Build should fail (either success=false or have errors)
      expect(result.success).toBe(false);
    });

    it('should fail on syntax errors in preamble', async () => {
      const lassFile = join(testDir, 'syntax-error.lass');
      const entryFile = join(testDir, 'entry.ts');

      // Create a file with invalid JS in preamble
      await writeFile(
        lassFile,
        `const x = {{{ // invalid syntax
---
.box { color: red; }`
      );
      await writeFile(entryFile, `import "./syntax-error.lass";`);

      const result = await Bun.build({
        entrypoints: [entryFile],
        outdir: join(testDir, 'out'),
        plugins: [lass()],
        throw: false, // Don't throw, return result with errors
      });

      // Build should fail due to syntax error
      expect(result.success).toBe(false);
    });
  });

  describe('verbose logging', () => {
    it('should log when verbose is true', async () => {
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: unknown[]) => logs.push(args.join(' '));

      const lassFile = join(testDir, 'verbose.lass');
      const entryFile = join(testDir, 'entry.ts');

      await writeFile(lassFile, '.test { color: red; }');
      await writeFile(entryFile, `import "./verbose.lass";`);

      await Bun.build({
        entrypoints: [entryFile],
        outdir: join(testDir, 'out'),
        plugins: [lass({ verbose: true })],
      });

      console.log = originalLog;

      expect(logs.some((l) => l.includes('[lass]'))).toBe(true);
    });
  });

  describe('multiple files', () => {
    it('should handle multiple .lass imports', async () => {
      const lassFile1 = join(testDir, 'reset.lass');
      const lassFile2 = join(testDir, 'theme.lass');
      const entryFile = join(testDir, 'entry.ts');

      await writeFile(lassFile1, '* { margin: 0; padding: 0; }');
      await writeFile(lassFile2, '.app { font-family: sans-serif; }');
      await writeFile(
        entryFile,
        `
import "./reset.lass";
import "./theme.lass";
`
      );

      const result = await Bun.build({
        entrypoints: [entryFile],
        outdir: join(testDir, 'out'),
        plugins: [lass()],
      });

      expect(result.success).toBe(true);
    });
  });
});
