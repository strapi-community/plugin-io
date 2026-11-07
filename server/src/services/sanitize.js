/**
 * Field names that are never emitted, matched exactly (case-insensitive) at
 * any depth. Strapi's Content API sanitizer already removes private and
 * password attributes; this list is a second layer for raw emits and custom
 * fields. Substring matching is not used, so `tokenCount` or an upload's
 * `hash` stay intact.
 */
const DEFAULT_SENSITIVE_FIELDS = Object.freeze([
	'password',
	'passwordHash',
	'resetPasswordToken',
	'registrationToken',
	'confirmationToken',
	'refreshToken',
	'accessToken',
	'secret',
	'secretKey',
	'apiKey',
	'api_key',
	'privateKey',
	'private_key',
	'salt',
]);

const MAX_DEPTH = 20;

/**
 * Error thrown when an entry cannot be sanitized; the caller skips the emit.
 */
class SanitizeError extends Error {
	constructor(message) {
		super(message);
		this.name = 'SanitizeError';
	}
}

/**
 * Recursively removes keys from plain objects and arrays.
 *
 * @param {any} data - Value to clean.
 * @param {Set<string>} blocked - Lower-cased key names to remove.
 * @param {number} [depth] - Current depth.
 * @returns {any} Cleaned copy.
 */
function removeFields(data, blocked, depth = 0) {
	if (!data || typeof data !== 'object' || depth > MAX_DEPTH) return data;
	if (Array.isArray(data)) return data.map((item) => removeFields(item, blocked, depth + 1));
	if (data instanceof Date) return data;
	const result = {};
	for (const [key, value] of Object.entries(data)) {
		if (blocked.has(key.toLowerCase())) continue;
		result[key] = removeFields(value, blocked, depth + 1);
	}
	return result;
}

/**
 * Sanitize service. `output` fails closed: when the content type cannot be
 * resolved or Strapi's sanitizer throws, it throws a `SanitizeError` and the
 * socket layer skips that room instead of emitting raw data.
 *
 * @param {{ strapi: import('@strapi/types').Core.Strapi }} deps - Strapi instance.
 * @returns {object} Sanitize service API.
 */
export default ({ strapi }) => {
	/**
	 * Builds the set of blocked keys from defaults, `config.sensitiveFields`
	 * and the admin setting `events.excludeFields`.
	 *
	 * @returns {Set<string>} Lower-cased key names.
	 */
	function getBlockedFields() {
		const custom = strapi.config.get('plugin::io.sensitiveFields', []) || [];
		const excluded = strapi.plugin('io')?.service('settings')?.current()?.events?.excludeFields || [];
		return new Set([...DEFAULT_SENSITIVE_FIELDS, ...custom, ...excluded].map((f) => String(f).toLowerCase()));
	}

	/**
	 * Returns the field names that are always removed.
	 *
	 * @returns {string[]} Field names.
	 */
	function getSensitiveFields() {
		return [...getBlockedFields()];
	}

	/**
	 * Sanitizes an entry for one audience with Strapi's Content API sanitizer,
	 * then removes blocked fields.
	 *
	 * @param {object} param - Parameters.
	 * @param {{ uid: string }} param.schema - Content type (at least `uid`).
	 * @param {object} param.data - Entry from the Document Service.
	 * @param {object} param.options - Sanitizer options (`auth`).
	 * @returns {Promise<object>} Sanitized entry.
	 * @throws {SanitizeError} When the schema is unknown or sanitizing fails.
	 */
	async function output({ schema, data, options }) {
		const contentType = schema?.attributes ? schema : strapi.contentTypes?.[schema?.uid];
		const sanitizeOutput = strapi.contentAPI?.sanitize?.output;
		if (!contentType) throw new SanitizeError('Unknown content type');
		if (typeof sanitizeOutput !== 'function') throw new SanitizeError('Content API sanitizer unavailable');

		let sanitized;
		try {
			sanitized = await sanitizeOutput(data, contentType, options);
		} catch {
			throw new SanitizeError('Content API sanitization failed');
		}
		return removeFields(sanitized, getBlockedFields());
	}

	/**
	 * Removes blocked fields from data sent with `strapi.$io.raw()`.
	 *
	 * @param {any} data - Data to clean.
	 * @returns {any} Cleaned copy.
	 */
	function sanitizeRaw(data) {
		return removeFields(data, getBlockedFields());
	}

	return { output, sanitizeRaw, getSensitiveFields, DEFAULT_SENSITIVE_FIELDS };
};

export { DEFAULT_SENSITIVE_FIELDS, SanitizeError, removeFields };
