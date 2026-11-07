const isPlainObject = (value) =>
	value !== null &&
	typeof value === 'object' &&
	(Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const isNil = (value) => value === null || value === undefined;
const isEntry = (value) => value === null || isPlainObject(value) || Array.isArray(value);

/**
 * Transform service: wraps entries in the `{ data: { id, attributes }, meta }`
 * payload format this plugin has always emitted (kept for compatibility).
 *
 * @param {{ strapi: import('@strapi/types').Core.Strapi }} deps - Strapi instance.
 * @returns {{ response: Function }} Transform service API.
 */
export default ({ strapi }) => {
	function transformComponent(data, component) {
		if (Array.isArray(data)) return data.map((datum) => transformComponent(datum, component));
		const res = transformEntry(data, component);
		if (isNil(res)) return res;
		const { id, attributes } = res;
		return { id, ...attributes };
	}

	function transformEntry(entry, type) {
		if (isNil(entry)) return entry;
		if (Array.isArray(entry)) return entry.map((single) => transformEntry(single, type));
		if (!isPlainObject(entry)) return entry;

		const { id, ...properties } = entry;
		const attributes = {};
		for (const [key, property] of Object.entries(properties)) {
			const attribute = type?.attributes?.[key];
			if (attribute?.type === 'relation' && isEntry(property) && 'target' in attribute) {
				attributes[key] = { data: transformEntry(property, strapi.contentTypes[attribute.target]) };
			} else if (attribute?.type === 'component' && isEntry(property)) {
				attributes[key] = transformComponent(property, strapi.components[attribute.component]);
			} else if (attribute?.type === 'dynamiczone' && Array.isArray(property)) {
				attributes[key] = property.map((sub) => transformComponent(sub, strapi.components[sub?.__component]));
			} else if (attribute?.type === 'media' && isEntry(property)) {
				attributes[key] = { data: transformEntry(property, strapi.contentTypes['plugin::upload.file']) };
			} else {
				attributes[key] = property;
			}
		}
		return { id, attributes };
	}

	/**
	 * Transforms a sanitized entry into the emitted payload.
	 *
	 * @param {object} param - Parameters.
	 * @param {object} param.data - Sanitized entry.
	 * @param {{ uid: string }} param.schema - Content type (at least `uid`).
	 * @returns {{ data: object, meta: object } | null | undefined} Payload.
	 */
	function response({ data, schema }) {
		if (isNil(data)) return data;
		const contentType = schema?.attributes ? schema : strapi.contentTypes?.[schema?.uid];
		return { data: transformEntry(data, contentType), meta: {} };
	}

	return { response };
};
