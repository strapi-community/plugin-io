---
layout: home

hero:
  name: 'Strapi Plugin IO'
  text: 'Real-time Strapi 5, permission-aware'
  tagline: 'Socket.IO events for your content, delivered only to the roles and API tokens that may read it. With admin settings, monitoring and live presence built from the Strapi Design System.'
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: Examples
      link: /examples/
    - theme: alt
      text: Upgrade from 5.x
      link: /guide/migration

features:
  - icon: ⚡
    title: Content events out of the box
    details: create, update, publish, unpublish, discardDraft and delete, one event per locale, sent after the transaction commits.
  - icon: 🔐
    title: Strapi's permissions decide
    details: Each role and API token gets only types it may find, sanitized by Strapi's own Content API sanitizer. Sanitizing fails closed.
  - icon: 🪪
    title: JWT, API tokens, public
    details: Legacy and refresh-mode JWTs, content API tokens and an optional public room. Sockets end when the token, session or role does.
  - icon: 🛡️
    title: Settings that are enforced
    details: Allowed origins, connection cap, IP allow and block lists, per-client event limit, required authentication. Applied without a restart.
  - icon: 📊
    title: Monitoring and widgets
    details: Connected clients, rooms, events per second, admins online, an event log and two native homepage widgets.
  - icon: 👥
    title: Live presence
    details: See which admins have the same entry open in the Content Manager. No emails, Content Manager read permission required.
---

**Strapi Plugin IO** (`@strapi-community/plugin-io`) is a free, MIT-licensed Strapi 5 plugin that runs a Socket.IO server inside Strapi and sends content events only to the roles and API tokens that may read that content.

## Is it the right fit?

Use it when:

- Browsers or apps should hear about created, updated, published or deleted entries without polling.
- Each client may only receive what its role or API token can `find` through the Content API.
- You want connection settings, monitoring and admin presence inside the Strapi admin.

Skip it when:

- You only need server-to-server notifications: Strapi's own webhooks cover that without a WebSocket server.
- Your project runs Strapi 4, or Strapi 5 older than 5.38.

## Quick start

```bash
npm install @strapi-community/plugin-io
```

```js
// config/plugins.js
module.exports = {
  io: { enabled: true, config: { contentTypes: ['api::article.article'] } },
};
```

Give the Public role **find** on Article, then:

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:1337');
socket.on('article:publish', ({ data }) => console.log('Published:', data.attributes.title));
```

[Full getting started guide →](/guide/getting-started)

## Built like a native Strapi screen

Settings and Monitoring live under _Settings > Socket.IO_ and follow the
layout of Strapi's own settings pages: Save in the header, an unsaved-changes
guard, inline validation, confirmation dialogs and RBAC-aware actions, in
light and dark mode and five languages.

<img src="/settings.png" alt="Settings > Socket.IO > Settings" width="1440" height="900" loading="lazy" decoding="async" />

<img src="/monitoring-dark.png" alt="Monitoring in dark mode" width="1440" height="993" loading="lazy" decoding="async" />

<img src="/monitoring-mobile.png" alt="Monitoring at 390 px width" width="390" height="844" loading="lazy" decoding="async" />

The homepage gets two widgets through Strapi's Widget API, and the Content
Manager edit view shows who else is editing.

<img src="/widget.png" alt="Socket.IO homepage widget" width="626" height="350" loading="lazy" decoding="async" />

<img src="/presence.png" alt="Live presence panel in the edit view" width="1440" height="900" loading="lazy" decoding="async" />

Screenshots come from a local test host with synthetic data.

## Who receives what

| Client                  | Joins                 | Receives                                                                  |
| ----------------------- | --------------------- | ------------------------------------------------------------------------- |
| No token                | `io-role-public`      | Types the Public role may `find` (unless authentication is required)      |
| Users & Permissions JWT | `io-role-<role type>` | Types the user's role may `find`                                          |
| Content API token       | `io-token-<id>`       | Read-only and full-access: all watched types; custom: types it may `find` |
| Admin (presence panel)  | `io-admin-<id>`       | Presence only, never content events                                       |

## Security and performance

- Admin routes need an authenticated admin plus the plugin permission. Monitoring responses contain counts and display names only.
- Content events are sanitized per audience; rooms without listeners are skipped before sanitizing.
- Socket re-checks run in one batch per kind (one query for all users, tokens or admins), triggered right away when a user, token, admin or Strapi session changes.
- Strapi's Data Transfer WebSocket (`strapi transfer`) keeps working next to Socket.IO (#112).

## Requirements

- Strapi 5.38 or later (tested with 5.63)
- Node.js 22.21+ or 24.9+ (up to 26)
- Socket.IO 4.8 clients (`socket.io-client`)

## FAQ

### What is @strapi-community/plugin-io?

A free MIT-licensed Socket.IO plugin for Strapi v5 that adds real-time WebSocket events, auth strategies, rooms, Redis scaling, and admin presence on top of Strapi.

### Does plugin-io break strapi transfer?

Older Engine.IO defaults could kill `/admin/transfer` WebSocket upgrades behind reverse proxies. Current versions default `destroyUpgrade` to `false` so Strapi Data Transfer coexists with Socket.IO on the same HTTP server.

### Which Strapi version is supported?

Strapi 5.38 or later on Node.js 22.21+ or 24.9+ (up to 26). Install via npm as `@strapi-community/plugin-io`.

## Community

- [Report an issue](https://github.com/strapi-community/plugin-io/issues)
- [Source on GitHub](https://github.com/strapi-community/plugin-io)
- [Related plugins](/ecosystem)
- [Overview on the Schero94 plugin hub](https://schero94.github.io/plugins/plugin-io/)

---

Made with ❤️ by [@ComfortablyCoding](https://github.com/ComfortablyCoding) and [@hrdunn](https://github.com/hrdunn).
Updated and made better by [@Schero94](https://github.com/Schero94).
