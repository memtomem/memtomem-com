// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	site: 'https://memtomem.com',
	integrations: [
		starlight({
			title: 'memtomem',
			description: 'MCP-native memory infrastructure for AI agents — STM + LTM separated architecture',
			defaultLocale: 'root',
			locales: {
				root: { label: 'English', lang: 'en' },
				ko: { label: '한국어', lang: 'ko' },
			},
			head: [
				{
					tag: 'meta',
					attrs: { property: 'og:type', content: 'website' },
				},
				{
					tag: 'meta',
					attrs: { property: 'og:site_name', content: 'memtomem' },
				},
				{
					tag: 'meta',
					attrs: { name: 'twitter:card', content: 'summary' },
				},
			],
			social: [
				{ icon: 'github', label: 'memtomem (LTM)', href: 'https://github.com/memtomem/memtomem' },
				{ icon: 'github', label: 'memtomem-stm', href: 'https://github.com/memtomem/memtomem-stm' },
			],
			sidebar: [
				{
					label: 'Getting Started',
					translations: { ko: '시작하기' },
					items: [
						{ label: 'Quick Start', slug: 'guides/quickstart' },
						{ label: 'Installation', slug: 'guides/installation', translations: { ko: '설치' } },
					],
				},
				{
					label: 'LTM (memtomem)',
					items: [
						{ label: 'Hybrid Search', slug: 'ltm/hybrid-search', translations: { ko: '하이브리드 검색' } },
						{ label: 'Multi-Agent Collaboration', slug: 'ltm/multi-agent', translations: { ko: '멀티 에이전트 협업' } },
					],
				},
				{
					label: 'STM (memtomem-stm)',
					items: [
						{ label: 'Proactive Surfacing', slug: 'stm/surfacing', translations: { ko: '능동적 서피싱' } },
						{ label: 'Compression Strategies', slug: 'stm/compression', translations: { ko: '압축 전략' } },
						{ label: 'Context Gateway', slug: 'stm/context-gateway' },
					],
				},
				{
					label: 'API Reference',
					translations: { ko: 'API 레퍼런스' },
					autogenerate: { directory: 'reference' },
				},
			],
			customCss: ['./src/styles/custom.css'],
		}),
	],
});
