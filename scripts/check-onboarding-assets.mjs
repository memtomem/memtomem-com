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

const CORE_FILE_LINK = /https:\/\/(?:raw\.githubusercontent\.com\/memtomem\/memtomem|github\.com\/memtomem\/memtomem\/(?:blob|raw))\/([^/)\s"'<>]+)\/([^)\s"'<>?#]+)/g;
const CORE_TREE_LINK = /https:\/\/github\.com\/memtomem\/memtomem\/tree\/([^/)\s"'<>]+)\/([^)\s"'<>?#]+)/g;

export function collectCoreReferences(text) {
  const files = new Set();
  const trees = new Set();
  const links = [];
  for (const match of text.matchAll(CORE_FILE_LINK)) {
    files.add(match[2]);
    links.push({ type: 'file', ref: match[1], path: match[2] });
  }
  for (const match of text.matchAll(CORE_TREE_LINK)) {
    const path = match[2].replace(/\/+$/, '');
    trees.add(path);
    links.push({ type: 'tree', ref: match[1], path });
  }
  return { files, trees, links };
}

// The manifest is hand-maintained. Without this the gate would happily report
// success while a page linked an eighth Core file that nothing ever checked.
export function assertReferencesCovered({ files, trees, links }, expectedRef) {
  if (!Array.isArray(links)) {
    throw new Error('Core reference scan must include link refs.');
  }
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
  // Visitors must receive the same release bytes the gate verifies. Keep the
  // explicitly unpinned prose links independent of this onboarding contract.
  const mismatched = links.filter(link => {
    const onboarding = link.type === 'file'
      ? REQUIRED_ASSET_PATHS.includes(link.path)
      : REQUIRED_ASSET_PATHS.some(path => path.startsWith(link.path + '/'));
    return onboarding && link.ref !== expectedRef;
  });
  if (mismatched.length) {
    throw new Error('Onboarding links must use ' + expectedRef + ': ' +
      mismatched.map(link => link.path + ' at ' + link.ref).join(', '));
  }
}

const SCANNED_EXTENSIONS = new Set(['.md', '.mdx', '.astro', '.html', '.json', '.ts', '.js', '.mjs']);

async function scanSourceReferences(root) {
  const files = new Set();
  const trees = new Set();
  const links = [];
  const walk = async dir => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = resolve(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (SCANNED_EXTENSIONS.has(extname(entry.name))) {
        const found = collectCoreReferences(await readFile(path, 'utf8'));
        for (const value of found.files) files.add(value);
        for (const value of found.trees) trees.add(value);
        links.push(...found.links);
      }
    }
  };
  await walk(root);
  return { files, trees, links };
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
  if (digest !== asset.sha256) {
    throw new Error('Onboarding asset hash mismatch: ' + asset.path +
      ' expected ' + asset.sha256 + ', actual ' + digest);
  }
}

export function coreReleaseRef(contract) {
  const version = contract?.core?.version;
  if (typeof version !== 'string' || version !== version.trim() ||
      !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)*$/.test(version)) {
    throw new Error('Documentation contract has no valid core.version release.');
  }
  return 'v' + version;
}

// Retry transient publication/cache and network failures against the same
// release tag, but fail immediately for a missing asset (404).
// Never fall back to main or change pins to accommodate a fetch.
export const FETCH_ATTEMPTS = 4;
const RETRY_DELAY_MS = 5000;

export async function fetchPublishedAsset(path, ref, {
  attempts = FETCH_ATTEMPTS, delayMs = RETRY_DELAY_MS, fetchImpl = fetch,
} = {}) {
  const url = 'https://raw.githubusercontent.com/memtomem/memtomem/' + ref + '/' + path;
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(url, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) {
        const error = new Error('HTTP ' + response.status);
        error.status = response.status;
        throw error;
      }
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      const detail = error.message + (error.cause?.message ? ': ' + error.cause.message : '');
      lastError = new Error('Failed to fetch onboarding asset: ' + path + ' at ' + ref + ': ' + detail,
        { cause: error });
      if (error.status === 404 || attempt === attempts) break;
      console.warn('Retrying (attempt ' + attempt + '/' + attempts + '): ' + lastError.message);
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
  const ref = coreReleaseRef(
    JSON.parse(await readFile(new URL('../src/data/docs-contract.json', import.meta.url), 'utf8'))
  );
  assertReferencesCovered(await scanSourceReferences(fileURLToPath(new URL('../src', import.meta.url))), ref);
  for (const asset of assets) {
    let bytes;
    if (args.length) {
      bytes = await readFile(resolve(args[1], asset.path));
    } else {
      bytes = await fetchPublishedAsset(asset.path, ref);
    }
    verifyAsset(asset, bytes);
  }
  console.log('Onboarding assets verified (' + assets.length + ', ' + (args.length ? 'local only' : 'published ' + ref) + ').');
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
