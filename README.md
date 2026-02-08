# @lass-lang/bun-plugin-lass

Bun plugin for processing `.lass` files. Transforms Lass source to CSS via `@lass-lang/core`.

## Installation

```bash
bun add @lass-lang/bun-plugin-lass --dev
```

## Usage

### With Bun.build()

```typescript
import lass from "@lass-lang/bun-plugin-lass";

await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  plugins: [lass()],
});
```

### With bunfig.toml (preload)

For automatic `.lass` support without explicit plugin configuration:

```toml
# bunfig.toml
preload = ["@lass-lang/bun-plugin-lass/preload"]
```

Then import `.lass` files directly:

```typescript
import "./styles.lass";
```

## CSS Modules

CSS Modules work with `.module.lass` files:

```typescript
import styles from "./component.module.lass";

element.className = styles.container;
```

For TypeScript, add declarations:

```typescript
// lass.d.ts
declare module "*.lass";

declare module "*.module.lass" {
  const classes: { readonly [key: string]: string };
  export default classes;
}
```

## Options

```typescript
lass({
  verbose: true,  // Enable logging (default: false)
});
```

## Limitations

- **No HMR**: Bun's plugin API doesn't support Hot Module Replacement.
  For development with HMR, use Vite with `@lass-lang/vite-plugin-lass`.

## How It Works

1. Plugin intercepts `.lass` file imports via `onResolve`/`onLoad`
2. Transpiles Lass source to JS module via `@lass-lang/core`
3. Executes JS to extract CSS string
4. Returns CSS to Bun's bundler with `loader: "css"`
5. For `.module.lass`: resolves to virtual `.lass.module.css` path so Bun applies CSS Modules scoping

## Peer Dependencies

- `bun` >=1.0.0

## License

MIT
