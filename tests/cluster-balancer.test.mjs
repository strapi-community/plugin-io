/**
 * The round-robin balancer used by scripts/cluster-acceptance.mjs: a busy
 * port rejects listen() instead of crashing the run with an unhandled error.
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { test } from 'node:test';
import { createBalancer } from '../scripts/cluster/balancer.mjs';

test('balancer listen() rejects with EADDRINUSE when the port is taken', async () => {
  const holder = createServer();
  await new Promise((resolve) => holder.listen(0, '127.0.0.1', resolve));
  const { port } = holder.address();
  try {
    const balancer = createBalancer({ upstreams: [port], port });
    await assert.rejects(balancer.listen(), { code: 'EADDRINUSE' });
  } finally {
    await new Promise((resolve) => holder.close(resolve));
  }
});

test('balancer listen() resolves on a free port and closes again', async () => {
  const probe = createServer();
  await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const { port } = probe.address();
  await new Promise((resolve) => probe.close(resolve));
  const balancer = createBalancer({ upstreams: [port], port });
  await balancer.listen();
  await balancer.close();
});
