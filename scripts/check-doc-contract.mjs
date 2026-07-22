import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { parse as parseToml } from 'smol-toml';

const root = process.cwd();
const docsRoot = path.join(root, 'src/content/docs');
const contract = JSON.parse(await readFile(path.join(root, 'src/data/docs-contract.json'), 'utf8'));
const errors = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  }));
  return nested.flat();
}

const allFiles = await walk(docsRoot);
const docs = allFiles.filter((file) => /\.mdx?$/.test(file));
const englishDocs = docs.filter((file) => !file.includes(`${path.sep}ko${path.sep}`));
const siteSources = [
  ...docs,
  path.join(root, 'src/pages/index.astro'),
  path.join(root, 'src/pages/ko/index.astro')
];
const sourceText = new Map(await Promise.all(siteSources.map(async (file) => [file, await readFile(file, 'utf8')])));

function relative(file) {
  return path.relative(root, file);
}

function assertContains(file, needle, label = needle) {
  if (!sourceText.get(file)?.includes(needle)) errors.push(`${relative(file)}: missing ${label}`);
}

for (const file of englishDocs) {
  const rel = path.relative(docsRoot, file);
  const koFile = path.join(docsRoot, 'ko', rel);
  if (!sourceText.has(koFile)) errors.push(`${relative(file)}: missing Korean mirror ${relative(koFile)}`);
}

const combined = [...sourceText.values()].join('\n');
for (const stale of ['0.3.10', '0.3.11', '0.1.38', '0.1.39', '0.1.40']) {
  if (combined.includes(stale)) errors.push(`stale upstream version remains: ${stale}`);
}
if (/\bmm server\b/.test(combined)) errors.push('removed CLI command remains: mm server');
if (/^\| `MEMTOMEM_CONTEXT_GATEWAY__USER_TIER_ENABLED`/m.test(combined)) {
  errors.push('removed Context Gateway environment variable remains in a table');
}
if (/uvx\s+--from\s+memtomem(?:\s|["'])/.test(combined)) {
  errors.push('floating uvx memtomem registration remains; use memtomem-server or an exact pin');
}

function tableEnvironment(text, kind) {
  const pattern = kind === 'stm'
    ? /^\| `(MEMTOMEM_STM[A-Z0-9_]*)`/gm
    : /^\| `(MEMTOMEM_(?!STM)[A-Z0-9_]*)`/gm;
  return [...new Set([...text.matchAll(pattern)].map((match) => match[1]))].sort();
}

function digest(values) {
  return createHash('sha256').update(values.join('\n')).digest('hex');
}

const enConfig = path.join(docsRoot, 'reference/configuration.md');
const koConfig = path.join(docsRoot, 'ko/reference/configuration.md');
for (const kind of ['core', 'stm']) {
  const enValues = tableEnvironment(sourceText.get(enConfig), kind);
  const koValues = tableEnvironment(sourceText.get(koConfig), kind);
  const expected = contract.configuration[`${kind}Environment`];
  if (JSON.stringify(enValues) !== JSON.stringify(koValues)) {
    const enOnly = enValues.filter((value) => !koValues.includes(value));
    const koOnly = koValues.filter((value) => !enValues.includes(value));
    errors.push(`${kind} environment EN/KO mismatch; en-only=${enOnly.join(',')}; ko-only=${koOnly.join(',')}`);
  }
  if (enValues.length !== expected.count) {
    errors.push(`${kind} environment count ${enValues.length}; expected ${expected.count}`);
  }
  const actualHash = digest(enValues);
  if (actualHash !== expected.sha256) {
    errors.push(`${kind} environment hash ${actualHash}; expected ${expected.sha256}`);
  }
}

const quickstartPairs = [
  path.join(docsRoot, 'guides/quickstart.mdx'),
  path.join(docsRoot, 'ko/guides/quickstart.mdx')
];
for (const file of quickstartPairs) {
  const text = sourceText.get(file);
  const sequence = ['mm init', 'mm status', 'mm add', 'mm search'];
  let position = -1;
  for (const command of sequence) {
    position = text.indexOf(command, position + 1);
    if (position < 0) {
      errors.push(`${relative(file)}: first-success sequence missing or out of order at ${command}`);
      break;
    }
  }
  for (const required of [
    '/plugin marketplace add memtomem/memtomem',
    'codex plugin marketplace add memtomem/memtomem',
    'mms init --demo --client auto',
    'mms doctor',
    'mcp__<server>__<prefix>__<tool>'
  ]) {
    if (!text.includes(required)) errors.push(`${relative(file)}: missing ${required}`);
  }
}

const stmCliPairs = [path.join(docsRoot, 'stm/cli.md'), path.join(docsRoot, 'ko/stm/cli.md')];
for (const file of stmCliPairs) {
  for (const command of contract.stmTopLevelCommands) {
    assertContains(file, `mms ${command}`, `mms ${command} coverage`);
  }
  for (const command of contract.stmRequiredSubcommands) {
    assertContains(file, `mms ${command}`, `mms ${command} coverage`);
  }
  for (const option of contract.stmCliOptionTokens) {
    assertContains(file, option, `STM CLI option ${option}`);
  }
}

const coreCliPairs = [path.join(docsRoot, 'ltm/cli.md'), path.join(docsRoot, 'ko/ltm/cli.md')];
for (const file of coreCliPairs) {
  const match = sourceText.get(file).match(/## (?:Complete Command Index|전체 명령 인덱스)\n([\s\S]*?)(?=\n## )/);
  if (!match) {
    errors.push(`${relative(file)}: complete Core command index not found`);
    continue;
  }
  const index = match[1];
  for (const command of contract.coreTopLevelCommands) {
    if (!index.includes(`\`${command}\``)) errors.push(`${relative(file)}: Core command index missing ${command}`);
  }
  for (const [group, subcommands] of Object.entries(contract.coreCommandGroups)) {
    const row = `| \`${group}\` | ${subcommands.map((command) => `\`${command}\``).join(', ')} |`;
    if (!index.includes(row)) errors.push(`${relative(file)}: Core command-group row drifted: ${group}`);
  }
}

for (const file of [path.join(docsRoot, 'ltm/mcp-tools.md'), path.join(docsRoot, 'ko/ltm/mcp-tools.md')]) {
  for (const token of ['content', 'source', 'source_ref', 'idempotency_key']) {
    assertContains(file, token, `proposal argument ${token}`);
  }
}

function dataFences(text) {
  const blocks = [];
  let openFence;

  for (const [index, line] of text.split('\n').entries()) {
    if (!openFence) {
      const opening = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
      if (!opening) continue;
      openFence = {
        marker: opening[1][0],
        length: opening[1].length,
        language: opening[2].trim().split(/\s+/, 1)[0].toLowerCase(),
        line: index + 1,
        body: []
      };
      continue;
    }

    const closing = line.match(/^ {0,3}(`{3,}|~{3,})\s*$/);
    if (closing && closing[1][0] === openFence.marker && closing[1].length >= openFence.length) {
      if (openFence.language === 'json' || openFence.language === 'toml') blocks.push(openFence);
      openFence = undefined;
      continue;
    }

    openFence.body.push(line);
  }

  return { blocks, unterminated: openFence };
}

for (const file of docs) {
  const text = sourceText.get(file);
  const { blocks, unterminated } = dataFences(text);
  for (const { language, body: bodyLines, line } of blocks) {
    const body = bodyLines.join('\n');
    if (/(?:<[^>]+>|\{\.\.\.\}|^\s*\.\.\.\s*$)/m.test(body)) continue;
    try {
      if (language === 'json') JSON.parse(body);
      else parseToml(body);
    } catch (error) {
      errors.push(`${relative(file)}:${line}: invalid ${language} fence: ${error.message}`);
    }
  }
  if (unterminated && (unterminated.language === 'json' || unterminated.language === 'toml')) {
    errors.push(`${relative(file)}:${unterminated.line}: unterminated ${unterminated.language} fence`);
  }
}

for (const file of [path.join(root, 'src/pages/index.astro'), path.join(root, 'src/pages/ko/index.astro')]) {
  assertContains(file, 'docs-contract.json', 'shared docs contract import');
}

if (errors.length) {
  console.error(`Documentation contract failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Documentation contract passed: ${englishDocs.length} EN/KO pairs, `
  + `${contract.configuration.coreEnvironment.count} Core env vars, `
  + `${contract.configuration.stmEnvironment.count} STM env vars.`
);
