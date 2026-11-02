import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fromMarkdown } from 'mdast-util-from-markdown';

// Inline flow diagrams live inside Markdown pages as raw HTML blocks. Their colors come from the
// Starlight theme tokens in src/styles/custom.css, so one SVG follows the site's light/dark toggle.
const root = process.cwd();
// CRLF checkouts are read as LF, like the other tests in scripts/.
const read = async (file) => (await readFile(path.join(root, file), 'utf8')).replace(/\r\n/g, '\n');
const pages = ['src/content/docs/stm/overview.md', 'src/content/docs/ko/stm/overview.md'];

// Parsed as Markdown, so a figure inside a comment or a fenced or indented code block does not count.
async function figure(file) {
	const source = await read(file);
	const blocks = [];
	const visit = (node) => {
		if (node.type === 'html' && node.value.startsWith('<figure class="flow-diagram">')) blocks.push(node);
		node.children?.forEach(visit);
	};
	const tree = fromMarkdown(source);
	visit(tree);
	assert.equal(blocks.length, 1, `${file} needs exactly one rendered flow-diagram figure`);
	const [node] = blocks;
	assert.ok(node.value.endsWith('</figure>'), `${file}: a blank line splits the figure out of its HTML block`);
	return { tree, node, html: node.value };
}

const attr = (tag, name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];

for (const file of pages) {
	test(`${file}: the figure renders as one HTML block`, async () => {
		await figure(file);
	});

	test(`${file}: the stage boxes, read bottom to top, are the page's numbered pipeline`, async () => {
		const { tree, node, html } = await figure(file);
		const stages = [...html.matchAll(/<text class="fd-stage-text"[^>]*>([^<]+)<\/text>/g)]
			.map((match) => ({ name: match[1], y: Number(attr(match[0], 'y')) }))
			.sort((a, b) => b.y - a.y)
			.map((stage) => stage.name);
		// The rendered ordered list that follows the figure, read from the same Markdown tree.
		const after = tree.children.slice(tree.children.indexOf(node) + 1);
		const list = after.find((child) => child.type === 'list' && child.ordered);
		assert.ok(list, 'no rendered numbered list after the figure');
		const names = list.children.map((item) => item.children[0]?.children?.[0])
			.map((first) => (first?.type === 'strong' ? first.children[0]?.value : undefined));
		assert.deepEqual(stages, names);
		const strong = [];
		const visit = (n) => { if (n.type === 'strong') strong.push(n.children.map((c) => c.value).join('')); n.children?.forEach(visit); };
		after.forEach(visit);
		assert.ok(strong.includes(stages.join(' → ')), `no rendered **${stages.join(' → ')}** after the figure`);
	});

	test(`${file}: the accessible description names every stage`, async () => {
		const { html } = await figure(file);
		assert.match(html, /role="img" aria-labelledby="stm-flow-title stm-flow-desc"/);
		const desc = html.match(/<desc id="stm-flow-desc">([^<]+)<\/desc>/)?.[1];
		assert.ok(desc, 'missing <desc>');
		for (const stage of ['CLEAN', 'COMPRESS', 'SURFACE']) assert.ok(desc.includes(stage), `<desc> omits ${stage}`);
	});
}

test('EN and KO figures share one drawing; only their words differ', async () => {
	const strip = (html) => html.replace(/>[^<]*</g, '><');
	const [en, ko] = await Promise.all(pages.map(async (file) => strip((await figure(file)).html)));
	assert.equal(ko, en);
});

test('every class the figures use has a rule in custom.css', async () => {
	// A class name ends where the next character is not a name character, so .fd-stage is not
	// satisfied by the .fd-stage-text rule.
	const css = await read('src/styles/custom.css');
	const { html } = await figure(pages[0]);
	const classes = new Set([...html.matchAll(/class="(fd-[a-z-]+)"/g)].map((match) => match[1]));
	assert.ok(classes.size > 0);
	for (const name of classes) assert.match(css, new RegExp(`\\.flow-diagram \\.${name}(?![\\w-])`), `no rule for .${name}`);
});
