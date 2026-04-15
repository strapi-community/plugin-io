import { plugin } from './schema.js';

export default {
	default() {
		return {
			events: [],
			hooks: {},
			contentTypes: [],
			socket: { serverOptions: { cors: { origin: 'http://127.0.0.1:8080', methods: ['GET', 'POST'] } } },
		};
	},
	validator(config) {
		plugin.parse(config);
	},
};
