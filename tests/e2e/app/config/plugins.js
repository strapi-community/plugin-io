/**
 * Articles and categories are broadcast. Notes are not, so entity
 * subscriptions are the only way to receive their events.
 */
module.exports = () => ({
	io: {
		enabled: true,
		config: {
			contentTypes: [{ uid: 'api::article.article', populate: ['category'] }, 'api::category.category'],
			sensitiveFields: ['internalCode'],
		},
	},
});
