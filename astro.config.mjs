// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	site: 'https://memtomem.github.io',
	base: '/memtomem-com',
	integrations: [
		starlight({
			title: 'memtomem',
			defaultLocale: 'root',
			locales: {
				root: { label: '한국어', lang: 'ko' },
				en: { label: 'English', lang: 'en' },
			},
			social: [
				{ icon: 'github', label: 'memtomem (LTM)', href: 'https://github.com/memtomem/memtomem' },
				{ icon: 'github', label: 'memtomem-stm', href: 'https://github.com/memtomem/memtomem-stm' },
			],
			sidebar: [
				{
					label: '시작하기',
					translations: { en: 'Getting Started' },
					items: [
						{ label: 'Quick Start', slug: 'guides/quickstart' },
						{ label: '설치', slug: 'guides/installation', translations: { en: 'Installation' } },
					],
				},
				{
					label: 'LTM (memtomem)',
					items: [
						{ label: '하이브리드 검색', slug: 'ltm/hybrid-search', translations: { en: 'Hybrid Search' } },
						{ label: '멀티 에이전트 협업', slug: 'ltm/multi-agent', translations: { en: 'Multi-Agent Collaboration' } },
					],
				},
				{
					label: 'STM (memtomem-stm)',
					items: [
						{ label: '능동적 서피싱', slug: 'stm/surfacing', translations: { en: 'Proactive Surfacing' } },
						{ label: '압축 전략', slug: 'stm/compression', translations: { en: 'Compression Strategies' } },
						{ label: 'Context Gateway', slug: 'stm/context-gateway' },
					],
				},
				{
					label: 'API 레퍼런스',
					translations: { en: 'API Reference' },
					autogenerate: { directory: 'reference' },
				},
			],
			customCss: ['./src/styles/custom.css'],
		}),
	],
});
