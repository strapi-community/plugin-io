module.exports = ({ env }) => ({
	host: '127.0.0.1',
	port: env.int('PORT', 1357),
	url: `http://127.0.0.1:${env.int('PORT', 1357)}`,
	app: { keys: env.array('APP_KEYS') },
	logger: { updates: { enabled: false } },
});
