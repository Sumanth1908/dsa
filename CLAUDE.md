# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # dev server at localhost:5173
npm run build      # tsc + vite build (type errors fail the build)
npm run preview    # preview production build
npm run lint       # eslint src/

# GitHub Pages build (sets base to /dsa/)
DEPLOY_TARGET=gh-pages npm run build
```

## Architecture

React 18 + TypeScript + Vite SPA. Tailwind CSS with `class`-based dark mode. React Router v6 with `createBrowserRouter`.

### Adding a new module

Three files always change together:

1. **`src/registry/index.ts`** — add a `SubCategory` entry under the relevant `ModuleSection`. The sidebar and home page auto-populate from this registry; nothing else changes.

2. **`src/App.tsx`** — add a `lazy()` import and a route entry in `createBrowserRouter`. The router uses `basename: import.meta.env.BASE_URL` for GitHub Pages compatibility.

3. **`src/modules/<section>/<slug>/index.tsx`** — the module component itself.

### Module structure

Every visualizer uses a `useSteps(steps[])` pattern for step-by-step animation. `StepControls` renders play/pause/prev/next. Most modules follow this layout:

```
title + description
amber/colored context panel  ← explains the "why"
viz-container                ← interactive SVG or DOM animation
StepControls
CodeBlock (JS / Python / Java tabs)
```

### Shared components (`src/components/shared/`)

- **`CodeBlock`** — multi-language tab switcher with custom syntax highlighting (no Prism in this component; uses regex-based `SyntaxLine`). Renders with `display: table` + `min-w-max` for correct horizontal scroll.
- **`StepControls`** — play/pause/step with speed control.
- **`ComplexityBadge`** — renders O(n) chips.
- **`ModuleCard`** — used by section index pages.

### Code style

- `<pre>` elements inside grid/flex containers must have `overflow-x-auto` to prevent content escaping bounds.
- `whitespace-pre` alone is not enough — always pair with `overflow-x-auto` on the same element.

### GitHub Pages deployment

The workflow at `.github/workflows/deploy.yml` triggers on push to `main`. It sets `DEPLOY_TARGET=gh-pages` which switches `vite.config.ts` base to `/dsa/`. The SPA routing trick uses `public/404.html` → `sessionStorage` → `history.replaceState` in `index.html`.

To enable: GitHub repo Settings → Pages → Source → **GitHub Actions**.

Deployed URL: `https://Sumanth1908.github.io/dsa/`
