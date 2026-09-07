import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import {
  REQUIRED_ASSET_PATHS,
  UNPINNED_CORE_PATHS,
  assertReferencesCovered,
  collectCoreReferences,
  validateManifest,
  verifyAsset,
} from './check-onboarding-assets.mjs';

const bytes = Buffer.from('verified notebook');
const asset = { path: 'examples/notebook.ipynb', sha256: createHash('sha256').update(bytes).digest('hex') };
test('onboarding publication gate accepts exact contents', () => {
  assert.doesNotThrow(() => verifyAsset(asset, bytes));
});
test('onboarding publication gate rejects drift and error pages', () => {
  assert.throws(() => verifyAsset(asset, Buffer.from('404: Not Found')), /Missing or changed/);
  assert.throws(() => verifyAsset(asset, Buffer.from('modified notebook')), /Missing or changed/);
});

const manifest = () => REQUIRED_ASSET_PATHS.map(path => ({ path, sha256: 'a'.repeat(64) }));

test('onboarding manifest must cover every required asset', () => {
  assert.doesNotThrow(() => validateManifest(manifest()));
  assert.throws(() => validateManifest(manifest().slice(1)), /missing required assets/);
  assert.throws(() => validateManifest([]), /non-empty array/);
  assert.throws(() => validateManifest(''), /non-empty array/);
  assert.throws(() => validateManifest({ path: 'x', sha256: 'a'.repeat(64) }), /non-empty array/);
});

test('onboarding manifest cannot substitute an unrelated asset for a required one', () => {
  // Same entry count, so a length check alone would not catch this.
  const substituted = manifest();
  substituted[0].path = 'examples/notebooks/99_not_reviewed.ipynb';
  assert.throws(() => validateManifest(substituted), /Unexpected/);
  assert.throws(() => validateManifest(substituted.slice(1).concat(substituted[0])), /Unexpected/);
});

test('onboarding manifest entries need a real path and digest', () => {
  const withoutPath = manifest();
  delete withoutPath[0].path;
  assert.throws(() => validateManifest(withoutPath), /no path/);

  const shortDigest = manifest();
  shortDigest[0].sha256 = 'abc';
  assert.throws(() => validateManifest(shortDigest), /no valid sha256/);

  const uppercaseDigest = manifest();
  uppercaseDigest[0].sha256 = 'A'.repeat(64);
  assert.throws(() => validateManifest(uppercaseDigest), /no valid sha256/);

  const trailingNewline = manifest();
  trailingNewline[0].sha256 = 'a'.repeat(64) + '\n';
  assert.throws(() => validateManifest(trailingNewline), /no valid sha256/);

  for (const entry of [null, 'a string', 42]) {
    const nonObject = manifest();
    nonObject[0] = entry;
    assert.throws(() => validateManifest(nonObject), /no path/);
  }

  const duplicated = manifest();
  duplicated.push({ path: REQUIRED_ASSET_PATHS[0], sha256: 'b'.repeat(64) });
  assert.throws(() => validateManifest(duplicated), /Duplicate/);
});

test('the committed manifest passes its own validation', async () => {
  const { readFile } = await import('node:fs/promises');
  const committed = JSON.parse(
    await readFile(new URL('../src/data/onboarding-assets.json', import.meta.url), 'utf8')
  );
  assert.doesNotThrow(() => validateManifest(committed));
});

const CORE = 'https://github.com/memtomem/memtomem';
const RAW = 'https://raw.githubusercontent.com/memtomem/memtomem/main';

test('core references are collected from blob, raw, and tree links', () => {
  const found = collectCoreReferences([
    `[a](${CORE}/blob/main/examples/notebooks/05_langgraph_memory_basics.ipynb)`,
    `<a href="${RAW}/examples/onboarding/retry-policy/demo.py">b</a>`,
    `[c](${CORE}/tree/main/examples/onboarding/retry-policy)`,
    'https://github.com/memtomem/memtomem-stm/blob/main/README.md',
    `${CORE}/blob/v0.5.0/examples/notebooks/05_langgraph_memory_basics.ipynb`,
  ].join('\n'));
  assert.deepEqual([...found.files].sort(), [
    'examples/notebooks/05_langgraph_memory_basics.ipynb',
    'examples/onboarding/retry-policy/demo.py',
  ]);
  assert.deepEqual([...found.trees], ['examples/onboarding/retry-policy']);
});

test('a trailing slash does not hide a covered directory link', () => {
  const found = collectCoreReferences(`[a](${CORE}/tree/main/examples/onboarding/retry-policy/)`);
  assert.doesNotThrow(() => assertReferencesCovered(found));
});

test('every linked core file must be pinned or explicitly unpinned', () => {
  assert.doesNotThrow(() => assertReferencesCovered({
    files: new Set([REQUIRED_ASSET_PATHS[0], UNPINNED_CORE_PATHS[0]]),
    trees: new Set(),
  }));
  assert.throws(
    () => assertReferencesCovered({ files: new Set(['examples/notebooks/99_new.ipynb']), trees: new Set() }),
    /does not cover: examples\/notebooks\/99_new\.ipynb/
  );
});

test('a linked core directory must contain at least one covered asset', () => {
  assert.doesNotThrow(() => assertReferencesCovered({
    files: new Set(),
    trees: new Set(['examples/onboarding/retry-policy']),
  }));
  assert.throws(
    () => assertReferencesCovered({ files: new Set(), trees: new Set(['examples/onboarding/rag']) }),
    /directories that the onboarding manifest does not cover/
  );
  // A prefix that is not a directory boundary must not count as coverage.
  assert.throws(
    () => assertReferencesCovered({ files: new Set(), trees: new Set(['examples/onboarding/retry']) }),
    /directories that the onboarding manifest does not cover/
  );
});
