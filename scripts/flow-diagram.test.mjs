import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fromHtml } from 'hast-util-from-html';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmTableFromMarkdown } from 'mdast-util-gfm-table';
import { gfmTable } from 'micromark-extension-gfm-table';

// Inline flow diagrams live inside Markdown pages as raw HTML blocks. Their colors come from the
// Starlight theme tokens in src/styles/custom.css, so one SVG follows the site's light/dark toggle.
const root = process.cwd();
// CRLF checkouts are read as LF, like the other tests in scripts/.
const read = async (file) => (await readFile(path.join(root, file), 'utf8')).replace(/\r\n/g, '\n');

// The page is parsed as Markdown (with GFM tables, as the site renders them) and the figure as HTML,
// so content inside a comment or a code block is never read as part of the page or the drawing.
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
	const svgs = elements(fromHtml(node.value, { fragment: true })).filter((el) => el.tagName === 'svg');
	assert.equal(svgs.length, 1, `${file}: the figure holds one svg`);
	return { tree, node, svg: svgs[0], after: tree.children.slice(tree.children.indexOf(node) + 1) };
}

// Element nodes only, in document order; comments and whitespace text are not part of the drawing.
function elements(node, out = []) {
	for (const child of node.children ?? []) {
		if (child.type !== 'element') continue;
		out.push(child);
		elements(child, out);
	}
	return out;
}
const kids = (el) => (el.children ?? []).filter((child) => child.type === 'element');
const textOf = (el) => (el.children ?? []).map((child) => (child.type === 'text' ? child.value : textOf(child))).join('');
const classes = (el) => el.properties?.className ?? [];
// Labels are drawn only by <text>, boxes only by <rect>; another element with the same class is not drawn.
const ofClass = (svg, name, tagName = 'text') => elements(svg)
	.filter((el) => el.tagName === tagName && classes(el).includes(name));
const isText = (el, name) => el.tagName === 'text' && classes(el).includes(name);
const strongText = (node) => (node?.type === 'strong' ? node.children.map((child) => child.value).join('') : undefined);

// The session-loop figure's commands, top to bottom; its description must name each one.
const LOOP_COMMANDS = ['/memtomem:handoff save', '$memtomem-brief', '$memtomem-handoff resume', '/memtomem:update'];

// Each figure pins itself to the words the page around it already uses.
const figures = [
	{
		id: 'stm-flow',
		pages: ['src/content/docs/stm/overview.md', 'src/content/docs/ko/stm/overview.md'],
		descNames: ['CLEAN', 'COMPRESS', 'SURFACE'],
		check({ svg, after }) {
			// Stage boxes, read bottom to top, are the numbered pipeline and its bold summary line.
			const stages = ofClass(svg, 'fd-stage-text')
				.map((el) => ({ name: textOf(el), y: Number(el.properties.y) }))
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
		async check({ svg, after }, rerank) {
			// The engine names in the table that follows are box titles in the figure.
			const table = after.find((child) => child.type === 'table');
			assert.ok(table, 'no rendered table after the figure');
			const engines = table.children.slice(1).map((row) => strongText(row.children[0]?.children?.[0]));
			assert.ok(engines.length > 0 && engines.every(Boolean), 'the table rows lead with bold engine names');
			const titles = ofClass(svg, 'fd-title').map(textOf);
			for (const engine of engines) assert.ok(titles.includes(engine), `no box titled ${engine}`);
			// Defaults drawn in the figure match the pinned upstream snapshot.
			const env = JSON.parse(await read('src/data/upstream-snapshot.json')).core.environment;
			const notes = ofClass(svg, 'fd-note').map(textOf);
			assert.ok(notes.some((note) => note.endsWith(`k = ${env.MEMTOMEM_SEARCH__RRF_K}`)), `RRF k is not ${env.MEMTOMEM_SEARCH__RRF_K}`);
			const results = notes.find((note) => note.startsWith('top_k, '));
			assert.match(results ?? '', new RegExp(`^top_k, \\S+ ${env.MEMTOMEM_SEARCH__DEFAULT_TOP_K}$`));
			// Reranking is drawn as the one dashed box, and its note says the snapshot's default.
			assert.equal(env.MEMTOMEM_RERANK__ENABLED, false, 'the figure draws reranking as off by default');
			const dashed = ofClass(svg, 'fd-optional', 'rect');
			assert.equal(dashed.length, 1, 'exactly one dashed box');
			assert.equal(elements(svg).filter((el) => classes(el).includes('fd-optional')).length, 1);
			const siblings = kids(svg);
			const at = siblings.indexOf(dashed[0]);
			const [title, note] = siblings.slice(at + 1, at + 3);
			assert.ok(isText(title, 'fd-title') && isText(note, 'fd-note'), 'the dashed box is followed by its title and note');
			assert.deepEqual([textOf(title), textOf(note)], rerank);
		},
	},
	{
		id: 'loop-flow',
		pages: ['src/content/docs/ltm/project-workflows.md', 'src/content/docs/ko/ltm/project-workflows.md'],
		descNames: [...LOOP_COMMANDS, '.memtomem/memories.local'],
		check({ svg, tree }) {
			// Every command drawn is one the page's "Where they ship" table lists for the host named in
			// the session title right above it.
			const table = tree.children.find((child) => child.type === 'table');
			assert.ok(table, 'no rendered table on the page');
			const rows = new Map(table.children.slice(1).map((row) => {
				const cell = (index) => row.children[index]?.children ?? [];
				const host = cell(0).map((node) => node.value ?? '').join('');
				return [host, cell(1).filter((node) => node.type === 'inlineCode').map((node) => node.value)];
			}));
			const drawn = ofClass(svg, 'fd-cmd').map(textOf);
			assert.deepEqual(drawn, LOOP_COMMANDS, 'the drawn commands, in order');
			let title;
			let checked = 0;
			for (const el of kids(svg)) {
				if (isText(el, 'fd-title')) title = textOf(el);
				else if (isText(el, 'fd-cmd')) {
					const command = textOf(el);
					const host = [...rows.keys()].find((name) => name && title?.includes(name));
					assert.ok(host, `no table row names the host in "${title}", above ${command}`);
					assert.ok(rows.get(host).includes(command.split(' ')[0]), `${host} does not list ${command}`);
					checked += 1;
				} else if (el.tagName !== 'text') title = undefined;
			}
			assert.equal(checked, drawn.length, 'every drawn command sits under a session title');
			const styled = elements(svg).filter((el) => classes(el).includes('fd-cmd'));
			assert.equal(styled.length, drawn.length, 'only <text> elements carry the command class');
			// The drawn store is the tier path the page tells you to register.
			const code = [];
			const visit = (node) => {
				if (node.type === 'inlineCode') code.push(node.value);
				node.children?.forEach(visit);
			};
			visit(tree);
			assert.ok(ofClass(svg, 'fd-path').map(textOf).includes('.memtomem/memories.local'));
			assert.ok(code.includes('.memtomem/memories.local'));
		},
	},
];

// A drawing's shape: element names and attributes, without text or comments. An in-page link target
// (#fragment) is each language's own heading id, so only its presence is compared; check:links
// verifies that it resolves. Any other link target must match exactly.
const shape = (el) => [
	el.tagName,
	Object.entries(el.properties ?? {}).map(([key, value]) => (
		el.tagName === 'a' && key === 'href' && String(value).startsWith('#') ? [key, '#'] : [key, value]
	)),
	kids(el).map(shape),
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
			const { svg } = await figure(file);
			assert.equal(svg.properties.role, 'img');
			assert.deepEqual(svg.properties.ariaLabelledBy, [`${id}-title`, `${id}-desc`]);
			const ids = elements(svg).map((el) => el.properties?.id).filter(Boolean);
			assert.deepEqual(ids.filter((value) => !value.startsWith(`${id}-`)), [], `ids must start with ${id}-`);
			for (const el of elements(svg)) {
				for (const value of Object.values(el.properties ?? {})) {
					for (const ref of String(value).matchAll(/url\(#([^)]+)\)/g)) assert.ok(ids.includes(ref[1]), `no element #${ref[1]}`);
				}
			}
			const desc = elements(svg).find((el) => el.tagName === 'desc' && el.properties?.id === `${id}-desc`);
			assert.ok(desc, 'missing <desc>');
			for (const name of descNames) assert.ok(textOf(desc).includes(name), `<desc> omits ${name}`);
		});
	}

	test(`${id}: EN and KO share one drawing; only their words differ`, async () => {
		const [en, ko] = await Promise.all(pages.map(async (file) => {
			const { node } = await figure(file);
			return kids(fromHtml(node.value, { fragment: true })).map(shape);
		}));
		assert.deepEqual(ko, en);
	});
}

test('every class the figures use has a rule in custom.css', async () => {
	// A class name ends where the next character is not a name character, so .fd-stage is not
	// satisfied by the .fd-stage-text rule.
	const css = await read('src/styles/custom.css');
	const used = new Set();
	for (const { pages } of figures) {
		const { svg } = await figure(pages[0]);
		for (const el of elements(svg)) for (const name of classes(el)) if (name.startsWith('fd-')) used.add(name);
	}
	assert.ok(used.size > 0);
	for (const name of used) assert.match(css, new RegExp(`\\.flow-diagram \\.${name}(?![\\w-])`), `no rule for .${name}`);
});
