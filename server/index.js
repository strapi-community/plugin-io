'use strict';

const bootstrap = require('./bootstrap');
const config = require('./config');
const controllers = require('./controllers');
const routes = require('./routes');
const services = require('./services');

// Strapi v5 plugin server entry expects a full object of hooks + APIs.
const destroy = async () => {};
const register = async () => {};
const contentTypes = {};
const middlewares = {};
const policies = {};

module.exports = {
	register,
	bootstrap,
	destroy,
	config,
	controllers,
	routes,
	services,
	contentTypes,
	policies,
	middlewares,
};
