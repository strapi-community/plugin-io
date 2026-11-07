// Non-sticky round-robin HTTP balancer with WebSocket upgrade passthrough.
// Like Railway's edge it overwrites X-Real-IP with the client address; for the
// test the client address can be a synthetic one sent in `x-synthetic-client`
// (documentation range IPs only, the header never reaches Strapi).
import http from 'node:http';
import net from 'node:net';

const HOP = new Set(['x-real-ip', 'x-synthetic-client', 'x-forwarded-for']);

export function createBalancer({ upstreams, port, host = '127.0.0.1' }) {
  let next = 0;
  const stats = { http: {}, upgrade: {} };
  const live = new Set();
  const pick = (kind) => {
    const upstream = upstreams[next % upstreams.length];
    next += 1;
    stats[kind][upstream] = (stats[kind][upstream] ?? 0) + 1;
    return upstream;
  };
  const clientIp = (req) => {
    const synthetic = req.headers['x-synthetic-client'];
    return typeof synthetic === 'string' && net.isIP(synthetic) ? synthetic : req.socket.remoteAddress;
  };
  const forwardHeaders = (req) => {
    const out = [];
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      if (!HOP.has(req.rawHeaders[i].toLowerCase())) out.push([req.rawHeaders[i], req.rawHeaders[i + 1]]);
    }
    out.push(['X-Real-IP', clientIp(req)]);
    return out;
  };

  const server = http.createServer((req, res) => {
    const upstream = pick('http');
    const headers = {};
    for (const [k, v] of forwardHeaders(req)) headers[k] = v;
    headers.connection = 'close';
    const proxied = http.request(
      { host: '127.0.0.1', port: upstream, method: req.method, path: req.url, headers, agent: false },
      (up) => {
        res.writeHead(up.statusCode, up.headers);
        up.pipe(res);
      }
    );
    proxied.on('error', () => {
      if (!res.headersSent) res.writeHead(502);
      res.end();
    });
    req.pipe(proxied);
  });

  server.on('upgrade', (req, socket, head) => {
    const upstream = pick('upgrade');
    const target = net.connect(upstream, '127.0.0.1', () => {
      const lines = [`${req.method} ${req.url} HTTP/${req.httpVersion}`];
      for (const [k, v] of forwardHeaders(req)) lines.push(`${k}: ${v}`);
      target.write(`${lines.join('\r\n')}\r\n\r\n`);
      if (head?.length) target.write(head);
      socket.pipe(target).pipe(socket);
    });
    const pair = { socket, target };
    live.add(pair);
    const close = () => {
      live.delete(pair);
      socket.destroy();
      target.destroy();
    };
    socket.on('error', close);
    target.on('error', close);
    socket.on('close', close);
    target.on('close', close);
  });

  return {
    stats,
    /** Starts listening; rejects (for example with EADDRINUSE) instead of throwing an unhandled error. */
    listen: () =>
      new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => {
          server.off('error', reject);
          resolve();
        });
      }),
    /** Cuts every proxied WebSocket, like an edge restart. */
    dropAll() {
      const n = live.size;
      for (const pair of [...live]) {
        pair.socket.destroy();
        pair.target.destroy();
      }
      return n;
    },
    liveCount: () => live.size,
    close: () =>
      new Promise((resolve) => {
        for (const pair of [...live]) pair.socket.destroy();
        server.close(() => resolve());
        server.closeAllConnections?.();
      }),
  };
}
