import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const source = 'design/og-image.html';
const manifest = 'design/og-image.json';
const read = (file) => readFile(path.join(root, file), 'utf8');
// The HTML is hashed with LF line endings so a CRLF checkout matches; PNGs are hashed as bytes.
const sha256 = async (file) => {
	const bytes = await readFile(path.join(root, file));
	const content = file.endsWith('.html') ? bytes.toString('utf8').replace(/\r\n/g, '\n') : bytes;
	return createHash('sha256').update(content).digest('hex');
};
const text = (html) => html
	.replace(/<br\s*\/?>/gi, ' ')
	.replace(/<[^>]+>/g, '')
	.replace(/\s+/g, ' ')
	.trim();
const body = (html) => html
	.replace(/<!--[\s\S]*?-->/g, '')
	.replace(/<(style|script)\b[\s\S]*?<\/\1>/gi, '')
	.match(/<body\b[^>]*>([\s\S]*)<\/body>/i)[1];

// A card runs from its marker to the next card or the shared footer, so nesting cannot hide text.
function card(html, lang) {
	const markup = body(html);
	const starts = [...markup.matchAll(/<div class="card" lang="([a-z]+)">/g)];
	assert.deepEqual(starts.map((match) => match[1]), ['en', 'ko'], `${source} needs one en and one ko card`);
	const index = starts.findIndex((match) => match[1] === lang);
	const end = starts[index + 1]?.index ?? markup.indexOf('<div class="url">');
	assert.ok(end > starts[index].index, `${source} has no footer after the cards`);
	return markup.slice(starts[index].index, end);
}

const cards = [
	{ lang: 'en', landing: 'src/pages/index.astro', png: 'public/og-image.png' },
	{ lang: 'ko', landing: 'src/pages/ko/index.astro', png: 'public/og-image-ko.png' },
];

for (const { lang, landing, png } of cards) {
	test(`${lang} card headline matches the landing h1`, async () => {
		const headlines = [...card(await read(source), lang).matchAll(/<h1>([\s\S]*?)<\/h1>/g)];
		assert.equal(headlines.length, 1, `${lang} card needs exactly one h1`);
		const landingH1 = (await read(landing)).match(/<h1>([\s\S]*?)<\/h1>/)?.[1];
		assert.ok(landingH1, `${landing} has no h1`);
		assert.equal(text(headlines[0][1]), text(landingH1),
			`update the ${lang} card in ${source} to the landing h1, then re-render ${png}`);
	});

	test(`${png} is 1200x630`, async () => {
		const bytes = await readFile(path.join(root, png));
		assert.equal(bytes.toString('ascii', 12, 16), 'IHDR');
		assert.deepEqual([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], [1200, 630]);
	});
}

test('the cards name no counts or versions', async () => {
	assert.doesNotMatch(text(body(await read(source))).replaceAll('Apache 2.0', ''), /\d/);
});

// Records which render of which source shipped; it cannot prove the render, so look at the PNGs.
test(`${manifest} matches the source and both PNGs`, async () => {
	const recorded = JSON.parse(await read(manifest));
	const actual = Object.fromEntries(await Promise.all(
		[source, ...cards.map(({ png }) => png)].map(async (file) => [file, await sha256(file)]),
	));
	assert.deepEqual(recorded, actual,
		`re-render both PNGs with the commands in ${source}, then record their hashes in ${manifest}`);
});

const page = (card) => `<html><head><meta property="og:image" content="https://memtomem.com/${card}">`
	+ `<meta name="twitter:image" content="https://memtomem.com/${card}"></head></html>`;
const redirect = '<!doctype html><html><head><noscript><meta http-equiv="refresh" content="0;url=/ltm/"></noscript></head></html>';
const verification = 'google-site-verification: google0000.html';
// Keys under public/ are source files; every other key is a built file under dist/.
const valid = {
	'og-image.png': 'png',
	'og-image-ko.png': 'png',
	'index.html': page('og-image.png'),
	'ko/index.html': page('og-image-ko.png'),
	'public/guides/old/index.html': redirect,
	'guides/old/index.html': redirect,
	'public/google0000.html': verification,
	'google0000.html': verification,
};

async function builtLinks(files) {
	const dir = await mkdtemp(path.join(tmpdir(), 'site-cards-'));
	try {
		for (const [file, content] of Object.entries(files)) {
			if (content === undefined) continue;
			const target = file.startsWith('public/') ? path.join(dir, file) : path.join(dir, 'dist', file);
			await mkdir(path.dirname(target), { recursive: true });
			await writeFile(target, content);
		}
		return spawnSync(process.execPath, [path.join(root, 'scripts/check-built-links.mjs')], { cwd: dir, encoding: 'utf8' });
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

test('built checker passes locale cards and files copied from public/', async () => {
	const spaced = page('og-image.png').replace('property="og:image"', 'property = "og:image"');
	const result = await builtLinks({ ...valid, 'ltm/index.html': spaced });
	assert.equal(result.status, 0, result.stdout + result.stderr);
});

for (const [name, files, expected] of [
	['the English card on a Korean page', { 'ko/index.html': page('og-image.png') }, /ko[\\/]index\.html -> og:image "https:\/\/memtomem\.com\/og-image\.png" \(expected the og-image-ko\.png card\)/],
	['a missing twitter:image', { 'index.html': page('og-image.png').replace(/<meta name="twitter:image"[^>]*>/, '') }, /index\.html has 0 twitter:image tags/],
	['an empty og:image', { 'index.html': page('og-image.png').replace('content="https://memtomem.com/og-image.png">', 'content="">') }, /index\.html -> og:image "" \(expected the og-image\.png card\)/],
	['a commented-out og:image', { 'index.html': page('og-image.png').replace(/(<meta property="og:image"[^>]*>)/, '<!--$1-->') }, /index\.html has 0 og:image tags/],
	['a data-property lookalike', { 'index.html': page('og-image.png').replace('property="og:image"', 'data-property="og:image"') }, /index\.html has 0 og:image tags/],
	['a duplicate og:image', { 'index.html': page('og-image.png').replace('</head>', '<meta property="og:image" content="https://memtomem.com/og-image.png"></head>') }, /index\.html has 2 og:image tags/],
	['a generated page that only mentions a refresh', { 'ltm/index.html': '<html><body><code>http-equiv="refresh"</code></body></html>' }, /ltm[\\/]index\.html has 0 og:image tags/],
	['a redirect generated outside public/', { 'public/guides/old/index.html': undefined }, /guides[\\/]old[\\/]index\.html has 0 og:image tags/],
	['a card image missing from dist', { 'og-image-ko.png': undefined }, /ko[\\/]index\.html -> https:\/\/memtomem\.com\/og-image-ko\.png \(missing card image\)/],
]) test(`built checker rejects ${name}`, async () => {
	const result = await builtLinks({ ...valid, ...files });
	assert.equal(result.status, 1, result.stdout + result.stderr);
	assert.match(result.stderr, expected);
});
