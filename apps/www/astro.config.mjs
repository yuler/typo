import { fileURLToPath } from 'node:url'
import react from '@astrojs/react'
import starlight from '@astrojs/starlight'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

const siteNav = [
  { label: 'Home', link: '/' },
  { label: 'Downloads', link: '/downloads/' },
  { label: 'Blog', link: '/blog/' },
  { label: 'Releases', link: '/releases/' },
]

const docSidebar = [
  {
    label: 'Overview',
    translations: { zh: '概览', jp: '概要' },
    link: '/docs/',
  },
  {
    label: 'Getting started',
    translations: { zh: '快速开始', jp: 'はじめに' },
    link: '/getting-started/',
  },
  {
    label: 'Features',
    translations: { zh: '功能', jp: '機能' },
    link: '/features/',
  },
  {
    label: 'Usage',
    translations: { zh: '使用方法', jp: '使い方' },
    link: '/usage/',
  },
  {
    label: 'Authentication',
    translations: { zh: '身份验证', jp: '認証' },
    link: '/authentication/',
  },
  {
    label: 'Prompt shortcuts',
    translations: { zh: '提示词快捷键', jp: 'プロンプトショートカット' },
    link: '/prompt-shortcuts/',
  },
  {
    label: 'FAQ',
    translations: { zh: '常见问题', jp: 'よくある質問' },
    link: '/faq/',
  },
]

// https://astro.build/config
export default defineConfig({
  site: 'https://typo.yuler.cc',
  output: 'static',
  integrations: [
    react(),
    starlight({
      title: 'typo',
      description: 'Guides and reference for the typo desktop app.',
      logo: {
        src: './src/assets/logo.png',
        alt: 'typo',
        replacesTitle: true,
      },
      defaultLocale: 'root',
      locales: {
        root: {
          label: 'English',
          lang: 'en',
        },
        zh: {
          label: '中文',
          lang: 'zh-CN',
        },
        jp: {
          label: '日本語',
          lang: 'ja-JP',
        },
      },
      editLink: {
        baseUrl: 'https://github.com/yuler/typo/edit/main/',
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/yuler/typo',
        },
      ],
      customCss: ['./src/styles/starlight.css'],
      components: {
        SiteTitle: './src/components/starlight/SiteTitle.astro',
      },
      sidebar: [
        {
          label: 'Site',
          translations: { zh: '站点', jp: 'サイト' },
          items: siteNav,
        },
        {
          label: 'Documentation',
          translations: { zh: '文档', jp: 'ドキュメント' },
          items: docSidebar,
        },
      ],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  },
})
