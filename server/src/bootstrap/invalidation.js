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
 * @param {{ strapi: import('@strapi/types').Core.Strapi }} deps - Strapi instance.
 */
function registerInvalidation({ strapi }) {
	const rooms = () => strapi.plugin(pluginId).service('rooms');
	const revalidator = (kind) =>
		batch((ids) => {
			strapi.$io?.revalidateSockets([kind], ids ? { ids } : {}).catch(() => {});
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

export { batch, changedIds, registerInvalidation, sessionTarget };
