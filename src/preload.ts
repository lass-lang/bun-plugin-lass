/**
 * Preload script for automatic .lass file support.
 *
 * Usage in bunfig.toml:
 *
 * @example
 * ```toml
 * preload = ["@lass-lang/bun-plugin-lass/preload"]
 * ```
 *
 * This registers the Lass plugin globally, enabling .lass imports
 * without explicit Bun.build() configuration.
 */

import { register } from './index.js';

register();
