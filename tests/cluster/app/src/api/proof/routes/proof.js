'use strict';

// Test-only routes of the cluster acceptance app (loopback, synthetic data).
module.exports = {
	routes: [
		{ method: 'POST', path: '/proof/join', handler: 'api::proof.proof.join', config: { auth: false } },
		{ method: 'POST', path: '/proof/disconnect', handler: 'api::proof.proof.disconnect', config: { auth: false } },
		{ method: 'POST', path: '/proof/emit', handler: 'api::proof.proof.emit', config: { auth: false } },
	],
};
