---
description: Reference for strapi.$io in the Strapi Socket.IO plugin - emit, emitIdentifier, raw, room helpers, revalidateSockets, server and namespaces, with TypeScript types.
---

# IO class (`strapi.$io`)

The plugin creates one `SocketIO` instance during bootstrap and exposes it as
`strapi.$io`. Use it from services, controllers, lifecycles or cron jobs.

## Quick reference

```js
await strapi.$io.emit({ event, schema, data }); // content event, sanitized per audience
await strapi.$io.emitIdentifier({ event, schema, data: { documentId, locale } });
await strapi.$io.raw({ event, data, rooms }); // custom event, sensitive keys removed

strapi.$io.joinRoom(socketId, room); // false for plugin rooms
strapi.$io.leaveRoom(socketId, room);
await strapi.$io.getSocketsInRoom(room); // socket ids
strapi.$io.sendPrivateMessage(socketId, event, data);
strapi.$io.broadcast(socketId, event, data); // everyone except socketId
strapi.$io.emitToNamespace('chat', event, data);
strapi.$io.disconnectSocket(socketId);
await strapi.$io.revalidateSockets(kinds?, { ids? });

strapi.$io.server; // Socket.IO Server
strapi.$io.namespaces; // { '': Namespace, chat: Namespace }
```

## `emit()`

Sends a content event to every role and API token that may read the content
type (`find` or `findOne`). Each audience receives the entry sanitized with its
own permissions. If sanitizing fails for an audience, that audience is skipped.

```ts
emit(options: { event: string; schema: string | { uid: string; singularName?: string }; data: object }): Promise<number>
```

- The event name is `<singularName>:<event>`, for example `article:update`.
- Returns the number of rooms that received the event. With the default in-memory adapter, rooms without sockets are skipped before sanitizing and not counted.
- The payload is `{ data: { id, attributes }, meta: {} }`.

```js
const entry = await strapi.documents('api::article.article').findOne({ documentId, populate: ['author'] });
await strapi.$io.emit({ event: 'update', schema: 'api::article.article', data: entry });
```

The plugin calls `emit()` itself for watched content types, so you only need
it for content you do not watch or events you build yourself.

## `emitIdentifier()`

Sends `{ data: { documentId, locale? } }` to the audiences that may read the
type. The plugin uses it for `delete` and `unpublish`.

```js
await strapi.$io.emitIdentifier({
  event: 'delete',
  schema: 'api::article.article',
  data: { documentId, locale: 'en' },
});
```

## `raw()`

Sends a custom event as `{ data }`. Keys from the sensitive field list are
removed first. Without `rooms` the event goes to every connected client of the
default namespace.

```ts
raw(options: { event: string; data: unknown; rooms?: string[] }): Promise<void>
```

```js
await strapi.$io.raw({ event: 'maintenance', data: { startsAt: '22:00 UTC' } });
await strapi.$io.raw({ event: 'report:ready', data: { id }, rooms: [`user-${userId}`] });
```

`raw()` does not check permissions. Choose the rooms yourself.

## Room helpers

| Method                                      | Returns             | Notes                                                                   |
| ------------------------------------------- | ------------------- | ----------------------------------------------------------------------- |
| `joinRoom(socketId, room)`                  | `boolean`           | `false` when the socket is unknown or the room belongs to the plugin.   |
| `leaveRoom(socketId, room)`                 | `boolean`           | `false` when the socket is unknown.                                     |
| `getSocketsInRoom(room)`                    | `Promise<string[]>` | Socket ids, across instances when an adapter such as Redis is attached. |
| `sendPrivateMessage(socketId, event, data)` | `void`              | Sends `data` as is (no sanitizing).                                     |
| `broadcast(socketId, event, data)`          | `void`              | Everyone except `socketId`.                                             |
| `emitToNamespace(namespace, event, data)`   | `void`              | `namespace` with or without the leading slash.                          |
| `disconnectSocket(socketId)`                | `boolean`           | Closes the connection.                                                  |

Plugin rooms (`io-role-`, `io-token-`, `io-admin-`, `presence:`) cannot be
joined with `joinRoom()`.

## `revalidateSockets()`

Re-checks authenticated sockets and disconnects those whose credentials are no
longer valid: expired or invalid JWT, blocked user, changed role, revoked
Strapi session, deleted or expired API token, deactivated admin, or an admin
who lost read access to an entry the presence panel has open.

```ts
revalidateSockets(kinds?: Array<'user' | 'token' | 'admin'>, options?: { ids?: Iterable<number | string> }): Promise<number>
```

```js
await strapi.$io.revalidateSockets(); // everything
await strapi.$io.revalidateSockets(['user'], { ids: [userId] }); // one user's sockets
```

Returns the number of disconnected sockets. Sockets are checked in one batch
per kind (one query for all users, one for all tokens, one for all admins).
The plugin already runs this every five minutes and right after users, admins,
API tokens or Strapi sessions change, so you rarely need to call it.

## `server` and `namespaces`

```js
strapi.$io.server.emit('hello', { ok: true }); // the Socket.IO Server, no sanitizing
strapi.$io.server.to('io-role-authenticated').emit('notice', { text: 'Hi' });
Object.keys(strapi.$io.namespaces); // ['', 'chat']
```

Namespaces created with `strapi.$io.server.of('/name')` get the plugin
handshake. Content events go to the default namespace only.

## Monitoring service

Counts only, never IP addresses, emails, tokens or socket ids:

```js
const monitoring = strapi.plugin('io').service('monitoring');
await monitoring.getConnectionStats(); // { connected, rooms, byKind: { admin, user, token, public } }
monitoring.getEventStats(); // { totalEvents, eventsPerSecond, lastEventAt, totalConnections, since }
monitoring.getEventLog(50); // newest first, when the event log is on
```

## Client payloads

```js
socket.on('article:update', ({ data }) => render(data.attributes)); // emit()
socket.on('article:delete', ({ data }) => remove(data.documentId)); // emitIdentifier()
socket.on('maintenance', ({ data }) => banner(data.startsAt)); // raw()
```

## TypeScript

The package ships `types.d.ts` and adds `$io` to `Core.Strapi`:

```ts
import type { SocketIOConfig, SocketData } from '@strapi-community/plugin-io/strapi-server';

const config: SocketIOConfig = { contentTypes: ['api::article.article'] };

const handler = (_ctx: unknown, socket: { data: SocketData }) => {
  if (socket.data.kind === 'user') console.log(socket.data.user?.id);
};
```

## Removed in 6.0

`subscribeToEntity`, `unsubscribeFromEntity`, `getEntitySubscriptions`,
`emitToEntity`, `getEntityRoomSockets` and the client events
`subscribe-entity` / `unsubscribe-entity` were only in an unpublished source
tree; the npm builds 5.4.0 to 5.8.3 did not contain them. Filter content
events by `documentId` on the client instead:

```js
socket.on('article:update', ({ data }) => {
  if (data.attributes.documentId === currentDocumentId) render(data);
});
```

## See also

- [Plugin configuration](/api/plugin-config)
- [Custom events](/examples/events)
- [Socket.IO server API](https://socket.io/docs/v4/server-api/)
