# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # dev server at localhost:5173
npm run build      # tsc + vite build (type errors fail the build)
npm run preview    # preview production build
npm run lint       # eslint src/ (zero warnings allowed — CI enforces this)
npm test           # vitest (registry/route consistency + page smoke tests)
```

## Architecture

React 18 + TypeScript + Vite SPA. Tailwind CSS with `class`-based dark mode. React Router v6 with `createBrowserRouter`.

### The registry is the single source of truth

`src/registry/index.ts` drives everything: sidebar (grouped + searchable), home page journey, section index pages, breadcrumbs, and prev/next module navigation. Sections belong to one of four `groups` (foundations → languages → design → systems) and carry a `story` field — the narrative intro rendered on their index page.

**There are no per-section index components.** One generic `src/components/shared/SectionIndex.tsx` renders every section landing page from registry data; its routes are generated in `App.tsx` from the registry. Do not create `src/modules/<section>/index.tsx` files.

### Adding a new module

Three files change together:

1. **`src/registry/index.ts`** — add a `SubCategory` entry under the relevant `ModuleSection` (description, difficulty, tags; optional `complexity` chip).
2. **`src/App.tsx`** — add a `lazy()` import and a route entry in `appRoutes`. The router uses `basename: import.meta.env.BASE_URL` for GitHub Pages compatibility.
3. **`src/modules/<section>/<slug>/index.tsx`** — the module component itself.

`npm test` will fail if a registry path has no matching route (and vice versa for section paths), so run it after wiring.

### Module structure

Every visualizer uses a `useSteps(steps[])` pattern for step-by-step animation. `StepControls` renders play/pause/prev/next with keyboard shortcuts (←/→/space — a global keydown listener that ignores typing targets). Most modules follow this layout:

```
title + description
amber/colored context panel  ← explains the "why"
viz-container                ← interactive SVG or DOM animation
StepControls
CodeBlock (JS / Python / Java tabs)
```

### Shared components (`src/components/shared/`)

- **`CodeBlock`** — multi-language tab switcher with custom syntax highlighting (regex-based `SyntaxLine`, no Prism). Renders with `display: table` + `min-w-max` for correct horizontal scroll.
- **`StepControls`** — play/pause/step with speed control and keyboard shortcuts.
- **`SectionIndex`** — generic section landing page, derives the section from the URL.
- **`ModuleNav`** — prev/next learning-path footer; rendered once in `Layout`, shows itself only on module pages (path matches a registry subcategory).
- **`ComplexityBadge`** — renders O(n) chips.
- **`ModuleCard`** — section cards on the home page.

### Layout notes

- `<main>` in `Layout.tsx` is the scroll container (not the window) and resets scroll on route change — keep it that way or prev/next navigation lands mid-page.
- Sidebar auto-expands the active section only; matching uses path-boundary checks (`/java` must not match `/javascript`).

### Code style

- `<pre>` elements inside grid/flex containers must have `overflow-x-auto` to prevent content escaping bounds.
- `whitespace-pre` alone is not enough — always pair with `overflow-x-auto` on the same element.
- `while (true)` in step generators is allowed (`no-constant-condition` checkLoops off); step-state objects may be typed `any` across pattern variants.

### GitHub Pages deployment

The workflow at `.github/workflows/deploy.yml` triggers on push to `main` and runs lint → test → build before deploying. It sets `DEPLOY_TARGET=gh-pages` which switches `vite.config.ts` base to `/dsa/`. The SPA routing trick uses `public/404.html` → `sessionStorage` → `history.replaceState` in `index.html`.

To enable: GitHub repo Settings → Pages → Source → **GitHub Actions**.

Deployed URL: `https://Sumanth1908.github.io/dsa/`
