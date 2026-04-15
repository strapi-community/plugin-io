/**
 * Default sensitive field names that should NEVER be emitted via Socket.IO.
 * These are removed regardless of schema settings.
 */
const DEFAULT_SENSITIVE_FIELDS = [
	'password',
	'resetPasswordToken',
	'confirmationToken',
	'refreshToken',
	'accessToken',
	'secret',
	'apiKey',
	'api_key',
	'privateKey',
	'private_key',
	'token',
	'salt',
	'hash',
];

/**
 * Recursively removes sensitive fields from an object
 * @param {any} data - The data to sanitize
 * @param {string[]} sensitiveFields - List of field names to remove
 * @returns {any} Sanitized data
 */
function removeSensitiveFields(data, sensitiveFields) {
	if (!data || typeof data !== 'object') {
		return data;
	}

	if (Array.isArray(data)) {
		return data.map(item => removeSensitiveFields(item, sensitiveFields));
	}

	const result = {};
	for (const [key, value] of Object.entries(data)) {
		const lowerKey = key.toLowerCase();
		if (sensitiveFields.some(sf => lowerKey === sf.toLowerCase() || lowerKey.includes(sf.toLowerCase()))) {
			continue;
		}

		if (value && typeof value === 'object') {
			result[key] = removeSensitiveFields(value, sensitiveFields);
		} else {
			result[key] = value;
		}
	}

	return result;
}

export default ({ strapi }) => {
	/**
	 * Get list of sensitive fields from plugin settings
	 * @returns {string[]} Combined list of default and custom sensitive fields
	 */
	function getSensitiveFields() {
		const customFields = strapi.config.get('plugin::io.sensitiveFields', []);
		return [...DEFAULT_SENSITIVE_FIELDS, ...customFields];
	}

	/**
	 * Sanitize data output with a provided schema for a specified role.
	 * Uses Strapi's runtime content API sanitizer and additionally
	 * strips sensitive fields.
	 *
	 * @param {object} param
	 * @param {object} param.schema - Content type schema (must have uid)
	 * @param {object} param.data - Data to sanitize
	 * @param {object} param.options - Sanitization options (auth, etc.)
	 * @returns {Promise<object>} Sanitized data
	 */
	async function output({ schema, data, options }) {
		let sanitizedData = data;

		const contentAPISanitize = strapi.contentAPI?.sanitize?.output;
		if (contentAPISanitize) {
			try {
				sanitizedData = await contentAPISanitize(data, schema, options);
			} catch (error) {
				strapi.log.debug(`[socket.io] Content API sanitization failed: ${error.message}`);
			}
		}

		const sensitiveFields = getSensitiveFields();
		sanitizedData = removeSensitiveFields(sanitizedData, sensitiveFields);

		return sanitizedData;
	}

	/**
	 * Sanitize data for raw emit (without schema-based sanitization)
	 * @param {any} data - Data to sanitize
	 * @returns {any} Sanitized data
	 */
	function sanitizeRaw(data) {
		const sensitiveFields = getSensitiveFields();
		return removeSensitiveFields(data, sensitiveFields);
	}

	return {
		output,
		sanitizeRaw,
		getSensitiveFields,
		DEFAULT_SENSITIVE_FIELDS,
	};
};
