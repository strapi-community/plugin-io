---
description: Install the Strapi 5 Socket.IO plugin, watch a content type and receive your first live event in under a minute.
---

# Getting started

From `npm install` to your first live event in about a minute.

## Requirements

|                     | Version                                                  |
| ------------------- | -------------------------------------------------------- |
| Strapi              | 5.13 or later (tested with 5.61)                         |
| Node.js             | 22.21+ or 24.9+ (up to 26, like Strapi 5.61)             |
| Users & Permissions | Optional. Needed for user JWTs and the Public role room. |

For Strapi 4 use version 2.x of the plugin.

## 1. Install

::: code-group

```bash [npm]
npm install @strapi-community/plugin-io
```

```bash [yarn]
yarn add @strapi-community/plugin-io
```

```bash [pnpm]
pnpm add @strapi-community/plugin-io
```

:::

## 2. Watch a content type

::: code-group

```js [config/plugins.js]
module.exports = () => ({
  io: {
    enabled: true,
    config: {
      contentTypes: ['api::article.article'],
    },
  },
});
```

```ts [config/plugins.ts]
export default () => ({
  io: {
    enabled: true,
    config: {
      contentTypes: ['api::article.article'],
    },
  },
});
```

:::

Restart Strapi (`npm run develop`).

## 3. Allow reading

Clients receive what they may read through the REST API. For a quick test,
give the **Public** role the **find** permission for Article in
_Settings > Users & Permissions plugin > Roles > Public_.

## 4. Listen

```bash
npm install socket.io-client
```

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:1337');

socket.on('connect', () => console.log('connected', socket.id));
socket.on('article:publish', ({ data }) => console.log('published', data.attributes.title));
socket.on('article:delete', ({ data }) => console.log('deleted', data.documentId));
```

Publish an article in the Content Manager and watch the event arrive.

::: tip Browser on another origin?
A page served from another origin (for example `http://localhost:3000`) must be
listed under _Settings > Socket.IO > Settings > Allowed origins_. Node scripts
and mobile apps send no `Origin` header and are not affected.
:::

## Authenticate clients

```js
// Users & Permissions JWT: the client joins its role's room
const socket = io(url, { auth: (cb) => cb({ strategy: 'jwt', token: getJwt() }) });

// Content API token (read-only, full-access or custom)
const socket = io(url, { auth: { strategy: 'api-token', token: process.env.STRAPI_TOKEN } });
```

A function for `auth` runs on every reconnect, so a refreshed JWT is picked up.
Turn on _Require authentication_ to refuse clients without a token. Failed
handshakes only ever see `Authentication failed`.

## What you get in the admin

- **Settings > Socket.IO > Settings**: origins, limits, security, content events, roles, presence and monitoring. Changes apply without a restart.
- **Settings > Socket.IO > Monitoring**: connected clients, rooms, events per second, admins online and the recent event log.
- **Homepage widgets**: _Socket.IO_ counters and _Admins online_ (Strapi 5.13+).
- **Live presence** in the Content Manager edit view.

Super Admins see everything. Grant the plugin's permissions to other roles in
_Settings > Administration panel > Roles > Plugins > IO_.

![Settings > Socket.IO > Settings](/settings.png)

## Troubleshooting

**Nothing arrives.** Check that the role or token has `find` on the content
type, that the content type is watched, and, with Draft & Publish, that you
listen to `:publish` (drafts are not sent while _Only published content_ is on).

**`connect_error: Authentication failed`.** The JWT or token is invalid,
expired or belongs to a blocked user. After 20 failures from one IP within a
minute, that IP is locked out for the rest of the minute.

**Browser shows a CORS error or a 400/403 on `/socket.io/`.** Add the page's
origin under _Allowed origins_.

**`strapi transfer` stopped working.** Upgrade to 6.0; see the
[README troubleshooting](https://github.com/strapi-community/plugin-io#troubleshooting) for #112.

## Next steps

- [Content types](/examples/content-types): actions, populate, payloads
- [Custom events](/examples/events): handle client events safely
- [Plugin configuration](/api/plugin-config): every option
- [Migration guide](/guide/migration): upgrading from 5.x
