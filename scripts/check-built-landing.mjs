// Checks the plugin install panels of the built landing pages against the
// docs contract. It reads the rendered HTML through a real parser, so a check
// is scoped to the panel element itself, whatever the attribute order or
// markup around it.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { fromHtml } from 'hast-util-from-html';

function elements(node, found = []) {
  if (node.type === 'element') found.push(node);
  for (const child of node.children ?? []) elements(child, found);
  return found;
}

function parentOf(root, target) {
  for (const el of elements(root)) {
    if ((el.children ?? []).includes(target)) return el;
  }
  return null;
}

const hasClass = (el, name) => (el.properties.className ?? []).includes(name);

function text(node) {
  if (node.type === 'text') return node.value;
  return (node.children ?? []).map(text).join('');
}

function decode(href) {
  try {
    return decodeURI(href);
  } catch {
    return href;
  }
}

/**
 * @param {string} html rendered landing page
 * @param {'en' | 'ko'} locale
 * @param {object} install contract.guides.landingPluginInstall
 * @returns {string[]} errors
 */
export function checkLanding(html, locale, install) {
  const errors = [];
  const tree = fromHtml(html);
  const all = elements(tree);
  const route = install.prerequisiteRoute[locale];

  for (const client of install.clients) {
    const panels = all.filter((el) => el.properties.id === client.panelId && hasClass(el, 'install-panel'));
    if (panels.length !== 1) {
      errors.push(`${locale}: expected one install panel #${client.panelId}, found ${panels.length}`);
      continue;
    }
    // install-tabs.ts makes a tab only for a labelled direct child of [data-install-tabs].
    const parent = parentOf(tree, panels[0]);
    if (!parent || !('dataInstallTabs' in parent.properties) || !panels[0].properties.dataTabLabel) {
      errors.push(`${locale}: #${client.panelId} must be a direct child of [data-install-tabs] with a data-tab-label`);
    }
    const inPanel = elements(panels[0]);

    for (const [id, command] of Object.entries(client.commands)) {
      const onPage = all.filter((el) => el.properties.id === id);
      const inside = inPanel.filter((el) => el.tagName === 'code' && el.properties.id === id);
      if (onPage.length !== 1 || inside.length !== 1) {
        errors.push(`${locale}: expected one <code id="${id}"> in #${client.panelId}, found ${inside.length} (page ${onPage.length})`);
      } else if (text(inside[0]) !== command) {
        errors.push(`${locale}: #${id} is "${text(inside[0])}"; expected "${command}"`);
      }
    }

    // Every form of the tier command in the panel must be exact, and the step
    // line must carry it even when the note below repeats it.
    const isTier = (el) => el.tagName === 'code' && /^\s*mm\s+mem\s+init\b/.test(text(el));
    const tierForms = inPanel.filter(isTier).map(text);
    const steps = inPanel.filter((el) => hasClass(el, 'install-steps'));
    const stepHasTier = steps.some((el) => elements(el).some((c) => isTier(c) && text(c) === install.tierCommand));
    if (!stepHasTier || tierForms.some((form) => form !== install.tierCommand)) {
      errors.push(`${locale}: #${client.panelId} must show ${install.tierCommand} in its steps; found ${tierForms.join(' | ') || 'none'}`);
    }

    const links = inPanel
      .filter((el) => el.tagName === 'a' && el.properties.href !== undefined)
      .map((el) => decode(String(el.properties.href)));
    if (links.length !== 1 || links[0] !== route) {
      errors.push(`${locale}: #${client.panelId} needs exactly one link, to ${route}; found ${links.join(', ') || 'none'}`);
    }
  }
  return errors;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = process.cwd();
  const contract = JSON.parse(await readFile(path.join(root, 'src/data/docs-contract.json'), 'utf8'));
  const errors = [];
  for (const [locale, file] of [['en', 'dist/index.html'], ['ko', 'dist/ko/index.html']]) {
    errors.push(...checkLanding(await readFile(path.join(root, file), 'utf8'), locale, contract.guides.landingPluginInstall));
  }
  if (errors.length) {
    console.error(`Built landing check failed (${errors.length}):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('Built landing check passed: plugin install panels match the contract.');
}
