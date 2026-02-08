/**
 * Type declarations for .lass file imports
 */

// CSS Modules (.module.lass) - must come first for specificity
declare module "*.module.lass" {
  const classes: Record<string, string>;
  export default classes;
}

// Regular .lass files
declare module "*.lass" {
  const content: string;
  export default content;
}
