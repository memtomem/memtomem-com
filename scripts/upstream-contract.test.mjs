import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { validateUpstream, staleVersionPattern, stalePins, STALE_VERSIONS } from './upstream-contract.mjs';
const snapshot = JSON.parse(await readFile('src/data/upstream-snapshot.json', 'utf8'));
const contract = JSON.parse(await readFile('src/data/docs-contract.json', 'utf8'));
const sources = {};
async function walk(dir) { for (const entry of await readdir(dir, { withFileTypes: true })) { const file = dir + '/' + entry.name; if (entry.isDirectory()) await walk(file); else if (/\.mdx?$/.test(file)) sources[file] = await readFile(file, 'utf8'); } }
await walk('src/content/docs');
const config = 'src/content/docs/ltm/configuration.md';
const stmConfig = 'src/content/docs/stm/configuration.md';
test('pinned website passes', () => assert.deepEqual(validateUpstream(snapshot, contract, sources), []));
test('no current release is listed as stale', () => { for (const version of [contract.core.version, contract.stm.version, contract.claudePlugin.version, contract.opencode.version]) assert.ok(!STALE_VERSIONS.includes(version), version + ' is current but listed in STALE_VERSIONS'); });
for (const [name, mutate] of [
['same-count tool replacement', (s, c) => { c.core.toolNames[0] = 'mem_fake'; }],
['wrong source revision', (s, c) => { c.sourceSnapshots.coreMain = 'bad'; }],
['missing setting', (s, c, d) => { d[config] = d[config].replaceAll('MEMTOMEM_EMBEDDING__PROVIDER', 'MEMTOMEM_REMOVED'); }],
['default value changed', (s, c, d) => { d[config] = d[config].replace('| `"none"` |', '| `"onnx"` |'); }],
['Korean default drift', (s, c, d) => { d['src/content/docs/ko/ltm/configuration.md'] = ''; }],
['Korean STM default drift', (s, c, d) => { d['src/content/docs/ko/stm/configuration.md'] = ''; }],
['CLI option omitted', (s, c, d) => { d['src/content/docs/stm/cli.md'] = d['src/content/docs/stm/cli.md'].replaceAll('--inherit-runtime-env', '--fake-option'); }],
['public tool catalog drift', (s, c, d) => { d['src/content/docs/ko/ltm/mcp-tools.md'] = ''; }],
['stale release', (s, c, d) => { d[config] += '\nmemtomem 0.3.12'; }],
['private repository link', (s, c, d) => { d[config] += '\nhttps://github.com/memtomem/memtomem-docs/blob/main/audit.md'; }],
['private audit path', (s, c, d) => { d[config] += '\n/docs/audits/internal.md'; }],
]) { test('rejects ' + name, () => { const s = structuredClone(snapshot), c = structuredClone(contract), d = { ...sources }; mutate(s, c, d); assert.ok(validateUpstream(s, c, d).length > 0); }); }
test('rejects STM default drift', () => { const d = { ...sources }; const row = '| `MEMTOMEM_STM_PROXY__CACHE__ENABLED` | Enable response caching | `true` |'; assert.ok(d[stmConfig].includes(row)); d[stmConfig] = d[stmConfig].replace(row, row.replace('`true`', '`false`')); assert.deepEqual(validateUpstream(snapshot, contract, d), ['MEMTOMEM_STM_PROXY__CACHE__ENABLED: default mismatch']); });
test('rejects stale release at sentence end', () => { const d = { ...sources }; d[config] += '\nThis targets memtomem v0.3.12. Next'; assert.deepEqual(validateUpstream(snapshot, contract, d), [config + ': stale release']); });
for (const [version, text, stale] of [
['0.6.4', 'targets memtomem v0.6.4. Commands', true],
['0.6.4', 'v0.6.4.', true],
['0.6.4', '==0.6.4"', true],
['0.6.4', '0.6.4-rc1', true],
['0.6.4', '0.6.4.dev0', true],
['0.6.4', '0.6.4.x', true],
['0.6.4', '`0.6.4`', true],
['0.6.4', '**0.6.4**', true],
['0.1.2', 'notes on v0.1.23', false],
['0.6.4', 'v0.6.4.1', false],
['0.6.4', '10.6.4', false],
]) { test(`stale pattern ${version} ${stale ? 'flags' : 'ignores'} ${text}`, () => assert.equal(staleVersionPattern(version).test(text), stale)); }
for (const [text, flagged] of [
["uv tool install 'memtomem[all]==0.6.8'", ['memtomem[all]==0.6.8']],
['uvx --from "memtomem-stm[langfuse]==0.6.1" mms', ['memtomem-stm[langfuse]==0.6.1']],
['pip install memtomem-stm==0.6.8', ['memtomem-stm==0.6.8']],
['"args": ["--from", "memtomem[onnx]==0.6.8", "memtomem-server"]', ['memtomem[onnx]==0.6.8']],
["pip install 'git+https://github.com/memtomem/memtomem.git@v0.6.8#subdirectory=packages/memtomem'", ['github.com/memtomem/memtomem.git@v0.6.8']],
['mm upgrade --version 0.6.8', ['--version 0.6.8']],
['mm upgrade --version=0.6.8', ['--version=0.6.8']],
['https://github.com/memtomem/memtomem/blob/v0.6.8/docs/guides/configuration.md', ['github.com/memtomem/memtomem/blob/v0.6.8']],
['https://github.com/memtomem/memtomem-stm/tree/v0.6.1/docs', ['github.com/memtomem/memtomem-stm/tree/v0.6.1']],
['https://raw.githubusercontent.com/memtomem/memtomem/v0.6.8/examples/a.ipynb', ['raw.githubusercontent.com/memtomem/memtomem/v0.6.8']],
['https://raw.githubusercontent.com/memtomem/memtomem-stm/v0.6.1/docs/configuration.md', ['raw.githubusercontent.com/memtomem/memtomem-stm/v0.6.1']],
['{"plugin": ["opencode-memtomem@0.3.11"]}', ['opencode-memtomem@0.3.11']],
['memtomem==0.6.12rc1', ['memtomem==0.6.12rc1']],
['pip install MEMTOMEM==0.6.8', ['MEMTOMEM==0.6.8']],
['pip install MemToMem-STM==0.6.8', ['MemToMem-STM==0.6.8']],
['mm upgrade --version "0.6.8"', ['--version "0.6.8"']],
["mm upgrade --version='0.6.8'", ["--version='0.6.8'"]],
['mm upgrade --yes --version  0.6.8', ['--version  0.6.8']],
['mm upgrade --version 0.6.12 --version 0.6.8', ['--version 0.6.8']],
['mm upgrade --version \\\n  0.6.8', ['--version \\\n  0.6.8']],
['mm upgrade --version\n0.6.8', ['--version\n0.6.8']],
['mm upgrade \\\n  --version 0.6.8', ['--version 0.6.8']],
// No other package on the site takes a numeric --version; one that does needs its own rule.
['hermes update --version 0.21.5', ['--version 0.21.5']],
['memtomem==0.6.12.post1', ['memtomem==0.6.12.post1']],
// Current pins, unversioned links, prose, and other packages pass.
["uv tool install 'memtomem[all]==0.6.12'", []],
['uvx --from memtomem-stm==0.6.9 mms', []],
['{"plugin": ["opencode-memtomem@0.3.15"]}', []],
['https://github.com/memtomem/memtomem-stm/blob/main/docs/configuration.md', []],
['https://github.com/memtomem/memtomem-stm/blob/v0.6.9/docs/cli.md', []],
['Added in 0.6.8; requires memtomem 0.6.8 or later.', []],
['an exact `memtomem==` pin', []],
['/plugin install memtomem@memtomem', []],
['uv tool install "hermes-agent[mcp]==0.21.5"', []],
['opencode-memtomem-extra@0.1.0 and mymemtomem==0.1.0', []],
['pip install other.memtomem==0.6.8', []],
['mm upgrade --version 0.6.12', []],
['mm --version', []],
]) test(`stale pins in ${text}`, () => assert.deepEqual(stalePins(text, contract), flagged));
test('rejects a stale pin in a Korean doc', () => { const d = { ...sources }; const ko = 'src/content/docs/ko/stm/cli.md'; d[ko] += '\nuv tool install memtomem-stm==0.6.8'; assert.deepEqual(validateUpstream(snapshot, contract, d), [ko + ': stale pin memtomem-stm==0.6.8']); });
