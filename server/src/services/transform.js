'use strict';

const { isNil, isPlainObject } = require('lodash/fp');

module.exports = ({ strapi }) => {
	/**
	 * Transform query response data to API format.
	 *
	 * Resolves the full content-type definition from Strapi's registry
	 * so `transformEntry` has access to `attributes` for each field.
	 *
	 * @param {object} param
	 * @param {object} param.data - The raw entity data
	 * @param {object} param.schema - Minimal schema with at least `uid`
	 * @returns {{ data: object, meta: object }}
	 */
	function response({ data, schema }) {
		const contentType = resolveContentType(schema);
		return transformResponse(data, {}, { contentType });
	}

	/**
	 * Resolves a full Strapi content-type definition from a minimal schema
	 * that may only contain `{ singularName, uid }`.
	 *
	 * @param {object} schema - At minimum `{ uid }` or a full content-type
	 * @returns {object|undefined} Full content-type with `attributes`, or undefined
	 */
	function resolveContentType(schema) {
		if (!schema) return undefined;

		// Already a full content-type (has attributes)
		if (schema.attributes) return schema;

		// Resolve by UID from Strapi's content-type registry
		if (schema.uid) {
			return strapi.contentTypes[schema.uid] || undefined;
		}

		return undefined;
	}

	return {
		response,
	};
};

// adapted from https://github.com/strapi/strapi/blob/main/packages/core/strapi/src/core-api/controller/transform.ts
function isEntry(property) {
	return property === null || isPlainObject(property) || Array.isArray(property);
}

function isDZEntries(property) {
	return Array.isArray(property);
}

function transformResponse(resource, meta = {}, opts = {}) {
	if (isNil(resource)) {
		return resource;
	}

	return {
		data: transformEntry(resource, opts?.contentType),
		meta,
	};
}

function transformComponent(data, component) {
	if (Array.isArray(data)) {
		return data.map((datum) => transformComponent(datum, component));
	}

	const res = transformEntry(data, component);

	if (isNil(res)) {
		return res;
	}

	const { id, attributes } = res;
	return { id, ...attributes };
}

function transformEntry(entry, type) {
	if (isNil(entry)) {
		return entry;
	}

	if (Array.isArray(entry)) {
		return entry.map((singleEntry) => transformEntry(singleEntry, type));
	}

	if (!isPlainObject(entry)) {
		throw new Error('Entry must be an object');
	}

	const { id, ...properties } = entry;

	const attributeValues = {};

	for (const key of Object.keys(properties)) {
		const property = properties[key];
		const attribute = type?.attributes?.[key];

		if (attribute && attribute.type === 'relation' && isEntry(property) && 'target' in attribute) {
			const data = transformEntry(property, strapi.contentType(attribute.target));

			attributeValues[key] = { data };
		} else if (attribute && attribute.type === 'component' && isEntry(property)) {
			attributeValues[key] = transformComponent(property, strapi.components[attribute.component]);
		} else if (attribute && attribute.type === 'dynamiczone' && isDZEntries(property)) {
			if (isNil(property)) {
				attributeValues[key] = property;
			}

			attributeValues[key] = property.map((subProperty) => {
				return transformComponent(subProperty, strapi.components[subProperty.__component]);
			});
		} else if (attribute && attribute.type === 'media' && isEntry(property)) {
			const data = transformEntry(property, strapi.contentType('plugin::upload.file'));

			attributeValues[key] = { data };
		} else {
			attributeValues[key] = property;
		}
	}

	return {
		id,
		attributes: attributeValues,
	};
}
