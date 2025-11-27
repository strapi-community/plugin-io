'use strict';

const strategy = require('./strategies');
const sanitize = require('./sanitize');
const transform = require('./transform');

module.exports = {
	sanitize,
	strategy,
	transform,
};
