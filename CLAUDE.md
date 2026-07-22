# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

memtomem.com — the public homepage and documentation site for [memtomem](https://github.com/memtomem/memtomem) (LTM) and [memtomem-stm](https://github.com/memtomem/memtomem-stm) (STM), an MCP-native memory infrastructure for AI agents. This repo is a **2026 AI Champion** contest entry (일반 트랙) by DAPADA Inc., licensed Apache 2.0.

Deployed via **GitHub Pages** using GitHub Actions (`.github/workflows/deploy.yml`). Pushes to `main` trigger automatic builds.

## Tech Stack

- **Astro + Starlight** — static site generator with docs framework
- **Node.js 22.12+**, npm

## Commands

```bash
npm install          # install dependencies
npm run dev          # dev server (localhost:4321)
npm run check:docs   # versions, CLI/config surface, EN/KO, code fences
npm run build        # production build → dist/
npm run preview      # preview production build locally
```

## Architecture

```
src/
  pages/index.astro       # Custom landing page (NOT Starlight layout)
  pages/ko/index.astro    # Korean landing-page mirror
  data/docs-contract.json # Reviewed upstream versions/counts/hashes
  content/docs/           # Starlight docs pages (Markdown)
    guides/               # Quick Start, Installation
    ltm/                  # memtomem (LTM) docs
    stm/                  # memtomem-stm (STM) docs
    reference/            # API reference
  styles/custom.css       # Starlight theme overrides + brand tokens
  assets/                 # Logo SVGs
```

**Key distinction**: `src/pages/index.astro` is a standalone Astro page with its own HTML/CSS (not a Starlight doc). All other pages under `src/content/docs/` use the Starlight docs layout with sidebar, search, and table of contents.

Sidebar structure is configured in `astro.config.mjs` — slugs must match file paths under `src/content/docs/`.

## Brand

- Accent: `#534AB7`, Teal: `#1D9E75`, Coral: `#D85A30`
- Font: Pretendard Variable (self-hosted via the npm `pretendard` package, bundled by Vite under `dist/_astro/`), system fallback on docs
- CSS tokens defined in `src/styles/custom.css` (Starlight overrides) and inline in `index.astro`

## Language

The root locale is **English** and `/ko/` is its Korean mirror. Every English document must keep the same-path Korean document in sync. Landing pages are also paired (`src/pages/index.astro`, `src/pages/ko/index.astro`).

## Documentation Contract

- Keep the site as an exhaustive mirror of supported upstream CLI and configuration options. Do not collapse the reference into a recommended-only subset.
- Use `src/data/docs-contract.json` as the reviewed snapshot for Core, STM, and OpenCode versions, tool counts, CLI groups, and environment-variable hashes.
- Update English and Korean together. `npm run check:docs` enforces pairing and critical contract details; `npm run build` also validates generated internal routes and fragments.
- On a Core or STM version bump, add the superseded version to the explicit stale-version list in `scripts/check-doc-contract.mjs`; do not replace it with a site-wide lower-semver rule that would reject historical notes or independently versioned integrations.
- Prefer first-success flows in beginner pages (`mm init → mm status → mm add → mm search`; `mms init --demo --client auto → mms doctor`) while retaining the full option surface in reference pages.
- `.mcp.json` is local tooling state and must remain untracked unless the user explicitly changes that policy.
