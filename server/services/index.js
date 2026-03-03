'use strict';

const strategy = require('./strategies');
const sanitize = require('./sanitize');
const transform = require('./transform');
const settings = require('./settings');
const monitoring = require('./monitoring');
const presence = require('./presence');
const preview = require('./preview');
const diff = require('./diff');

module.exports = {
	sanitize,
	strategy,
	transform,
	settings,
	monitoring,
	presence,
	preview,
	diff,
	security: require('../src/services/security'),
};
