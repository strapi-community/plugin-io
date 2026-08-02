import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitepress';
import { buildLlmsFull } from './build-llms-full.js';
import { generateStructuredData } from './structured-data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_ROOT = path.resolve(__dirname, '..');

const SITE_URL = 'https://strapi-community.github.io/plugin-io';
const REPO_URL = 'https://github.com/strapi-community/plugin-io';
const NPM_URL = 'https://www.npmjs.com/package/@strapi-community/plugin-io';
const VERSION = '5.8.2';
const SITE_NAME = 'Strapi Plugin IO';
const SITE_DESCRIPTION =
  'Socket.IO plugin for Strapi v5 — real-time events, OAuth/JWT auth, rooms, Redis scaling, presence, and admin monitoring. Free MIT open source.';

export default defineConfig({
  title: SITE_NAME,
  titleTemplate: `:title - Socket.IO for Strapi v5`,
  description: SITE_DESCRIPTION,
  lang: 'en-US',
  base: '/plugin-io/',
  lastUpdated: true,
  cleanUrls: true,
  ignoreDeadLinks: true,
  srcExclude: ['README.md'],

  sitemap: {
    hostname: SITE_URL,
    transformItems: (items) =>
      items
        .filter((item) => item.url !== 'README' && !item.url.startsWith('README'))
        .map((item) => ({
          ...item,
          changefreq: item.url === '' ? 'weekly' : 'monthly',
          priority:
            item.url === ''
              ? 1.0
              : item.url.startsWith('guide/')
                ? 0.9
                : item.url.startsWith('api/')
                  ? 0.85
                  : 0.7,
        })),
  },

  async buildEnd(siteConfig) {
    const outDir = siteConfig.outDir;
    try {
      const size = await buildLlmsFull(DOCS_ROOT, path.join(outDir, 'llms-full.txt'));
      await buildLlmsFull(DOCS_ROOT, path.join(DOCS_ROOT, 'public', 'llms-full.txt'));
      console.log(`  ✓ llms-full.txt written (${(size / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.warn('  ⚠ llms-full.txt generation failed:', err.message);
    }
  },

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/plugin-io/logo.svg' }],
    ['link', { rel: 'apple-touch-icon', href: '/plugin-io/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#4945ff' }],
    ['meta', { name: 'color-scheme', content: 'light dark' }],
    ['meta', { name: 'author', content: 'ComfortablyCoding, hrdunn, Schero94, strapi-community' }],
    ['meta', { name: 'publisher', content: 'strapi-community' }],
    [
      'meta',
      {
        name: 'robots',
        content: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
      },
    ],
    ['meta', { name: 'googlebot', content: 'index, follow' }],
    ['meta', { name: 'bingbot', content: 'index, follow' }],
    [
      'meta',
      {
        name: 'keywords',
        content:
          'strapi, socket.io, websocket, real-time, strapi v5, strapi plugin, oauth, jwt, redis, presence, headless cms, @strapi-community/plugin-io, strapi transfer',
      },
    ],
    ['meta', { name: 'application-name', content: SITE_NAME }],
    ['meta', { name: 'apple-mobile-web-app-title', content: SITE_NAME }],
    ['meta', { name: 'format-detection', content: 'telephone=no' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: SITE_NAME }],
    ['meta', { property: 'og:locale', content: 'en_US' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:creator', content: '@Schero94' }],
    ['link', { rel: 'alternate', type: 'text/plain', href: `${SITE_URL}/llms.txt`, title: 'llms.txt' }],
    [
      'link',
      {
        rel: 'alternate',
        type: 'text/plain',
        href: `${SITE_URL}/llms-full.txt`,
        title: 'llms-full.txt',
      },
    ],
  ],

  transformHead({ pageData }) {
    const head = [];
    const frontmatter = pageData.frontmatter || {};
    const relativePath = pageData.relativePath || '';
    const isHome = relativePath === 'index.md';
    const pagePath = isHome
      ? ''
      : relativePath.replace(/\.md$/, '').replace(/\/index$/, '/');
    const canonicalUrl = `${SITE_URL}/${pagePath}`.replace(/\/+$/, '/') || `${SITE_URL}/`;
    const pageTitle = frontmatter.title || pageData.title || SITE_NAME;
    const pageDescription = frontmatter.description || pageData.description || SITE_DESCRIPTION;
    const pageOgImage = frontmatter.ogImage
      ? `${SITE_URL}${frontmatter.ogImage}`
      : `${SITE_URL}/logo.svg`;
    const fullTitle = isHome
      ? `${SITE_NAME} — Socket.IO for Strapi v5`
      : `${pageTitle} | ${SITE_NAME}`;

    head.push(['link', { rel: 'canonical', href: canonicalUrl }]);
    head.push(['meta', { name: 'description', content: pageDescription }]);
    head.push(['meta', { property: 'og:title', content: fullTitle }]);
    head.push(['meta', { property: 'og:description', content: pageDescription }]);
    head.push(['meta', { property: 'og:url', content: canonicalUrl }]);
    head.push(['meta', { property: 'og:image', content: pageOgImage }]);
    head.push(['meta', { property: 'og:image:alt', content: `${pageTitle} — ${SITE_NAME}` }]);
    head.push(['meta', { name: 'twitter:title', content: fullTitle }]);
    head.push(['meta', { name: 'twitter:description', content: pageDescription }]);
    head.push(['meta', { name: 'twitter:image', content: pageOgImage }]);
    head.push(['meta', { name: 'twitter:url', content: canonicalUrl }]);

    const structured = generateStructuredData({
      relativePath,
      frontmatter,
      pageTitle,
      pageDescription,
      canonicalUrl,
      siteUrl: SITE_URL,
    });

    for (const schema of structured) {
      head.push(['script', { type: 'application/ld+json' }, JSON.stringify(schema)]);
    }

    return head;
  },

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/io-class' },
      { text: 'Examples', link: '/examples/' },
      { text: 'Ecosystem', link: '/ecosystem' },
      {
        text: `v${VERSION}`,
        items: [
          { text: 'Changelog', link: `${REPO_URL}/releases` },
          { text: 'GitHub', link: REPO_URL },
          { text: 'llms.txt', link: `${SITE_URL}/llms.txt` },
        ],
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is Socket.IO Plugin?', link: '/' },
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Dashboard Widget', link: '/guide/widget' },
            { text: 'Migration from v4 to v5', link: '/guide/migration' },
          ],
        },
      ],

      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'IO Class', link: '/api/io-class' },
            { text: 'Plugin Configuration', link: '/api/plugin-config' },
          ],
        },
      ],

      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Overview', link: '/examples/' },
            { text: 'Content Types', link: '/examples/content-types' },
            { text: 'Events', link: '/examples/events' },
            { text: 'Hooks', link: '/examples/hooks' },
          ],
        },
      ],

      '/ecosystem': [
        {
          text: 'Ecosystem',
          items: [{ text: 'Related Plugins', link: '/ecosystem' }],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: REPO_URL },
      { icon: 'npm', link: NPM_URL },
    ],

    editLink: {
      pattern: `${REPO_URL}/edit/main/docs/:path`,
      text: 'Edit this page on GitHub',
    },

    footer: {
      message:
        'Released under the MIT License. Updated and made better by <a href="https://github.com/Schero94" target="_blank">@Schero94</a> · <a href="https://strapi-community.github.io/plugin-io/llms.txt">llms.txt</a>',
      copyright: 'Copyright © 2023-present ComfortablyCoding & hrdunn | Maintained by strapi-community',
    },

    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: 'Search',
                buttonAriaLabel: 'Search documentation',
              },
              modal: {
                displayDetails: 'Display detailed list',
                resetButtonTitle: 'Reset search',
                backButtonTitle: 'Close search',
                noResultsText: 'No results found',
                footer: {
                  selectText: 'to select',
                  selectKeyAriaLabel: 'enter',
                  navigateText: 'to navigate',
                  navigateUpKeyAriaLabel: 'up arrow',
                  navigateDownKeyAriaLabel: 'down arrow',
                  closeText: 'to close',
                  closeKeyAriaLabel: 'escape',
                },
              },
            },
          },
        },
      },
    },
  },

  markdown: {
    lineNumbers: true,
  },
});
