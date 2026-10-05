import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

// The deployed site is first-party: fonts and scripts ship from dist/. A
// dependency update could reintroduce a CDN import that nothing else in CI
// would notice, so the built artifact itself is checked. Every file is read
// byte for byte (latin1), with no exemptions: a page can load JSON or XML at
// runtime, and any skip rule is a place for a reference to hide.
const root = process.cwd();
const dist = path.join(root, 'dist');
const CDN_HOST = /(?<![a-z0-9.-])((?:[a-z0-9-]+\.)*(?:jsdelivr\.net|cdnjs\.cloudflare\.com|unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|esm\.sh|skypack\.dev))(?![a-z0-9-]|\.[a-z0-9])/gi;
const errors = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  }));
  return nested.flat();
}

const files = await walk(dist);
for (const file of files) {
  const lines = (await readFile(file, 'latin1')).split('\n');
  lines.forEach((line, index) => {
    for (const match of line.matchAll(CDN_HOST)) {
      errors.push(`${path.relative(dist, file)}:${index + 1}: ${match[1]}`);
    }
  });
}

if (errors.length) {
  console.error(`External CDN check failed (${errors.length}). Bundle the asset from npm instead:`);
  for (const error of [...new Set(errors)].slice(0, 100)) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`External CDN check passed across ${files.length} files.`);
