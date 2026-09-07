import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { REQUIRED_ASSET_PATHS, validateManifest, verifyAsset } from './check-onboarding-assets.mjs';

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
