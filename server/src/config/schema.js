import z from 'zod';

const Event = z.object({
	name: z.string(),
	handler: z.function(),
});

const InitHook = z.function();

const Hooks = z.object({
	init: InitHook.optional(),
});

const ContentTypeAction = z.enum(['create', 'update', 'delete']);

/**
 * Populate configuration for content type events.
 * Supports multiple formats:
 * - '*' or true: Populate all relations (1 level deep)
 * - string[]: Populate specific relations ['author', 'category']
 * - object: Strapi populate syntax { author: { fields: ['name'] } }
 */
const PopulateConfig = z.union([
	z.literal('*'),
	z.literal(true),
	z.array(z.string()),
	z.record(z.any()),
]);

const ContentType = z.object({
	uid: z.string(),
	actions: z.array(ContentTypeAction).optional(),
	populate: PopulateConfig.optional(),
});

const Socket = z.object({ serverOptions: z.unknown().optional() });

/**
 * Plugin configuration schema
 */
const plugin = z.object({
	events: z.array(Event).optional(),
	hooks: Hooks.optional(),
	contentTypes: z.array(z.union([z.string(), ContentType])),
	socket: Socket.optional(),
	/**
	 * Additional sensitive field names to exclude from emitted data.
	 * These are added to the default list: password, resetPasswordToken,
	 * confirmationToken, refreshToken, accessToken, secret, apiKey, etc.
	 */
	sensitiveFields: z.array(z.string()).optional(),
});

export { plugin, PopulateConfig };
