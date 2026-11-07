---
description: Reference for strapi.$io in the Strapi Socket.IO plugin - emit, emitIdentifier, raw, room helpers, entity subscriptions, revalidateSockets, server and namespaces, with TypeScript types.
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
await strapi.$io.subscribeToEntity(socketId, uid, documentId); // same checks as subscribe-entity
strapi.$io.unsubscribeFromEntity(socketId, uid, documentId);
strapi.$io.getEntitySubscriptions(socketId);

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

| Method                                      | Returns             | Notes                                                                                                                                                              |
| ------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `joinRoom(socketId, room)`                  | `boolean`           | `false` when the socket is unknown or the room belongs to the plugin. With a multi-server adapter, `true` for a socket on another process means the join was sent. |
| `leaveRoom(socketId, room)`                 | `boolean`           | `false` when the socket is unknown.                                                                                                                                |
| `getSocketsInRoom(room)`                    | `Promise<string[]>` | Socket ids, across instances when an adapter such as Redis is attached.                                                                                            |
| `sendPrivateMessage(socketId, event, data)` | `void`              | Sends `data` as is (no sanitizing).                                                                                                                                |
| `broadcast(socketId, event, data)`          | `void`              | Everyone except `socketId`.                                                                                                                                        |
| `emitToNamespace(namespace, event, data)`   | `void`              | `namespace` with or without the leading slash.                                                                                                                     |
| `disconnectSocket(socketId)`                | `boolean`           | Closes the connection.                                                                                                                                             |

Plugin rooms (`io-role-`, `io-token-`, `io-admin-`, `io-entity-`, `presence:`) cannot be
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

## Entity subscriptions

Clients can follow single entries once _Settings > Socket.IO > Entry
subscriptions_ is on. Each subscription is checked against the read
permission of the client's own role or API token, and every event is
sanitized with those permissions. Subscribers also receive events of content
types and actions that are not broadcast under _Events_; a client that is in
both its role room and an entry room receives each event once.

```js
// client
socket.emit('subscribe-entity', { uid: 'api::article.article', documentId }, (reply) => {
  // { success: true, uid, documentId, id } or { success: false, error }
});
socket.on('article:update', ({ data }) => render(data.attributes));
socket.emit('unsubscribe-entity', { uid: 'api::article.article', documentId });
socket.emit('get-entity-subscriptions', ({ subscriptions }) => console.log(subscriptions));
```

| Error                                                 | Meaning                                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| `Entity subscriptions are disabled`                   | The setting is off.                                                            |
| `Invalid parameters: uid and documentId are required` | `uid` is not an `api::` uid or `documentId` is not a document id.              |
| `Not allowed`                                         | Admin socket, unknown content type, or no `find`/`findOne` for the role/token. |
| `Entity not found`                                    | No such entry (published only, while _Only published content_ is on).          |
| `Maximum subscriptions (n) reached`                   | The per-client limit from the settings.                                        |
| `Rate limit exceeded`                                 | More than ten subscribe requests per second.                                   |

Server code can use the same checks:

| Method                                             | Returns                                                                                                          |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `subscribeToEntity(socketId, uid, documentId)`     | `Promise<{ success, uid, documentId, id } \| { success, error }>`                                                |
| `unsubscribeFromEntity(socketId, uid, documentId)` | `{ success, uid, documentId, id } \| { success, error }` (a Promise for a socket on another process: `await` it) |
| `getEntitySubscriptions(socketId)`                 | `{ success, subscriptions: [{ uid, documentId, id }] }` (a Promise for a socket on another process: `await` it)  |

`emit()` and `emitIdentifier()` accept `broadcast: false` to reach only the
subscribers of `data.documentId`.

## Not part of 6.0

`emitToEntity`, `getEntityRoomSockets`, live preview field events
(`preview:*`) and field-level diffs. See the
[migration guide](../guide/migration.md#_11-restored-changed-and-removed) for
the reasons.

## See also

- [Plugin configuration](/api/plugin-config)
- [Custom events](/examples/events)
- [Socket.IO server API](https://socket.io/docs/v4/server-api/)
