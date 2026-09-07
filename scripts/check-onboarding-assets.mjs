import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

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

async function main() {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--core-root')) {
    throw new Error('Usage: node scripts/check-onboarding-assets.mjs [--core-root PATH]');
  }
  const assets = validateManifest(
    JSON.parse(await readFile(new URL('../src/data/onboarding-assets.json', import.meta.url), 'utf8'))
  );
  for (const asset of assets) {
    let bytes;
    if (args.length) {
      bytes = await readFile(resolve(args[1], asset.path));
    } else {
      const url = 'https://raw.githubusercontent.com/memtomem/memtomem/main/' + asset.path;
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error('Onboarding asset is not published: ' + asset.path + ' HTTP ' + response.status);
      bytes = Buffer.from(await response.arrayBuffer());
    }
    verifyAsset(asset, bytes);
  }
  console.log('Onboarding assets verified (' + assets.length + ', ' + (args.length ? 'local only' : 'published') + ').');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
