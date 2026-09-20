# Onboarding publication checklist

The website and Core assets are separate deliveries. No deployment is implied
by a successful local build.

1. Review and publish the Core notebook and retry-policy example files in the
   release tag `v<core.version>` from `src/data/docs-contract.json` first.
2. Run `node scripts/check-onboarding-assets.mjs`. It fetches the seven raw
   GitHub assets from that release tag and compares SHA-256 against
   `src/data/onboarding-assets.json`,
   and checks that every Core file the site links is either pinned in that
   manifest or listed in `UNPINNED_CORE_PATHS`. Missing files, drift, and
   network errors stop deployment; they do not prove an asset itself is broken.
   On a Core version bump, review and test the tagged source, then update the
   contract version and any changed hashes in the same pull request.

   Fetch failures are retried against the same tag and logged with the path,
   ref, and HTTP status or network cause. A hash mismatch instead reports the
   expected and actual SHA-256. Investigate publication or network failures
   before retrying; never edit the manifest to match an error response.
3. Run `npm test` and `npm run build`. For unpublished local review, use
   `node scripts/check-onboarding-assets.mjs --core-root /path/to/core`.
   Local mode is not publication proof and is not used by deployment CI.
4. Review EN/KO landing cards, both use-case routes, locale switching, search,
   notebook downloads, and mobile layout in a connected browser.
5. Every pull request targeting `main` checks published assets, including PRs
   with no asset-related changes. The main-branch workflow repeats the same
   check before uploading its deployment artifact. Deployment remains limited
   to non-PR runs on `main`.

Marketing scripts are canonical in Core's `examples/onboarding/DEMO-SCRIPTS.md`.
The scenarios are synthetic. Actual Claude/Codex sessions, paid API execution,
production recovery, and productivity measurements require separate evidence.
