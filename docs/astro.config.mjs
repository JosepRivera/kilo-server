import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightThemeNova from 'starlight-theme-nova';
import starlightLlmsTxt from 'starlight-llms-txt';
import starlightPageContextAction from 'starlight-page-context-action';
import vercel from '@astrojs/vercel';

export default defineConfig({
	site: 'https://kilo-docs-mu.vercel.app',
	adapter: vercel(),
	integrations: [
		starlight({
			title: 'Kilo Docs',
			favicon: '/favicon.png',
			logo: { src: './src/assets/kilo-logo.png', alt: 'Kilo' },
			description:
				'Documentación de producto de Kilo — predicción de demanda de insumos y recomendación de compras para restaurantes pequeños y medianos en Lima.',
			locales: { root: { label: 'Español', lang: 'es' } },
			disable404Route: true,
			lastUpdated: true,
			editLink: { baseUrl: 'https://github.com/JosepRivera/kilo-server/edit/main/docs/' },
			pagefind: { ranking: { diacriticSimilarity: 0.8 } },
			head: [
				{ tag: 'link', attrs: { rel: 'stylesheet', href: '/ask-widget.css' } },
				{ tag: 'link', attrs: { rel: 'stylesheet', href: '/theme-images.css' } },
				{ tag: 'script', attrs: { src: '/ask-widget.js', defer: true } },
			],
			plugins: [
				starlightThemeNova(),
				starlightLlmsTxt({
					projectName: 'Kilo',
					description:
						'Kilo predice la demanda de insumos y recomienda qué comprar a restaurantes pequeños y medianos de Lima, para reducir el desperdicio y evitar platos que se caen del menú.',
					details:
						'Documentación de producto en español: visión general, flujo operativo en 5 fases (configuración inicial, registro diario, predicción, recomendador y registro de compra), competencia, preguntas frecuentes y decisiones descartadas.',
				}),
				starlightPageContextAction({
					prompt:
						'Lee {url} completo. Responde mis preguntas usando exclusivamente lo que está escrito en esa página — no agregues supuestos, prácticas genéricas de la industria, ni información que no esté ahí. Si algo no está definido en la página, dime explícitamente que no está definido, en vez de inventarlo o completarlo con conocimiento externo. Quiero hacerte preguntas sobre esto.',
				}),
			],
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/JosepRivera/kilo-server' }],
			sidebar: [
				{
					label: 'Producto',
					items: [
						{ label: 'Visión general', slug: 'producto/vision-general' },
						{ label: 'Competencia', slug: 'producto/competencia' },
						{ label: 'Flujo operativo', items: [{ autogenerate: { directory: 'producto/flujo' } }] },
						{ label: 'Preguntas frecuentes', slug: 'producto/preguntas-frecuentes' },
						{ label: 'Decisiones descartadas', slug: 'producto/descartado' },
					],
				},
			],
		}),
	],
});
