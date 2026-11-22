import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { checkLanding } from './check-built-landing.mjs';

const root = process.cwd();
const install = JSON.parse(await readFile(path.join(root, 'src/data/docs-contract.json'), 'utf8')).guides.landingPluginInstall;

// The fixture is the real landing markup, with Astro's base-prefixed hrefs
// rendered the way the build renders them (base is empty on this site).
async function landing(locale) {
  const file = locale === 'en' ? 'src/pages/index.astro' : 'src/pages/ko/index.astro';
  const source = await readFile(path.join(root, file), 'utf8');
  const main = source.slice(source.indexOf('<main>'), source.indexOf('</main>') + '</main>'.length);
  return `<!doctype html><html><body>${main.replace(/href=\{`\$\{base\}([^`]*)`\}/g, 'href="$1"')}</body></html>`;
}

function mutate(html, from, to) {
  const after = html.replace(from, to);
  assert.notEqual(after, html, `mutation did not apply: ${from}`);
  return after;
}

for (const locale of ['en', 'ko']) {
  test(`built landing check accepts the ${locale} landing`, async () => {
    assert.deepEqual(checkLanding(await landing(locale), locale, install), []);
  });
}

const route = { en: '/ltm/project-workflows/#before-you-start', ko: '/ko/ltm/project-workflows/#시작하기-전에' };
const codexAdd = '<code id="install-codex-plugin">codex plugin add memtomem@memtomem</code>';
const claudeInstall = '<code id="install-claude-plugin">/plugin install memtomem@memtomem</code>';

for (const [name, locale, change, expected] of [
  ['a suffixed command', 'en',
    (h) => mutate(h, codexAdd, codexAdd.replace('memtomem@memtomem', 'memtomem@memtomem-x')),
    /#install-codex-plugin is "codex plugin add memtomem@memtomem-x"/],
  ['a command moved outside its panel', 'ko',
    (h) => mutate(h, codexAdd, '').replace('</main>', `${codexAdd}</main>`),
    /expected one <code id="install-codex-plugin"> in #install-panel-codex, found 0 \(page 1\)/],
  ['swapped command rows', 'en',
    (h) => mutate(h, claudeInstall, '\u0000').replace(codexAdd, claudeInstall).replace('\u0000', codexAdd),
    /expected one <code id="install-claude-plugin"> in #install-panel-claude, found 0 \(page 1\)/],
  ['a missing command id', 'en',
    (h) => mutate(h, '<code id="install-claude-plugin">', '<code>'),
    /expected one <code id="install-claude-plugin"> in #install-panel-claude, found 0 \(page 0\)/],
  ['a changed tier scope in one place', 'ko',
    (h) => mutate(h, '<code>mm mem init --scope project_local</code>', '<code>mm mem init --scope project_shared</code>'),
    /#install-panel-claude must show mm mem init --scope project_local in its steps; found mm mem init --scope project_shared \| mm mem init --scope project_local/],
  ['a tier step with a changed scope and extra spaces', 'en',
    (h) => mutate(h, '<code>mm mem init --scope project_local</code>', '<code>mm  mem init --scope project_shared</code>'),
    /#install-panel-claude must show mm mem init --scope project_local in its steps; found mm  mem init --scope project_shared/],
  ['a tier step removed while the note keeps it', 'en',
    (h) => mutate(h, '<span class="step-sep" aria-hidden="true"></span><code>mm mem init --scope project_local</code>', ''),
    /#install-panel-claude must show mm mem init --scope project_local in its steps; found mm mem init --scope project_local$/],
  ['a panel without its tab label', 'en',
    (h) => mutate(h, 'id="install-panel-codex" data-tab-label="Codex CLI"', 'id="install-panel-codex"'),
    /#install-panel-codex must be a direct child of \[data-install-tabs\] with a data-tab-label/],
  ['a panel wrapped in another element', 'ko',
    (h) => { const i = h.indexOf('<div class="install-panel" id="install-panel-codex"'); const j = h.indexOf('</div>\n\t</div>\n\t<p class="sr-only"'); assert.ok(i > 0 && j > i); return h.slice(0, i) + '<div class="wrap">' + h.slice(i, j) + '</div></div>' + h.slice(j + '</div>'.length); },
    /#install-panel-codex must be a direct child of \[data-install-tabs\] with a data-tab-label/],
  ['a link to the other locale', 'en',
    (h) => mutate(h, `href="${route.en}"`, `href="/ko${route.en}"`),
    /#install-panel-claude needs exactly one link, to \/ltm\/project-workflows\/#before-you-start; found \/ko\/ltm/],
  ['a Codex link to another route', 'ko',
    (h) => { const i = h.indexOf('id="install-panel-codex"'); return h.slice(0, i) + mutate(h.slice(i), `href="${route.ko}"`, 'href="/ko/guides/quickstart/"'); },
    /#install-panel-codex needs exactly one link, to \/ko\/ltm\/project-workflows\/#시작하기-전에; found \/ko\/guides\/quickstart\//],
  ['an extra link in a panel', 'en',
    (h) => mutate(h, `<a href="${route.en}">`, `<a href="/guides/quickstart/">Quick Start</a><a href="${route.en}">`),
    /#install-panel-claude needs exactly one link/],
]) {
  test(`built landing check rejects ${name}`, async () => {
    const errors = checkLanding(change(await landing(locale)), locale, install);
    assert.ok(errors.some((e) => expected.test(e)), errors.join('\n') || 'no errors');
  });
}

for (const [name, locale, change] of [
  ['panel attributes in another order', 'en',
    (h) => mutate(h, '<div class="install-panel" id="install-panel-claude"', '<div id="install-panel-claude" class="install-panel"')],
  ['a percent-encoded Korean fragment', 'ko',
    (h) => { const after = h.replaceAll(`href="${route.ko}"`, `href="${encodeURI(route.ko)}"`); assert.notEqual(after, h); return after; }],
  ['an anchor without href in a panel', 'en',
    (h) => mutate(h, `<a href="${route.en}">`, `<a id="setup-note"></a><a href="${route.en}">`)],
]) {
  test(`built landing check accepts ${name}`, async () => {
    assert.deepEqual(checkLanding(change(await landing(locale)), locale, install), []);
  });
}
