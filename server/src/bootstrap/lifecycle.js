import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

let transactionCtx = null;

/**
 * Gets the transaction context for proper emit timing
 * @returns {object} Transaction context with get() and onCommit() methods
 */
function getTransactionCtx() {
	if (!transactionCtx) {
		try {
			transactionCtx = require('@strapi/database/dist/transaction-context').transactionCtx;
		} catch (error) {
			console.warn('[@strapi-community/plugin-io] Unable to access transaction context:', error.message);
			transactionCtx = { get: () => null, onCommit: () => {} };
		}
	}
	return transactionCtx;
}

/**
 * Schedules a callback to run after the current transaction commits
 * @param {Function} callback - The callback to execute
 * @param {number} delay - Optional delay in ms after commit
 */
function scheduleAfterTransaction(callback, delay = 0) {
	const runner = () => setTimeout(callback, delay);
	const ctx = getTransactionCtx();
	if (ctx.get()) {
		ctx.onCommit(runner);
	} else {
		runner();
	}
}

/**
 * Normalizes populate configuration to Strapi format
 * Supports: '*', true, ['field1', 'field2'], { field: options }
 * @param {string|boolean|array|object} config - The populate configuration
 * @returns {string|object} Normalized populate value for Strapi Document Service
 */
function normalizePopulate(config) {
	if (config === '*' || config === true) {
		return '*';
	}
	
	if (Array.isArray(config)) {
		return config.reduce((acc, field) => {
			acc[field] = true;
			return acc;
		}, {});
	}
	
	if (typeof config === 'object' && config !== null) {
		return config;
	}
	
	return undefined;
}

/**
 * Fetches an entity with populate configuration
 * @param {object} strapi - Strapi instance
 * @param {string} uid - Content type UID
 * @param {string} documentId - Document ID to fetch
 * @param {*} populateConfig - Populate configuration
 * @returns {Promise<object|null>} The populated entity or null
 */
async function fetchWithPopulate(strapi, uid, documentId, populateConfig) {
	if (!documentId) {
		strapi.log.debug(`[socket.io] Cannot fetch without documentId for ${uid}`);
		return null;
	}
	
	try {
		const populate = normalizePopulate(populateConfig);
		const result = await strapi.documents(uid).findOne({
			documentId,
			populate,
		});
		return result;
	} catch (error) {
		strapi.log.debug(`[socket.io] Error fetching with populate for ${uid}:`, error.message);
		return null;
	}
}

/**
 * Bootstrap lifecycles for content type events
 * @param {object} params - Bootstrap parameters
 * @param {object} params.strapi - Strapi instance
 */
async function bootstrapLifecycles({ strapi }) {
	strapi.config.get('plugin::io.contentTypes', []).forEach((ct) => {
		const uid = ct.uid ? ct.uid : ct;
		const populateConfig = ct.populate;
		const hasPopulate = populateConfig !== undefined;

		const subscriber = {
			models: [uid],
		};

		if (!ct.actions || ct.actions.includes('create')) {
			const eventType = 'create';
			subscriber.afterCreate = async (event) => {
				if (!event.result) {
					strapi.log.debug(`[socket.io] No result data in afterCreate for ${uid}`);
					return;
				}
				
				const documentId = event.result?.documentId;
				const modelInfo = { singularName: event.model.singularName, uid: event.model.uid };
				
				scheduleAfterTransaction(async () => {
					try {
						let data;
						
						if (hasPopulate && documentId) {
							data = await fetchWithPopulate(strapi, uid, documentId, populateConfig);
							if (!data) {
								data = JSON.parse(JSON.stringify(event.result));
							}
						} else {
							data = JSON.parse(JSON.stringify(event.result));
						}
						
						strapi.$io.emit({
							event: eventType,
							schema: modelInfo,
							data,
						});
					} catch (error) {
						strapi.log.error(`[socket.io] Could not emit create event for ${uid}:`, error.message);
					}
				}, hasPopulate ? 50 : 0);
			};
			
			subscriber.afterCreateMany = async (event) => {
				const query = buildEventQuery({ event });
				if (query.filters) {
					const clonedQuery = JSON.parse(JSON.stringify(query));
					const modelInfo = { singularName: event.model.singularName, uid: event.model.uid };
					
					if (hasPopulate) {
						clonedQuery.populate = normalizePopulate(populateConfig);
					}
					
					scheduleAfterTransaction(async () => {
						try {
							const records = await strapi.documents(uid).findMany(clonedQuery);
							records.forEach((r) => {
								strapi.$io.emit({
									event: eventType,
									schema: { singularName: modelInfo.singularName, uid: modelInfo.uid },
									data: r,
								});
							});
						} catch (error) {
							strapi.log.debug(`[socket.io] Could not fetch records in afterCreateMany for ${uid}:`, error.message);
						}
					}, 50);
				}
			};
		}

		if (!ct.actions || ct.actions.includes('update')) {
			const eventType = 'update';
			subscriber.afterUpdate = async (event) => {
				if (!event.result) {
					strapi.log.debug(`[socket.io] No result data in afterUpdate for ${uid}`);
					return;
				}
				
				const documentId = event.result?.documentId;
				const modelInfo = { singularName: event.model.singularName, uid: event.model.uid };
				
				scheduleAfterTransaction(async () => {
					try {
						let data;
						
						if (hasPopulate && documentId) {
							data = await fetchWithPopulate(strapi, uid, documentId, populateConfig);
							if (!data) {
								data = JSON.parse(JSON.stringify(event.result));
							}
						} else {
							data = JSON.parse(JSON.stringify(event.result));
						}
						
						strapi.$io.emit({
							event: eventType,
							schema: modelInfo,
							data,
						});
					} catch (error) {
						strapi.log.debug(`[socket.io] Could not emit update event for ${uid}:`, error.message);
					}
				}, hasPopulate ? 50 : 0);
			};
			
			subscriber.beforeUpdateMany = async (event) => {
				if (!event.state.io) {
					event.state.io = {};
				}
				event.state.io.params = event.params;
			};
			
			subscriber.afterUpdateMany = async (event) => {
				const params = event.state.io?.params;
				if (!params || !params.where) return;
				
				const clonedWhere = JSON.parse(JSON.stringify(params.where));
				const modelInfo = { singularName: event.model.singularName, uid: event.model.uid };
				
				const query = {
					filters: clonedWhere,
				};
				if (hasPopulate) {
					query.populate = normalizePopulate(populateConfig);
				}
				
				scheduleAfterTransaction(async () => {
					try {
						const records = await strapi.documents(uid).findMany(query);
						records.forEach((r) => {
							strapi.$io.emit({
								event: eventType,
								schema: { singularName: modelInfo.singularName, uid: modelInfo.uid },
								data: r,
							});
						});
					} catch (error) {
						strapi.log.debug(`[socket.io] Could not fetch records in afterUpdateMany for ${uid}:`, error.message);
					}
				}, 50);
			};
		}

		if (!ct.actions || ct.actions.includes('delete')) {
			const eventType = 'delete';
			subscriber.afterDelete = async (event) => {
				if (!event.result) {
					strapi.log.debug(`[socket.io] No result data in afterDelete for ${uid}`);
					return;
				}
				const deleteData = {
					documentId: event.result?.documentId,
				};

				if (!deleteData.documentId) {
					strapi.log.debug(`[socket.io] No documentId in afterDelete for ${uid}`);
					return;
				}
				const modelInfo = {
					singularName: event.model.singularName,
					uid: event.model.uid,
				};
				
				scheduleAfterTransaction(() => {
					try {
						const eventName = `${modelInfo.singularName}:${eventType}`;
						strapi.$io.raw({
							event: eventName,
							data: deleteData,
						});
					} catch (error) {
						strapi.log.error(`[socket.io] Could not emit delete event for ${uid}:`, error.message);
					}
				}, 100);
			};
		}

		strapi.db.lifecycles.subscribe(subscriber);
	});
}

/**
 * Builds the query object for findMany operations based on lifecycle event
 * @param {object} params - Parameters
 * @param {object} params.event - The lifecycle event
 * @returns {object} Query object with filters and limit
 */
function buildEventQuery({ event }) {
	const query = {};

	if (event.params.where) {
		query.filters = event.params.where;
	}

	if (event.result?.count) {
		query.limit = event.result.count;
	} else if (event.params.limit) {
		query.limit = event.params.limit;
	}

	if (event.action === 'afterCreateMany') {
		const ids = event.result?.ids || [];
		query.filters = { id: { $in: ids } };
	} else if (event.action === 'beforeUpdate') {
		query.fields = ['id'];
	}

	return query;
}

export { bootstrapLifecycles, normalizePopulate };
