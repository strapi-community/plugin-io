'use strict';

const { z } = require('zod');

const Event = z.object({
	name: z.string(),
	handler: z.function(),
});

const InitHook = z.function();

const Hooks = z.object({
	init: InitHook.optional(),
});

const ContentTypeAction = z.enum(['create', 'update', 'delete']);

const ContentType = z.object({
	uid: z.string(),
	actions: z.array(ContentTypeAction),
});

const Socket = z.object({ serverOptions: z.unknown().optional() });

const plugin = z.object({
	events: z.array(Event).optional(),
	hooks: Hooks.optional(),
	contentTypes: z.array(z.union([z.string(), ContentType])),
	socket: Socket.optional(),
});

module.exports = {
	plugin,
};
