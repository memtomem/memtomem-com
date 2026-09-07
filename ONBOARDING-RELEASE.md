# Onboarding publication checklist

The website and Core assets are separate deliveries. No deployment is implied
by a successful local build.

1. Review and publish the Core notebook and retry-policy example files first.
2. Run `node scripts/check-onboarding-assets.mjs`. It fetches the seven raw
   GitHub assets and compares SHA-256 against `src/data/onboarding-assets.json`.
   Missing files, drift, and network errors stop deployment; they do not prove
   an asset itself is broken. Update hashes only after reviewing and testing
   the changed Core source.
3. Run `npm test` and `npm run build`. For unpublished local review, use
   `node scripts/check-onboarding-assets.mjs --core-root /path/to/core`.
   Local mode is not publication proof and is not used by deployment CI.
4. Review EN/KO landing cards, both use-case routes, locale switching, search,
   notebook downloads, and mobile layout in a connected browser.
5. Approve website publication separately. The main-branch workflow checks
   published assets before uploading its deployment artifact.

Marketing scripts are canonical in Core's `examples/onboarding/DEMO-SCRIPTS.md`.
The scenarios are synthetic. Actual Claude/Codex sessions, paid API execution,
production recovery, and productivity measurements require separate evidence.
