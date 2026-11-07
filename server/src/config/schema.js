import { z } from 'zod';
import { CONTENT_ACTIONS } from '../utils/constants.js';

const fn = z.custom((value) => typeof value === 'function', { error: 'Expected a function' });

const Event = z.object({
	name: z.string().min(1),
	handler: fn,
});

const Hooks = z.object({
	init: fn.optional(),
});

const ContentTypeAction = z.enum(CONTENT_ACTIONS);

/**
 * Populate configuration for content type events:
 * - `'*'` or `true`: populate all relations one level deep
 * - `string[]`: populate the listed relations
 * - object: Strapi populate syntax
 */
const PopulateConfig = z.union([z.literal('*'), z.literal(true), z.array(z.string()), z.record(z.string(), z.any())]);

const ContentType = z.object({
	uid: z.string().min(1),
	actions: z.array(ContentTypeAction).optional(),
	populate: PopulateConfig.optional(),
});

const Socket = z.object({ serverOptions: z.record(z.string(), z.any()).optional() });

/** Plugin configuration schema (`config/plugins.js` > `io.config`). */
const plugin = z.object({
	events: z.array(Event).optional(),
	hooks: Hooks.optional(),
	contentTypes: z.array(z.union([z.string().min(1), ContentType])),
	socket: Socket.optional(),
	/** Extra field names that are never emitted, added to the built-in list. */
	sensitiveFields: z.array(z.string()).optional(),
});

export { plugin, PopulateConfig };
