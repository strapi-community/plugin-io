'use strict';
// One "replica" of the cluster acceptance run (scripts/cluster-acceptance.mjs):
// pm2 cluster mode with 4 workers on $PORT. Secrets come from the environment
// of the pm2 CLI, never from this file.
const path = require('node:path');

module.exports = {
  apps: [
    {
      name: `io-${process.env.REPLICA_NAME}`,
      script: path.join(__dirname, 'server.cjs'),
      cwd: __dirname,
      exec_mode: 'cluster',
      instances: 4,
      node_args: ['-r', path.join(__dirname, 'block-egress.cjs')],
      out_file: path.join(__dirname, 'logs', `${process.env.REPLICA_NAME}.out.log`),
      error_file: path.join(__dirname, 'logs', `${process.env.REPLICA_NAME}.err.log`),
      merge_logs: true,
      autorestart: true,
      kill_timeout: 8000,
    },
  ],
};
