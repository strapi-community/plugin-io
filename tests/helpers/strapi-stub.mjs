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
    service: (uid) => options.coreServices?.[uid],
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
          findMany: async () => {
            if (uid === 'plugin::users-permissions.role') return structuredClone(state.roles);
            if (uid === 'admin::api-token') return structuredClone(state.tokens);
            return [];
          },
          findOne: async ({ where } = {}) => {
            if (uid === 'plugin::users-permissions.role') {
              return state.roles.find((r) => (where.id ? r.id === where.id : r.type === where.type)) ?? null;
            }
            if (uid === 'admin::api-token') return state.tokens.find((t) => t.id === where.id) ?? null;
            if (uid === 'admin::user') return state.admins.find((a) => a.id === where.id) ?? null;
            return null;
          },
          update: async () => ({}),
        };
      },
    },
    server: { httpServer: options.httpServer, app: options.app ?? { proxy: false } },
  };
  return strapi;
}
