import assert from 'node:assert/strict';

// Superseded upstream releases (Core, STM, Claude plugin, OpenCode plugin).
// Matched on a version boundary so a prefix like 0.1.2 does not flag
// historical notes about v0.1.23/v0.1.25. Single source of truth: the
// document contract checker imports this list too.
export const STALE_VERSIONS = ['0.3.10', '0.3.11', '0.3.12', '0.1.38', '0.1.39', '0.1.40', '0.1.41', '0.1.2', '0.3.3'];

export function staleVersionPattern(version) {
  return new RegExp(`(?<![\\d.])${version.replace(/\./g, '\\.')}(?![\\d.])`);
}

export function validateUpstream(snapshot, contract, sources) {
  const errors = [];
  const same = (actual, expected, label) => {
    try { assert.deepEqual(actual, expected); } catch { errors.push(label); }
  };
  for (const kind of ['core', 'stm']) {
    same(snapshot[kind].commit, contract.sourceSnapshots[kind + 'Main'], kind + ' source pin mismatch');
    for (const locale of ['', 'ko/']) {
      const config = sources[`src/content/docs/${locale}reference/configuration.md`] || '';
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
  }
  return errors;
}
