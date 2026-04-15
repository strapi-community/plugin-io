'use strict';

const bootstrap = require('./bootstrap');
const config = require('./config');
const controllers = require('./controllers');
const routes = require('./routes');
const services = require('./services');

module.exports = {
	bootstrap,
	config,
	controllers,
	routes,
	services,
};
