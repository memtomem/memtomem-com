import { defineRouteMiddleware } from '@astrojs/starlight/route-data';

const KO_CARD = 'https://memtomem.com/og-image-ko.png';

// Docs pages share the config-wide head; Korean pages show the Korean link-preview card.
export const onRequest = defineRouteMiddleware((context) => {
	const route = context.locals.starlightRoute;
	if (route.locale !== 'ko') return;
	for (const entry of route.head) {
		const key = entry.attrs?.property ?? entry.attrs?.name;
		if (key === 'og:image' || key === 'twitter:image') {
			entry.attrs = { ...entry.attrs, content: KO_CARD };
		}
	}
});
