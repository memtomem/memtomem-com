// Turns each [data-install-tabs] block into a tab set. The server renders every
// panel stacked under a visible label, so a page without JS still shows every
// install path; this script adds the tab controls and the ARIA relationships.
for (const root of document.querySelectorAll<HTMLElement>('[data-install-tabs]')) {
	const panels = [...root.querySelectorAll<HTMLElement>(':scope > [data-tab-label]')];
	if (panels.length < 2) continue;

	const tablist = document.createElement('div');
	tablist.className = 'install-tabs';
	tablist.setAttribute('role', 'tablist');
	tablist.setAttribute('aria-label', root.dataset.tablistLabel ?? '');

	const tabs = panels.map((panel) => {
		const tab = document.createElement('button');
		tab.type = 'button';
		tab.className = 'install-tab';
		tab.id = `${panel.id}-tab`;
		tab.textContent = panel.dataset.tabLabel ?? '';
		tab.setAttribute('role', 'tab');
		tab.setAttribute('aria-controls', panel.id);
		panel.setAttribute('role', 'tabpanel');
		panel.setAttribute('aria-labelledby', tab.id);
		tablist.append(tab);
		return tab;
	});

	const select = (index: number, focus: boolean) => {
		tabs.forEach((tab, i) => {
			const selected = i === index;
			tab.setAttribute('aria-selected', String(selected));
			tab.tabIndex = selected ? 0 : -1;
			panels[i].hidden = !selected;
			panels[i].tabIndex = selected ? 0 : -1;
		});
		if (focus) tabs[index].focus();
	};

	// Focus follows the click too: Safari does not focus a clicked button, and a
	// stale focus on another tab would make the next Tab key skip the new panel.
	tabs.forEach((tab, i) => tab.addEventListener('click', () => select(i, true)));
	tablist.addEventListener('keydown', (event) => {
		const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
		if (current < 0) return;
		const last = tabs.length - 1;
		let next: number;
		switch (event.key) {
			case 'ArrowRight': next = current === last ? 0 : current + 1; break;
			case 'ArrowLeft': next = current === 0 ? last : current - 1; break;
			case 'Home': next = 0; break;
			case 'End': next = last; break;
			default: return;
		}
		event.preventDefault();
		select(next, true);
	});

	root.prepend(tablist);
	root.classList.add('is-tabbed');
	select(0, false);
}
