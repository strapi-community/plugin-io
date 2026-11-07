---
description: Copy-paste examples for the Strapi Socket.IO plugin - live content lists, notifications, chat, presence and React, Vue and Next.js clients.
---

# Examples

Short, working examples. Each one assumes Strapi 5, the plugin installed and
the role or token used by the client allowed to **find** the content type.

- [Content types](/examples/content-types): which events are sent and how to shape them
- [Custom events](/examples/events): handle events your clients send
- [Hooks](/examples/hooks): Redis adapter, middleware, namespaces

## Live article list

```js
// config/plugins.js
module.exports = {
  io: { enabled: true, config: { contentTypes: ['api::article.article'] } },
};
```

```js
// browser
import { io } from 'socket.io-client';

const socket = io('https://cms.example.com');

socket.on('article:publish', ({ data }) => upsert(data.id, data.attributes));
socket.on('article:update', ({ data }) => upsert(data.id, data.attributes));
socket.on('article:unpublish', ({ data }) => remove(data.documentId));
socket.on('article:delete', ({ data }) => remove(data.documentId));
```

`publish`, `update`, `create` and `discardDraft` carry the sanitized entry as
`{ data: { id, attributes }, meta }`. `unpublish` and `delete` carry
`{ data: { documentId, locale? } }`.

## Signed-in users only

Users & Permissions JWTs put the client in the room of its role, so it
receives what that role may read.

```js
const socket = io('https://cms.example.com', {
  // a function runs on every (re)connect, so a refreshed token is used
  auth: (cb) => cb({ strategy: 'jwt', token: getJwt() }),
});

socket.on('connect_error', (error) => console.warn(error.message)); // "Authentication failed"
```

Turn on _Require authentication_ in _Settings > Socket.IO_ to refuse clients
without a token.

## Server-to-server with an API token

```js
const socket = io('https://cms.example.com', {
  auth: { strategy: 'api-token', token: process.env.STRAPI_READ_TOKEN },
});
socket.on('order:create', ({ data }) => fulfil(data));
```

Read-only and full-access content API tokens receive every watched content
type; custom tokens receive the types they may `find` or `findOne`.

## Notify one user

```js
// config/plugins.js: put each signed-in user in a personal room
events: [
  {
    name: 'connection',
    handler(_ctx, socket) {
      if (socket.data.kind === 'user') socket.join(`user-${socket.data.user.id}`);
    },
  },
],
```

```js
// anywhere in Strapi, e.g. a service
strapi.$io.server.to(`user-${userId}`).emit('notification', { text: 'Your export is ready' });
```

For a payload that might contain secrets, use `strapi.$io.raw({ event, data, rooms })`,
which removes sensitive keys first.

## Broadcast a maintenance notice

```js
await strapi.$io.raw({ event: 'maintenance', data: { startsAt: '22:00 UTC' } });
```

Without `rooms` the event goes to every connected client.

## Chat, typing and online status

See [Custom events](/examples/events) for a chat with access-checked rooms,
a typing indicator and online status.

## Content Manager presence

Nothing to code: the plugin adds a _Live presence_ panel to the edit view that
shows which other admins have the same entry open. Admins only see entries of
content types they may read. Turn it off in _Settings > Socket.IO > Live presence_.

## React

```tsx
import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

export function useArticles(url: string, getToken?: () => string | undefined) {
  const [articles, setArticles] = useState<Record<number, unknown>>({});

  useEffect(() => {
    const socket: Socket = io(url, {
      auth: (cb) => {
        const token = getToken?.();
        cb(token ? { strategy: 'jwt', token } : {});
      },
    });
    const upsert = ({ data }: { data: { id: number; attributes: unknown } }) =>
      setArticles((prev) => ({ ...prev, [data.id]: data.attributes }));
    socket.on('article:publish', upsert);
    socket.on('article:update', upsert);
    return () => {
      socket.disconnect();
    };
  }, [url, getToken]);

  return articles;
}
```

## Vue 3

```ts
import { onBeforeUnmount, ref } from 'vue';
import { io } from 'socket.io-client';

export function useArticles(url: string) {
  const articles = ref<Record<number, unknown>>({});
  const socket = io(url);
  const upsert = ({ data }: { data: { id: number; attributes: unknown } }) => {
    articles.value = { ...articles.value, [data.id]: data.attributes };
  };
  socket.on('article:publish', upsert);
  socket.on('article:update', upsert);
  onBeforeUnmount(() => socket.disconnect());
  return { articles };
}
```

## Next.js (App Router)

Socket.IO clients run in the browser, so use them in a client component:

```tsx
'use client';
import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useRouter } from 'next/navigation';

export function LiveRefresh() {
  const router = useRouter();
  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_STRAPI_URL!);
    socket.on('article:publish', () => router.refresh());
    return () => {
      socket.disconnect();
    };
  }, [router]);
  return null;
}
```

If the site and Strapi run on different origins, add the site's origin under
_Settings > Socket.IO > Allowed origins_.

## Test an integration

```js
const assert = require('node:assert/strict');
const test = require('node:test');
const { io } = require('socket.io-client');

test('a published article reaches the public role', async () => {
  const socket = io(process.env.STRAPI_URL, { transports: ['websocket'] });
  const event = new Promise((resolve) => socket.once('article:publish', resolve));
  await publishTestArticle(); // your helper, e.g. a REST call with an API token
  const { data } = await event;
  assert.equal(data.attributes.title, 'Test article');
  socket.close();
});
```

## Need help?

Open an issue on [GitHub](https://github.com/strapi-community/plugin-io/issues)
with your Strapi version, plugin version and the smallest config that shows the
problem.
