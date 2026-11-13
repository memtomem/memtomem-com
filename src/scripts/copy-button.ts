// Wires every [data-copy] button to the element whose id it names. The button
// ships hidden, so a page without JS (or without the Clipboard API) shows only
// the selectable command. Labels come from data-label / data-done / data-fail.
const status = document.getElementById('copy-status');

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-copy]')) {
	const source = document.getElementById(button.dataset.copy ?? '');
	if (!source || !navigator.clipboard) continue;
	button.hidden = false;
	let reset: ReturnType<typeof setTimeout> | undefined;
	button.addEventListener('click', async () => {
		let message = button.dataset.done ?? '';
		try {
			await navigator.clipboard.writeText(source.textContent?.trim() ?? '');
		} catch {
			message = button.dataset.fail ?? '';
			getSelection()?.selectAllChildren(source);
		}
		button.textContent = message;
		if (status) status.textContent = message;
		clearTimeout(reset);
		reset = setTimeout(() => { button.textContent = button.dataset.label ?? ''; }, 2000);
	});
}
