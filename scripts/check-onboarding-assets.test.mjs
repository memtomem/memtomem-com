import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { verifyAsset } from './check-onboarding-assets.mjs';

const bytes = Buffer.from('verified notebook');
const asset = { path: 'examples/notebook.ipynb', sha256: createHash('sha256').update(bytes).digest('hex') };
test('onboarding publication gate accepts exact contents', () => {
  assert.doesNotThrow(() => verifyAsset(asset, bytes));
});
test('onboarding publication gate rejects drift and error pages', () => {
  assert.throws(() => verifyAsset(asset, Buffer.from('404: Not Found')), /Missing or changed/);
  assert.throws(() => verifyAsset(asset, Buffer.from('modified notebook')), /Missing or changed/);
});
