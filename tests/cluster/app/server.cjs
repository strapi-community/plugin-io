'use strict';
// pm2 cluster entry: every worker is a node:cluster worker running Strapi.
const { createStrapi } = require('@strapi/strapi');

createStrapi({ appDir: __dirname, distDir: __dirname }).start();
