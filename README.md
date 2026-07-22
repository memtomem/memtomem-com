# memtomem.com

Public bilingual documentation site for [memtomem](https://github.com/memtomem/memtomem) (LTM) and [memtomem-stm](https://github.com/memtomem/memtomem-stm) (STM), built with Astro and Starlight.

## Local development

Node.js 22.12 or newer is required.

```bash
npm install
npm run dev
npm run check:docs
npm run build
```

`npm run build` validates the documentation contract, builds Astro, creates the Pagefind index, and checks every generated internal route and fragment.

## Upstream synchronization contract

- `src/data/docs-contract.json` is the reviewed version/count snapshot used by landing pages and CI checks.
- `src/content/docs/reference/configuration.md` intentionally mirrors the complete supported Core and STM option surfaces. Do not replace the tables with a curated subset.
- Every English document under `src/content/docs/` has the same-path Korean mirror under `src/content/docs/ko/`.
- Update both languages in one change, then update manifest counts/hashes only after reviewing the upstream schema or CLI.
- Keep local connector files such as `.mcp.json` untracked and out of site commits.

### Version-bump checklist

1. Verify the Core and STM versions and supported surfaces against reviewed upstream checkouts.
2. Update `src/data/docs-contract.json`, then synchronize every affected English/Korean page.
3. Add the superseded Core and STM versions to the stale-version list in `scripts/check-doc-contract.mjs`. Keep this list explicit: a site-wide lower-semver rule would reject valid historical notes and independently versioned integrations.
4. Run `npm run build` to check the contract, generated site, search index, routes, and fragments.

Pushes to `main` deploy through the GitHub Pages workflow in `.github/workflows/deploy.yml`.
