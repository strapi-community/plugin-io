import assert from 'node:assert/strict';
import test from 'node:test';
import { getClientIp } from '../server/src/utils/client-ip.js';
import { createIpRules, isValidIpOrCidr } from '../server/src/utils/ip-rules.js';
import { createFailureLimiter, createTokenBucket } from '../server/src/services/rate-limit.js';
import { isOriginAllowed, resolveSocketServerOptions } from '../server/src/structures/resolveSocketServerOptions.js';

const req = (forwarded, remote = '10.0.0.1') => ({
  headers: forwarded ? { 'x-forwarded-for': forwarded } : {},
  socket: { remoteAddress: remote },
});

test('client IP ignores X-Forwarded-For unless Strapi trusts the proxy', () => {
  assert.equal(getClientIp(req('1.2.3.4'), { proxy: false }), '10.0.0.1');
  assert.equal(getClientIp(req('1.2.3.4, 5.6.7.8'), { proxy: true }), '1.2.3.4');
  assert.equal(getClientIp(req('spoof, 1.2.3.4, 5.6.7.8'), { proxy: true, maxIpsCount: 1 }), '5.6.7.8');
});

test('IP rules support CIDR, IPv6 and IPv4-mapped addresses', () => {
  const rules = createIpRules({ ipWhitelist: ['192.168.0.0/16', '2001:db8::/32'], ipBlacklist: ['192.168.1.5'] });
  assert.equal(rules('192.168.4.4'), true);
  assert.equal(rules('::ffff:192.168.4.4'), true);
  assert.equal(rules('192.168.1.5'), false);
  assert.equal(rules('2001:db8::1'), true);
  assert.equal(rules('8.8.8.8'), false);
  assert.equal(isValidIpOrCidr('10.0.0.0/33'), false);
  assert.equal(isValidIpOrCidr('nope'), false);
});

test('token bucket and failure limiter', () => {
  let now = 0;
  const allow = createTokenBucket(
    () => 2,
    () => now
  );
  assert.deepEqual([allow(), allow(), allow()], [true, true, false]);
  now = 1000;
  assert.equal(allow(), true);
  const limiter = createFailureLimiter({ maxFailures: 2, windowMs: 1000 });
  limiter.fail('a');
  assert.equal(limiter.isBlocked('a'), false);
  limiter.fail('a');
  assert.equal(limiter.isBlocked('a'), true);
  limiter.clear('a');
  assert.equal(limiter.isBlocked('a'), false);
});

test('server options: destroyUpgrade off, small buffer, origin checks from settings unless configured', () => {
  const settings = { cors: { origins: ['https://app.example.com'] } };
  const options = resolveSocketServerOptions({}, () => settings);
  assert.equal(options.destroyUpgrade, false);
  assert.equal(options.maxHttpBufferSize, 1e5);
  const verdict = (origin, host) =>
    new Promise((resolve) => options.allowRequest({ headers: { origin, host } }, (_e, ok) => resolve(ok)));
  return Promise.all([
    verdict('https://app.example.com').then((ok) => assert.equal(ok, true)),
    verdict('https://evil.example').then((ok) => assert.equal(ok, false)),
    verdict('http://cms.example:1337', 'cms.example:1337').then((ok) => assert.equal(ok, true, 'same-origin admin')),
    verdict(undefined).then((ok) => assert.equal(ok, true, 'non-browser clients')),
  ]).then(() => {
    const configured = resolveSocketServerOptions({ cors: { origin: '*' }, destroyUpgrade: true }, () => settings);
    assert.deepEqual(configured.cors, { origin: '*' });
    assert.equal(configured.destroyUpgrade, true);
    assert.equal(isOriginAllowed('https://x.example', []), true);
  });
});
