import { CONTENT_ACTIONS } from '../utils/constants.js';
import { pluginId } from '../utils/pluginId.js';

/**
 * Normalizes the `populate` option of a content type config.
 *
 * @param {'*' | true | string[] | object | undefined} config - Populate config.
 * @returns {'*' | object | undefined} Document Service populate value.
 */
function normalizePopulate(config) {
	if (config === '*' || config === true) return '*';
	if (Array.isArray(config)) return Object.fromEntries(config.map((field) => [field, true]));
	if (config && typeof config === 'object') return config;
	return undefined;
}

/**
 * Builds the watch list from `config.contentTypes` (fixed) merged with the
 * admin setting `events.contentTypes` (editable).
 *
 * @param {import('@strapi/types').Core.Strapi} strapi - Strapi instance.
 * @returns {(uid: string) => { actions: string[], populate: any } | null} Resolver.
 */
function createWatchResolver(strapi) {
	const fromConfig = new Map();
	for (const entry of strapi.config.get(`plugin::${pluginId}.contentTypes`, []) || []) {
		const uid = typeof entry === 'string' ? entry : entry.uid;
		if (!strapi.contentTypes[uid]) {
			strapi.log.warn(`[io] config.contentTypes: unknown content type "${uid}" is ignored.`);
			continue;
		}
		fromConfig.set(uid, {
			actions: typeof entry === 'string' || !entry.actions?.length ? [...CONTENT_ACTIONS] : entry.actions,
			populate: typeof entry === 'string' ? undefined : normalizePopulate(entry.populate),
		});
	}
	const settings = () => strapi.plugin(pluginId).service('settings').current();
	return (uid) => {
		const configured = fromConfig.get(uid);
		if (configured) return configured;
		const actions = settings().events.contentTypes?.[uid];
		if (actions?.length && strapi.contentTypes[uid]) return { actions, populate: undefined };
		return null;
	};
}

/**
 * Runs a callback after the surrounding transaction commits, or on the next
 * tick when there is none.
 *
 * @param {import('@strapi/types').Core.Strapi} strapi - Strapi instance.
 * @param {() => Promise<void>} callback - Work to run.
 */
function afterCommit(strapi, callback) {
	const run = () => {
		setImmediate(() => {
			callback().catch((error) => strapi.log.error(`[io] Emitting a content event failed: ${error?.message}`));
		});
	};
	if (strapi.db?.inTransaction?.()) {
		strapi.db.transaction(({ onCommit }) => onCommit(run));
	} else {
		run();
	}
}

const toPlain = (entry) => JSON.parse(JSON.stringify(entry));

/**
 * Creates the Document Service middleware that turns document actions into
 * socket events: `<singularName>:<action>` for create, update, delete,
 * publish, unpublish and discardDraft.
 *
 * Content types and actions that are not broadcast are still emitted to
 * entity subscribers of the affected documents.
 *
 * Draft versions of draft-and-publish content are only emitted when the
 * setting "Only published content" is off. Delete and unpublish events carry
 * `{ documentId, locale }` only.
 *
 * @param {import('@strapi/types').Core.Strapi} strapi - Strapi instance.
 * @returns {(ctx: { uid: string, action: string, params: object }, next: () => Promise<any>) => Promise<any>} Middleware.
 * @see https://docs.strapi.io/cms/api/document-service/middlewares
 */
function createDocumentEventsMiddleware(strapi) {
	const resolveWatch = createWatchResolver(strapi);

	const emitEntries = async ({ uid, action, entries, watch }) => {
		const contentType = strapi.contentTypes[uid];
		const schema = { uid, singularName: contentType.info.singularName };
		const draftAndPublish = contentType.options?.draftAndPublish === true;
		const { onlyPublished } = strapi.plugin(pluginId).service('settings').current().events;

		if (action === 'delete' || action === 'unpublish') {
			const seen = new Set();
			for (const entry of entries) {
				if (!entry?.documentId) continue;
				const key = `${entry.documentId}:${entry.locale ?? ''}`;
				if (seen.has(key)) continue;
				seen.add(key);
				await strapi.$io.emitIdentifier({ event: action, schema, data: entry, broadcast: watch.broadcast });
			}
			return;
		}

		for (const entry of entries) {
			if (!entry?.documentId) continue;
			const isDraft = draftAndPublish && !entry.publishedAt;
			if (isDraft && onlyPublished) continue;
			let data = entry;
			if (watch.populate) {
				const refetched = await strapi.documents(uid).findOne({
					documentId: entry.documentId,
					...(entry.locale ? { locale: entry.locale } : {}),
					...(draftAndPublish ? { status: isDraft ? 'draft' : 'published' } : {}),
					populate: watch.populate,
				});
				if (refetched) data = refetched;
			}
			await strapi.$io.emit({ event: action, schema, data: toPlain(data), broadcast: watch.broadcast });
		}
	};

	return async (ctx, next) => {
		const result = await next();
		if (!CONTENT_ACTIONS.includes(ctx.action) || !strapi.$io || !result) return result;
		if (ctx.action === 'delete' && !result.entries?.length) return result;
		const entries = Array.isArray(result.entries) ? result.entries : [result];

		const configured = resolveWatch(ctx.uid);
		let watch = configured?.actions.includes(ctx.action) ? { ...configured, broadcast: true } : null;
		// Not broadcast: still emit when a socket follows one of the documents
		// (entity subscriptions). The check is an in-memory lookup.
		if (!watch && strapi.contentTypes[ctx.uid]) {
			const ids = entries.map((entry) => entry?.documentId).filter(Boolean);
			const subscriptions = strapi.plugin(pluginId).service('subscriptions');
			if (subscriptions?.hasSubscribers(ctx.uid, ids)) watch = { populate: undefined, broadcast: false };
		}
		if (!watch) return result;
		afterCommit(strapi, () => emitEntries({ uid: ctx.uid, action: ctx.action, entries, watch }));
		return result;
	};
}

export { afterCommit, createDocumentEventsMiddleware, createWatchResolver, normalizePopulate };
