// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLlmsTxt from 'starlight-llms-txt';

// https://astro.build/config
export default defineConfig({
	site: 'https://memtomem.com',
	integrations: [
		starlight({
			title: 'memtomem',
			logo: {
				light: './src/assets/logo-light.svg',
				dark: './src/assets/logo-dark.svg',
				replacesTitle: true,
			},
			description: 'MCP-native memory infrastructure for AI agents — STM + LTM separated architecture',
			defaultLocale: 'root',
			locales: {
				root: { label: 'English', lang: 'en' },
				ko: { label: '한국어', lang: 'ko' },
			},
			head: [
				{
					tag: 'script',
					content: `;(function(){if(!localStorage.getItem('starlight-theme')){localStorage.setItem('starlight-theme','dark');document.documentElement.setAttribute('data-theme','dark')}})()`,
				},
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
					attrs: { property: 'og:image', content: 'https://memtomem.com/og-image.png' },
				},
				{
					tag: 'meta',
					attrs: { name: 'twitter:card', content: 'summary_large_image' },
				},
				{
					tag: 'meta',
					attrs: { name: 'twitter:image', content: 'https://memtomem.com/og-image.png' },
				},
			],
			social: [
				{ icon: 'github', label: 'memtomem (LTM)', href: 'https://github.com/memtomem/memtomem' },
				{ icon: 'github', label: 'memtomem-stm', href: 'https://github.com/memtomem/memtomem-stm' },
			],
			sidebar: [
				{
					label: 'Start Here',
					translations: { ko: '여기서 시작' },
					items: [
						{ label: 'Choose Your Path', slug: 'guides/choose-your-path', translations: { ko: '목적에 맞는 시작 경로' } },
						{ label: 'Quick Start', slug: 'guides/quickstart', translations: { ko: '빠른 시작' } },
						{ label: 'Installation', slug: 'guides/installation', translations: { ko: '설치' } },
						{ label: 'Local-First & Privacy', slug: 'guides/privacy', translations: { ko: '로컬 우선 · 정보 보호' } },
					],
				},
				{
					label: 'Tasks',
					translations: { ko: '과업 가이드' },
					items: [
						{ label: 'Connect an AI Client', slug: 'guides/connect-ai-client', translations: { ko: 'AI 클라이언트 연결' } },
						{ label: 'Index & Import Content', slug: 'guides/index-and-import', translations: { ko: '기존 자료 색인·가져오기' } },
						{ label: 'Memory Across Sessions', slug: 'guides/memory-persistence', translations: { ko: '세션을 넘나드는 기억' } },
						{ label: 'Add STM to an MCP Server', slug: 'guides/stm-first-proxy', translations: { ko: 'MCP 서버에 STM 추가' } },
						{ label: 'Multi-Agent Collaboration', slug: 'ltm/multi-agent', translations: { ko: '멀티 에이전트 협업' } },
						{ label: 'Context Gateway', slug: 'ltm/context-gateway' },
					],
				},
				{
					label: 'Concepts',
					translations: { ko: '개념' },
					items: [
						{ label: 'LTM Overview', slug: 'ltm/overview', translations: { ko: 'LTM 개요' } },
						{ label: 'Hybrid Search', slug: 'ltm/hybrid-search', translations: { ko: '하이브리드 검색' } },
						{ label: 'Pinned Context', slug: 'ltm/pinned-context', translations: { ko: '고정 컨텍스트' } },
						{ label: 'STM Overview', slug: 'stm/overview', translations: { ko: 'STM 개요' } },
						{ label: 'Proactive Surfacing', slug: 'stm/surfacing', translations: { ko: '능동적 서피싱' } },
						{ label: 'Compression Strategies', slug: 'stm/compression', translations: { ko: '압축 전략' } },
					],
				},
				{
					label: 'Reference',
					translations: { ko: '레퍼런스' },
					items: [
						{ label: 'LTM MCP Tools', slug: 'ltm/mcp-tools', translations: { ko: 'LTM MCP 도구' } },
						{ label: 'LTM CLI', slug: 'ltm/cli', translations: { ko: 'LTM CLI' } },
						{ label: 'LTM Operations & API', slug: 'ltm/operations', translations: { ko: 'LTM 운영 및 API' } },
						{ label: 'STM MCP Tools', slug: 'stm/mcp-tools', translations: { ko: 'STM MCP 도구' } },
						{ label: 'STM CLI', slug: 'stm/cli', translations: { ko: 'STM CLI' } },
						{ label: 'Environment Variables', slug: 'reference/configuration', translations: { ko: '환경 변수' } },
						{ label: 'Troubleshooting', slug: 'guides/troubleshooting', translations: { ko: '문제 해결' } },
						{ label: 'Use These Docs', slug: 'guides/use-these-docs', translations: { ko: '문서를 MCP로 사용하기' } },
					],
				},
			],
			plugins: [
				starlightLlmsTxt({
					projectName: 'memtomem',
					description: 'MCP-native long and short-term memory infrastructure for AI agents. LTM (memtomem) provides persistent storage and hybrid search; STM (memtomem-stm) adds proxy-time compression and proactive memory surfacing.',
				}),
			],
			customCss: ['./src/styles/custom.css'],
		}),
	],
});
