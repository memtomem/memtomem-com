import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const dist = path.join(root, 'dist');
const errors = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  }));
  return nested.flat();
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

function htmlCandidates(route) {
  const clean = route.replace(/^\/+/, '');
  if (!clean) return [path.join(dist, 'index.html')];
  if (path.extname(clean)) return [path.join(dist, clean)];
  return [path.join(dist, clean, 'index.html'), path.join(dist, `${clean}.html`)];
}

const htmlFiles = (await walk(dist)).filter((file) => file.endsWith('.html'));
for (const source of htmlFiles) {
  const html = await readFile(source, 'utf8');
  const hrefs = [...html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)].map((match) => match[1]);
  for (const href of hrefs) {
    if (/^(?:https?:|mailto:|tel:|javascript:)/.test(href)) continue;
    const [rawRoute, rawFragment = ''] = href.split('#', 2);
    let route = rawRoute.split('?', 1)[0];
    if (!route) route = `/${path.relative(dist, source).replace(/index\.html$/, '')}`;
    if (!route.startsWith('/')) {
      route = `/${path.normalize(path.join(path.dirname(path.relative(dist, source)), route))}`;
    }
    const candidates = htmlCandidates(decodeURI(route));
    const target = candidates.find((candidate) => htmlFiles.includes(candidate))
      ?? candidates.find((candidate) => path.extname(candidate) && !candidate.endsWith('.html'));
    if (!target || !(await exists(target))) {
      errors.push(`${path.relative(dist, source)} -> ${href} (missing route)`);
      continue;
    }
    if (rawFragment && target.endsWith('.html')) {
      const targetHtml = target === source ? html : await readFile(target, 'utf8');
      const fragment = decodeURIComponent(rawFragment);
      const escaped = fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (!new RegExp(`\\bid=["']${escaped}["']`).test(targetHtml)) {
        errors.push(`${path.relative(dist, source)} -> ${href} (missing fragment)`);
      }
    }
  }
}

if (errors.length) {
  console.error(`Built-link check failed (${errors.length}):`);
  for (const error of [...new Set(errors)].slice(0, 100)) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Built-link check passed across ${htmlFiles.length} HTML files.`);
