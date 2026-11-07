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
  const store = new Map();
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
        return fallback;
      },
    },
    store: () => ({
      get: async ({ key }) => store.get(key) ?? null,
      set: async ({ key, value }) => store.set(key, structuredClone(value)),
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
      lifecycles: { subscribe: () => {} },
      inTransaction: () => false,
      query(uid) {
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
  };
  return strapi;
}
