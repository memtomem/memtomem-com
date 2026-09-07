import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The gate's own record of what must be checked. A manifest that drops an
// entry would otherwise verify fewer files and still report success.
export const REQUIRED_ASSET_PATHS = [
  'examples/notebooks/05_langgraph_memory_basics.ipynb',
  'examples/notebooks/06_langgraph_retrieval_memory.ipynb',
  'examples/onboarding/retry-policy/README.md',
  'examples/onboarding/retry-policy/demo.py',
  'examples/onboarding/retry-policy/retry_policy.py',
  'examples/onboarding/retry-policy/test_policy.py',
  'examples/onboarding/retry-policy/docs/auth-callback-adr.md',
];

// Core files the site links but deliberately does not pin by digest: upstream
// prose we point at without quoting line by line. Anything else the docs link
// must be a pinned asset, so a new Core link is a deliberate decision rather
// than an unnoticed gap in the gate.
export const UNPINNED_CORE_PATHS = [
  'docs/guides/configuration.md',
];

const CORE_FILE_LINK = /https:\/\/(?:raw\.githubusercontent\.com\/memtomem\/memtomem\/main|github\.com\/memtomem\/memtomem\/blob\/main)\/([^)\s"'<>]+)/g;
const CORE_TREE_LINK = /https:\/\/github\.com\/memtomem\/memtomem\/tree\/main\/([^)\s"'<>]+)/g;

export function collectCoreReferences(text) {
  const files = new Set();
  const trees = new Set();
  for (const match of text.matchAll(CORE_FILE_LINK)) files.add(match[1]);
  for (const match of text.matchAll(CORE_TREE_LINK)) trees.add(match[1].replace(/\/+$/, ''));
  return { files, trees };
}

// The manifest is hand-maintained. Without this the gate would happily report
// success while a page linked an eighth Core file that nothing ever checked.
export function assertReferencesCovered({ files, trees }) {
  const pinned = new Set([...REQUIRED_ASSET_PATHS, ...UNPINNED_CORE_PATHS]);
  const unchecked = [...files].filter(path => !pinned.has(path)).sort();
  if (unchecked.length) {
    throw new Error(
      'Site links Core files that the onboarding manifest does not cover: ' + unchecked.join(', ')
    );
  }
  const uncheckedTrees = [...trees]
    .filter(dir => ![...pinned].some(path => path.startsWith(dir + '/')))
    .sort();
  if (uncheckedTrees.length) {
    throw new Error(
      'Site links Core directories that the onboarding manifest does not cover: ' + uncheckedTrees.join(', ')
    );
  }
}

const SCANNED_EXTENSIONS = new Set(['.md', '.mdx', '.astro', '.html', '.json', '.ts', '.js', '.mjs']);

async function scanSourceReferences(root) {
  const files = new Set();
  const trees = new Set();
  const walk = async dir => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = resolve(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (SCANNED_EXTENSIONS.has(extname(entry.name))) {
        const found = collectCoreReferences(await readFile(path, 'utf8'));
        for (const value of found.files) files.add(value);
        for (const value of found.trees) trees.add(value);
      }
    }
  };
  await walk(root);
  return { files, trees };
}

export function validateManifest(assets) {
  if (!Array.isArray(assets) || assets.length === 0) {
    throw new Error('Onboarding manifest must be a non-empty array of assets.');
  }
  const seen = new Set();
  for (const asset of assets) {
    if (!asset || typeof asset.path !== 'string' || asset.path.length === 0) {
      throw new Error('Onboarding manifest entry has no path.');
    }
    if (typeof asset.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(asset.sha256)) {
      throw new Error('Onboarding manifest entry has no valid sha256: ' + asset.path);
    }
    // A fixed inventory: an unlisted path would be resolved against the Core
    // root or concatenated into a raw URL without ever being a required check.
    if (!REQUIRED_ASSET_PATHS.includes(asset.path)) {
      throw new Error('Unexpected onboarding manifest entry: ' + asset.path);
    }
    if (seen.has(asset.path)) throw new Error('Duplicate onboarding manifest entry: ' + asset.path);
    seen.add(asset.path);
  }
  const missing = REQUIRED_ASSET_PATHS.filter(path => !seen.has(path));
  if (missing.length) {
    throw new Error('Onboarding manifest is missing required assets: ' + missing.join(', '));
  }
  return assets;
}

export function verifyAsset(asset, bytes) {
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (digest !== asset.sha256) throw new Error('Missing or changed onboarding asset: ' + asset.path);
}

// raw.githubusercontent serves a branch ref from cache for a few minutes and
// rate-limits, so a deploy run right after the Core merge can see a stale 404
// or a transient 5xx for an asset that is in fact published. Retrying keeps a
// blip in a third-party fetch from blocking the Pages deploy of unrelated
// site changes; a genuinely unpublished file still fails after the last try.
export const FETCH_ATTEMPTS = 4;
const RETRY_DELAY_MS = 5000;

async function fetchPublishedAsset(path, { attempts = FETCH_ATTEMPTS, delayMs = RETRY_DELAY_MS } = {}) {
  const url = 'https://raw.githubusercontent.com/memtomem/memtomem/main/' + path;
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) {
        throw new Error('Onboarding asset is not published: ' + path + ' HTTP ' + response.status);
      }
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      console.warn('Retrying ' + path + ' (attempt ' + attempt + '/' + attempts + '): ' + error.message);
      await new Promise(done => setTimeout(done, delayMs * attempt));
    }
  }
  throw lastError;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--core-root')) {
    throw new Error('Usage: node scripts/check-onboarding-assets.mjs [--core-root PATH]');
  }
  const assets = validateManifest(
    JSON.parse(await readFile(new URL('../src/data/onboarding-assets.json', import.meta.url), 'utf8'))
  );
  assertReferencesCovered(await scanSourceReferences(fileURLToPath(new URL('../src', import.meta.url))));
  for (const asset of assets) {
    let bytes;
    if (args.length) {
      bytes = await readFile(resolve(args[1], asset.path));
    } else {
      bytes = await fetchPublishedAsset(asset.path);
    }
    verifyAsset(asset, bytes);
  }
  console.log('Onboarding assets verified (' + assets.length + ', ' + (args.length ? 'local only' : 'published') + ').');
}

// Both sides are resolved through realpath. Comparing a realpath-resolved
// module URL against a raw argv path silently skips main() whenever the repo
// is reached through a symlinked segment (macOS /tmp, a symlinked checkout, a
// node_modules/.bin shim), which would report success having verified nothing.
function invokedAsScript() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
  } catch {
    return false;
  }
}

if (invokedAsScript()) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
