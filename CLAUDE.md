# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

memtomem.com — the public homepage and documentation site for [memtomem](https://github.com/memtomem/memtomem) (LTM) and [memtomem-stm](https://github.com/memtomem/memtomem-stm) (STM), an MCP-native memory infrastructure for AI agents. This repo is a **2026 AI Champion** contest entry (일반 트랙) by DAPADA Inc., licensed Apache 2.0.

Deployed via **GitHub Pages** using GitHub Actions (`.github/workflows/deploy.yml`). Pushes to `main` trigger automatic builds.

## Tech Stack

- **Astro + Starlight** — static site generator with docs framework
- **Node.js 22+**, npm

## Commands

```bash
npm install          # install dependencies
npm run dev          # dev server (localhost:4321)
npm run build        # production build → dist/
npm run preview      # preview production build locally
```

## Architecture

```
src/
  pages/index.astro       # Custom landing page (NOT Starlight layout)
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

Primary content language is **Korean**. UI labels and technical terms are in English. Starlight locale is set to `ko` as root. Maintain this bilingual convention.
