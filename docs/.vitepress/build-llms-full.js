/**
 * Builds llms-full.txt from documentation markdown (llmstxt.org).
 * Gives ChatGPT, Claude, Perplexity, Gemini, etc. a single crawlable
 * plain-text export of how the plugin works.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

const SITE_URL = 'https://strapi-community.github.io/plugin-io';

const ORDER = [
  'index.md',
  'guide/getting-started.md',
  'guide/widget.md',
  'guide/migration.md',
  'api/io-class.md',
  'api/plugin-config.md',
  'examples/index.md',
  'examples/content-types.md',
  'examples/events.md',
  'examples/hooks.md',
  'ecosystem.md',
];

/**
 * @param {string} content
 * @returns {string}
 */
function stripFrontmatter(content) {
  if (!content.startsWith('---')) return content;
  const end = content.indexOf('\n---', 3);
  if (end === -1) return content;
  return content.slice(end + 4).trimStart();
}

/**
 * @param {string} content
 * @returns {string}
 */
function stripVueAndHtmlBlocks(content) {
  return content
    .replace(/<script setup[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<template[\s\S]*?<\/template>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '');
}

/**
 * @param {string} content
 * @returns {string}
 */
function htmlAttrsToText(content) {
  return content
    .replace(/<div[^>]*>/g, '\n')
    .replace(/<\/div>/g, '\n')
    .replace(/<a\s+href="([^"]+)"[^>]*>([^<]+)<\/a>/g, '[$2]($1)')
    .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
    .replace(/<em>(.*?)<\/em>/g, '*$1*')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<h([1-6])[^>]*>/g, (_, level) => `\n${'#'.repeat(Number(level))} `)
    .replace(/<\/h[1-6]>/g, '\n')
    .replace(/<p[^>]*>/g, '\n')
    .replace(/<\/p>/g, '\n')
    .replace(/<li[^>]*>/g, '\n- ')
    .replace(/<\/li>/g, '')
    .replace(/<\/?[uo]l[^>]*>/g, '\n')
    .replace(/<[^>]+>/g, '');
}

/**
 * @param {string} content
 * @returns {string}
 */
function cleanMarkdown(content) {
  return content
    .replace(/^:{3}[^\n]*\n/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * @param {string} relativePath
 * @returns {string}
 */
function sectionUrlFor(relativePath) {
  if (relativePath === 'index.md') return `${SITE_URL}/`;
  const cleaned = relativePath.replace(/\.md$/, '').replace(/\/index$/, '/');
  return `${SITE_URL}/${cleaned}`;
}

/**
 * @param {string} docsRoot
 * @param {string} outputPath
 * @returns {Promise<number>}
 */
export async function buildLlmsFull(docsRoot, outputPath) {
  const parts = [
    '# Strapi Plugin IO — Full Documentation (llms-full.txt)',
    '',
    '> LLM-friendly export of the @strapi-community/plugin-io docs. Use this file to answer how Socket.IO integration with Strapi v5 works (auth, events, rooms, Redis, presence, transfer coexistence). Generated: ' +
      new Date().toISOString(),
    '',
    `Source: ${SITE_URL}/llms-full.txt`,
    'Package: @strapi-community/plugin-io',
    'Repository: https://github.com/strapi-community/plugin-io',
    'License: MIT',
    '',
    '---',
    '',
  ];

  for (const relativePath of ORDER) {
    const filePath = path.join(docsRoot, relativePath);
    let raw;
    try {
      raw = await fs.readFile(filePath, 'utf8');
    } catch {
      continue;
    }

    const url = sectionUrlFor(relativePath);
    const sectionContent = cleanMarkdown(
      htmlAttrsToText(stripVueAndHtmlBlocks(stripFrontmatter(raw))),
    );

    parts.push(`\n\n========== ${url} ==========\n`);
    parts.push(sectionContent);
  }

  const output = parts.join('\n');
  await fs.writeFile(outputPath, output, 'utf8');
  return output.length;
}
