import { CONTENT_ACTIONS } from '../utils/constants.js';
import { DEFAULT_SETTINGS, deepMerge, normalizeSettings } from '../utils/settings-schema.js';

const STORE_KEY = 'plugin_io_settings';
/** Full core_store key (`strapi.store({ type: 'plugin', name: 'io' })` prefixes `plugin_io_`). */
const ROW_KEY = `plugin_io_${STORE_KEY}`;
const CORE_STORE = 'strapi::core-store';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/**
 * Compare-and-swap attempts per save. A save that names a revision fails
 * with 409 on the first lost race anyway; the attempts matter for saves
 * without a revision (API callers, imports), which re-merge onto the newer
 * row. Eight processes saving at once needed more than three.
 */
const MAX_ATTEMPTS = 10;
/** Upper bound of the random pause before a retry, multiplied by the attempt. */
const RETRY_JITTER_MS = 15;

/**
 * Thrown when a save names a revision that is no longer the stored one, so
 * another administrator (on any process) saved in between.
 */
class SettingsConflictError extends Error {
	/** @param {number} currentRevision - Stored revision. */
	constructor(currentRevision) {
		super('The settings were changed by someone else. Reload them and apply your changes again.');
		this.name = 'SettingsConflictError';
		this.currentRevision = currentRevision;
	}
}

/**
 * Parses a stored core_store value.
 *
 * @param {{ value?: string | null } | null} row - Core store row.
 * @returns {object | null} Parsed value.
 */
const parseRow = (row) => {
	if (!row || typeof row.value !== 'string') return null;
	try {
		return JSON.parse(row.value);
	} catch {
		return null;
	}
};

/** @param {unknown} stored @returns {number} Revision stored with the settings (0 before revisions existed). */
const revisionOf = (stored) =>
	stored && Number.isInteger(stored.revision) && stored.revision >= 0 ? stored.revision : 0;

/**
 * Settings service: reads and writes the admin settings in core_store and
 * keeps an in-memory snapshot (`current()`) that the socket layer reads on
 * every handshake and emit, so changes apply without a restart.
 *
 * Several processes: the stored document carries a `revision` that every
 * save increments. A save is a compare-and-swap (`UPDATE ... WHERE id AND
 * value = <the text it read>`), so two saves on different processes can never
 * overwrite each other; the loser re-reads and merges again, or gets a
 * conflict when the admin named the revision the form was based on. Other
 * processes pick the new revision up through the cluster signal or their
 * periodic `refresh()`.
 *
 * @param {{ strapi: import('@strapi/types').Core.Strapi }} deps - Strapi instance.
 * @returns {object} Settings service API.
 */
export default ({ strapi }) => {
	let snapshot = structuredClone(DEFAULT_SETTINGS);
	let revision = 0;
	const listeners = new Set();

	const query = () => strapi.db.query(CORE_STORE);
	const where = { key: ROW_KEY, environment: null, tag: null };

	/**
	 * Reads the settings row. When concurrent first saves created duplicates,
	 * the lowest id is kept and the others are removed.
	 *
	 * @returns {Promise<{ id: number | string, value: string } | null>} Row.
	 */
	const readRow = async () => {
		const rows = await query().findMany({ where, orderBy: { id: 'asc' } });
		if (rows.length > 1) {
			await query()
				.deleteMany({ where: { id: { $in: rows.slice(1).map((row) => row.id) } } })
				.catch(() => {});
		}
		return rows[0] ?? null;
	};

	/**
	 * Creates the settings row when it is missing. Only ever INSERTs, so it can
	 * never overwrite a save of another process; duplicates from processes
	 * booting at the same moment are removed by `readRow` (lowest id wins).
	 *
	 * @returns {Promise<{ id: number | string, value: string } | null>} Row.
	 */
	const ensureRow = async () => {
		const existing = await readRow();
		if (existing) return existing;
		await query().create({
			data: { ...where, value: JSON.stringify({ ...DEFAULT_SETTINGS, revision: 0 }), type: 'object' },
		});
		return readRow();
	};

	const notify = (next) => {
		for (const listener of listeners) {
			try {
				listener(next);
			} catch (error) {
				strapi.log.error(`[io] Applying settings failed: ${error.message}`);
			}
		}
	};

	/** Replaces the snapshot and notifies listeners when the revision changed. */
	const apply = (stored, { force = false } = {}) => {
		const nextRevision = revisionOf(stored);
		if (!force && nextRevision === revision) return snapshot;
		snapshot = normalizeSettings(stored, strapi.log);
		revision = nextRevision;
		notify(snapshot);
		return snapshot;
	};

	return {
		SettingsConflictError,

		/**
		 * Loads the stored settings into the snapshot. Called once at bootstrap;
		 * creates the settings row on the very first start, so later saves on
		 * any process compare-and-swap the same row.
		 *
		 * @returns {Promise<object>} The normalized settings.
		 */
		async load() {
			const stored = parseRow(await ensureRow());
			snapshot = normalizeSettings(stored, strapi.log);
			revision = revisionOf(stored);
			return snapshot;
		},

		/**
		 * Re-reads the stored settings and applies them (snapshot plus
		 * listeners) when another process saved a newer revision.
		 *
		 * @returns {Promise<object>} Current settings.
		 */
		async refresh() {
			return apply(parseRow(await readRow()));
		},

		/**
		 * Returns the in-memory settings snapshot (no database access).
		 *
		 * @returns {typeof DEFAULT_SETTINGS} Current settings.
		 */
		current() {
			return snapshot;
		},

		/** @returns {number} Revision of the snapshot. */
		revision() {
			return revision;
		},

		/**
		 * Reads the stored settings, normalized to the current version, and
		 * applies them on this process if they are newer.
		 *
		 * @returns {Promise<object>} Settings.
		 */
		async getSettings() {
			return this.refresh();
		},

		/**
		 * Returns the settings a validated update would produce, without saving
		 * them (used by the settings import preview).
		 *
		 * @param {object} update - Body already validated by `settingsUpdateSchema`.
		 * @returns {Promise<object>} Resulting settings.
		 */
		async preview(update) {
			const base = normalizeSettings(parseRow(await readRow()), strapi.log);
			const { version: _version, revision: _revision, ...rest } = update || {};
			return normalizeSettings(deepMerge(base, rest), strapi.log);
		},

		/**
		 * Merges a validated partial update into the stored settings, persists
		 * the result with a compare-and-swap and notifies subscribers (the socket
		 * layer re-applies options) and the other processes.
		 *
		 * @param {object} update - Body already validated by `settingsUpdateSchema`; `revision` is the revision the change is based on (optional).
		 * @returns {Promise<object>} The saved settings.
		 * @throws {SettingsConflictError} When `update.revision` is not the stored revision.
		 * @sideeffect Writes core_store key `plugin_io_settings`.
		 */
		async setSettings(update) {
			const { version: _version, revision: expected, ...rest } = update || {};
			for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
				const row = await ensureRow();
				const stored = parseRow(row);
				const current = revisionOf(stored);
				if (Number.isInteger(expected) && expected !== current) throw new SettingsConflictError(current);
				const next = normalizeSettings(deepMerge(normalizeSettings(stored, strapi.log), rest), strapi.log);
				const value = JSON.stringify({ ...next, revision: current + 1 });
				const { count } = await query().updateMany({ where: { id: row.id, value: row.value }, data: { value } });
				if (Number(count) === 1) {
					apply({ ...next, revision: current + 1 }, { force: true });
					await strapi
						.plugin('io')
						.service('cluster')
						?.publish('settings', { revision: current + 1 })
						.catch(() => {});
					return snapshot;
				}
				// Lost the race: spread the retries so the writers do not collide again.
				if (attempt < MAX_ATTEMPTS) await sleep(Math.floor(Math.random() * RETRY_JITTER_MS * attempt));
			}
			throw new SettingsConflictError(revisionOf(parseRow(await readRow())));
		},

		/**
		 * Subscribes to settings changes.
		 *
		 * @param {(settings: object) => void} listener - Called after each save.
		 * @returns {() => void} Unsubscribe function.
		 */
		onChange(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},

		/**
		 * Lists `api::` content types with the actions configured for events,
		 * marking the ones fixed in `config/plugins` (read-only in the admin).
		 *
		 * @returns {Array<{ uid: string, displayName: string, singularName: string, kind: string, draftAndPublish: boolean, configActions: string[] | null }>} Content types.
		 */
		getContentTypes() {
			const fromConfig = new Map();
			for (const entry of strapi.config.get('plugin::io.contentTypes', [])) {
				const uid = typeof entry === 'string' ? entry : entry.uid;
				const actions = typeof entry === 'string' ? null : entry.actions;
				fromConfig.set(uid, actions?.length ? [...actions] : [...CONTENT_ACTIONS]);
			}
			return Object.values(strapi.contentTypes)
				.filter((ct) => ct.uid.startsWith('api::'))
				.map((ct) => ({
					uid: ct.uid,
					displayName: ct.info?.displayName || ct.info?.singularName || ct.uid,
					singularName: ct.info?.singularName,
					kind: ct.kind,
					draftAndPublish: ct.options?.draftAndPublish === true,
					configActions: fromConfig.get(ct.uid) ?? null,
				}))
				.sort((a, b) => a.displayName.localeCompare(b.displayName));
		},

		/**
		 * Lists Users & Permissions roles (id, name, type, description).
		 *
		 * @returns {Promise<Array<object>>} Roles, or an empty list without the plugin.
		 */
		async getRoles() {
			if (!strapi.plugin('users-permissions')) return [];
			return strapi.db.query('plugin::users-permissions.role').findMany({
				select: ['id', 'name', 'type', 'description'],
				orderBy: { name: 'asc' },
				limit: 200,
			});
		},
	};
};

export { ROW_KEY, SettingsConflictError, STORE_KEY };
