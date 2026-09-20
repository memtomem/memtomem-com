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
    `${CORE}/blob/v0.6.4/examples/onboarding/retry-policy/retry_policy.py#L1`,
    'https://raw.githubusercontent.com/memtomem/memtomem/v0.6.4/examples/onboarding/retry-policy/test_policy.py?download=1',
    `${CORE}/tree/v0.6.4/examples/notebooks/`,
  ].join('\n'));
  assert.deepEqual([...found.files].sort(), [
    'examples/notebooks/05_langgraph_memory_basics.ipynb',
    'examples/onboarding/retry-policy/demo.py',
    'examples/onboarding/retry-policy/retry_policy.py',
    'examples/onboarding/retry-policy/test_policy.py',
  ]);
  assert.deepEqual([...found.trees], ['examples/onboarding/retry-policy', 'examples/notebooks']);
  assert.equal(found.links.length, 6);
});

test('a trailing slash does not hide a covered directory link', () => {
  const found = collectCoreReferences(`[a](${CORE}/tree/v0.6.4/examples/onboarding/retry-policy/)`);
  assert.doesNotThrow(() => assertReferencesCovered(found, 'v0.6.4'));
});

test('tagged links cannot bypass asset coverage', () => {
  for (const url of [
    `${CORE}/blob/v0.6.4/examples/notebooks/99_new.ipynb`,
    'https://raw.githubusercontent.com/memtomem/memtomem/v0.6.4/examples/notebooks/99_new.ipynb',
    `${CORE}/tree/v0.6.4/examples/onboarding/new-example`,
  ]) {
    assert.throws(() => assertReferencesCovered(collectCoreReferences(url), 'v0.6.4'), /does not cover/);
  }
});

test('GitHub raw download links must be covered and use the contract release', () => {
  const valid = collectCoreReferences(`${CORE}/raw/v0.6.4/${REQUIRED_ASSET_PATHS[0]}?download=1`);
  assert.deepEqual([...valid.files], [REQUIRED_ASSET_PATHS[0]]);
  assert.equal(valid.links.length, 1);
  assert.doesNotThrow(() => assertReferencesCovered(valid, 'v0.6.4'));
  assert.throws(() => assertReferencesCovered(collectCoreReferences(
    `${CORE}/raw/main/${REQUIRED_ASSET_PATHS[0]}`
  ), 'v0.6.4'), /Onboarding links must use/);
  assert.throws(() => assertReferencesCovered(collectCoreReferences(
    `${CORE}/raw/main/examples/notebooks/99_new.ipynb`
  ), 'v0.6.4'), /does not cover/);
});

test('onboarding links must use the contract release, including mixed refs', () => {
  for (const ref of ['main', 'v0.6.3', 'preview', 'a'.repeat(40)]) {
    for (const url of [
      `${CORE}/blob/${ref}/${REQUIRED_ASSET_PATHS[0]}`,
      `https://raw.githubusercontent.com/memtomem/memtomem/${ref}/${REQUIRED_ASSET_PATHS[0]}`,
      `${CORE}/tree/${ref}/examples/onboarding/retry-policy`,
    ]) {
      const links = collectCoreReferences(`${CORE}/blob/v0.6.4/${REQUIRED_ASSET_PATHS[0]}\n${url}`);
      assert.throws(() => assertReferencesCovered(links, 'v0.6.4'), /Onboarding links must use v0\.6\.4/);
    }
  }
  const unpinned = collectCoreReferences(`${CORE}/blob/main/${UNPINNED_CORE_PATHS[0]}`);
  assert.doesNotThrow(() => assertReferencesCovered(unpinned, 'v0.6.4'));
});

test('every linked core file must be pinned or explicitly unpinned', () => {
  assert.doesNotThrow(() => assertReferencesCovered(collectCoreReferences(
    `${CORE}/blob/v0.6.4/${REQUIRED_ASSET_PATHS[0]}\n${CORE}/blob/main/${UNPINNED_CORE_PATHS[0]}`
  ), 'v0.6.4'));
  assert.throws(
    () => assertReferencesCovered(collectCoreReferences(`${CORE}/blob/v0.6.4/examples/notebooks/99_new.ipynb`), 'v0.6.4'),
    /does not cover: examples\/notebooks\/99_new\.ipynb/
  );
});

test('a linked core directory must contain at least one covered asset', () => {
  assert.doesNotThrow(() => assertReferencesCovered(collectCoreReferences(
    `${CORE}/tree/v0.6.4/examples/onboarding/retry-policy`
  ), 'v0.6.4'));
  assert.throws(
    () => assertReferencesCovered(collectCoreReferences(`${CORE}/tree/v0.6.4/examples/onboarding/rag`), 'v0.6.4'),
    /directories that the onboarding manifest does not cover/
  );
  // A prefix that is not a directory boundary must not count as coverage.
  assert.throws(
    () => assertReferencesCovered(collectCoreReferences(`${CORE}/tree/v0.6.4/examples/onboarding/retry`), 'v0.6.4'),
    /directories that the onboarding manifest does not cover/
  );
});

test('missing link refs cannot silently skip release validation', () => {
  for (const links of [undefined, null, {}]) {
    assert.throws(() => assertReferencesCovered({
      files: new Set([REQUIRED_ASSET_PATHS[0]]), trees: new Set(), links,
    }, 'v0.6.4'), /must include link refs/);
  }
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

for (const failure of [404, 429, 503, 'network', 'timeout']) {
  test('fetch failure ' + failure + ' has distinct diagnostics and the expected retry count', async t => {
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
    const expectedAttempts = failure === 404 ? 1 : FETCH_ATTEMPTS;
    assert.equal(calls, expectedAttempts);
    assert.equal(warnings.mock.callCount(), expectedAttempts - 1);
  });
}

for (const scenario of ['published', 'version bump', 'stale hash', 'invalid version', 'local',
  'local invalid version', 'main link', 'stale link', 'local stale link', 'uncovered tagged link']) {
  test('CLI gate: ' + scenario, async () => {
    const root = await mkdtemp(join(tmpdir(), 'onboarding-gate-'));
    try {
      await mkdir(join(root, 'scripts'));
      await mkdir(join(root, 'src/data'), { recursive: true });
      await cp(new URL('./check-onboarding-assets.mjs', import.meta.url), join(root, 'scripts/check-onboarding-assets.mjs'));
      const version = scenario === 'version bump' ? '1.2.3' : '0.6.4';
      await writeFile(join(root, 'src/data/docs-contract.json'), JSON.stringify({
        core: { version: scenario.includes('invalid version') ? null : version },
      }));
      const linkRef = scenario === 'main link' ? 'main' : scenario.includes('stale link') ? 'v0.6.3' : 'v' + version;
      const linkedPath = scenario === 'uncovered tagged link' ? 'examples/notebooks/99_new.ipynb' : REQUIRED_ASSET_PATHS[0];
      await writeFile(join(root, 'src/page.md'), `[Download](https://raw.githubusercontent.com/memtomem/memtomem/${linkRef}/${linkedPath})`);
      const assets = REQUIRED_ASSET_PATHS.map(path => ({ path, sha256: asset.sha256 }));
      if (scenario === 'stale hash') assets[0].sha256 = '0'.repeat(64);
      await writeFile(join(root, 'src/data/onboarding-assets.json'), JSON.stringify(assets));
      const args = [];
      const local = scenario.startsWith('local');
      if (local) {
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
      const preflightFailure = scenario.includes('invalid version') || scenario.includes('link');
      const failed = scenario === 'stale hash' || preflightFailure;
      assert.equal(result.status, failed ? 1 : 0, result.stdout + result.stderr);
      const fetches = result.stdout.split('\n').filter(line => line.startsWith('FETCH '));
      assert.equal(fetches.length, preflightFailure || local ? 0 : scenario === 'stale hash' ? 1 : 7);
      if (failed) {
        const expectedError = scenario === 'stale hash' ? /hash mismatch/ :
          scenario.includes('invalid version') ? /core.version/ :
          scenario === 'uncovered tagged link' ? /does not cover/ : /Onboarding links must use/;
        assert.match(result.stderr, expectedError);
        assert.doesNotMatch(result.stdout, /Onboarding assets verified/);
      } else {
        assert.ok(result.stdout.includes(`Onboarding assets verified (7, ${local ? 'local only' : 'published v' + version}).`));
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

test('deployment requires a successful build and a non-PR main event', async () => {
  const workflow = (await readFile(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8'))
    .replace(/^\s*#.*$/gm, '');
  const deploy = workflow.match(/\n  deploy:\n([\s\S]*)/)?.[1];
  assert.ok(deploy, 'deploy job is present');
  const job = deploy.split('    steps:')[0];
  assert.match(job, /^    if: github\.event_name != 'pull_request' && github\.ref == 'refs\/heads\/main'$/m);
  assert.match(job, /^    needs: build$/m);
  const upload = workflow.split(/\n      - /).find(step => step.includes('uses: actions/upload-pages-artifact@'));
  assert.ok(upload, 'artifact upload step is present');
  assert.match(upload, /^if: github\.event_name != 'pull_request'$/m);
});
