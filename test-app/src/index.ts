/**
 * Test app entry point for bun-plugin-lass
 * 
 * This demonstrates importing .lass files in Bun:
 * - Regular .lass files are compiled to CSS
 * - .module.lass files support CSS Modules
 */

import "./styles/theme.lass";
import styles from "./styles/component.module.lass";

console.log("Lass Test App loaded!");
console.log("CSS Module classes:", styles);
console.log("Container class:", styles.container);
console.log("Title class:", styles.title);
console.log("Status class:", styles.status);
