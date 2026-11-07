// The e2e app's plugin config plus the multi-instance recipe: the Postgres
// adapter and WebSocket only (the balancer has no sticky sessions).
module.exports = () => ({
	io: {
		enabled: true,
		config: {
			contentTypes: [{ uid: 'api::article.article', populate: ['category'] }, 'api::category.category'],
			sensitiveFields: ['internalCode'],
			socket: { adapter: 'postgres', websocketOnly: true },
		},
	},
});
