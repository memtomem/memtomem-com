import assert from 'node:assert/strict';

// Superseded upstream releases (Core, STM, Claude plugin, OpenCode plugin).
// Matched on a version boundary so a prefix like 0.1.2 does not flag
// historical notes about v0.1.23/v0.1.25, while a version that ends a
// sentence ("v0.6.4.") still matches. Single source of truth: the
// document contract checker imports this list too.
// The match ignores which package a version belongs to, so a version that
// any package in the contract currently ships must not be listed (0.3.11 was
// a Core release and later the OpenCode plugin); a test enforces this.
// 0.6.8 stays out: the docs truthfully date features to it ("0.6.8 or later").
export const STALE_VERSIONS = ['0.3.10', '0.3.12', '0.1.38', '0.1.39', '0.1.40', '0.1.41', '0.1.2', '0.3.3', '0.5.0', '0.4.0', '0.6.4', '0.5.2', '0.5.6', '0.3.6', '0.6.7', '0.5.9', '0.3.9', '0.6.1', '0.5.14', '0.3.11'];

export function staleVersionPattern(version) {
  return new RegExp(`(?<![\\d.])${version.replace(/\./g, '\\.')}(?!\\d|\\.\\d)`);
}

// Install pins and release links must name the current version of their own
// package. STALE_VERSIONS cannot catch a leftover `memtomem==0.6.8`, because
// prose may truthfully date features to 0.6.8; a pin never may.
const VERSION = String.raw`(\d+\.\d+\.\d+(?:[-+.]?[0-9A-Za-z]+)*)`;
const REPO = String.raw`(memtomem-stm|memtomem)`;
const PIN_FORMS = [
  [new RegExp(String.raw`(?<![\w.-])${REPO}(?:\[[^\]\s]*\])?==${VERSION}`, 'gi'), 'repo'],
  [new RegExp(String.raw`github\.com/memtomem/${REPO}(?:\.git)?@v${VERSION}`, 'gi'), 'repo'],
  [new RegExp(String.raw`github\.com/memtomem/${REPO}/(?:blob|tree)/v${VERSION}`, 'gi'), 'repo'],
  [new RegExp(String.raw`raw\.githubusercontent\.com/memtomem/${REPO}/v${VERSION}`, 'gi'), 'repo'],
  // Only `mm upgrade` takes a numeric --version on this site, so every one is Core's.
  [new RegExp(String.raw`(?<![\w-])--version(?:=|[\s\\]+)["']?${VERSION}["']?`, 'g'), 'core'],
  [new RegExp(String.raw`(?<![\w.-])opencode-memtomem@${VERSION}`, 'gi'), 'opencode'],
];

export function stalePins(text, contract) {
  const current = { memtomem: contract.core.version, 'memtomem-stm': contract.stm.version, core: contract.core.version, opencode: contract.opencode.version };
  const found = [];
  for (const [pattern, kind] of PIN_FORMS) {
    for (const match of text.matchAll(pattern)) {
      const [pin, repo, version] = kind === 'repo' ? match : [match[0], kind, match[1]];
      if (version.toLowerCase() !== current[repo.toLowerCase()]) found.push(pin);
    }
  }
  return found;
}

export function validateUpstream(snapshot, contract, sources) {
  const errors = [];
  const same = (actual, expected, label) => {
    try { assert.deepEqual(actual, expected); } catch { errors.push(label); }
  };
  for (const kind of ['core', 'stm']) {
    same(snapshot[kind].commit, contract.sourceSnapshots[kind + 'Main'], kind + ' source pin mismatch');
    for (const locale of ['', 'ko/']) {
      const config = sources[`src/content/docs/${locale}${kind === 'core' ? 'ltm' : 'stm'}/configuration.md`] || '';
      const rows = [...config.matchAll(/^\| `(MEMTOMEM_[A-Z0-9_]+)` \| (.*) \| `(.*)` \|$/gm)];
      for (const [key, value] of Object.entries(snapshot[kind].environment)) {
        const matches = rows.filter(row => row[1] === key);
        if (matches.length !== 1) { errors.push(locale + key + ': missing or duplicate default'); continue; }
        try { same(JSON.parse(matches[0][3]), value, locale + key + ': default mismatch'); }
        catch { errors.push(locale + key + ': default must be JSON'); }
      }
      const cli = sources[`src/content/docs/${locale}${kind === 'core' ? 'ltm' : 'stm'}/cli.md`] || '';
      for (const [command, options] of Object.entries(snapshot[kind].options)) {
        const name = (kind === 'core' ? 'mm' : 'mms') + (command ? ' ' + command : '');
        const row = '| `' + name + '` | ' + (options.length ? options.map(o => '`' + o + '`').join(', ') : '—') + ' |';
        if (!cli.includes(row)) errors.push(locale + name + ': option index mismatch');
      }
    }
  }
  same(contract.core.toolNames, snapshot.core.tools, 'Core tool membership mismatch');
  same(contract.core.tools.fullCurrent, snapshot.core.tools.length, 'Core tool count mismatch');
  same(contract.core.tools.actions, snapshot.core.registeredFunctions.length, 'Core action count mismatch');
  for (const locale of ['', 'ko/']) {
    const tools = sources[`src/content/docs/${locale}ltm/mcp-tools.md`] || '';
    const catalog = tools.split('<!-- upstream-tool-names:start -->')[1]?.split('<!-- upstream-tool-names:end -->')[0] || '';
    same([...catalog.matchAll(/^- `([^\`]+)`$/gm)].map(m => m[1]), snapshot.core.tools, locale + 'public tool catalog mismatch');
  }
  for (const [file, text] of Object.entries(sources)) {
    if (/(?:github\.com\/memtomem\/memtomem-docs|\/private\/tmp\/|docs\/(?:audits|rfcs)\/)/i.test(text)) errors.push(file + ': private reference');
    if (STALE_VERSIONS.some((version) => staleVersionPattern(version).test(text))) {
      errors.push(file + ': stale release');
    }
    for (const pin of stalePins(text, contract)) errors.push(file + ': stale pin ' + pin);
  }
  return errors;
}
