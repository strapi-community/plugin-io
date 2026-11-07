/**
 * Local semantic-release plugin that folds the hand-written `## [Unreleased]`
 * section of CHANGELOG.md into the release.
 *
 * - `generateNotes` returns the section body. semantic-release concatenates the
 *   notes of every plugin in order, so the text lands below the generated
 *   commit list in the GitHub release and in the new CHANGELOG entry.
 * - `prepare` removes the section from CHANGELOG.md. It must run before
 *   `@semantic-release/changelog`, which then prepends the combined notes.
 *
 * Without this step the changelog plugin would prepend the new entry above a
 * stale `[Unreleased]` block.
 *
 * `prepare` also removes `Co-authored-by:` trailers from the release notes.
 * The commit analyzer copies commit bodies into "BREAKING CHANGES", so a
 * squash merge would otherwise publish those trailers in the GitHub release,
 * the CHANGELOG entry and the release commit. It runs before every other
 * prepare plugin, and they all read the same `nextRelease.notes`.
 *
 * @see https://semantic-release.gitbook.io/semantic-release/usage/plugins
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const HEADING = /^## \[Unreleased\][^\n]*\n/m;
const NEXT_RELEASE = /^#{1,2} \[\d/m;

/**
 * Splits a changelog into the Unreleased body and the rest.
 *
 * @param {string} text - CHANGELOG.md content.
 * @returns {{ body: string, rest: string }} Unreleased body ('' when absent) and the changelog without it.
 */
export function splitUnreleased(text) {
  const heading = HEADING.exec(text);
  if (!heading) return { body: '', rest: text };
  const start = heading.index + heading[0].length;
  const tail = text.slice(start);
  const next = tail.search(NEXT_RELEASE);
  const end = next === -1 ? text.length : start + next;
  return {
    body: text.slice(start, end).trim(),
    rest: (text.slice(0, heading.index) + text.slice(end)).replace(/^\s+/, ''),
  };
}

const changelogPath = (cwd) => join(cwd, 'CHANGELOG.md');

const TRAILER = /^[ \t]*Co-authored-by:[^\n]*(?:\n|$)/gim;

/**
 * Removes `Co-authored-by:` trailer lines and the blank lines they leave.
 *
 * @param {string} notes - Release notes.
 * @returns {string} Notes without co-author trailers.
 */
export function stripCoAuthorTrailers(notes) {
  if (typeof notes !== 'string') return notes;
  return notes
    .replace(TRAILER, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+$/, '\n');
}

/**
 * @param {object} _config - Plugin config.
 * @param {{ cwd: string }} context - semantic-release context.
 * @returns {Promise<string>} Unreleased notes or ''.
 */
export async function generateNotes(_config, { cwd }) {
  try {
    return splitUnreleased(await readFile(changelogPath(cwd), 'utf8')).body;
  } catch {
    return '';
  }
}

/**
 * @param {object} _config - Plugin config.
 * @param {{ cwd: string, logger: { log: Function }, nextRelease?: { notes?: string } }} context - semantic-release context.
 * @returns {Promise<void>}
 */
export async function prepare(_config, { cwd, logger, nextRelease }) {
  if (nextRelease && typeof nextRelease.notes === 'string') {
    nextRelease.notes = stripCoAuthorTrailers(nextRelease.notes);
  }
  const file = changelogPath(cwd);
  const text = await readFile(file, 'utf8');
  const { body, rest } = splitUnreleased(text);
  if (!body && rest === text) return;
  await writeFile(file, rest);
  logger.log('Folded the [Unreleased] section of CHANGELOG.md into the release notes');
}
