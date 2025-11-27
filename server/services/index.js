'use strict';

const strategy = require('./strategies');
const sanitize = require('./sanitize');
const transform = require('./transform');
const settings = require('./settings');
const monitoring = require('./monitoring');

module.exports = {
	sanitize,
	strategy,
	transform,
	settings,
	monitoring,
};
