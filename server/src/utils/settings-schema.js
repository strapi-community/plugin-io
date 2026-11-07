import { z } from 'zod';
import { CONTENT_ACTIONS } from './constants.js';
import { isValidIpOrCidr } from './ip-rules.js';

/** Version of the stored settings document. Version 1 had no `version` key. */
const SETTINGS_VERSION = 2;

/**
 * Defaults for the admin settings stored in core_store (`plugin_io_settings`).
 * Every key here is enforced at runtime; see README "Settings".
 */
const DEFAULT_SETTINGS = Object.freeze({
	version: SETTINGS_VERSION,
	cors: { origins: [] },
	connection: {
		maxConnections: 0,
		pingTimeout: 20000,
		pingInterval: 25000,
		connectionTimeout: 45000,
	},
	security: {
		requireAuthentication: false,
		rateLimiting: { enabled: false, maxEventsPerSecond: 10 },
		ipWhitelist: [],
		ipBlacklist: [],
	},
	events: {
		onlyPublished: true,
		excludeFields: [],
		contentTypes: {},
	},
	rolePermissions: {},
	presence: { enabled: true, showTypingIndicator: true },
	monitoring: {
		enableConnectionLogging: false,
		enableEventLogging: false,
		maxEventLogSize: 100,
	},
});

/**
 * Checks that a value is an exact http(s) origin such as `https://app.example.com`.
 *
 * @param {string} value - Candidate origin.
 * @returns {boolean} True for a bare origin without path, query or credentials.
 */
function isExactOrigin(value) {
	try {
		const url = new URL(value);
		return (url.protocol === 'http:' || url.protocol === 'https:') && url.origin === value;
	} catch {
		return false;
	}
}

const origin = z
	.string()
	.max(255)
	.refine(isExactOrigin, { error: 'Use an origin like https://app.example.com (no path or "*").' });
const ipEntry = z.string().max(64).refine(isValidIpOrCidr, { error: 'Use an IPv4/IPv6 address or a CIDR block.' });
const fieldName = z
	.string()
	.min(1)
	.max(100)
	.regex(/^[A-Za-z0-9_.-]+$/, { error: 'Use letters, numbers, "_", "-" or "."' });
const contentTypeUid = z
	.string()
	.max(200)
	.regex(/^api::[a-z0-9-]+\.[a-z0-9-]+$/, { error: 'Unknown content type.' });
const roleType = z
	.string()
	.max(100)
	.regex(/^[A-Za-z0-9_-]+$/);
const ms = z.number().int().min(1000).max(600000);

const uniqueList = (item, max) =>
	z
		.array(item)
		.max(max)
		.refine((list) => new Set(list).size === list.length, { error: 'Remove duplicate entries.' });

const sections = {
	cors: z.strictObject({ origins: uniqueList(origin, 50) }),
	connection: z.strictObject({
		maxConnections: z.number().int().min(0).max(100000),
		pingTimeout: ms,
		pingInterval: ms,
		connectionTimeout: ms,
	}),
	security: z.strictObject({
		requireAuthentication: z.boolean(),
		rateLimiting: z.strictObject({
			enabled: z.boolean(),
			maxEventsPerSecond: z.number().int().min(1).max(1000),
		}),
		ipWhitelist: uniqueList(ipEntry, 500),
		ipBlacklist: uniqueList(ipEntry, 500),
	}),
	events: z.strictObject({
		onlyPublished: z.boolean(),
		excludeFields: uniqueList(fieldName, 100),
		contentTypes: z.record(contentTypeUid, uniqueList(z.enum(CONTENT_ACTIONS), CONTENT_ACTIONS.length)),
	}),
	rolePermissions: z.record(roleType, z.strictObject({ canConnect: z.boolean() })),
	presence: z.strictObject({ enabled: z.boolean(), showTypingIndicator: z.boolean() }),
	monitoring: z.strictObject({
		enableConnectionLogging: z.boolean(),
		enableEventLogging: z.boolean(),
		maxEventLogSize: z.number().int().min(10).max(1000),
	}),
};

/** Full settings document. */
const settingsSchema = z.strictObject({
	version: z.literal(SETTINGS_VERSION).optional(),
	...sections,
});

/**
 * Body schema for `PUT /io/settings`: every section is optional, so the admin
 * can send the whole form or one section; unknown keys are rejected.
 */
const settingsUpdateSchema = z.strictObject({
	version: z.literal(SETTINGS_VERSION).optional(),
	cors: sections.cors.optional(),
	connection: sections.connection.optional(),
	security: sections.security.optional(),
	events: sections.events.optional(),
	rolePermissions: sections.rolePermissions.optional(),
	presence: sections.presence.optional(),
	monitoring: sections.monitoring.optional(),
});

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Deeply merges plain objects; arrays and scalars from `source` replace `target`.
 *
 * @param {object} target - Base object (not mutated).
 * @param {object} source - Values that win.
 * @returns {object} New merged object.
 */
function deepMerge(target, source) {
	const out = { ...target };
	for (const [key, value] of Object.entries(source || {})) {
		if (isPlainObject(value) && isPlainObject(target?.[key]) && !RECORD_SECTIONS.has(key)) {
			out[key] = deepMerge(target[key], value);
		} else {
			out[key] = structuredClone(value);
		}
	}
	return out;
}

/** Record-valued sections replace instead of merging, so entries can be removed. */
const RECORD_SECTIONS = new Set(['contentTypes', 'rolePermissions']);

/**
 * Maps a version 1 document (plugin 5.x, where settings were stored but not
 * enforced) to version 2. Keys that were never implemented are dropped, and
 * old defaults that would now change runtime behaviour are reset.
 *
 * @param {object} stored - Raw stored document.
 * @returns {object} Version 2 candidate (not yet validated).
 */
function migrateV1(stored) {
	const v1 = isPlainObject(stored) ? stored : {};
	const origins = Array.isArray(v1.cors?.origins) ? v1.cors.origins : [];
	const isOldDefaultOrigins = origins.length === 1 && origins[0] === 'http://localhost:3000';
	const rolePermissions = {};
	for (const [type, value] of Object.entries(v1.rolePermissions || {})) {
		if (isPlainObject(value) && typeof value.canConnect === 'boolean') {
			rolePermissions[type] = { canConnect: value.canConnect };
		}
	}
	return {
		cors: { origins: isOldDefaultOrigins ? [] : origins },
		connection: {
			...v1.connection,
			maxConnections: v1.connection?.maxConnections === 1000 ? 0 : v1.connection?.maxConnections,
		},
		security: v1.security,
		events: {
			onlyPublished: v1.events?.onlyPublished === true ? true : DEFAULT_SETTINGS.events.onlyPublished,
			excludeFields: v1.events?.excludeFields,
		},
		rolePermissions,
		presence: {
			enabled: v1.presence?.enabled,
			showTypingIndicator: v1.presence?.showTypingIndicator,
		},
		monitoring: {
			enableEventLogging: v1.monitoring?.enableEventLogging,
			maxEventLogSize: v1.monitoring?.maxEventLogSize,
		},
	};
}

/**
 * Removes `undefined` values so they do not override defaults during merge.
 *
 * @param {any} value - Any value.
 * @returns {any} Copy without undefined entries.
 */
function compact(value) {
	if (Array.isArray(value)) return value;
	if (!isPlainObject(value)) return value;
	const out = {};
	for (const [key, entry] of Object.entries(value)) {
		if (entry !== undefined) out[key] = compact(entry);
	}
	return out;
}

/**
 * Turns any stored document into a valid version 2 settings object. Sections
 * that fail validation fall back to their defaults, so a corrupt store never
 * disables the plugin.
 *
 * @param {unknown} stored - Raw value from core_store.
 * @param {{ warn?: (msg: string) => void }} [log] - Optional logger.
 * @returns {typeof DEFAULT_SETTINGS} Valid settings.
 */
function normalizeSettings(stored, log) {
	if (!isPlainObject(stored)) return structuredClone(DEFAULT_SETTINGS);
	const candidate = stored.version === SETTINGS_VERSION ? stored : migrateV1(stored);
	const result = { version: SETTINGS_VERSION };
	for (const [key, schema] of Object.entries(sections)) {
		const merged = isPlainObject(DEFAULT_SETTINGS[key])
			? deepMerge(DEFAULT_SETTINGS[key], compact(candidate[key]) || {})
			: candidate[key];
		const parsed = schema.safeParse(merged);
		if (parsed.success) {
			result[key] = parsed.data;
		} else {
			log?.warn?.(`[io] Stored "${key}" settings are invalid and were reset to defaults.`);
			result[key] = structuredClone(DEFAULT_SETTINGS[key]);
		}
	}
	return result;
}

/**
 * Formats zod issues in the shape Strapi uses for validation errors
 * (`details.errors[]` with `path`, `message`, `name`), which the admin's
 * `useAPIErrorHandler` understands.
 *
 * @param {import('zod').ZodError} error - Zod error.
 * @returns {{ errors: Array<{ path: string[], message: string, name: string }> }} Details.
 */
function toValidationDetails(error) {
	return {
		errors: error.issues.map((issue) => ({
			path: issue.path.map(String),
			message: issue.message,
			name: 'ValidationError',
		})),
	};
}

export {
	DEFAULT_SETTINGS,
	SETTINGS_VERSION,
	deepMerge,
	isExactOrigin,
	normalizeSettings,
	settingsSchema,
	settingsUpdateSchema,
	toValidationDetails,
};
