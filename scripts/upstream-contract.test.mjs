import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { validateUpstream } from './upstream-contract.mjs';
const snapshot = JSON.parse(await readFile('src/data/upstream-snapshot.json', 'utf8'));
const contract = JSON.parse(await readFile('src/data/docs-contract.json', 'utf8'));
const sources = {};
async function walk(dir) { for (const entry of await readdir(dir, { withFileTypes: true })) { const file = dir + '/' + entry.name; if (entry.isDirectory()) await walk(file); else if (/\.mdx?$/.test(file)) sources[file] = await readFile(file, 'utf8'); } }
await walk('src/content/docs');
const config = 'src/content/docs/reference/configuration.md';
test('pinned website passes', () => assert.deepEqual(validateUpstream(snapshot, contract, sources), []));
for (const [name, mutate] of [
['same-count tool replacement', (s, c) => { c.core.toolNames[0] = 'mem_fake'; }],
['wrong source revision', (s, c) => { c.sourceSnapshots.coreMain = 'bad'; }],
['missing setting', (s, c, d) => { d[config] = d[config].replaceAll('MEMTOMEM_EMBEDDING__PROVIDER', 'MEMTOMEM_REMOVED'); }],
['default value changed', (s, c, d) => { d[config] = d[config].replace('| `"none"` |', '| `"onnx"` |'); }],
['Korean default drift', (s, c, d) => { d['src/content/docs/ko/reference/configuration.md'] = ''; }],
['CLI option omitted', (s, c, d) => { d['src/content/docs/stm/cli.md'] = d['src/content/docs/stm/cli.md'].replaceAll('--inherit-runtime-env', '--fake-option'); }],
['public tool catalog drift', (s, c, d) => { d['src/content/docs/ko/ltm/mcp-tools.md'] = ''; }],
['stale release', (s, c, d) => { d[config] += '\nmemtomem 0.3.12'; }],
['private repository link', (s, c, d) => { d[config] += '\nhttps://github.com/memtomem/memtomem-docs/blob/main/audit.md'; }],
['private audit path', (s, c, d) => { d[config] += '\n/docs/audits/internal.md'; }],
]) { test('rejects ' + name, () => { const s = structuredClone(snapshot), c = structuredClone(contract), d = { ...sources }; mutate(s, c, d); assert.ok(validateUpstream(s, c, d).length > 0); }); }
