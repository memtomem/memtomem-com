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
const builtCdn = async files => { const dir=await mkdtemp(path.join(tmpdir(),'site-cdn-')); try { for (const [file, body] of Object.entries(files)) { await mkdir(path.dirname(path.join(dir,'dist',file)),{recursive:true}); await writeFile(path.join(dir,'dist',file),body); } return spawnSync(process.execPath,[path.join(root,'scripts/check-built-cdn.mjs')],{cwd:dir,encoding:'utf8'}); } finally { await rm(dir,{recursive:true,force:true}); } };
for (const [name, file, body, host] of [
['script tag', 'index.html', '<html><script src="https://cdn.jsdelivr.net/npm/x@1/x.js"></script></html>', 'cdn.jsdelivr.net'],
['CSS import', '_astro/common.css', "@import url('https://fonts.googleapis.com/css2?family=Inter');", 'fonts.googleapis.com'],
['JS module import', '_astro/app.js', 'import("https://esm.sh/react@18")', 'esm.sh'],
['mirror subdomain', 'ko/index.html', '<link rel="stylesheet" href="https://fastly.jsdelivr.net/npm/y.css">', 'fastly.jsdelivr.net'],
['uppercase host', 'index.html', '<img src="HTTPS://UNPKG.COM/z.svg">', 'UNPKG.COM'],
['runtime JSON', 'config.json', '{"theme":"https://cdn.jsdelivr.net/x.css"}', 'cdn.jsdelivr.net'],
['XML stylesheet', 'feed.xml', '<?xml-stylesheet href="https://cdnjs.cloudflare.com/a.xsl"?>', 'cdnjs.cloudflare.com'],
['root-dot host', 'index.html', '<script src="https://unpkg.com./x.js"></script>', 'unpkg.com'],
['HTML after a NUL byte', 'index.html', '<!--\0--><script src="https://cdn.jsdelivr.net/x.js"></script>', 'cdn.jsdelivr.net'],
['CSS after a NUL byte', '_astro/a.css', "/*\0*/@import url('https://fonts.gstatic.com/a.css');", 'fonts.gstatic.com'],
['sitemap stylesheet', 'sitemap-0.xml', '<?xml-stylesheet href="https://cdnjs.cloudflare.com/a.xsl" type="text/xsl"?>', 'cdnjs.cloudflare.com'],
['plain-text mention', 'llms-full.txt', 'Avoid cdn.jsdelivr.net imports.', 'cdn.jsdelivr.net'],
]) test('built CDN checker rejects '+name, async () => { const result=await builtCdn({ [file]: body }); assert.equal(result.status,1,result.stdout+result.stderr); assert.ok(result.stderr.includes(file+':1: '+host), result.stderr); });
test('built CDN checker passes first-party output, lookalike hosts, and binaries', async () => { const result=await builtCdn({ 'index.html': '<html><link rel="canonical" href="https://memtomem.com/"><script src="/_astro/app.js"></script></html>', '_astro/app.js': 'const notCdn = "https://github.com/memtomem/memtomem"; const prefixed = "https://notunpkg.com/a.js"; const suffixed = "https://unpkg.community/a.js"; const dotted = "https://unpkg.com.example.org/a.js";', 'font.woff2': Buffer.from([0, 0xff, 0x00, 0x7f, 0x80]) }); assert.equal(result.status,0,result.stdout+result.stderr); assert.match(result.stdout,/External CDN check passed across 3 files/); });
