import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Strapi Plugin IO',
  titleTemplate: ':title - Socket.IO for Strapi v5',
  description: 'Socket.IO plugin for Strapi v5 CMS with OAuth authentication, real-time events, room management, Redis adapter, and production-ready features. Free & open-source.',
  
  base: '/',
  
  // SEO Meta Tags
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#4945ff' }],
    
    // Primary Meta Tags
    ['meta', { name: 'title', content: 'Strapi Socket.IO Plugin - Real-Time WebSocket Integration for Strapi v5' }],
    ['meta', { name: 'description', content: 'Production-ready Socket.IO plugin for Strapi v5 CMS. Features: OAuth 2.0 authentication, automatic content type events, room management, Redis adapter, rate limiting. Free MIT license.' }],
    ['meta', { name: 'keywords', content: 'strapi, socket.io, websocket, real-time, strapi v5, strapi plugin, nodejs, oauth, jwt, redis, websockets, cms plugin, headless cms, real-time events, strapi-plugin-io' }],
    ['meta', { name: 'author', content: 'ComfortablyCoding, hrdunn, Schero94' }],
    ['meta', { name: 'robots', content: 'index, follow' }],
    ['link', { rel: 'canonical', href: 'https://strapi-plugin-io.netlify.app/' }],
    
    // Open Graph / Facebook
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:url', content: 'https://strapi-plugin-io.netlify.app/' }],
    ['meta', { property: 'og:title', content: 'Strapi Socket.IO Plugin - Real-Time WebSocket Integration' }],
    ['meta', { property: 'og:description', content: 'Production-ready Socket.IO plugin for Strapi v5. OAuth authentication, real-time events, Redis scaling, room management. Open-source & free.' }],
    ['meta', { property: 'og:image', content: 'https://strapi-plugin-io.netlify.app/og-image.png' }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { property: 'og:locale', content: 'en_US' }],
    ['meta', { property: 'og:site_name', content: 'Strapi Plugin IO' }],
    
    // Twitter Card
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:url', content: 'https://strapi-plugin-io.netlify.app/' }],
    ['meta', { name: 'twitter:title', content: 'Strapi Socket.IO Plugin - Real-Time WebSocket Integration' }],
    ['meta', { name: 'twitter:description', content: 'Production-ready Socket.IO plugin for Strapi v5. OAuth, real-time events, Redis, room management. Free & open-source.' }],
    ['meta', { name: 'twitter:image', content: 'https://strapi-plugin-io.netlify.app/og-image.png' }],
    ['meta', { name: 'twitter:creator', content: '@Schero94' }],
    
    // Additional SEO
    ['meta', { name: 'application-name', content: 'Strapi Plugin IO' }],
    ['meta', { name: 'apple-mobile-web-app-title', content: 'Strapi Plugin IO' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'default' }],
    ['meta', { name: 'format-detection', content: 'telephone=no' }],
    ['meta', { name: 'mobile-web-app-capable', content: 'yes' }],
    
    // Structured Data (JSON-LD)
    ['script', { type: 'application/ld+json' }, JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      'name': 'Strapi Plugin IO',
      'applicationCategory': 'DeveloperApplication',
      'operatingSystem': 'Node.js',
      'description': 'Socket.IO plugin for Strapi v5 CMS with real-time WebSocket integration, OAuth authentication, and production-ready features.',
      'offers': {
        '@type': 'Offer',
        'price': '0',
        'priceCurrency': 'USD'
      },
      'author': {
        '@type': 'Organization',
        'name': 'ComfortablyCoding',
        'url': 'https://github.com/ComfortablyCoding'
      },
      'maintainer': {
        '@type': 'Person',
        'name': 'Schero94',
        'url': 'https://github.com/Schero94'
      },
      'license': 'https://opensource.org/licenses/MIT',
      'downloadUrl': 'https://www.npmjs.com/package/strapi-plugin-io',
      'softwareVersion': '3.0.0',
      'releaseNotes': 'Strapi v5 support, Redis adapter, OAuth authentication, 7 helper functions',
      'programmingLanguage': 'JavaScript',
      'runtimePlatform': 'Node.js',
      'url': 'https://strapi-plugin-io.netlify.app/'
    })],
    
    // Google Analytics (optional - add your tracking ID)
    // ['script', { async: '', src: 'https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX' }],
    // ['script', {}, `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', 'G-XXXXXXXXXX');`]
  ],
  
  themeConfig: {
    logo: '/logo.svg',
    
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/io-class' },
      { text: 'Examples', link: '/examples/' },
      { text: 'Ecosystem', link: '/ecosystem' },
      {
        text: 'v3.0.0',
        items: [
          { text: 'Changelog', link: 'https://github.com/ComfortablyCoding/strapi-plugin-io/releases' },
          { text: 'Contributing', link: 'https://github.com/ComfortablyCoding/strapi-plugin-io/blob/main/CONTRIBUTING.md' }
        ]
      }
    ],
    
    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is Socket.IO Plugin?', link: '/' },
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Dashboard Widget', link: '/guide/widget' },
            { text: 'Migration from v4 to v5', link: '/guide/migration' }
          ]
        }
      ],
      
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'IO Class', link: '/api/io-class' },
            { text: 'Plugin Configuration', link: '/api/plugin-config' }
          ]
        }
      ],
      
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Overview', link: '/examples/' },
            { text: 'Content Types', link: '/examples/content-types' },
            { text: 'Events', link: '/examples/events' },
            { text: 'Hooks', link: '/examples/hooks' }
          ]
        }
      ],
      
      '/ecosystem': [
        {
          text: 'Ecosystem',
          items: [
            { text: 'Related Plugins', link: '/ecosystem' }
          ]
        }
      ]
    },
    
    socialLinks: [
      { icon: 'github', link: 'https://github.com/ComfortablyCoding/strapi-plugin-io' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/strapi-plugin-io' }
    ],
    
    editLink: {
      pattern: 'https://github.com/ComfortablyCoding/strapi-plugin-io/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },
    
    footer: {
      message: 'Released under the MIT License. Updated and made better by <a href="https://github.com/Schero94" target="_blank">@Schero94</a>',
      copyright: 'Copyright © 2023-present ComfortablyCoding & hrdunn | Will be maintained till December 2026'
    },
    
    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: 'Search',
                buttonAriaLabel: 'Search documentation'
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
                  closeKeyAriaLabel: 'escape'
                }
              }
            }
          }
        },
        miniSearch: {
          searchOptions: {
            combineWith: 'AND',
            fuzzy: 0.3,
            prefix: true,
            boost: {
              title: 10,
              heading: 6,
              text: 2,
              code: 1
            },
            fields: ['title', 'titles', 'text']
          },
          options: {
            extractField: (document, fieldName) => {
              if (fieldName === 'text') {
                // Clean and optimize text for search
                const text = document[fieldName] || ''
                return text
                  .replace(/```[\s\S]*?```/g, '') // Remove code blocks
                  .replace(/\[.*?\]\(.*?\)/g, '') // Remove markdown links
                  .replace(/[#*_~`]/g, '') // Remove markdown syntax
                  .toLowerCase()
              }
              return document[fieldName]
            },
            tokenize: (text) => {
              // Better tokenization
              return text
                .split(/[\s\-_\.,:;!?]+/)
                .filter(token => token.length > 1)
            },
            processTerm: (term) => {
              // Normalize search terms
              return term.toLowerCase()
            }
          }
        }
      }
    }
  },
  
  markdown: {
    lineNumbers: true
  },
  
  // SEO: Generate sitemap
  sitemap: {
    hostname: 'https://strapi-plugin-io.netlify.app'
  },
  
  // Performance optimization
  cleanUrls: true,
  
  // Last updated timestamp
  lastUpdated: true
});


