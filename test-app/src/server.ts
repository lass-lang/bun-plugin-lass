/**
 * Simple HTTP server to serve the test app with hot reload.
 * Run with: bun --hot src/server.ts
 */

import "./styles/theme.lass";
import styles from "./styles/component.module.lass";

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Application - bun-plugin-lass</title>
  <style>
    :root {
      --color-primary: #3b82f6;
      --color-secondary: #10b981;
      --color-background: #1e1e2e;
      --color-surface: #2a2a3e;
      --color-text: #e4e4e7;
      --color-text-muted: #a1a1aa;
    }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: var(--color-background);
      color: var(--color-text);
      margin: 0;
      padding: 2rem;
      line-height: 1.6;
    }
    h1 { color: var(--color-primary); margin-bottom: 1rem; }
    p { color: var(--color-text-muted); }
    .container {
      background: var(--color-surface);
      padding: 1.5rem;
      border-radius: 8px;
      margin: 1rem 0;
    }
    .title {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-primary);
      margin-bottom: 1rem;
    }
    .status {
      display: inline-block;
      padding: 0.5rem 1rem;
      background: var(--color-secondary);
      color: white;
      border-radius: 8px;
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <h1>Lass Bun Plugin Test App</h1>
  <p>This page confirms the bun-plugin-lass is working.</p>

  <div class="container">
    <div class="title">CSS Modules Demo</div>
    <p>Scoped classes from <code>component.module.lass</code>:</p>
    <ul>
      <li><code>.container</code> &rarr; <code>${styles.container}</code></li>
      <li><code>.title</code> &rarr; <code>${styles.title}</code></li>
      <li><code>.status</code> &rarr; <code>${styles.status}</code></li>
    </ul>
    <span class="status">Plugin Active</span>
  </div>

  <div class="container">
    <div class="title">Features Tested</div>
    <ul>
      <li>Regular .lass file import (theme.lass)</li>
      <li>CSS Modules (.module.lass) with scoped class names</li>
      <li>Preamble expressions with interpolation</li>
    </ul>
  </div>
</body>
</html>`;

const server = Bun.serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);
    
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    }
    
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Listening on http://localhost:${server.port}`);
console.log("CSS Module classes loaded:", Object.keys(styles).join(", "));
