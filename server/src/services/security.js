'use strict';

/**
 * Rate limiting service to prevent abuse
 */
module.exports = ({ strapi }) => {
	// Store rate limit data in memory (consider Redis for production)
	const rateLimitStore = new Map();
	const connectionLimitStore = new Map();

	/**
	 * Clean up old entries periodically
	 */
	const cleanupInterval = setInterval(() => {
		const now = Date.now();
		const maxAge = 60 * 1000; // 1 minute

		for (const [key, value] of rateLimitStore.entries()) {
			if (now - value.resetTime > maxAge) {
				rateLimitStore.delete(key);
			}
		}

		for (const [key, value] of connectionLimitStore.entries()) {
			if (now - value.lastSeen > maxAge) {
				connectionLimitStore.delete(key);
			}
		}
	}, 60 * 1000);

	// Cleanup on shutdown
	process.on('SIGTERM', () => clearInterval(cleanupInterval));
	process.on('SIGINT', () => clearInterval(cleanupInterval));

	return {
		/**
		 * Check if request should be rate limited
		 * @param {string} identifier - Unique identifier (IP, user ID, etc.)
		 * @param {Object} options - Rate limit options
		 * @param {number} options.maxRequests - Maximum requests allowed
		 * @param {number} options.windowMs - Time window in milliseconds
		 * @returns {Object} - { allowed: boolean, remaining: number, resetTime: number }
		 */
		checkRateLimit(identifier, options = {}) {
			const { maxRequests = 100, windowMs = 60 * 1000 } = options;
			const now = Date.now();
			const key = `ratelimit_${identifier}`;

			let record = rateLimitStore.get(key);

			if (!record || now - record.resetTime > windowMs) {
				// Create new record or reset expired one
				record = {
					count: 1,
					resetTime: now,
					windowMs,
				};
				rateLimitStore.set(key, record);

				return {
					allowed: true,
					remaining: maxRequests - 1,
					resetTime: now + windowMs,
				};
			}

			// Check if limit exceeded
			if (record.count >= maxRequests) {
				return {
					allowed: false,
					remaining: 0,
					resetTime: record.resetTime + windowMs,
					retryAfter: record.resetTime + windowMs - now,
				};
			}

			// Increment counter
			record.count++;
			rateLimitStore.set(key, record);

			return {
				allowed: true,
				remaining: maxRequests - record.count,
				resetTime: record.resetTime + windowMs,
			};
		},

		/**
		 * Check connection limits per IP/user
		 * @param {string} identifier - Unique identifier
		 * @param {number} maxConnections - Maximum allowed connections
		 * @returns {boolean} - Whether connection is allowed
		 */
		checkConnectionLimit(identifier, maxConnections = 5) {
			const key = `connlimit_${identifier}`;
			const record = connectionLimitStore.get(key);
			const now = Date.now();

			if (!record) {
				connectionLimitStore.set(key, {
					count: 1,
					lastSeen: now,
				});
				return true;
			}

			if (record.count >= maxConnections) {
				strapi.log.warn(`[Socket.IO Security] Connection limit exceeded for ${identifier}`);
				return false;
			}

			record.count++;
			record.lastSeen = now;
			connectionLimitStore.set(key, record);
			return true;
		},

		/**
		 * Release a connection slot
		 * @param {string} identifier - Unique identifier
		 */
		releaseConnection(identifier) {
			const key = `connlimit_${identifier}`;
			const record = connectionLimitStore.get(key);

			if (record) {
				record.count = Math.max(0, record.count - 1);
				if (record.count === 0) {
					connectionLimitStore.delete(key);
				} else {
					connectionLimitStore.set(key, record);
				}
			}
		},

		/**
		 * Validate event name to prevent injection
		 * @param {string} eventName - Event name to validate
		 * @returns {boolean} - Whether event name is valid
		 */
		validateEventName(eventName) {
			// Allow alphanumeric, hyphens, underscores, colons, dots
			const validPattern = /^[a-zA-Z0-9:._-]+$/;
			return validPattern.test(eventName) && eventName.length < 100;
		},

		/**
		 * Get current statistics
		 * @returns {Object} - Statistics object
		 */
		getStats() {
			return {
				rateLimitEntries: rateLimitStore.size,
				connectionLimitEntries: connectionLimitStore.size,
			};
		},

		/**
		 * Clear all rate limit data
		 */
		clear() {
			rateLimitStore.clear();
			connectionLimitStore.clear();
		},
	};
};

