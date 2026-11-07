import { pluginId } from '../utils/pluginId.js';

const EVENTS = ['afterCreate', 'afterCreateMany', 'afterUpdate', 'afterUpdateMany', 'afterDelete', 'afterDeleteMany'];
const BATCH_MS = 250;

/**
 * Returns the ids of the rows a lifecycle event changed, or `null` when they
 * are unknown (bulk `*Many` events), which means "check everything".
 *
 * @param {{ action?: string, params?: { where?: any }, result?: any }} event - Database lifecycle event.
 * @returns {Array<number | string> | null} Changed ids or null.
 * @see https://docs.strapi.io/cms/backend-customization/models#lifecycle-hooks
 */
function changedIds(event) {
	if (!event || String(event.action || '').endsWith('Many')) return null;
	const ids = new Set();
	const results = Array.isArray(event.result) ? event.result : [event.result];
	for (const row of results) if (row?.id !== undefined && row?.id !== null) ids.add(row.id);
	const whereId = event.params?.where?.id;
	if (typeof whereId === 'number' || typeof whereId === 'string') ids.add(whereId);
	return ids.size ? [...ids] : null;
}

/**
 * Collects ids for a short time and then runs one revalidation for all of
 * them. A `null` id list (unknown rows) widens the batch to every socket of
 * that kind.
 *
 * @param {(ids: Array<number | string> | null) => void} run - Called with the batched ids.
 * @param {number} [ms] - Batch window.
 * @returns {(ids: Array<number | string> | null) => void} Scheduler.
 */
function batch(run, ms = BATCH_MS) {
	let timer = null;
	let pending = new Set();
	let all = false;
	return (ids) => {
		if (ids === null) all = true;
		else for (const id of ids) pending.add(id);
		clearTimeout(timer);
		timer = setTimeout(() => {
			const next = all ? null : [...pending];
			pending = new Set();
			all = false;
			run(next);
		}, ms);
		timer.unref?.();
	};
}

/**
 * Keeps delivery and connections in sync with Strapi:
 * - role, permission and API-token changes clear the audience cache (who may
 *   read which content type);
 * - user, admin and API-token updates or deletes re-check only the sockets of
 *   the changed rows (bulk changes re-check every socket of that kind).
 *
 * Creating a row never re-checks sockets (nobody can be connected with it
 * yet), and the plugin's own `lastUsedAt` update on API tokens is ignored.
 *
 * Lifecycles run only on the process that wrote the row, so each batch is
 * also sent to the other processes (`revalidate` and `audiences` signals,
 * see `registerClusterSignals`).
 *
 * @param {{ strapi: import('@strapi/types').Core.Strapi }} deps - Strapi instance.
 */
function registerInvalidation({ strapi }) {
	const cluster = () => strapi.plugin(pluginId).service('cluster');
	const localRooms = () => strapi.plugin(pluginId).service('rooms');
	const publishAudiences = batch(() => {
		cluster()
			?.publish('audiences')
			.catch(() => {});
	});
	// Clears this process's cache now and tells the other processes once per batch.
	const rooms = () => ({
		invalidate() {
			localRooms().invalidate();
			publishAudiences(null);
		},
	});
	const revalidator = (kind) =>
		batch((ids) => {
			strapi.$io?.revalidateSockets([kind], ids ? { ids } : {}).catch(() => {});
			cluster()
				?.publish('revalidate', { kind, ids: ids ?? null })
				.catch(() => {});
		});
	const revalidate = { user: revalidator('user'), token: revalidator('token'), admin: revalidator('admin') };

	const isCreate = (event) => String(event?.action || '').startsWith('afterCreate');
	const subscribe = (models, handler) => {
		const subscriber = { models };
		for (const name of EVENTS) subscriber[name] = handler;
		strapi.db.lifecycles.subscribe(subscriber);
	};

	subscribe(['plugin::users-permissions.role', 'plugin::users-permissions.permission'], () => rooms().invalidate());
	subscribe(['admin::api-token-permission'], () => rooms().invalidate());
	subscribe(['admin::api-token'], (event) => {
		const data = event?.params?.data;
		const onlyLastUsed = data && typeof data === 'object' && Object.keys(data).every((key) => key === 'lastUsedAt');
		if (onlyLastUsed && String(event.action || '') === 'afterUpdate') return;
		rooms().invalidate();
		if (!isCreate(event)) revalidate.token(changedIds(event));
	});
	subscribe(['plugin::users-permissions.user'], (event) => {
		if (!isCreate(event)) revalidate.user(changedIds(event));
	});
	subscribe(['admin::user'], (event) => {
		if (!isCreate(event)) revalidate.admin(changedIds(event));
	});
	// Strapi sessions (admin logout, revoked sessions, users-permissions refresh
	// mode): deleting a session re-checks the sockets of that user right away
	// instead of at the next five-minute re-check.
	subscribe(['admin::session'], (event) => {
		if (!String(event?.action || '').startsWith('afterDelete')) return;
		const { origin, userId } = sessionTarget(event);
		const ids = userId === null ? null : [userId];
		if (origin === 'admin' || origin === null) revalidate.admin(ids);
		if (origin === 'users-permissions' || origin === null) revalidate.user(ids);
	});
}

/**
 * Reads which user and origin a session delete affects, from the delete
 * criteria or the deleted row.
 *
 * @param {{ params?: { where?: any }, result?: any }} event - Database lifecycle event.
 * @returns {{ origin: string | null, userId: string | null }} Origin and user id, null when unknown.
 */
function sessionTarget(event) {
	const where = event?.params?.where ?? {};
	const row = Array.isArray(event?.result) ? null : event?.result;
	const pick = (key) => {
		const value = where[key] ?? row?.[key];
		return typeof value === 'string' || typeof value === 'number' ? String(value) : null;
	};
	return { origin: pick('origin'), userId: pick('userId') };
}

const KINDS = new Set(['user', 'token', 'admin']);
const MAX_SIGNAL_IDS = 1000;
/** Counter key of a lockout signal: limiter prefix and SHA-256 hex of the IP. */
const LOCKOUT_KEY = /^(hs|ps):[0-9a-f]{64}$/;

/**
 * Applies the control signals of other processes on this one:
 * - `revalidate` `{ kind, ids }`: re-check the local sockets of those users,
 *   admins or tokens (all of that kind when `ids` is null);
 * - `audiences`: clear the audience cache (roles, permissions, tokens);
 * - `settings`: load a newer settings revision;
 * - `stats-reset`: clear the local monitoring counters;
 * - `lockout` `{ key, until }`: refuse handshakes from an IP (by its hashed
 *   counter key) that reached the failed-handshake limit elsewhere.
 *
 * Payloads come from the plugin's own processes but are still checked, as
 * they pass through the adapter and the signal table.
 *
 * @param {{ strapi: import('@strapi/types').Core.Strapi }} deps - Strapi instance.
 */
function registerClusterSignals({ strapi }) {
	const plugin = () => strapi.plugin(pluginId);
	const cluster = plugin().service('cluster');
	cluster.on('revalidate', async (payload) => {
		const kind = payload?.kind;
		if (!KINDS.has(kind)) return;
		// More ids than the cap: check every socket of that kind instead.
		const ids =
			Array.isArray(payload.ids) && payload.ids.length <= MAX_SIGNAL_IDS
				? payload.ids.filter((id) => typeof id === 'string' || typeof id === 'number')
				: null;
		await strapi.$io?.revalidateSockets([kind], ids ? { ids } : {});
	});
	cluster.on('audiences', () => plugin().service('rooms').invalidate());
	cluster.on('settings', () => plugin().service('settings').refresh());
	cluster.on('stats-reset', () => plugin().service('monitoring').reset());
	cluster.on('lockout', (payload) => {
		const key = payload?.key;
		if (typeof key !== 'string' || !LOCKOUT_KEY.test(key) || !Number.isFinite(payload.until)) return;
		const handshake = strapi.$io?._handshake;
		const limiter = key.startsWith('ps:') ? handshake?.presenceMisses : handshake?.failures;
		limiter?.learn(key, payload.until);
	});
}

export { batch, changedIds, registerClusterSignals, registerInvalidation, sessionTarget };
