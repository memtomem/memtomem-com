import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmTableFromMarkdown } from 'mdast-util-gfm-table';
import { gfmTable } from 'micromark-extension-gfm-table';

// Inline flow diagrams live inside Markdown pages as raw HTML blocks. Their colors come from the
// Starlight theme tokens in src/styles/custom.css, so one SVG follows the site's light/dark toggle.
const root = process.cwd();
// CRLF checkouts are read as LF, like the other tests in scripts/.
const read = async (file) => (await readFile(path.join(root, file), 'utf8')).replace(/\r\n/g, '\n');

// Parsed as Markdown (with GFM tables, as the site renders them), so a figure inside a comment or a
// fenced or indented code block does not count.
async function figure(file) {
	const source = await read(file);
	const blocks = [];
	const visit = (node) => {
		if (node.type === 'html' && node.value.startsWith('<figure class="flow-diagram">')) blocks.push(node);
		node.children?.forEach(visit);
	};
	const tree = fromMarkdown(source, { extensions: [gfmTable()], mdastExtensions: [gfmTableFromMarkdown()] });
	visit(tree);
	assert.equal(blocks.length, 1, `${file} needs exactly one rendered flow-diagram figure`);
	const [node] = blocks;
	assert.ok(node.value.endsWith('</figure>'), `${file}: a blank line splits the figure out of its HTML block`);
	return { tree, node, html: node.value, after: tree.children.slice(tree.children.indexOf(node) + 1) };
}

const attr = (tag, name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
const texts = (html, cls) => [...html.matchAll(new RegExp(`<text class="${cls}"[^>]*>([^<]+)</text>`, 'g'))];
const strongText = (node) => (node?.type === 'strong' ? node.children.map((child) => child.value).join('') : undefined);

// Each figure pins itself to the words the page around it already uses.
const figures = [
	{
		id: 'stm-flow',
		pages: ['src/content/docs/stm/overview.md', 'src/content/docs/ko/stm/overview.md'],
		descNames: ['CLEAN', 'COMPRESS', 'SURFACE'],
		check({ html, after }) {
			// Stage boxes, read bottom to top, are the numbered pipeline and its bold summary line.
			const stages = texts(html, 'fd-stage-text')
				.map((match) => ({ name: match[1], y: Number(attr(match[0], 'y')) }))
				.sort((a, b) => b.y - a.y)
				.map((stage) => stage.name);
			const list = after.find((child) => child.type === 'list' && child.ordered);
			assert.ok(list, 'no rendered numbered list after the figure');
			assert.deepEqual(stages, list.children.map((item) => strongText(item.children[0]?.children?.[0])));
			const strong = [];
			const visit = (n) => {
				if (n.type === 'strong') strong.push(strongText(n));
				n.children?.forEach(visit);
			};
			after.forEach(visit);
			assert.ok(strong.includes(stages.join(' → ')), `no rendered **${stages.join(' → ')}** after the figure`);
		},
	},
	{
		id: 'search-flow',
		pages: ['src/content/docs/ltm/hybrid-search.md', 'src/content/docs/ko/ltm/hybrid-search.md'],
		descNames: ['BM25', 'RRF', 'mem_search', 'mm search', 'embedding.provider=none'],
		// The rerank box's title and note on each page, in page order.
		args: [['Rerank', 'optional · off by default'], ['리랭크', '선택 · 기본값 꺼짐']],
		async check({ html, after }, rerank) {
			// The engine names in the table that follows are box titles in the figure.
			const table = after.find((child) => child.type === 'table');
			assert.ok(table, 'no rendered table after the figure');
			const engines = table.children.slice(1).map((row) => strongText(row.children[0]?.children?.[0]));
			assert.ok(engines.length > 0 && engines.every(Boolean), 'the table rows lead with bold engine names');
			const titles = texts(html, 'fd-title').map((match) => match[1]);
			for (const engine of engines) assert.ok(titles.includes(engine), `no box titled ${engine}`);
			// Defaults drawn in the figure match the pinned upstream snapshot.
			const env = JSON.parse(await read('src/data/upstream-snapshot.json')).core.environment;
			assert.ok(html.includes(`k = ${env.MEMTOMEM_SEARCH__RRF_K}<`), `RRF k is not ${env.MEMTOMEM_SEARCH__RRF_K}`);
			const results = texts(html, 'fd-note').map((match) => match[1]).find((note) => note.startsWith('top_k, '));
			assert.match(results ?? '', new RegExp(`^top_k, \\S+ ${env.MEMTOMEM_SEARCH__DEFAULT_TOP_K}$`));
			// Reranking is drawn as the one dashed box, and its note says the snapshot's default.
			assert.equal(env.MEMTOMEM_RERANK__ENABLED, false, 'the figure draws reranking as off by default');
			const optional = html.match(/<rect class="fd-optional"[^>]*\/>\n<text class="fd-title"[^>]*>([^<]+)<\/text>\n<text class="fd-note"[^>]*>([^<]+)<\/text>/);
			assert.ok(optional, 'no dashed box followed by its title and note');
			assert.equal((html.match(/class="fd-optional"/g) ?? []).length, 1);
			assert.deepEqual([optional[1], optional[2]], rerank);
		},
	},
];

for (const { id, pages, descNames, check, args = [] } of figures) {
	for (const [index, file] of pages.entries()) {
		test(`${file}: the figure renders as one HTML block`, async () => {
			await figure(file);
		});

		test(`${file}: the figure agrees with the page around it`, async () => {
			await check(await figure(file), args[index]);
		});

		test(`${file}: the figure's ids are its own and its description names what it draws`, async () => {
			const { html } = await figure(file);
			assert.match(html, new RegExp(`role="img" aria-labelledby="${id}-title ${id}-desc"`));
			const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
			assert.deepEqual(ids.filter((value) => !value.startsWith(`${id}-`)), [], `ids must start with ${id}-`);
			for (const ref of html.matchAll(/url\(#([^)]+)\)/g)) assert.ok(ids.includes(ref[1]), `no element #${ref[1]}`);
			const desc = html.match(new RegExp(`<desc id="${id}-desc">([^<]+)</desc>`))?.[1];
			assert.ok(desc, 'missing <desc>');
			for (const name of descNames) assert.ok(desc.includes(name), `<desc> omits ${name}`);
		});
	}

	test(`${id}: EN and KO share one drawing; only their words differ`, async () => {
		const strip = (html) => html.replace(/>[^<]*</g, '><');
		const [en, ko] = await Promise.all(pages.map(async (file) => strip((await figure(file)).html)));
		assert.equal(ko, en);
	});
}

test('every class the figures use has a rule in custom.css', async () => {
	// A class name ends where the next character is not a name character, so .fd-stage is not
	// satisfied by the .fd-stage-text rule.
	const css = await read('src/styles/custom.css');
	const classes = new Set();
	for (const { pages } of figures) {
		const { html } = await figure(pages[0]);
		for (const match of html.matchAll(/class="(fd-[a-z-]+)"/g)) classes.add(match[1]);
	}
	assert.ok(classes.size > 0);
	for (const name of classes) assert.match(css, new RegExp(`\\.flow-diagram \\.${name}(?![\\w-])`), `no rule for .${name}`);
});
