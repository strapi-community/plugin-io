/**
 * Per-page Schema.org JSON-LD for SEO / GEO / AIO discoverability.
 */

const SITE_URL = 'https://strapi-community.github.io/plugin-io';
const REPO_URL = 'https://github.com/strapi-community/plugin-io';
const NPM_URL = 'https://www.npmjs.com/package/@strapi-community/plugin-io';

const ORGANIZATION = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: 'strapi-community',
  url: 'https://github.com/strapi-community',
  sameAs: [REPO_URL, NPM_URL, 'https://github.com/Schero94'],
};

const WEBSITE = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  url: `${SITE_URL}/`,
  name: 'Strapi Plugin IO',
  description:
    'Official documentation for @strapi-community/plugin-io — Socket.IO integration for Strapi v5.',
  publisher: { '@id': `${SITE_URL}/#organization` },
  inLanguage: 'en-US',
};

const SOFTWARE = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  '@id': `${SITE_URL}/#software`,
  name: 'Strapi Plugin IO',
  alternateName: ['@strapi-community/plugin-io', 'strapi-plugin-io'],
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Node.js',
  description:
    'Production-ready Socket.IO plugin for Strapi v5 with OAuth/JWT auth strategies, automatic content-type events, rooms, Redis adapter, presence, and admin monitoring.',
  url: `${SITE_URL}/`,
  downloadUrl: NPM_URL,
  installUrl: NPM_URL,
  softwareVersion: '5.8.2',
  license: 'https://opensource.org/licenses/MIT',
  programmingLanguage: 'JavaScript',
  runtimePlatform: 'Node.js',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  author: { '@id': `${SITE_URL}/#organization` },
  maintainer: {
    '@type': 'Person',
    name: 'Schero94',
    url: 'https://github.com/Schero94',
  },
  featureList: [
    'Socket.IO server attached to Strapi HTTP server',
    'OAuth / JWT / API token authentication strategies',
    'Automatic CRUD events for configured content types',
    'Room management and role-based emit targeting',
    'Redis adapter for multi-instance scaling',
    'Admin presence and online editors widget',
    'destroyUpgrade:false so Strapi transfer WebSockets coexist',
  ],
  codeRepository: REPO_URL,
};

/**
 * @param {string} relativePath
 * @param {string} siteUrl
 * @returns {object}
 */
function buildBreadcrumbs(relativePath, siteUrl) {
  const segments = relativePath
    .replace(/\.md$/, '')
    .replace(/\/index$/, '')
    .split('/')
    .filter(Boolean);

  const items = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: `${siteUrl}/`,
    },
  ];

  let pathAcc = '';
  segments.forEach((segment, index) => {
    pathAcc += `/${segment}`;
    items.push({
      '@type': 'ListItem',
      position: index + 2,
      name: segment
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      item: `${siteUrl}${pathAcc}`,
    });
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };
}

/**
 * @param {object} params
 * @returns {object[]}
 */
export function generateStructuredData({
  relativePath,
  frontmatter,
  pageTitle,
  pageDescription,
  canonicalUrl,
  siteUrl = SITE_URL,
}) {
  const schemas = [ORGANIZATION, WEBSITE, SOFTWARE];
  const isHome = relativePath === 'index.md';

  schemas.push(buildBreadcrumbs(relativePath, siteUrl));

  if (isHome) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is @strapi-community/plugin-io?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'A free MIT-licensed Socket.IO plugin for Strapi v5 that adds real-time WebSocket events, auth strategies, rooms, Redis scaling, and admin presence on top of Strapi.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does plugin-io break strapi transfer?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Older Engine.IO defaults could kill /admin/transfer WebSocket upgrades behind reverse proxies. Current versions default destroyUpgrade to false so Strapi Data Transfer coexists with Socket.IO on the same HTTP server.',
          },
        },
        {
          '@type': 'Question',
          name: 'Which Strapi version is supported?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Strapi v5. Node.js 18–22. Install via npm as @strapi-community/plugin-io.',
          },
        },
      ],
    });
  } else {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: pageTitle,
      description: pageDescription,
      url: canonicalUrl,
      mainEntityOfPage: canonicalUrl,
      author: { '@id': `${siteUrl}/#organization` },
      publisher: { '@id': `${siteUrl}/#organization` },
      about: { '@id': `${siteUrl}/#software` },
      inLanguage: 'en-US',
      isPartOf: { '@id': `${siteUrl}/#website` },
      ...(frontmatter?.lastUpdated
        ? { dateModified: frontmatter.lastUpdated }
        : {}),
    });
  }

  if (relativePath.startsWith('guide/getting-started')) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'Install Strapi Plugin IO',
      description: 'Install and enable @strapi-community/plugin-io in a Strapi v5 project.',
      totalTime: 'PT10M',
      tool: [
        { '@type': 'HowToTool', name: 'Node.js 18+' },
        { '@type': 'HowToTool', name: 'Strapi v5' },
      ],
      step: [
        {
          '@type': 'HowToStep',
          name: 'Install the package',
          text: 'npm install @strapi-community/plugin-io',
        },
        {
          '@type': 'HowToStep',
          name: 'Enable the plugin',
          text: 'Add the plugin entry to config/plugins.js/.ts and configure socket.serverOptions.',
        },
        {
          '@type': 'HowToStep',
          name: 'Restart Strapi',
          text: 'Rebuild/restart the Strapi server and verify Socket.IO connections from your client.',
        },
      ],
    });
  }

  return schemas;
}
