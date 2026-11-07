import { CONTENT_ACTIONS } from '../utils/constants.js';
import { DEFAULT_SETTINGS, deepMerge, normalizeSettings } from '../utils/settings-schema.js';

const STORE_KEY = 'plugin_io_settings';

/**
 * Settings service: reads and writes the admin settings in core_store and
 * keeps an in-memory snapshot (`current()`) that the socket layer reads on
 * every handshake and emit, so changes apply without a restart.
 *
 * @param {{ strapi: import('@strapi/types').Core.Strapi }} deps - Strapi instance.
 * @returns {object} Settings service API.
 */
export default ({ strapi }) => {
	let snapshot = structuredClone(DEFAULT_SETTINGS);
	const listeners = new Set();

	const getStore = () => strapi.store({ type: 'plugin', name: 'io' });

	return {
		/**
		 * Loads the stored settings into the snapshot. Called once at bootstrap.
		 *
		 * @returns {Promise<object>} The normalized settings.
		 */
		async load() {
			const stored = await getStore().get({ key: STORE_KEY });
			snapshot = normalizeSettings(stored, strapi.log);
			return snapshot;
		},

		/**
		 * Returns the in-memory settings snapshot (no database access).
		 *
		 * @returns {typeof DEFAULT_SETTINGS} Current settings.
		 */
		current() {
			return snapshot;
		},

		/**
		 * Reads the stored settings, normalized to the current version.
		 *
		 * @returns {Promise<object>} Settings.
		 */
		async getSettings() {
			return this.load();
		},

		/**
		 * Returns the settings a validated update would produce, without saving
		 * them (used by the settings import preview).
		 *
		 * @param {object} update - Body already validated by `settingsUpdateSchema`.
		 * @returns {Promise<object>} Resulting settings.
		 */
		async preview(update) {
			const base = await this.load();
			const { version: _version, ...rest } = update || {};
			return normalizeSettings(deepMerge(base, rest), strapi.log);
		},

		/**
		 * Merges a validated partial update into the stored settings, persists the
		 * result and notifies subscribers (the socket layer re-applies options).
		 *
		 * @param {object} update - Body already validated by `settingsUpdateSchema`.
		 * @returns {Promise<object>} The saved settings.
		 * @sideeffect Writes core_store key `plugin_io_settings`.
		 */
		async setSettings(update) {
			const next = await this.preview(update);
			await getStore().set({ key: STORE_KEY, value: next });
			snapshot = next;
			for (const listener of listeners) {
				try {
					listener(next);
				} catch (error) {
					strapi.log.error(`[io] Applying settings failed: ${error.message}`);
				}
			}
			return next;
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

export { STORE_KEY };
