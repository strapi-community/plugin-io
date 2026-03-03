'use strict';

/**
 * Diff Service for Socket.IO
 * Calculates field-level differences between old and new data.
 * Enables efficient bandwidth usage by only sending changed fields.
 */
module.exports = ({ strapi }) => {
	/**
	 * Gets diff settings from plugin settings
	 * @returns {object} Diff settings
	 */
	const getDiffSettings = () => {
		const settings = strapi.$ioSettings || {};
		return {
			enabled: settings.fieldLevelChanges?.enabled ?? true,
			includeFullData: settings.fieldLevelChanges?.includeFullData ?? false,
			excludeFields: settings.fieldLevelChanges?.excludeFields ?? ['updatedAt', 'updatedBy', 'createdAt', 'createdBy'],
			maxDiffDepth: settings.fieldLevelChanges?.maxDiffDepth ?? 3,
		};
	};

	/**
	 * Checks if a value is a plain object
	 * @param {*} value - Value to check
	 * @returns {boolean} True if plain object
	 */
	const isPlainObject = (value) => {
		return value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
	};

	/**
	 * Checks if two values are deeply equal
	 * @param {*} a - First value
	 * @param {*} b - Second value
	 * @returns {boolean} True if equal
	 */
	const isEqual = (a, b, depth = 0) => {
		if (a === b) return true;
		if (a === null || b === null) return a === b;
		if (typeof a !== typeof b) return false;
		if (depth > 30) return JSON.stringify(a) === JSON.stringify(b);

		if (a instanceof Date && b instanceof Date) {
			return a.getTime() === b.getTime();
		}

		if (Array.isArray(a) && Array.isArray(b)) {
			if (a.length !== b.length) return false;
			return a.every((item, index) => isEqual(item, b[index], depth + 1));
		}

		if (isPlainObject(a) && isPlainObject(b)) {
			const keysA = Object.keys(a);
			const keysB = Object.keys(b);
			if (keysA.length !== keysB.length) return false;
			return keysA.every((key) => isEqual(a[key], b[key], depth + 1));
		}

		return false;
	};

	/**
	 * Safely clones a value for diff storage
	 * @param {*} value - Value to clone
	 * @returns {*} Cloned value
	 */
	const safeClone = (value) => {
		if (value === null || value === undefined) return value;
		if (value instanceof Date) return value.toISOString();
		if (Array.isArray(value)) return value.map(safeClone);
		if (isPlainObject(value)) {
			const cloned = {};
			for (const [key, val] of Object.entries(value)) {
				cloned[key] = safeClone(val);
			}
			return cloned;
		}
		return value;
	};

	/**
	 * Calculates the diff between old and new data
	 * @param {object} oldData - Previous data state
	 * @param {object} newData - New data state
	 * @param {object} options - Diff options
	 * @returns {object} Diff object with changed fields
	 */
	const calculateDiffInternal = (oldData, newData, options = {}, depth = 0) => {
		const { excludeFields = [], maxDiffDepth = 3 } = options;
		const diff = {};

		if (!oldData || !newData) {
			return { _replaced: true, old: safeClone(oldData), new: safeClone(newData) };
		}

		// Get all keys from both objects
		const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);

		for (const key of allKeys) {
			// Skip excluded fields
			if (excludeFields.includes(key)) continue;

			const oldValue = oldData?.[key];
			const newValue = newData?.[key];

			// Skip if values are equal
			if (isEqual(oldValue, newValue)) continue;

			// Handle nested objects (but not too deep)
			if (isPlainObject(oldValue) && isPlainObject(newValue) && depth < maxDiffDepth) {
				const nestedDiff = calculateDiffInternal(oldValue, newValue, options, depth + 1);
				if (Object.keys(nestedDiff).length > 0) {
					diff[key] = nestedDiff;
				}
			} else {
				// Store old and new values
				diff[key] = {
					old: safeClone(oldValue),
					new: safeClone(newValue),
				};
			}
		}

		return diff;
	};

	return {
		/**
		 * Calculates field-level diff between old and new data
		 * @param {object} oldData - Previous data state
		 * @param {object} newData - New data state
		 * @returns {object} Diff result with changed fields and metadata
		 */
		calculateDiff(oldData, newData) {
			const settings = getDiffSettings();
			
			if (!settings.enabled) {
				return {
					enabled: false,
					hasChanges: !isEqual(oldData, newData),
					diff: null,
					fullData: newData,
				};
			}

			const diff = calculateDiffInternal(oldData, newData, {
				excludeFields: settings.excludeFields,
				maxDiffDepth: settings.maxDiffDepth,
			});

			const changedFields = Object.keys(diff);
			const hasChanges = changedFields.length > 0;

			const result = {
				enabled: true,
				hasChanges,
				changedFields,
				changedFieldCount: changedFields.length,
				diff: hasChanges ? diff : null,
				timestamp: Date.now(),
			};

			// Include full data if configured
			if (settings.includeFullData) {
				result.fullData = newData;
			}

			return result;
		},

		/**
		 * Applies a diff to a target object
		 * @param {object} target - Target object to apply diff to
		 * @param {object} diff - Diff to apply
		 * @returns {object} Updated target object
		 */
		applyDiff(target, diff) {
			if (!diff || typeof diff !== 'object') return target;

			const result = { ...target };

			for (const [key, change] of Object.entries(diff)) {
				if (change._replaced) {
					// Full replacement
					result[key] = change.new;
				} else if (change.old !== undefined && change.new !== undefined) {
					// Simple field change
					result[key] = change.new;
				} else if (isPlainObject(change)) {
					// Nested change
					result[key] = this.applyDiff(result[key] || {}, change);
				}
			}

			return result;
		},

		/**
		 * Validates if a diff is applicable to a content type
		 * @param {string} uid - Content type UID
		 * @param {object} diff - Diff to validate
		 * @returns {object} Validation result
		 */
		validateDiff(uid, diff) {
			if (!diff) {
				return { valid: true, errors: [] };
			}

			const contentType = strapi.contentTypes[uid];
			if (!contentType) {
				return { valid: false, errors: [`Content type ${uid} not found`] };
			}

			const errors = [];
			const attributes = contentType.attributes || {};

			for (const field of Object.keys(diff)) {
				if (!attributes[field] && field !== 'id' && field !== 'documentId') {
					errors.push(`Field '${field}' does not exist in ${uid}`);
				}
			}

			return {
				valid: errors.length === 0,
				errors,
			};
		},

		/**
		 * Creates an event payload with diff information
		 * @param {string} eventType - Event type (create, update, delete)
		 * @param {object} schema - Content type schema info
		 * @param {object} oldData - Previous data (null for create)
		 * @param {object} newData - New data (null for delete)
		 * @returns {object} Event payload with diff
		 */
		createEventPayload(eventType, schema, oldData, newData) {
			const settings = getDiffSettings();
			
			// For create events, no diff needed
			if (eventType === 'create') {
				return {
					event: eventType,
					schema: { singularName: schema.singularName, uid: schema.uid },
					data: newData,
					diff: null,
					timestamp: Date.now(),
				};
			}

			// For delete events, include deleted data
			if (eventType === 'delete') {
				return {
					event: eventType,
					schema: { singularName: schema.singularName, uid: schema.uid },
					data: { id: oldData?.id, documentId: oldData?.documentId },
					deletedData: settings.includeFullData ? oldData : null,
					diff: null,
					timestamp: Date.now(),
				};
			}

			// For update events, calculate diff
			const diffResult = this.calculateDiff(oldData, newData);

			const payload = {
				event: eventType,
				schema: { singularName: schema.singularName, uid: schema.uid },
				documentId: newData?.documentId || newData?.id,
				diff: diffResult.diff,
				changedFields: diffResult.changedFields,
				hasChanges: diffResult.hasChanges,
				timestamp: Date.now(),
			};

			// Include data based on settings
			if (settings.includeFullData || !settings.enabled) {
				payload.data = newData;
			}

			return payload;
		},

		/**
		 * Checks if diff feature is enabled
		 * @returns {boolean} True if enabled
		 */
		isEnabled() {
			return getDiffSettings().enabled;
		},

		/**
		 * Gets current diff settings
		 * @returns {object} Current settings
		 */
		getSettings() {
			return getDiffSettings();
		},
	};
};
