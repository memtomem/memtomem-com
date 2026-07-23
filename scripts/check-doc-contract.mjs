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
const koreanDocs = docs.filter((file) => file.includes(`${path.sep}ko${path.sep}`));
const sidebarFile = path.join(root, 'astro.config.mjs');
const siteSources = [
  ...docs,
  path.join(root, 'src/pages/index.astro'),
  path.join(root, 'src/pages/ko/index.astro'),
  sidebarFile
];
const sourceText = new Map(await Promise.all(siteSources.map(async (file) => [file, await readFile(file, 'utf8')])));

function relative(file) {
  return path.relative(root, file);
}

function assertContains(file, needle, label = needle) {
  if (!sourceText.get(file)?.includes(needle)) errors.push(`${relative(file)}: missing ${label}`);
}

function markdownSection(text, heading, level) {
  const marker = `${'#'.repeat(level)} ${heading}`;
  const start = text.indexOf(marker);
  if (start < 0) return null;
  const tail = text.slice(start + marker.length);
  const nextHeading = tail.search(new RegExp(`\\n#{1,${level}}\\s`));
  return nextHeading < 0 ? tail : tail.slice(0, nextHeading);
}

function assertSectionContains(file, section, needle, label = needle) {
  if (!section?.includes(needle)) errors.push(`${relative(file)}: section missing ${label}`);
}

for (const file of englishDocs) {
  const rel = path.relative(docsRoot, file);
  const koFile = path.join(docsRoot, 'ko', rel);
  if (!sourceText.has(koFile)) errors.push(`${relative(file)}: missing Korean mirror ${relative(koFile)}`);
}

for (const file of koreanDocs) {
  const rel = path.relative(path.join(docsRoot, 'ko'), file);
  const enFile = path.join(docsRoot, rel);
  if (!sourceText.has(enFile)) errors.push(`${relative(file)}: missing English mirror ${relative(enFile)}`);
}

const sidebar = sourceText.get(sidebarFile);
for (const file of englishDocs) {
  const slug = path.relative(docsRoot, file).replace(/\.mdx?$/, '').split(path.sep).join('/');
  if (!sidebar.includes(`slug: '${slug}'`)) errors.push(`${relative(file)}: missing sidebar entry for ${slug}`);
}

const combined = [...sourceText.values()].join('\n');
for (const stale of ['0.3.10', '0.3.11', '0.1.38', '0.1.39', '0.1.40']) {
  if (combined.includes(stale)) errors.push(`stale upstream version remains: ${stale}`);
}
for (const staleClaim of ['nothing runs twice', '아무것도 두 번 실행되지']) {
  if (combined.toLowerCase().includes(staleClaim)) {
    errors.push(`unconditional MCP coexistence claim remains: ${staleClaim}`);
  }
}
if (/\bmm server\b/.test(combined)) errors.push('removed CLI command remains: mm server');
if (/^\| `MEMTOMEM_CONTEXT_GATEWAY__USER_TIER_ENABLED`/m.test(combined)) {
  errors.push('removed Context Gateway environment variable remains in a table');
}
if (/uvx\s+--from\s+memtomem(?:\s|["'])/.test(combined)) {
  errors.push('floating uvx memtomem registration remains; use memtomem-server or an exact pin');
}
if (contract.claudePlugin.bundledCore !== contract.core.version) {
  errors.push(`Claude plugin bundles Core ${contract.claudePlugin.bundledCore}; expected ${contract.core.version}`);
}
if (contract.opencode.bundledCore !== contract.core.version) {
  errors.push(`OpenCode plugin bundles Core ${contract.opencode.bundledCore}; expected ${contract.core.version}`);
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
  let position = -1;
  for (const command of contract.guides.quickstartSequence) {
    position = text.indexOf(command, position + 1);
    if (position < 0) {
      errors.push(`${relative(file)}: first-success sequence missing or out of order at ${command}`);
      break;
    }
  }
}

function pairedGuideFiles(slug) {
  return [
    path.join(docsRoot, `${slug}.md`),
    path.join(docsRoot, 'ko', `${slug}.md`)
  ];
}

for (const slug of contract.guides.pairedTaskSlugs) {
  for (const file of pairedGuideFiles(slug)) {
    if (!sourceText.has(file)) errors.push(`missing task guide: ${relative(file)}`);
  }
}

for (const file of pairedGuideFiles('guides/connect-ai-client')) {
  for (const required of contract.guides.clientGuide.requiredCommands) {
    assertContains(file, required, `client-guide command ${required}`);
  }
  for (const client of contract.guides.clientGuide.clients) {
    assertContains(file, client, `client-guide coverage ${client}`);
  }

  const locale = file.includes(`${path.sep}ko${path.sep}`) ? 'ko' : 'en';
  const text = sourceText.get(file);
  const claudeSection = markdownSection(text, contract.guides.clientGuide.coexistence.claude.heading, 2);
  assertSectionContains(file, claudeSection, contract.claudePlugin.version, `Claude plugin version ${contract.claudePlugin.version}`);
  assertSectionContains(
    file,
    claudeSection,
    `uvx --from memtomem==${contract.claudePlugin.bundledCore} memtomem-server`,
    'Claude exact plugin signature'
  );
  const opencodeSection = markdownSection(text, contract.guides.clientGuide.coexistence.opencode.heading, 2);
  assertSectionContains(
    file,
    opencodeSection,
    `opencode-memtomem@${contract.opencode.version}`,
    `OpenCode plugin version ${contract.opencode.version}`
  );

  for (const [client, spec] of Object.entries(contract.guides.clientGuide.coexistence)) {
    if (client === 'outcomeTokens') continue;
    const section = markdownSection(text, spec.heading, 2);
    if (!section) {
      errors.push(`${relative(file)}: missing client section ${spec.heading}`);
      continue;
    }
    for (const token of spec.requiredTokens) {
      assertSectionContains(file, section, token, `${spec.heading} coexistence token ${token}`);
    }
    for (const token of contract.guides.clientGuide.coexistence.outcomeTokens[locale]) {
      assertSectionContains(file, section, token, `${spec.heading} coexistence outcome ${token}`);
    }
  }
}

const troubleshootingPairs = [
  path.join(docsRoot, 'guides/troubleshooting.md'),
  path.join(docsRoot, 'ko/guides/troubleshooting.md')
];
for (const file of troubleshootingPairs) {
  const locale = file.includes(`${path.sep}ko${path.sep}`) ? 'ko' : 'en';
  const heading = contract.guides.troubleshootingCoexistence.headings[locale];
  const section = markdownSection(sourceText.get(file), heading, 3);
  if (!section) {
    errors.push(`${relative(file)}: missing troubleshooting section ${heading}`);
    continue;
  }
  for (const token of contract.guides.troubleshootingCoexistence.requiredTokens) {
    assertSectionContains(file, section, token, `troubleshooting coexistence token ${token}`);
  }
}

for (const file of pairedGuideFiles('guides/index-and-import')) {
  for (const command of contract.guides.indexGuideCommands) {
    assertContains(file, command, `index-guide command ${command}`);
  }
}

for (const file of pairedGuideFiles('guides/stm-first-proxy')) {
  for (const command of contract.guides.stmGuideCommands) {
    assertContains(file, command, `STM-guide command ${command}`);
  }
}

const multiAgentPairs = [path.join(docsRoot, 'ltm/multi-agent.md'), path.join(docsRoot, 'ko/ltm/multi-agent.md')];
for (const file of multiAgentPairs) {
  const text = sourceText.get(file);
  for (const action of contract.guides.coreMultiAgentActions) {
    assertContains(file, action, `Core multi-agent action ${action}`);
  }
  const modeBoundary = text.indexOf(file.includes(`${path.sep}ko${path.sep}`) ? '## 도구 모드에 따른 차이' : '## Tool-Mode Differences');
  const defaultWorkflow = modeBoundary < 0 ? text : text.slice(0, modeBoundary);
  for (const directTool of ['mem_session_start(', 'mem_agent_search(', 'mem_agent_share(', 'mem_session_end(']) {
    if (defaultWorkflow.includes(directTool)) {
      errors.push(`${relative(file)}: default Core workflow exposes hidden direct tool ${directTool}`);
    }
  }
}

function internalRoutes(text) {
  return [...new Set([...text.matchAll(/\]\((\/(?:ko\/)?[^)\s#?]+)(?:#[^)]*)?\)/g)]
    .map((match) => match[1].replace(/^\/ko\//, '/').replace(/\/$/, '')))].sort();
}

for (const slug of [...contract.guides.pairedTaskSlugs, 'guides/quickstart']) {
  const extension = slug === 'guides/quickstart' ? 'mdx' : 'md';
  const enFile = path.join(docsRoot, `${slug}.${extension}`);
  const koFile = path.join(docsRoot, 'ko', `${slug}.${extension}`);
  const enRoutes = internalRoutes(sourceText.get(enFile));
  const koRoutes = internalRoutes(sourceText.get(koFile));
  if (JSON.stringify(enRoutes) !== JSON.stringify(koRoutes)) {
    errors.push(`${slug}: EN/KO internal route targets drifted; en=${enRoutes.join(',')}; ko=${koRoutes.join(',')}`);
  }
}

const landingPages = [path.join(root, 'src/pages/index.astro'), path.join(root, 'src/pages/ko/index.astro')];
for (const [index, file] of landingPages.entries()) {
  for (const slug of contract.guides.landingTaskSlugs) {
    const route = index === 0 ? `/${slug}/` : `/ko/${slug}/`;
    assertContains(file, route, `landing task route ${route}`);
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
  for (const token of ['mcp.memtomem', 'mcp."memtomem-local"']) {
    assertContains(file, token, `OpenCode coexistence token ${token}`);
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
