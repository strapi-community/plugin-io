import services from '../../server/src/services/index.js';
import controllers from '../../server/src/controllers/index.js';

/**
 * Minimal ability that allows exactly the listed actions.
 *
 * @param {Array<{ action: string }>} permissions - Permissions.
 * @returns {{ can: (action: string) => boolean }} Ability.
 */
export const abilityFor = (permissions) => {
  const actions = new Set(permissions.map((p) => p.action));
  return { can: (action) => actions.has(action) };
};

/**
 * Creates a Strapi-like object with the real plugin services and in-memory
 * stand-ins for the database, store, config and Content API.
 *
 * @param {object} [options] - Options.
 * @returns {object} Strapi stub with `logs` and `db` state.
 */
export function createStrapi(options = {}) {
  const logs = { info: [], warn: [], error: [], debug: [] };
  /** core_store rows like `strapi_core_store_settings` (id, key, value, type, environment, tag). */
  const coreStore = options.coreStore ?? [];
  // The id sequence lives on the array, so stubs sharing the rows share it (like one table).
  if (coreStore.nextId === undefined) coreStore.nextId = coreStore.reduce((max, row) => Math.max(max, row.id), 0);
  const storeKey = ({ type = 'core', name } = {}, key) => `${type}${name ? `_${name}` : ''}_${key}`;
  const matches = (row, where = {}) =>
    Object.entries(where).every(([field, value]) => {
      if (value && typeof value === 'object' && Array.isArray(value.$in)) return value.$in.includes(row[field]);
      return (row[field] ?? null) === (value ?? null);
    });
  const state = {
    roles: options.roles ?? [
      { id: 1, name: 'Public', type: 'public', permissions: [{ action: 'api::article.article.find' }] },
      { id: 2, name: 'Authenticated', type: 'authenticated', permissions: [{ action: 'api::article.article.create' }] },
    ],
    tokens: options.tokens ?? [],
    users: options.users ?? [],
    admins: options.admins ?? [],
    documents: options.documents ?? [],
    queries: [],
    lifecycles: [],
  };
  const config = {
    events: [],
    hooks: {},
    contentTypes: [],
    sensitiveFields: [],
    socket: { serverOptions: {} },
    ...options.config,
  };
  const contentTypes = options.contentTypes ?? {
    'api::article.article': {
      uid: 'api::article.article',
      kind: 'collectionType',
      info: { singularName: 'article', displayName: 'Article' },
      options: { draftAndPublish: true },
      attributes: { title: { type: 'string' } },
    },
  };

  const instances = new Map();
  const ctrlInstances = new Map();
  const strapi = {
    logs,
    state,
    contentTypes,
    components: {},
    log: Object.fromEntries(Object.keys(logs).map((level) => [level, (msg) => logs[level].push(String(msg))])),
    config: {
      get(path, fallback) {
        if (path === 'plugin::io') return config;
        if (path.startsWith('plugin::io.')) return config[path.slice('plugin::io.'.length)] ?? fallback;
        if (options.globalConfig && path in options.globalConfig) return options.globalConfig[path];
        return fallback;
      },
    },
    store: (scope) => ({
      get: async ({ key }) => {
        const row = coreStore.find((r) => r.key === storeKey(scope, key));
        return row ? JSON.parse(row.value) : null;
      },
      set: async ({ key, value }) => {
        const k = storeKey(scope, key);
        const row = coreStore.find((r) => r.key === k);
        if (row) row.value = JSON.stringify(value);
        else
          coreStore.push({
            id: ++coreStore.nextId,
            key: k,
            value: JSON.stringify(value),
            type: typeof value,
            environment: null,
            tag: null,
          });
      },
    }),
    plugin(name) {
      if (name === 'users-permissions') return options.usersPermissions ?? null;
      if (name !== 'io') return null;
      return {
        service(serviceName) {
          if (!instances.has(serviceName)) instances.set(serviceName, services[serviceName]({ strapi }));
          return instances.get(serviceName);
        },
        controller(controllerName) {
          if (!ctrlInstances.has(controllerName)) {
            ctrlInstances.set(controllerName, controllers[controllerName]({ strapi }));
          }
          return ctrlInstances.get(controllerName);
        },
      };
    },
    service: (uid) => {
      if (options.coreServices?.[uid]) return options.coreServices[uid];
      if (uid === 'admin::permission') {
        return {
          engine: {
            generateUserAbility: async (user) =>
              options.adminAbility ? options.adminAbility(user) : abilityFor(user.permissions ?? []),
          },
        };
      }
      return undefined;
    },
    sessionManager: options.sessionManager,
    getModel: (uid) => (uid === 'admin::api-token' ? { attributes: { kind: {} } } : undefined),
    contentAPI: {
      permissions: { engine: { generateAbility: async (permissions) => abilityFor(permissions) } },
      sanitize: { output: options.sanitizeOutput ?? (async (data) => data) },
    },
    db: {
      lifecycles: { subscribe: (subscriber) => state.lifecycles.push(subscriber) },
      connection: options.knex,
      dialect: options.knex ? { client: options.dialect ?? 'postgres' } : undefined,
      inTransaction: () => false,
      query(uid) {
        if (uid === 'strapi::core-store') {
          return {
            findMany: async ({ where } = {}) =>
              structuredClone(coreStore.filter((r) => matches(r, where)).sort((a, b) => a.id - b.id)),
            findOne: async ({ where } = {}) => structuredClone(coreStore.find((r) => matches(r, where)) ?? null),
            create: async ({ data }) => {
              const row = { id: ++coreStore.nextId, environment: null, tag: null, ...data };
              coreStore.push(row);
              return structuredClone(row);
            },
            updateMany: async ({ where, data }) => {
              let count = 0;
              for (const row of coreStore) {
                if (!matches(row, where)) continue;
                Object.assign(row, data);
                count += 1;
              }
              return { count };
            },
            deleteMany: async ({ where }) => {
              const before = coreStore.length;
              for (let i = coreStore.length - 1; i >= 0; i -= 1)
                if (matches(coreStore[i], where)) coreStore.splice(i, 1);
              return { count: before - coreStore.length };
            },
          };
        }
        return {
          findMany: async ({ where } = {}) => {
            state.queries.push({ uid, op: 'findMany', where });
            const inIds = where?.id?.$in ? new Set(where.id.$in.map(String)) : null;
            const pick = (rows) => structuredClone(inIds ? rows.filter((r) => inIds.has(String(r.id))) : rows);
            if (uid === 'plugin::users-permissions.role') return structuredClone(state.roles);
            if (uid === 'admin::api-token') return pick(state.tokens);
            if (uid === 'admin::user') return pick(state.admins);
            if (uid === 'plugin::users-permissions.user') return pick(state.users);
            return [];
          },
          findOne: async ({ where } = {}) => {
            state.queries.push({ uid, op: 'findOne', where });
            if (uid === 'plugin::users-permissions.role') {
              return state.roles.find((r) => (where.id ? r.id === where.id : r.type === where.type)) ?? null;
            }
            if (uid === 'admin::api-token') return state.tokens.find((t) => t.id === where.id) ?? null;
            if (uid === 'admin::user') return state.admins.find((a) => a.id === where.id) ?? null;
            const doc = state.documents.find(
              (d) =>
                d.uid === uid &&
                d.documentId === where?.documentId &&
                (!where?.publishedAt?.$notNull || Boolean(d.publishedAt))
            );
            return doc ? { id: doc.id ?? 1 } : null;
          },
          update: async () => ({}),
        };
      },
    },
    server: { httpServer: options.httpServer, app: options.app ?? { proxy: false } },
    /** Fires the database lifecycle subscribers for a model (like Strapi after a write on this process). */
    async fireLifecycle(model, action, event) {
      for (const subscriber of state.lifecycles) {
        if (subscriber.models?.includes(model)) await subscriber[action]?.({ action, model: { uid: model }, ...event });
      }
    },
  };
  strapi.coreStore = coreStore;
  return strapi;
}
