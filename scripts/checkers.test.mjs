import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const root = process.cwd();
for (const [name, mutate] of [
['missing mirror', async d => { await rm(path.join(d, 'src/content/docs/ko/ltm/overview.md')); }],
['unknown setting', async d => { const p=path.join(d,'src/content/docs/reference/configuration.md'); await writeFile(p,(await readFile(p,'utf8'))+'\n| `MEMTOMEM_FAKE` | unknown | `false` |\n'); }],
['invalid JSON example', async d => { const p=path.join(d,'src/content/docs/ltm/overview.md'); await writeFile(p,(await readFile(p,'utf8'))+'\n```json\n{"broken": }\n```\n'); }],
]) test('full checker rejects '+name, async () => {
const dir=await mkdtemp(path.join(tmpdir(),'site-contract-'));
try { await cp(path.join(root,'src'),path.join(dir,'src'),{recursive:true}); await cp(path.join(root,'astro.config.mjs'),path.join(dir,'astro.config.mjs')); await mutate(dir); const result=spawnSync(process.execPath,[path.join(root,'scripts/check-doc-contract.mjs')],{cwd:dir,encoding:'utf8'}); assert.equal(result.status,1,result.stdout+result.stderr); assert.match(result.stderr,/Documentation contract failed/); } finally { await rm(dir,{recursive:true,force:true}); }
});
for(const [name,href] of [['route','/absent/'],['fragment','#absent']]) test('built checker rejects missing '+name,async()=>{ const dir=await mkdtemp(path.join(tmpdir(),'site-links-')); try { await mkdir(path.join(dir,'dist')); await writeFile(path.join(dir,'dist/index.html'),'<html><a href="'+href+'">broken</a></html>'); const result=spawnSync(process.execPath,[path.join(root,'scripts/check-built-links.mjs')],{cwd:dir,encoding:'utf8'}); assert.equal(result.status,1); assert.match(result.stderr,new RegExp('missing '+name)); } finally { await rm(dir,{recursive:true,force:true}); } });
