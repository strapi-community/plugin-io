'use strict';

/**
 * Middleware to deeply sanitize sensitive fields from Socket.IO events
 * Removes password hashes, tokens, secrets from all nested objects
 */

const SENSITIVE_FIELDS = [
	'password',
	'passwordHash',
	'resetPasswordToken',
	'registrationToken',
	'confirmationToken',
	'privateKey',
	'secretKey',
	'apiKey',
	'secret',
];

const MAX_SANITIZE_DEPTH = 20;

/**
 * Recursively remove sensitive fields from an object
 * @param {*} obj - Object to sanitize
 * @returns {*} Sanitized object
 */
function deepSanitize(obj, depth = 0) {
	if (!obj || typeof obj !== 'object') {
		return obj;
	}

	if (depth >= MAX_SANITIZE_DEPTH) {
		return obj;
	}

	if (Array.isArray(obj)) {
		return obj.map(item => deepSanitize(item, depth + 1));
	}

	const sanitized = {};
	for (const [key, value] of Object.entries(obj)) {
		if (SENSITIVE_FIELDS.includes(key)) {
			continue;
		}

		if (value && typeof value === 'object') {
			sanitized[key] = deepSanitize(value, depth + 1);
		} else {
			sanitized[key] = value;
		}
	}

	return sanitized;
}

module.exports = ({ strapi }) => {
	// Override the emit method to add sanitization
	const originalEmit = strapi.$io.emit.bind(strapi.$io);

	strapi.$io.emit = async function(params) {
		// Deep sanitize data before emitting
		if (params.data) {
			params.data = deepSanitize(params.data);
		}

		// Call original emit
		return originalEmit(params);
	};

	strapi.log.info('socket.io: Sensitive fields sanitization middleware active');
};

