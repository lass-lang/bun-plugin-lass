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

  describe('absolute path resolution', () => {
    it('should resolve absolute .lass paths', async () => {
      const lassFile = join(testDir, 'absolute.lass');
      const entryFile = join(testDir, 'entry.ts');

      await writeFile(lassFile, '.absolute { position: absolute; }');
      // Use absolute path in import
      await writeFile(entryFile, `import "${lassFile}";`);

      const result = await Bun.build({
        entrypoints: [entryFile],
        outdir: join(testDir, 'out'),
        plugins: [lass()],
      });

      expect(result.success).toBe(true);
    });

    it('should resolve absolute .module.lass paths', async () => {
      const lassFile = join(testDir, 'absolute.module.lass');
      const entryFile = join(testDir, 'entry.ts');

      await writeFile(lassFile, '.absolute { position: absolute; }');
      // Use absolute path in import
      await writeFile(
        entryFile,
        `
import styles from "${lassFile}";
console.log(styles.absolute);
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

  describe('nested directory imports', () => {
    it('should handle .lass files in subdirectories', async () => {
      const stylesDir = join(testDir, 'styles');
      await mkdir(stylesDir, { recursive: true });

      const lassFile = join(stylesDir, 'nested.lass');
      const entryFile = join(testDir, 'entry.ts');

      await writeFile(lassFile, '.nested { display: block; }');
      await writeFile(entryFile, `import "./styles/nested.lass";`);

      const result = await Bun.build({
        entrypoints: [entryFile],
        outdir: join(testDir, 'out'),
        plugins: [lass()],
      });

      expect(result.success).toBe(true);
    });

    it('should handle .module.lass files in subdirectories', async () => {
      const componentsDir = join(testDir, 'components');
      await mkdir(componentsDir, { recursive: true });

      const lassFile = join(componentsDir, 'button.module.lass');
      const entryFile = join(testDir, 'entry.ts');

      await writeFile(lassFile, '.button { cursor: pointer; }');
      await writeFile(
        entryFile,
        `
import styles from "./components/button.module.lass";
console.log(styles.button);
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

  describe('verbose logging for CSS modules', () => {
    it('should log CSS Module resolve and load when verbose is true', async () => {
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: unknown[]) => logs.push(args.join(' '));

      const lassFile = join(testDir, 'verbose.module.lass');
      const entryFile = join(testDir, 'entry.ts');

      await writeFile(lassFile, '.verbose { opacity: 1; }');
      await writeFile(
        entryFile,
        `
import styles from "./verbose.module.lass";
console.log(styles.verbose);
`
      );

      await Bun.build({
        entrypoints: [entryFile],
        outdir: join(testDir, 'out'),
        plugins: [lass({ verbose: true })],
      });

      console.log = originalLog;

      // Should have logs for resolve and load
      expect(logs.some((l) => l.includes('[lass] resolve module:'))).toBe(true);
      expect(logs.some((l) => l.includes('[lass] loading module:'))).toBe(true);
    });
  });

  describe('CSS module error handling', () => {
    it('should fail for non-existent .module.lass files', async () => {
      const entryFile = join(testDir, 'entry.ts');
      await writeFile(
        entryFile,
        `
import styles from "./nonexistent.module.lass";
console.log(styles);
`
      );

      const result = await Bun.build({
        entrypoints: [entryFile],
        outdir: join(testDir, 'out'),
        plugins: [lass()],
        throw: false,
      });

      expect(result.success).toBe(false);
    });

    it('should fail on syntax errors in .module.lass preamble', async () => {
      const lassFile = join(testDir, 'error.module.lass');
      const entryFile = join(testDir, 'entry.ts');

      // Invalid JS in preamble
      await writeFile(
        lassFile,
        `const x = {{{ // syntax error
---
.error { color: red; }`
      );
      await writeFile(
        entryFile,
        `
import styles from "./error.module.lass";
console.log(styles);
`
      );

      const result = await Bun.build({
        entrypoints: [entryFile],
        outdir: join(testDir, 'out'),
        plugins: [lass()],
        throw: false,
      });

      expect(result.success).toBe(false);
    });
  });

  describe('register function', () => {
    it('should export register function', async () => {
      const { register } = await import('../src/index.js');
      expect(typeof register).toBe('function');
    });
  });

  describe('import without importer', () => {
    it('should resolve paths when importer is undefined', async () => {
      const lassFile = join(testDir, 'no-importer.lass');
      const entryFile = join(testDir, 'entry.ts');

      await writeFile(lassFile, '.box { color: red; }');
      await writeFile(entryFile, `import "./no-importer.lass";`);

      const result = await Bun.build({
        entrypoints: [entryFile],
        outdir: join(testDir, 'out'),
        plugins: [lass()],
      });

      expect(result.success).toBe(true);
    });
  });

  describe('complex expressions in preamble', () => {
    it('should handle template literals in expressions', async () => {
      const lassFile = join(testDir, 'template.lass');
      const entryFile = join(testDir, 'entry.ts');

      await writeFile(
        lassFile,
        `const unit = "px"
const size = 16
---
.box { font-size: {{ \`\${size}\${unit}\` }}; }`
      );
      await writeFile(entryFile, `import "./template.lass";`);

      const result = await Bun.build({
        entrypoints: [entryFile],
        outdir: join(testDir, 'out'),
        plugins: [lass()],
      });

      expect(result.success).toBe(true);

      const cssOutput = result.outputs.find((o) => o.path.endsWith('.css'));
      if (cssOutput) {
        const css = await cssOutput.text();
        expect(css).toContain('font-size: 16px');
      }
    });

    it('should handle function calls in expressions', async () => {
      const lassFile = join(testDir, 'function.lass');
      const entryFile = join(testDir, 'entry.ts');

      await writeFile(
        lassFile,
        `const sizes = ["10px", "20px", "30px"]
---
.first { width: {{ sizes[0] }}; }
.last { width: {{ sizes.at(-1) }}; }`
      );
      await writeFile(entryFile, `import "./function.lass";`);

      const result = await Bun.build({
        entrypoints: [entryFile],
        outdir: join(testDir, 'out'),
        plugins: [lass()],
      });

      expect(result.success).toBe(true);

      const cssOutput = result.outputs.find((o) => o.path.endsWith('.css'));
      if (cssOutput) {
        const css = await cssOutput.text();
        expect(css).toContain('width: 10px');
        expect(css).toContain('width: 30px');
      }
    });
  });

  describe('CSS output verification', () => {
    it('should output correct CSS for .module.lass files', async () => {
      const lassFile = join(testDir, 'verify.module.lass');
      const entryFile = join(testDir, 'entry.ts');

      await writeFile(lassFile, '.container { display: grid; gap: 1rem; }');
      await writeFile(
        entryFile,
        `
import styles from "./verify.module.lass";
export default styles;
`
      );

      const result = await Bun.build({
        entrypoints: [entryFile],
        outdir: join(testDir, 'out'),
        plugins: [lass()],
      });

      expect(result.success).toBe(true);

      const cssOutput = result.outputs.find((o) => o.path.endsWith('.css'));
      if (cssOutput) {
        const css = await cssOutput.text();
        expect(css).toContain('display: grid');
        expect(css).toContain('gap: 1rem');
      }
    });
  });
});
