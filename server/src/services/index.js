'use strict';

const strategy = require('./strategies');
const sanitize = require('./sanitize');
const transform = require('./transform');
const settings = require('./settings');

module.exports = {
	sanitize,
	strategy,
	transform,
	settings,
};
