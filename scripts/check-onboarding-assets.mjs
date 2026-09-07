import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function verifyAsset(asset, bytes) {
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (digest !== asset.sha256) throw new Error('Missing or changed onboarding asset: ' + asset.path);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--core-root')) {
    throw new Error('Usage: node scripts/check-onboarding-assets.mjs [--core-root PATH]');
  }
  const assets = JSON.parse(await readFile(new URL('../src/data/onboarding-assets.json', import.meta.url), 'utf8'));
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
