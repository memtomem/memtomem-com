import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import {
  REQUIRED_ASSET_PATHS,
  UNPINNED_CORE_PATHS,
  assertReferencesCovered,
  collectCoreReferences,
  validateManifest,
  verifyAsset,
  coreReleaseRef,
  fetchPublishedAsset,
  FETCH_ATTEMPTS,
} from './check-onboarding-assets.mjs';

const bytes = Buffer.from('verified notebook');
const asset = { path: 'examples/notebook.ipynb', sha256: createHash('sha256').update(bytes).digest('hex') };
test('onboarding publication gate accepts exact contents', () => {
  assert.doesNotThrow(() => verifyAsset(asset, bytes));
});
test('onboarding publication gate rejects drift and error pages', () => {
  assert.throws(() => verifyAsset(asset, Buffer.from('404: Not Found')), /hash mismatch/);
  assert.throws(() => verifyAsset(asset, Buffer.from('modified notebook')), error => {
    assert.match(error.message, /hash mismatch/);
    assert.ok(error.message.includes(asset.path));
    assert.ok(error.message.includes('expected ' + asset.sha256));
    assert.ok(error.message.includes('actual ' + createHash('sha256').update('modified notebook').digest('hex')));
    return true;
  });
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
    `${CORE}/blob/v0.6.4/examples/notebooks/05_langgraph_memory_basics.ipynb`,
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

test('release ref comes from the contract and rejects missing or unsafe versions', () => {
  assert.equal(coreReleaseRef({ core: { version: '0.6.4' } }), 'v0.6.4');
  assert.equal(coreReleaseRef({ core: { version: '1.2.3-rc.1' } }), 'v1.2.3-rc.1');
  for (const version of [undefined, null, 64, '', 'main', '../main', '0.6.4\n']) {
    assert.throws(() => coreReleaseRef({ core: { version } }), /core.version/);
  }
  assert.throws(() => coreReleaseRef({}), /core.version/);
});

test('transient fetch failures retry the same release URL and can recover', async t => {
  t.mock.method(console, 'warn', () => {});
  const urls = [];
  const result = await fetchPublishedAsset(asset.path, 'v1.2.3', {
    delayMs: 0,
    fetchImpl: async (url, { signal }) => {
      urls.push(url);
      assert.ok(signal instanceof AbortSignal);
      return urls.length === 1 ? new Response('busy', { status: 503 }) : new Response(bytes);
    },
  });
  assert.deepEqual(result, bytes);
  assert.deepEqual(urls, Array(2).fill('https://raw.githubusercontent.com/memtomem/memtomem/v1.2.3/' + asset.path));
});

for (const failure of [404, 429, 'network', 'timeout']) {
  test('fetch exhaustion distinguishes ' + failure + ' from a hash mismatch', async t => {
    const warnings = t.mock.method(console, 'warn', () => {});
    let calls = 0;
    await assert.rejects(fetchPublishedAsset(asset.path, 'v0.6.4', {
      delayMs: 0,
      fetchImpl: async () => {
        calls += 1;
        if (failure === 'network') throw new TypeError('fetch failed', { cause: new Error('getaddrinfo ENOTFOUND') });
        if (failure === 'timeout') throw new DOMException('request timed out', 'TimeoutError');
        return new Response('unavailable', { status: failure });
      },
    }), error => {
      assert.match(error.message, /Failed to fetch onboarding asset/);
      assert.ok(error.message.includes(asset.path));
      assert.match(error.message, /at v0\.6\.4/);
      assert.ok(error.message.includes(failure === 'network' ? 'getaddrinfo ENOTFOUND' :
        failure === 'timeout' ? 'request timed out' : 'HTTP ' + failure));
      assert.doesNotMatch(error.message, /hash mismatch/);
      return true;
    });
    assert.equal(calls, FETCH_ATTEMPTS);
    assert.equal(warnings.mock.callCount(), FETCH_ATTEMPTS - 1);
  });
}

for (const scenario of ['published', 'version bump', 'stale hash', 'invalid version', 'local']) {
  test('CLI gate: ' + scenario, async () => {
    const root = await mkdtemp(join(tmpdir(), 'onboarding-gate-'));
    try {
      await mkdir(join(root, 'scripts'));
      await mkdir(join(root, 'src/data'), { recursive: true });
      await cp(new URL('./check-onboarding-assets.mjs', import.meta.url), join(root, 'scripts/check-onboarding-assets.mjs'));
      const version = scenario === 'version bump' ? '1.2.3' : '0.6.4';
      await writeFile(join(root, 'src/data/docs-contract.json'), JSON.stringify({
        core: { version: ['invalid version', 'local'].includes(scenario) ? null : version },
      }));
      const assets = REQUIRED_ASSET_PATHS.map(path => ({ path, sha256: asset.sha256 }));
      if (scenario === 'stale hash') assets[0].sha256 = '0'.repeat(64);
      await writeFile(join(root, 'src/data/onboarding-assets.json'), JSON.stringify(assets));
      const args = [];
      if (scenario === 'local') {
        for (const { path } of assets) {
          const target = join(root, 'core', path);
          await mkdir(dirname(target), { recursive: true });
          await writeFile(target, bytes);
        }
        args.push('--core-root', join(root, 'core'));
      }
      const mock = `
        import assert from 'node:assert/strict';
        globalThis.fetch = async url => {
          console.log('FETCH ' + url);
          assert.ok(url.startsWith('https://raw.githubusercontent.com/memtomem/memtomem/v${version}/'));
          return new Response('verified notebook');
        };
      `;
      const result = spawnSync(process.execPath, [
        '--import', 'data:text/javascript,' + encodeURIComponent(mock),
        join(root, 'scripts/check-onboarding-assets.mjs'), ...args,
      ], { cwd: root, encoding: 'utf8', timeout: 10000 });
      const failed = ['stale hash', 'invalid version'].includes(scenario);
      assert.equal(result.status, failed ? 1 : 0, result.stdout + result.stderr);
      const fetches = result.stdout.split('\n').filter(line => line.startsWith('FETCH '));
      assert.equal(fetches.length, ['invalid version', 'local'].includes(scenario) ? 0 : scenario === 'stale hash' ? 1 : 7);
      if (failed) {
        assert.match(result.stderr, scenario === 'stale hash' ? /hash mismatch/ : /core.version/);
        assert.doesNotMatch(result.stdout, /Onboarding assets verified/);
      } else {
        assert.ok(result.stdout.includes(`Onboarding assets verified (7, ${scenario === 'local' ? 'local only' : 'published v' + version}).`));
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

test('PR build always includes the publication gate without change-path filters', async () => {
  const workflow = (await readFile(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8'))
    .replace(/^\s*#.*$/gm, '');
  const triggers = workflow.slice(workflow.indexOf('\non:'), workflow.indexOf('\npermissions:'));
  assert.match(triggers, /\n  pull_request:\n    branches: \[main\]/);
  assert.doesNotMatch(triggers, /paths(?:-ignore)?:/);
  const build = workflow.match(/\n  build:\n([\s\S]*?)(?=\n  deploy:)/)?.[1];
  assert.ok(build, 'build job is present');
  assert.doesNotMatch(build.split('    steps:')[0], /\b(?:if|needs|continue-on-error):/);
  const gate = build.split(/\n      - /).find(step => step.includes('run: node scripts/check-onboarding-assets.mjs'));
  assert.ok(gate, 'gate is a step inside build');
  assert.doesNotMatch(gate, /\b(?:if|continue-on-error):|--core-root|\|\||;|\|/);
});
