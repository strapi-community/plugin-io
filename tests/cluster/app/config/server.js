module.exports = ({ env }) => ({
	host: '127.0.0.1',
	port: env.int('PORT', 1391),
	url: `http://127.0.0.1:${env.int('PORT', 1391)}`,
	app: { keys: env.array('APP_KEYS') },
	logger: { updates: { enabled: false } },
	// Railway recipe: the edge (here the test balancer) overwrites X-Real-IP.
	proxy: { koa: true, ipHeader: 'X-Real-IP', maxIpsCount: 1 },
});
