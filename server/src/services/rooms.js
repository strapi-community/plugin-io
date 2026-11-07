import { API_TOKEN_TYPE } from '../utils/constants.js';
import { toAction } from './strategies.js';

const CACHE_TTL_MS = 10_000;

/**
 * Rooms service: builds the list of audiences (role and API-token rooms) with
 * a Content API ability each, and caches it for a short time so an emit does
 * not query every role and token. The cache is cleared when roles,
 * permissions or tokens change.
 *
 * @param {{ strapi: import('@strapi/types').Core.Strapi }} deps - Strapi instance.
 * @returns {object} Rooms service API.
 */
export default ({ strapi }) => {
	let cache = null;
	let cachedAt = 0;
	let pending = null;

	/**
	 * Builds the audience list.
	 *
	 * @returns {Promise<Array<{ name: string, strategy: object, entry: object, ability: any, fullAccess: boolean, readOnly: boolean }>>} Audiences.
	 */
	async function build() {
		const strategies = strapi.plugin('io').service('strategy');
		const engine = strapi.contentAPI.permissions.engine;
		const audiences = [];

		for (const strategy of [strategies.role, strategies.token]) {
			let entries;
			try {
				entries = await strategy.getRooms();
			} catch (error) {
				strapi.log.warn(`[io] Could not load ${strategy.name} rooms: ${error.message}`);
				continue;
			}
			for (const entry of entries) {
				const actions = (entry.permissions || []).map(toAction).filter(Boolean);
				const ability = await engine.generateAbility(actions.map((action) => ({ action })));
				audiences.push({
					name: strategy.getRoomName(entry),
					strategy,
					entry,
					ability,
					fullAccess: entry.type === API_TOKEN_TYPE.FULL_ACCESS,
					readOnly: entry.type === API_TOKEN_TYPE.READ_ONLY,
				});
			}
		}
		return audiences;
	}

	return {
		/**
		 * Returns the cached audiences, rebuilding them when stale.
		 *
		 * @returns {Promise<Array<object>>} Audiences.
		 */
		async getAudiences() {
			if (cache && Date.now() - cachedAt < CACHE_TTL_MS) return cache;
			if (!pending) {
				pending = build()
					.then((result) => {
						cache = result;
						cachedAt = Date.now();
						return result;
					})
					.finally(() => {
						pending = null;
					});
			}
			return pending;
		},

		/**
		 * Checks whether an audience may read entries of a content type.
		 *
		 * @param {object} audience - Audience from `getAudiences()`.
		 * @param {string} uid - Content type uid.
		 * @returns {boolean} True when the audience has find or findOne.
		 */
		canRead(audience, uid) {
			if (audience.fullAccess || audience.readOnly) return true;
			return audience.ability.can(`${uid}.find`) || audience.ability.can(`${uid}.findOne`);
		},

		/** Clears the audience cache. */
		invalidate() {
			cache = null;
			cachedAt = 0;
		},
	};
};
