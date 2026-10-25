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
					label: 'Get Started',
					translations: { ko: '시작하기' },
					items: [
						{ label: 'Choose Your Path', slug: 'guides/choose-your-path', translations: { ko: '목적에 맞는 시작 경로' } },
						{ label: 'Quick Start', slug: 'guides/quickstart', translations: { ko: '빠른 시작' } },
						{ label: 'Connect an AI Client', slug: 'guides/connect-ai-client', translations: { ko: 'AI 클라이언트 연결' } },
						{ label: 'Installation', slug: 'guides/installation', translations: { ko: '설치' } },
					],
				},
				{
					label: 'memtomem (LTM)',
					items: [
						{ label: 'Overview', slug: 'ltm/overview', translations: { ko: '개요' } },
						{ label: 'Memory Across Sessions', slug: 'ltm/memory-persistence', translations: { ko: '세션을 넘나드는 기억' } },
						{ label: 'Index & Import Content', slug: 'ltm/index-and-import', translations: { ko: '기존 자료 색인·가져오기' } },
						{ label: 'Multi-Agent Collaboration', slug: 'ltm/multi-agent', translations: { ko: '멀티 에이전트 협업' } },
						{ label: 'Context Gateway', slug: 'ltm/context-gateway' },
						{ label: 'Hybrid Search', slug: 'ltm/hybrid-search', translations: { ko: '하이브리드 검색' } },
						{ label: 'Pinned Context', slug: 'ltm/pinned-context', translations: { ko: '고정 컨텍스트' } },
						{
							label: 'Reference',
							translations: { ko: '레퍼런스' },
							items: [
								{ label: 'MCP Tools', slug: 'ltm/mcp-tools', translations: { ko: 'MCP 도구' } },
								{ label: 'CLI', slug: 'ltm/cli', translations: { ko: 'CLI' } },
								{ label: 'Environment Variables', slug: 'ltm/configuration', translations: { ko: '환경 변수' } },
								{ label: 'Operations & API', slug: 'ltm/operations', translations: { ko: '운영 및 API' } },
							],
						},
					],
				},
				{
					label: 'memtomem-stm (STM)',
					items: [
						{ label: 'Overview', slug: 'stm/overview', translations: { ko: '개요' } },
						{ label: 'Add STM to an MCP Server', slug: 'stm/first-proxy', translations: { ko: 'MCP 서버에 STM 추가' } },
						{ label: 'Proactive Surfacing', slug: 'stm/surfacing', translations: { ko: '능동적 서피싱' } },
						{ label: 'Compression Strategies', slug: 'stm/compression', translations: { ko: '압축 전략' } },
						{
							label: 'Reference',
							translations: { ko: '레퍼런스' },
							items: [
								{ label: 'MCP Tools', slug: 'stm/mcp-tools', translations: { ko: 'MCP 도구' } },
								{ label: 'CLI', slug: 'stm/cli', translations: { ko: 'CLI' } },
								{ label: 'Environment Variables', slug: 'stm/configuration', translations: { ko: '환경 변수' } },
							],
						},
					],
				},
				{
					label: 'Use Cases',
					translations: { ko: '활용 사례' },
					items: [
						{ label: 'Coding Agent', slug: 'use-cases/vibe-coding', translations: { ko: '코딩 에이전트' } },
						{ label: 'LangGraph Beginner Labs', slug: 'use-cases/langgraph', translations: { ko: 'LangGraph 입문 실습' } },
					],
				},
				{
					label: 'Help',
					translations: { ko: '도움말' },
					items: [
						{ label: 'Local-First & Privacy', slug: 'guides/privacy', translations: { ko: '로컬 우선 · 정보 보호' } },
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
