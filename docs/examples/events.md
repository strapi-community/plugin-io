---
description: Handle your own Socket.IO events in Strapi with config.events. Check who the client is with socket.data.kind, validate input and write with Strapi's APIs.
---

# Custom events

`config.events` registers handlers for events your clients send. The plugin
authenticates the socket first, so every handler can check who is talking.

```js
// config/plugins.js
module.exports = {
  io: {
    enabled: true,
    config: {
      contentTypes: ['api::article.article'],
      events: [
        { name: 'connection', handler: ({ strapi }, socket) => strapi.log.debug(`[io] ${socket.id} connected`) },
        { name: 'ping', handler: (_ctx, socket) => socket.emit('pong', { at: Date.now() }) },
      ],
    },
  },
};
```

## Handler signature

```ts
handler(context: { strapi; io }, socket, ...args): void | Promise<void>
```

| Argument  | What it is                                                                                         |
| --------- | -------------------------------------------------------------------------------------------------- |
| `strapi`  | The Strapi instance.                                                                               |
| `io`      | The plugin wrapper (`strapi.$io`). `io.server` is the Socket.IO `Server`.                          |
| `socket`  | The client's Socket.IO socket.                                                                     |
| `...args` | What the client sent. When the client passes an acknowledgement callback, it is the last argument. |

- The name `connection` runs once for every new socket, with no extra arguments.
- Any other name, including `disconnect`, is registered with `socket.on(name)`.
- Errors thrown in a handler are caught and logged as `[io] Handler for "<name>" failed`. The socket stays connected.
- When _Limit client events_ is on (Settings > Socket.IO), each client may send at most the configured number of events per second.

## Who is the client? (`socket.data`)

Always check `socket.data.kind` before you use an id. A Users & Permissions
user and an admin can have the same numeric id.

| `kind`   | Set by                                      | Keys you can use                                                        |
| -------- | ------------------------------------------- | ----------------------------------------------------------------------- |
| `public` | No token (while authentication is optional) | `socket.data.role` (the Public role)                                    |
| `user`   | Users & Permissions JWT                     | `socket.data.user.id`, `socket.data.user.role`, `socket.data.expiresAt` |
| `token`  | Content API token                           | `socket.data.token.id`, `socket.data.token.type`                        |
| `admin`  | The Content Manager presence panel          | `socket.data.admin.id`, `.firstname`, `.lastname`                       |

Admin presence sockets do **not** run your handlers unless the event sets
`admin: true`:

```js
{ name: 'admin-note', admin: true, handler: ({ strapi }, socket) => strapi.log.info(`Admin ${socket.data.admin.id}`) }
```

The plugin's own rooms are `io-role-<role type>`, `io-token-<token id>`,
`io-admin-<admin id>` and `presence:<uid>:<documentId>`.
`strapi.$io.joinRoom()` refuses them, so a client never ends up in a room it is
not entitled to.

## Update the signed-in user

Accept the event from Users & Permissions users only, validate the payload,
and update the row by id.

```js
{
  name: 'profile:rename',
  async handler({ strapi }, socket, payload, ack) {
    const reply = typeof ack === 'function' ? ack : () => {};
    if (socket.data.kind !== 'user') return reply({ ok: false, error: 'Sign in first' });

    const username = typeof payload?.username === 'string' ? payload.username.trim() : '';
    if (username.length < 3 || username.length > 30) {
      return reply({ ok: false, error: 'Use 3 to 30 characters' });
    }

    await strapi.db
      .query('plugin::users-permissions.user')
      .update({ where: { id: socket.data.user.id }, data: { username } });
    reply({ ok: true });
  },
}
```

Client:

```js
socket.emit('profile:rename', { username: 'ada' }, (result) => console.log(result));
```

`strapi.db.query()` skips Document Service middlewares, so this write does not
emit a content event. Use `strapi.documents()` when you want the plugin to
send one.

## Chat with rooms

Clients join a chat room only after the server checked access. Messages are
saved with the Document Service and sent to the room.

```js
const ROOM_ID = /^[a-z0-9-]{1,40}$/;

module.exports = {
  io: {
    enabled: true,
    config: {
      contentTypes: [],
      events: [
        {
          name: 'chat:join',
          async handler({ strapi }, socket, roomId, ack) {
            const reply = typeof ack === 'function' ? ack : () => {};
            if (socket.data.kind !== 'user' || typeof roomId !== 'string' || !ROOM_ID.test(roomId)) {
              return reply({ ok: false });
            }
            const member = await strapi.documents('api::chat-member.chat-member').findFirst({
              filters: { room: { slug: roomId }, user: { id: socket.data.user.id } },
              fields: ['documentId'],
            });
            if (!member) return reply({ ok: false });
            socket.join(`chat:${roomId}`);
            reply({ ok: true });
          },
        },
        {
          name: 'chat:message',
          async handler({ strapi }, socket, input) {
            const roomId = input?.roomId;
            const text = typeof input?.text === 'string' ? input.text.trim().slice(0, 2000) : '';
            if (socket.data.kind !== 'user' || !text || !socket.rooms.has(`chat:${roomId}`)) return;

            const message = await strapi.documents('api::message.message').create({
              data: { text, roomSlug: roomId, author: socket.data.user.id },
              fields: ['documentId', 'text', 'createdAt'],
            });
            socket.to(`chat:${roomId}`).emit('chat:message', { ...message, authorId: socket.data.user.id });
          },
        },
      ],
    },
  },
};
```

`socket.rooms.has()` makes sure a client only posts to a room it joined through
`chat:join`.

## Typing indicator

Typing events are short-lived, so they are not stored. Throttle them on the
client, for example to one event every two seconds.

```js
{
  name: 'chat:typing',
  handler(_ctx, socket, input) {
    const room = `chat:${input?.roomId}`;
    if (socket.data.kind !== 'user' || !socket.rooms.has(room)) return;
    socket.to(room).emit('chat:typing', { roomId: input.roomId, userId: socket.data.user.id });
  },
}
```

## Online status

Keep online state in memory (or in Redis when you run several instances)
instead of writing to the database on every connect and disconnect.

```js
const online = new Map(); // user id -> number of open sockets

module.exports = {
  io: {
    enabled: true,
    config: {
      contentTypes: [],
      events: [
        {
          name: 'connection',
          handler({ io }, socket) {
            if (socket.data.kind !== 'user') return;
            const id = socket.data.user.id;
            online.set(id, (online.get(id) ?? 0) + 1);
            if (online.get(id) === 1) io.server.to('io-role-authenticated').emit('user:online', { id });
          },
        },
        {
          name: 'disconnect',
          handler({ io }, socket) {
            if (socket.data.kind !== 'user') return;
            const id = socket.data.user.id;
            const left = (online.get(id) ?? 1) - 1;
            if (left > 0) return online.set(id, left);
            online.delete(id);
            io.server.to('io-role-authenticated').emit('user:offline', { id });
          },
        },
      ],
    },
  },
};
```

## Validate input

Treat every client payload as untrusted. A schema library keeps handlers short;
the plugin itself uses [zod 4](https://zod.dev/):

```js
const { z } = require('zod');

const Vote = z.object({ pollId: z.string().regex(/^[a-z0-9]{24}$/), option: z.number().int().min(0).max(9) });

const vote = {
  name: 'poll:vote',
  async handler(_ctx, socket, input, ack) {
    const reply = typeof ack === 'function' ? ack : () => {};
    const parsed = Vote.safeParse(input);
    if (socket.data.kind !== 'user' || !parsed.success) return reply({ ok: false });
    // ...save parsed.data
    reply({ ok: true });
  },
};
```

Do not send error details or stack traces back to the client.

## Test a handler

Handlers are plain functions, so you can call them with a fake socket:

```js
const assert = require('node:assert/strict');
const test = require('node:test');
const rename = require('../config/plugins.js')().io.config.events.find((e) => e.name === 'profile:rename');

test('profile:rename refuses admin sockets', async () => {
  let result;
  const socket = { data: { kind: 'admin', admin: { id: 1 } } };
  await rename.handler({ strapi: {} }, socket, { username: 'ada' }, (r) => (result = r));
  assert.deepEqual(result, { ok: false, error: 'Sign in first' });
});
```

## Checklist

- Check `socket.data.kind` before you use `socket.data.user`.
- Validate the type and length of every payload field.
- Use `strapi.documents()` (Document Service) for content. `strapi.entityService` is deprecated in Strapi 5.
- Answer through the acknowledgement callback instead of throwing.
- Keep high-frequency events (typing, cursors) out of the database.

## See also

- [Plugin configuration](/api/plugin-config): every option of `events` and `hooks`
- [Hooks](/examples/hooks): adapters and middleware
- [IO class](/api/io-class): the `strapi.$io` helpers
