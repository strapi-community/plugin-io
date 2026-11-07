## [Unreleased]

The next release is a major version (6.0.0): it contains breaking changes. See "Migration" below.

### Bug Fixes

* **cluster:** the plugin works with several processes on one database, for example two Railway replicas with a pm2 cluster of four workers each, without sticky sessions. Admin presence tokens are stored hashed in the database and work exactly once on any process (before, a token issued on one process failed on the others and each miss counted as a failed login of the IP). Settings carry a revision and are saved with compare-and-swap, so concurrent saves no longer overwrite each other and every process applies a new revision within seconds. Revoking a user, admin, session or API token disconnects its sockets on every process. Presence editor lists, the failed-handshake lockout, `maxConnections` and the monitoring totals cover all processes: a lockout is announced to every process, the connection cap re-reads the other processes' counts at most every poll interval, and saves without a revision retry the compare-and-swap up to ten times. Settings only move forward to newer revisions, also when refreshes overlap, and control signals whose ids commit out of order are still delivered. Verified with Strapi 5.61 on two pm2 cluster daemons of four workers each (8 processes) on PostgreSQL behind a non-sticky round-robin balancer.

* **socket:** Strapi Data Transfer works again behind proxies. Engine.IO's `upgrade` listener stopped Node from passing `/admin/transfer/runner/*` upgrades to Strapi, so they timed out (504/524). The plugin wraps the HTTP server's `shouldUpgradeCallback` (Node.js 22.21+ / 24.9+) so Node accepts upgrades only on the Socket.IO path and every other request (including `POST` with an `Upgrade: h2c` header and a body) reaches Strapi untouched. Closes #112.
* **lifecycle:** stopping or restarting Strapi closes the sockets with `transport close`, so socket.io-client reconnects by itself. Before, clients got `io server disconnect` and stayed offline; with a multi-server adapter, stopping one process (for example during `pm2 reload`) also disconnected the clients of every other process.
* **lifecycle:** `destroy()` no longer closes Strapi's HTTP server and releases every timer, so shutdown and `strapi ts:generate-types` exit (#109).
* **events:** content events use the Document Service middleware. Publishing emits `:publish` instead of `:delete` plus `:create`, populated refetches use the same locale and status, and delete emits one event per locale.
* **security:** Content API sanitizing fails closed. If sanitizing an entry fails, that audience is skipped instead of receiving the raw entry (class of #111). Sensitive keys are matched exactly, so `tokenCount` or an upload `hash` are no longer dropped.
* **security:** delete events are no longer broadcast to every client.
* **security:** presence events are accepted only from admin sockets, require Content Manager read permission for the content type, and no longer expose admin emails or socket ids.
* **security:** admin routes require new plugin permissions (`settings.read`, `settings.update`, `monitoring.read`, `monitoring.manage`).
* **security:** API-token handshakes reject admin-kind tokens, room names use the token id and the role type, `isReadScope` is defined, and failed handshakes return one generic message.
* **security:** the handshake uses Strapi's proxy settings for the client IP, does not count anonymous connections as failures, and applies to custom namespaces.
* **security:** authenticated sockets are re-checked and disconnected when the JWT expires, the user is blocked or changes role, the API token is deleted or the admin is deactivated.
* **security:** `POST /io/presence/session` keeps at most five unused tokens per admin (the oldest is dropped) and answers `429` when 10,000 are pending. Tokens store the admin id and Strapi session id only, not the request's permission object, so one admin can no longer exhaust server memory.
* **security:** admin presence sockets end when the admin logs out or the Strapi session expires or is revoked. Their permissions are reloaded on every re-check, and an admin who lost read access to an open entry is disconnected. In users-permissions refresh mode, sockets end when their session is revoked, and the JWT expiry is read from the token so sockets also end when it expires.
* **security:** deleting a Strapi session (logout, revoke) re-checks that user's or admin's sockets right away instead of at the next five-minute check.
* **security:** an empty "Allowed origins" list now refuses foreign browser origins for WebSocket as well as polling. Same-origin requests, the `server.url` / `admin.url` origins and clients without an `Origin` header stay allowed.
* **security:** admin presence sockets keep their identity in `socket.data.admin` instead of `socket.data.user`, and `config.events` handlers skip them unless the event sets `admin: true`, so handlers written for Users & Permissions ids cannot act on an admin id.
* **monitoring:** "Admins online" (page and widget) no longer names entries in content types the viewer may not read in the Content Manager; they are counted instead.
* **hooks:** `hooks.init` runs before the plugin handshake again (as in 5.x) and receives `{ strapi, $io, io }`, so documented examples that use `io.server` work.
* **performance:** content events skip rooms without sockets before sanitizing, and the delivered count only includes rooms with listeners. Socket re-checks run in one batch per kind (one query for all users, tokens or admins) instead of several queries per socket.
* **performance:** a changed user, admin or API token re-checks only that identity's sockets, in every namespace. Role and permission changes only refresh the delivery cache, and the plugin's own `lastUsedAt` update no longer triggers a re-check. Measured with 200 sockets: 427 queries per unrelated user update before, 0 after.
* **settings:** every admin setting is now enforced (origins, connection cap, ping and timeouts, required authentication, client event rate limit, IP allow and block lists, per-role connect permission, draft handling, excluded fields, presence, monitoring). Settings that were never implemented were removed.
* **settings:** `PUT /io/settings` validates a strict schema and returns 400 with field paths. `@strapi/utils` is now a declared dependency, so the error is Strapi's own `ValidationError` instead of a bundled copy that produced 500s.
* **monitoring:** statistics, event log and admins online report real values and never contain IP addresses, emails, tokens or socket ids. Test events refuse reserved, content and presence names.
* **admin:** the presence panel reconnects with a fresh one-time token, and the stats widget no longer shows zeros.
* **admin:** the Live presence panel opens one socket per edit view. The Content Manager mounts side panels twice; the first mount used to spend a session token and close a connecting WebSocket, which logged a browser warning.
* **admin:** the homepage widgets follow the native ones: "Socket.IO" is laid out like "Project statistics" (bordered grid of link cells with tinted icons) and "Admins online" like "Last edited entries" (rows open the entry, ghost edit button). The widget icon takes the native grey.
* **api:** the scaffold route `GET /api/io`, which answered 500, is removed.
* **types:** `types.d.ts` matches the runtime API and is published through `types` and the `strapi-server` export. New: `SocketData`, the `admin` flag on events and the `io` alias in `hooks.init`.
* **admin:** the connected-clients breakdown uses plural forms ("1 user", "2 users") in all five languages.
* **docs:** the examples, configuration reference, IO class reference and migration guide were rewritten against the 6.0 code: no `socket.data.userId`, non-existent services, `eventPrefix` or `entityService` calls.

### Features

* **cluster:** `socket.adapter` configures the Socket.IO adapter: `'postgres'` (`@socket.io/postgres-adapter` on its own pool of 2 connections, using Strapi's PostgreSQL connection), `{ type: 'redis' }` (`@socket.io/redis-adapter` with `ioredis`) or a function. The packages are optional peer dependencies. When the Postgres adapter loses its LISTEN connection (database restart, failover, `idle_session_timeout`), the process keeps running, logs the error and resumes cross-process delivery after the adapter reconnects. `socket.websocketOnly: true` turns off long-polling. `config.cluster` (`enabled: 'auto'`, `pollInterval`, `heartbeatInterval`) tunes the coordination, which turns on by itself with an adapter, in pm2 cluster mode or on Railway; one plain process keeps the in-memory behaviour.
* **cluster:** warnings at boot for several processes without an adapter, long-polling with several processes and Railway without `server.proxy.koa`; the Monitoring page shows the first one and how many processes its totals add up.
* **admin:** a concurrent settings save opens a dialog with "Load latest settings" instead of overwriting the other administrator's changes (`PUT /io/settings` answers `409` for a stale `revision`). Closing the dialog returns focus to Save, or to the page title while Save is disabled.
* **server:** `joinRoom`, `leaveRoom`, `disconnectSocket`, `subscribeToEntity`, `unsubscribeFromEntity` and `getEntitySubscriptions` reach sockets on other processes through the adapter. They look the id up first and act only on the socket with exactly that id, so a room name passed as `socketId` never selects the sockets of that room. `subscribeToEntity` always returns a Promise; the others return one for a socket on another process, so `await` them. `maxPerSocket` holds for parallel calls made on one process.

* **subscriptions:** entity subscriptions are back, rebuilt on the per-audience delivery. Clients send `subscribe-entity` with `{ uid, documentId }` (`{ uid, id }` still works), `unsubscribe-entity` and `get-entity-subscriptions`; server code can call `strapi.$io.subscribeToEntity()`, `unsubscribeFromEntity()` and `getEntitySubscriptions()`. Each subscription needs read permission of the client's own role or API token and an existing entry, the payload is sanitized with that audience's permissions at every emit, and read permission is checked again on every event. Subscribers also receive events of content types and actions that are not broadcast. Off by default; turn it on under Settings > Socket.IO > Entry subscriptions (limit per client 1 to 1,000, default 100).
* **admin:** settings export and import are back. Export downloads the saved settings as JSON (no secrets). Import checks the file with the server's strict schema (`POST /io/settings/validate`, needs `settings.update`), lists the changed values in a confirmation dialog and fills the form; nothing is stored until Save.
* **admin:** on/off settings use the native Strapi boolean input, as on Settings > Users & Permissions > Advanced settings: a TRUE/FALSE toggle under its label with the description below, one per row. The label names the input, so clicking it or pressing Space changes the value. Per-role "Can connect" is a checkbox per table row, like the grants in the native role permission matrices. The import preview shows booleans in the admin language.
* **events:** new actions `publish`, `unpublish` and `discardDraft`; content types and actions can also be chosen in the admin settings.
* **admin:** Settings, Monitoring, homepage widgets and the Live presence panel were rebuilt with the Strapi Design System 2 following native Strapi patterns (Save in the header, unsaved-changes guard, inline validation, confirmation dialogs, loading, empty and error states, RBAC-aware links and pages, five languages). The settings cards keep the native card padding at every width, down to 320 px.
* **api:** `strapi.$io.emitIdentifier()`, `revalidateSockets()`, `namespaces`, and `emit()` accepts a content type uid.

### Chores

* Dependencies updated to their latest versions: socket.io and socket.io-client 4.8.4, zod 4.6.7 (fixes GHSA-mrhx-c7xc-m3w5), @strapi/strapi and @strapi/utils 5.61.0, @strapi/sdk-plugin 6.1.1, Design System and icons 2.2.4, styled-components 6.6.0, ESLint 10, semantic-release 25. `date-fns` and the implicit `lodash` use were removed. TypeScript stays on 5.9 because react-intl 6 (Strapi's admin version) only accepts TypeScript up to 5.
* Node.js engines are `^22.21.0 || >=24.9.0 <=26.x.x` (Strapi 5.61's range, from the releases that have `shouldUpgradeCallback`); peers are `@strapi/strapi ^5.38.0` and Design System/icons `^2.2.0`. 5.38.0 is the first Strapi release whose admin ships Design System 2.2 (5.37.1 ships 2.1.2, 5.13 ships 2.0.0-rc.23), so the two ranges no longer contradict each other.
* `@strapi/design-system`, `@strapi/icons` and `react-intl` are optional peers: every Strapi app gets them from `@strapi/admin`, so installs no longer warn about them (yarn 1 printed three "unmet peer dependency" warnings; npm 11 and pnpm 9/10 printed none before or after) and no second copy is installed. The multi-instance adapters (`@socket.io/postgres-adapter`, `@socket.io/redis-adapter`, `pg`, `ioredis`) stay optional and silent.
* `package.json`: plain description, keywords for Strapi 5, Socket.IO and WebSockets, `repository.url` normalized by `npm pkg fix`. The stale root `api-reference.json` (5.0 API, not published) was removed.
* `npm run test:cluster` (`scripts/cluster-acceptance.mjs`) runs the 8-process acceptance on PostgreSQL behind a non-sticky balancer; see CONTRIBUTING.md. Its connection-cap check now waits until every process has written and re-read a heartbeat, instead of a fixed 11 s that was shorter than the 13 s staleness window and failed 1 of 5 runs.
* CI pins the PostgreSQL service image by digest (`postgres:16.15-alpine@sha256:…`).
* The legacy `server/` tree, the root `strapi-server.js`/`strapi-admin.js` shims, unreachable admin components and the manual root test scripts were removed. `dist/` is no longer tracked; `package-lock.json` is.
* semantic-release folds this `[Unreleased]` section into the release notes and removes it from CHANGELOG.md (`scripts/release-unreleased.mjs`), so no stale block is left behind.
* Dev-tree npm overrides to patched releases: `nodemailer` ^10.3.1, `zod` ^4.6.7 under `koa-body` and `@hono/node-server` ^2.1.6 under `@modelcontextprotocol/node` (71 advisories with 5 high before, 67 with 3 high after). The remaining ones have no compatible fix and are listed in the migration guide; none of them is in the published package (`npm audit --omit=dev` is clean).
* `npm run test:e2e`: Playwright 1.65 browser regression suite for Settings, Monitoring, the homepage widgets, 390 px, dark mode and read-only RBAC, run against a real Strapi app. The Socket.IO forwarding tests use a real Koa app, including `POST` bodies with an `Upgrade` header.
* CI `e2e` job (Node 22 and 24): `scripts/e2e-app.mjs` scaffolds a Strapi 5.61 app with SQLite, synthetic content types and the packed plugin, and runs the Playwright admin suite and the new socket/API suite (`tests/e2e/socket.e2e.mjs`). The app installs from a committed lockfile (`tests/e2e/app/package-lock.json`) with lifecycle scripts off, except `npm rebuild better-sqlite3`. Run it locally with `npm run build && npm run test:e2e:app`.
* The Allowed origins hint in the settings matches the enforced rule (five languages).
* ESLint 10 flat config, Prettier check, `node --test` suite and published-types check; CI on Node 22 and 24, hardened release workflow (SHA-pinned actions, lockfile install without scripts, npm OIDC with `NPM_TOKEN` fallback and provenance), Dependabot with verified auto-merge.

### Migration

* **Read permission decides delivery.** Roles and API tokens receive events for content types they may `find` or `findOne`. Grant read permissions where you relied on create or update permissions.
* **Publish events.** Listen to `:publish`, `:unpublish` and `:discardDraft` instead of the `:delete` plus `:create` pair. If `config.contentTypes[].actions` limits actions, add the new ones you need.
* **Drafts** are not sent by default. Turn off "Only published content" in the settings to send them.
* **Room names.** API-token rooms are `io-token-<id>` and custom role rooms are `io-role-<role type>`. `io-role-public` and `io-role-authenticated` are unchanged.
* **Settings.** Stored 5.x settings are migrated on the first start: keys that were never implemented are dropped, the old default origin `http://localhost:3000` and the old default limit of 1000 connections are reset. Review the settings after upgrading because they are now enforced.
* **Permissions.** Grant the new plugin permissions to non-Super-Admin roles that need the Socket.IO pages.
* **Removed APIs:** the `security` service and `GET /api/io`. Live preview field events (`preview:*`), field-level diffs and the Redis toggle are not part of 6.0; see the migration guide for the reasons and replacements.
* **Entity subscriptions** are off until you turn them on in the settings. Clients now pass the `documentId`; numeric ids are not accepted. Rooms are named `io-entity-<audience>|<uid>|<documentId>` and cannot be joined with `joinRoom()`.
* **Message size.** `maxHttpBufferSize` defaults to 100 KB; set it in `socket.serverOptions` if clients send larger messages.
* **Strapi 5.38 or later** is required (Design System 2.2 in the admin). Upgrade Strapi before the plugin.
* **Node.js 22.21+ or 24.9+** is required (`shouldUpgradeCallback`, see #112). Node.js 22.0 to 22.20 and 23 are not supported, and the 400 answer for upgrade requests with a body on older versions is gone.
* **Allowed origins.** An empty list now means "same origin only" for WebSocket too. Add every browser frontend origin under Settings > Socket.IO > Allowed origins.
* **Admin sockets.** Presence sockets carry `socket.data.admin` (not `socket.data.user`) and do not run `config.events` handlers unless the event sets `admin: true`. Check `socket.data.kind` in your handlers.
* **hooks.init** runs before the plugin handshake and receives `{ strapi, $io, io }`. Middleware you add there runs before authentication, so `socket.data.kind` is not set yet; use a `connection` event for logic that needs the authenticated client.
* **Presence tokens.** `POST /io/presence/session` can answer `429` when 10,000 tokens are pending server-wide.
* **Several processes.** If you attached a Redis adapter in `hooks.init`, it keeps working; you can switch to `socket.adapter`. Add `socket.websocketOnly: true` and `transports: ['websocket']` in clients when there are no sticky sessions. With coordination on, the plugin creates four tables (`plugin_io_presence_tokens`, `plugin_io_counters`, `plugin_io_nodes`, `plugin_io_signals`) on first start; size `database.connection.pool.max` for the extra adapter connections (README "Running several instances").
* **Socket data.** `socket.data.adminAbility` and `socket.data.clientIp` are gone, so they are not sent to other servers by `fetchSockets()`.
* **Service API.** `presence.createSessionToken()`, `consumeSessionToken()` and `size()` return Promises. `monitoring.getConnectionStats()` returns the totals of all processes.

## [5.8.3](https://github.com/strapi-community/plugin-io/compare/5.8.2...5.8.3) (2026-08-02)


### Bug Fixes

* **socket:** stop Engine.IO from killing Strapi transfer upgrades ([5111a74](https://github.com/strapi-community/plugin-io/commit/5111a74ca447f7d80e691509f00623e4ec03906b)), closes [#112](https://github.com/strapi-community/plugin-io/issues/112)

## [5.8.2](https://github.com/strapi-community/plugin-io/compare/5.8.1...5.8.2) (2026-04-28)


### Bug Fixes

* **sanitize:** resolve full content-type before passing to Content API ([#111](https://github.com/strapi-community/plugin-io/issues/111)) ([47155b6](https://github.com/strapi-community/plugin-io/commit/47155b6980946bb1b0d9a4e8beb24b06d9fd2b54)), closes [#110](https://github.com/strapi-community/plugin-io/issues/110)

## [5.8.1](https://github.com/strapi-community/plugin-io/compare/5.8.0...5.8.1) (2026-04-16)


### Bug Fixes

* six runtime bugs from deep audit ([f29143e](https://github.com/strapi-community/plugin-io/commit/f29143e087534201acf03d2f2a752e3c6e58845a))

# [5.8.0](https://github.com/strapi-community/plugin-io/compare/5.7.1...5.8.0) (2026-04-16)


### Features

* **settings:** make field-level highlighting opt-in via settings ([4b7f047](https://github.com/strapi-community/plugin-io/commit/4b7f047586cdcb67a2ae11bcf9e05715ea853289))

## [5.7.1](https://github.com/strapi-community/plugin-io/compare/5.7.0...5.7.1) (2026-04-16)


### Bug Fixes

* **presence:** field injection not working - fix field name matching ([af4ed2c](https://github.com/strapi-community/plugin-io/commit/af4ed2c5534e0c1387974aa6d590c6bd0513114d))

# [5.7.0](https://github.com/strapi-community/plugin-io/compare/5.6.0...5.7.0) (2026-04-16)


### Features

* **presence:** show editor name label next to avatar dot on fields ([845b285](https://github.com/strapi-community/plugin-io/commit/845b2850d1642f37decd13f5bf58d0225f252a92))

# [5.6.0](https://github.com/strapi-community/plugin-io/compare/5.5.0...5.6.0) (2026-04-16)


### Features

* **presence:** field-level visual presence with border + avatar dot ([e9988cf](https://github.com/strapi-community/plugin-io/commit/e9988cf84a2a224b3b68842411d7758b76be521b))

# [5.5.0](https://github.com/strapi-community/plugin-io/compare/5.4.4...5.5.0) (2026-04-16)


### Features

* **presence:** server-side presence tracking with content context ([9978bfe](https://github.com/strapi-community/plugin-io/commit/9978bfefb67f899d8da944f34f71526fae9dd2fb))

## [5.4.4](https://github.com/strapi-community/plugin-io/compare/5.4.3...5.4.4) (2026-04-15)


### Bug Fixes

* **handshake:** store user data in socket.data for online-users widget ([044f044](https://github.com/strapi-community/plugin-io/commit/044f044ebb21665bb78165ea6f7d4bef66a30f3c))
* **widgets:** add missing /online-users route and fix /stats URL ([88a813e](https://github.com/strapi-community/plugin-io/commit/88a813e48c866060fea857c727c681121f20719b))
* **widgets:** match online-users response to widget expected format ([3fa7203](https://github.com/strapi-community/plugin-io/commit/3fa720369f45ca31ec1d98d63e2bb4e99689a501))
* **widgets:** null-safe rendering in OnlineEditorsWidget ([bf0e129](https://github.com/strapi-community/plugin-io/commit/bf0e1295f5ca0ce75b17f098a36cd02a7da1546c))

## [5.4.3](https://github.com/strapi-community/plugin-io/compare/5.4.2...5.4.3) (2026-04-15)


### Bug Fixes

* **config:** use double-colon namespace notation for plugin config ([755d25c](https://github.com/strapi-community/plugin-io/commit/755d25cb46b56ef2cf091451ae16c90da2ec432e))

## [5.4.2](https://github.com/strapi-community/plugin-io/compare/5.4.1...5.4.2) (2026-04-15)


### Bug Fixes

* multiple crash bugs and resource leaks ([6da602a](https://github.com/strapi-community/plugin-io/commit/6da602a4ef3558b23626188596166725fe3db963))

## [5.4.1](https://github.com/strapi-community/plugin-io/compare/5.4.0...5.4.1) (2026-04-15)


### Bug Fixes

* **stats:** guard adapter.rooms access when no clients connected ([2209635](https://github.com/strapi-community/plugin-io/commit/22096359fb3987d28925423f96429c8718644215))

# [5.4.0](https://github.com/strapi-community/plugin-io/compare/5.3.7...5.4.0) (2026-04-15)


### Bug Fixes

* **sanitize:** use runtime strapi.contentAPI instead of static import ([3c9bb6e](https://github.com/strapi-community/plugin-io/commit/3c9bb6e3ef5d6f70713365715790003d76d31bf3))


### Features

* **build:** migrate server to ESM for sdk-plugin v6 / Vite 6 ([d1d97bd](https://github.com/strapi-community/plugin-io/commit/d1d97bd77138df26080b0f1085ced2f1fbe5b114))

## [5.3.7](https://github.com/strapi-community/plugin-io/compare/5.3.6...5.3.7) (2026-04-15)


### Bug Fixes

* **transform:** resolve full content-type schema to prevent crash ([#110](https://github.com/strapi-community/plugin-io/issues/110)) ([cd5deff](https://github.com/strapi-community/plugin-io/commit/cd5deff0ada6ac6d607d5b46abb8db9b6ecc97c5))

## [5.3.6](https://github.com/strapi-community/plugin-io/compare/5.3.5...5.3.6) (2026-03-03)


### Bug Fixes

* **security:** require auth for presence events and fix zod 3.25 interop ([a880763](https://github.com/strapi-community/plugin-io/commit/a8807630ca843a80ea3b826a43b676819f9aeebe))

## [5.3.5](https://github.com/strapi-community/plugin-io/compare/5.3.4...5.3.5) (2026-03-03)


### Bug Fixes

* **lifecycle:** populate relations in emitted events ([#82](https://github.com/strapi-community/plugin-io/issues/82)) ([dcdfc9f](https://github.com/strapi-community/plugin-io/commit/dcdfc9f8c901af6c7a60e6c35b52431f1b00242b))

## [5.3.4](https://github.com/strapi-community/plugin-io/compare/5.3.3...5.3.4) (2026-03-03)


### Bug Fixes

* **standards:** enforce coding rules and add Zod validation ([632c6e1](https://github.com/strapi-community/plugin-io/commit/632c6e18406685d52adf78d71448e6badc11bbef))

## [5.3.3](https://github.com/strapi-community/plugin-io/compare/5.3.2...5.3.3) (2026-03-03)


### Bug Fixes

* **security:** patch 25 vulnerabilities across Socket.IO plugin ([0fa0d78](https://github.com/strapi-community/plugin-io/commit/0fa0d787f8a1d89dbecd21df4b26645ead09fbe3))

## [5.3.2](https://github.com/strapi-community/plugin-io/compare/5.3.1...5.3.2) (2026-02-02)


### Bug Fixes

* **admin-strategy:** add missing getRooms and verify methods ([0fe8aef](https://github.com/strapi-community/plugin-io/commit/0fe8aefe78b43a22a98af89f983211d6be58badb))

## [5.3.1](https://github.com/strapi-community/plugin-io/compare/5.3.0...5.3.1) (2025-12-29)


### Bug Fixes

* readme update ([1d55244](https://github.com/strapi-community/plugin-io/commit/1d552442ae8314686b5f1c7d6a3ffb08b8a31717))

# [5.3.0](https://github.com/strapi-community/plugin-io/compare/5.2.0...5.3.0) (2025-12-28)


### Features

* add Who's Online dashboard widget showing active editors ([2104597](https://github.com/strapi-community/plugin-io/commit/21045977b932f54345e17d541934f55713219988))
* add Who's Online dashboard widget with clickable entry links ([14117e0](https://github.com/strapi-community/plugin-io/commit/14117e0d464a6bed1a529a18ca9f8ccb4585695f))

# [5.2.0](https://github.com/strapi-community/plugin-io/compare/5.1.0...5.2.0) (2025-12-28)


### Bug Fixes

* admin users now properly authenticated instead of showing anonymous ([6478777](https://github.com/strapi-community/plugin-io/commit/647877731f2d529d550b05740aea2547a0ada6f2))


### Features

* enhanced session token security with hashing, rate limiting, and auto-refresh ([88631ed](https://github.com/strapi-community/plugin-io/commit/88631ed3f83ef6c43d6908782f3f8d99a27606bf))

# [5.1.0](https://github.com/strapi-community/plugin-io/compare/5.0.6...5.1.0) (2025-12-28)


### Features

* add Live Presence System with typing indicators ([29390fb](https://github.com/strapi-community/plugin-io/commit/29390fb0406ea70f009f26ee646dfc9c1b0bf8ad))

## [5.0.6](https://github.com/strapi-community/plugin-io/compare/5.0.5...5.0.6) (2025-12-28)


### Bug Fixes

* correct version to 5.0.5 and add tagFormat for existing tags ([bdcaee2](https://github.com/strapi-community/plugin-io/commit/bdcaee2808214200e07014e6cee3469bca467934))
* migrate to semantic-release and fix date-fns v4 ESM compatibility ([31a3e05](https://github.com/strapi-community/plugin-io/commit/31a3e0531398702c0d8fbdadde87119a07b7c23d))
* remove package-lock.json to fix cross-platform SWC native binding issues ([d3715ff](https://github.com/strapi-community/plugin-io/commit/d3715ff4db824d8b7bce217a31689618c569c8ef))

# 1.0.0 (2025-12-28)


### Bug Fixes

* add dark mode support for event type filter select ([6647ff1](https://github.com/strapi-community/plugin-io/commit/6647ff1101a06bc58f8bd3d0bb605f41fd552095))
* **apiTokens:** account for full_access expiresAt null and not having ability ([#87](https://github.com/strapi-community/plugin-io/issues/87)) ([2d49409](https://github.com/strapi-community/plugin-io/commit/2d49409eb4749683b9dc3d73aebbb27241782520))
* **bootstrap-io:** events are not processed ([1117144](https://github.com/strapi-community/plugin-io/commit/11171448e3ebeac07ff2c3e123f8a516c2294cc2))
* **bootstrapIO:** $io.socket is not $io.server ([2d5b082](https://github.com/strapi-community/plugin-io/commit/2d5b08242f08e8f938d03b61248fa6d9061de1b9))
* **config:** default origin should be expected port instead of admin portal ([5027dd8](https://github.com/strapi-community/plugin-io/commit/5027dd8e4c02aacc50a694abba4a08107c413e74))
* **config:** event is expected to be an object instead of an array ([99b6e89](https://github.com/strapi-community/plugin-io/commit/99b6e89335b94b7a902e46c5c0eccc920fd81c54))
* **config:** invalid events type default ([91f372a](https://github.com/strapi-community/plugin-io/commit/91f372a993ae3882372e21795ef4778403363d1c))
* **defaults:** `POST` must be allowed ([54c4bf5](https://github.com/strapi-community/plugin-io/commit/54c4bf5efe46a33128bb53bfbabd323dd0768d3c))
* **docs:** error on build due to esm ([fba0100](https://github.com/strapi-community/plugin-io/commit/fba01005027426cf8c9fc4a942ab9b9a1c46979f))
* downgrade date-fns to v3.x for CommonJS compatibility ([c739fb9](https://github.com/strapi-community/plugin-io/commit/c739fb98f6fdfd400cd10b7925f89a0603f07f65))
* **emit:** `singleType` content types action should be find not findOne ([fd4d3cc](https://github.com/strapi-community/plugin-io/commit/fd4d3ccc4ec5d58210d9b0981d7e7c8e3c04c4e8))
* **emit:** account for publish/unpublish ([#20](https://github.com/strapi-community/plugin-io/issues/20)) ([bac0948](https://github.com/strapi-community/plugin-io/commit/bac0948d132c75ed02030318f9e8ac2723d9ef5f)), closes [#15](https://github.com/strapi-community/plugin-io/issues/15)
* **emit:** account for single content type `createOrUpdate` ([#21](https://github.com/strapi-community/plugin-io/issues/21)) ([fff808b](https://github.com/strapi-community/plugin-io/commit/fff808bf7d610e4cb8179e9ae501e34e9d3b5e77))
* **emit:** only emit event if room has permission for action ([116f718](https://github.com/strapi-community/plugin-io/commit/116f7189d7be4e17f99b4ac83a295bd4d23694af))
* **engines:** incorrect engine range ([#39](https://github.com/strapi-community/plugin-io/issues/39)) ([f9a5853](https://github.com/strapi-community/plugin-io/commit/f9a5853088ec51c561a8079c88bb3d8829c3e3a5))
* **events:** listen for bulkDelete ([#36](https://github.com/strapi-community/plugin-io/issues/36)) ([6183917](https://github.com/strapi-community/plugin-io/commit/618391794e2c8053b7c5b3de62c71dab2ed2dbfa))
* **getEventType:** `afterFindOne` event should be `findOne` ([1239ed4](https://github.com/strapi-community/plugin-io/commit/1239ed4ce20f6ca752b742898f5336719aad522d))
* **getModelMeta:** `publish` action should require update permission ([#22](https://github.com/strapi-community/plugin-io/issues/22)) ([9d22fee](https://github.com/strapi-community/plugin-io/commit/9d22fee769e3dac4ad30f5e435804287223be6b8))
* **handshake:** ensure the u&p plugin is present before attempting access ([015f38a](https://github.com/strapi-community/plugin-io/commit/015f38aaa1061e8f3ace11bc3e7b1650e4e0008e))
* **handshake:** reject unconfirmed and/or blocked users ([#27](https://github.com/strapi-community/plugin-io/issues/27)) ([6f8e7eb](https://github.com/strapi-community/plugin-io/commit/6f8e7ebcc7074fac579202533bbf0f0d0be922b6))
* **handshake:** unable to verify ([585ac00](https://github.com/strapi-community/plugin-io/commit/585ac00c8fad9238ce9ca93b84576a1a4c809132))
* **jwt:** `getAdvancedSettings` is undefined ([134fb73](https://github.com/strapi-community/plugin-io/commit/134fb73380bef969d5facca968b2449b051880a0))
* **middleware:** account for custom routes ([#4](https://github.com/strapi-community/plugin-io/issues/4)) ([b1d765c](https://github.com/strapi-community/plugin-io/commit/b1d765c90be758a272b0933f965eca53e858fdf1))
* **middleware:** missing model prefix for component relations ([#43](https://github.com/strapi-community/plugin-io/issues/43)) ([7504d23](https://github.com/strapi-community/plugin-io/commit/7504d23639292ed0c76e1095356c603760d1666e)), closes [#38](https://github.com/strapi-community/plugin-io/issues/38)
* migrate to semantic-release and fix date-fns v4 ESM compatibility ([31a3e05](https://github.com/strapi-community/plugin-io/commit/31a3e0531398702c0d8fbdadde87119a07b7c23d))
* Publishing version 5.0.3 to npm ([792a0ec](https://github.com/strapi-community/plugin-io/commit/792a0ec11cd960f056416dd8bc0de123f2e6436a))
* **raw emit:** add default options ([#5](https://github.com/strapi-community/plugin-io/issues/5)) ([bc34b52](https://github.com/strapi-community/plugin-io/commit/bc34b52514effda46b80af8f9190667b6b06e1e6))
* **raw emit:** room not respected ([#8](https://github.com/strapi-community/plugin-io/issues/8)) ([1092597](https://github.com/strapi-community/plugin-io/commit/109259792ec294f11ab625a1d241e4577fb63d8e))
* Remove eval() from transaction context loading ([126abbf](https://github.com/strapi-community/plugin-io/commit/126abbf3aa0120508df521008c604eebb10c4b51))
* remove package-lock.json to fix cross-platform SWC native binding issues ([d3715ff](https://github.com/strapi-community/plugin-io/commit/d3715ff4db824d8b7bce217a31689618c569c8ef))
* remove spinner buttons from number inputs in settings ([9a1892b](https://github.com/strapi-community/plugin-io/commit/9a1892ba99d50b6a3c731e9b9be26a17f407b0bb))
* **role scopeFn:** scopes are not being applied ([e0a4e89](https://github.com/strapi-community/plugin-io/commit/e0a4e89ba980e8fc6dad0f7dd6668e94d02bb570))
* **sanitize:** data array is undefined ([275a71f](https://github.com/strapi-community/plugin-io/commit/275a71f5a7bb32965fb5f02d6775a3050447feba))
* Security & Transaction Fixes for Strapi v5 ([124d6eb](https://github.com/strapi-community/plugin-io/commit/124d6eb43623637309998acc44993e641a4e4ae6))
* **server events:** custom events not registered ([#65](https://github.com/strapi-community/plugin-io/issues/65)) ([b14dfc5](https://github.com/strapi-community/plugin-io/commit/b14dfc510941eb4fd0c8ab92776eff12db250865))
* **services:sanitize:** output sanitize transforms should now be a function ([e3530fc](https://github.com/strapi-community/plugin-io/commit/e3530fc0465d003542c8967af57db883d322a0d2))
* **socketio:emit:** remove roomname from data ([2249d5b](https://github.com/strapi-community/plugin-io/commit/2249d5bab06bbe032076552447a85f6669de172b))
* **socketio:** ensure top level permissions are respected ([28413f2](https://github.com/strapi-community/plugin-io/commit/28413f21d92ba328342f7579eee7503a19858670))
* **strategies:apiToken:** authentication results in error ([#79](https://github.com/strapi-community/plugin-io/issues/79)) ([aca9a1e](https://github.com/strapi-community/plugin-io/commit/aca9a1e858e0bd045b9b15618e73c29194330bec))
* **strategies:role:** verification is happening after connection ([9fdd4fb](https://github.com/strapi-community/plugin-io/commit/9fdd4fbceaa105783642e2344d497d3f7214578a))
* update repository URLs from strapi-plugin-io to plugin-io ([091eb53](https://github.com/strapi-community/plugin-io/commit/091eb531d47a5599f71000fa5af100ba82ff4ad1))
* use npm install instead of npm ci for cross-platform SWC compatibility ([e3fe3b8](https://github.com/strapi-community/plugin-io/commit/e3fe3b864bd6465bafe6e96a6b69292f46894d1e))


### Features

* **.github:** add PR and issue templates ([#11](https://github.com/strapi-community/plugin-io/issues/11)) ([8f8606b](https://github.com/strapi-community/plugin-io/commit/8f8606b55c591059279ad66b0a89ba52b9518971))
* **config:** add defaults and validation ([384ce81](https://github.com/strapi-community/plugin-io/commit/384ce814513535311d69c0ded496b9fe7e6196e2))
* improve dark mode support for monitoring page ([21ce9ec](https://github.com/strapi-community/plugin-io/commit/21ce9ec6f90ec7074013436b0df58f4db4560a6d))
* init commit ([933244d](https://github.com/strapi-community/plugin-io/commit/933244dc16a36f84fab42a9475dcd2709ca4cb26))
* **io:** add raw emit ([#3](https://github.com/strapi-community/plugin-io/issues/3)) ([268d13d](https://github.com/strapi-community/plugin-io/commit/268d13d73be6c43458c5502e6ea61c2e1007b200))
* **io:** add server side events ([a7e7c57](https://github.com/strapi-community/plugin-io/commit/a7e7c57cbfe1d4e3745f21a5696a4271d8826201))
* **middeware:** add handshake ([5cad6bb](https://github.com/strapi-community/plugin-io/commit/5cad6bb8dec42c24a37863f2e9488a71e046715c))
* modernize npm publish workflow with OIDC provenance ([ac6df84](https://github.com/strapi-community/plugin-io/commit/ac6df847ca13ff1da10b522693da8330407a14a6))
* modernize npm publish workflow with OIDC provenance ([#107](https://github.com/strapi-community/plugin-io/issues/107)) ([ac5953c](https://github.com/strapi-community/plugin-io/commit/ac5953c0763799b7e084c6083918fba6cdb0ba18))
* **services:** add transform and sanitize ([130829a](https://github.com/strapi-community/plugin-io/commit/130829a11331b8cbc0431f14f1485546aea546a3))
* Strapi v5 Support with Dashboard Widget & Mobile-Optimized UI ([24a2565](https://github.com/strapi-community/plugin-io/commit/24a25653a97566d579f50fd06b7dce38dc2f2a1b)), closes [#95](https://github.com/strapi-community/plugin-io/issues/95) [#82](https://github.com/strapi-community/plugin-io/issues/82)
* **structures:** add SocketIO ([1eae26b](https://github.com/strapi-community/plugin-io/commit/1eae26b554ea93d70b51f340671a020a5363aee1))
* **v2.0:** init commit ([d2092ef](https://github.com/strapi-community/plugin-io/commit/d2092effa14a0eb0a245637f84c67352822b5ae1))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [5.0.0] - 2024-12-21

### Breaking Changes

#### Package Rename
- **BREAKING**: Package renamed from `strapi-plugin-io` to `@strapi-community/plugin-io`
- Migration: Update your `package.json` and run `npm install @strapi-community/plugin-io`
- Configuration stays the same - no code changes needed
- Plugin ID remains `io` for backward compatibility

#### Version Alignment
- **BREAKING**: Version jumped from 3.0.0 to 5.0.0 to match Strapi v5
- This makes it easier to identify which Strapi version is supported
- v5.x = Strapi v5
- v2.x = Strapi v4

### Added

#### Documentation
- Complete README modernization with better structure
- Added Table of Contents
- Added React and Vue 3 integration examples
- Added TypeScript usage examples
- Enhanced quick start guide
- Added production configuration examples
- Improved migration guide with detailed steps

#### UI Improvements
- Removed spinner buttons from number inputs for cleaner UI
- Full dark mode support for monitoring page
- Theme-aware components using Strapi's design system
- Improved mobile responsiveness
- Better hover and focus states

#### Developer Experience
- All components now use Strapi theme system
- Better TypeScript support
- Cleaner code with reduced complexity
- Removed unnecessary CSS (52 lines of redundant styling)

### Changed

#### Repository Migration
- Migrated to `@strapi-community` organization
- Updated all GitHub links to `strapi-community/strapi-plugin-io`
- Updated NPM badges and shields
- New repository URL: https://github.com/strapi-community/strapi-plugin-io

#### Documentation Updates
- All import paths updated to `@strapi-community/plugin-io`
- Migration guide updated with v5 versioning
- Getting started guide enhanced
- API reference updated
- Examples updated with new package name

#### Code Quality
- Replaced hardcoded colors with theme variables
- Improved CSS specificity for better dark mode support
- Better component isolation
- Cleaner styled-components implementation

### Fixed

- Fixed dark mode compatibility issues on monitoring page
- Fixed white backgrounds not adapting to dark theme
- Fixed text colors not visible in dark mode
- Fixed select dropdown styling in dark mode
- Fixed number input spinner buttons appearing on desktop
- Fixed border colors not adapting to theme
- Fixed shadow styles for better dark mode appearance

### Removed

- Removed internal `DOCUMENTATION_UPDATE.md` file
- Removed redundant CSS for number input spinners
- Removed hardcoded color values
- Removed unnecessary media queries for spinner buttons

---

## [3.0.0] - 2024-11-27

### Added

#### Strapi v5 Support
- Full compatibility with Strapi v5
- Updated to use Strapi v5 Plugin SDK
- New build system with optimized bundles
- Both ESM and CJS exports

#### Entity-Specific Subscriptions
- Subscribe to individual entities for targeted updates
- Client-side: `socket.emit('subscribe-entity', { uid, id })`
- Server-side: `strapi.$io.emitToEntity(uid, id, event, data)`
- Automatic permission checks
- Configurable limits per socket

#### Enhanced Admin Panel
- Live dashboard widget on admin homepage
- Real-time connection statistics
- Events per second monitoring
- Visual settings panel with tabs
- Monitoring page with connection details

#### Performance Optimizations
- Intelligent caching (roles cached for 5 minutes)
- 90% reduction in database queries
- Debouncing for bulk operations
- Parallel event processing
- Support for 2500+ concurrent connections

#### Documentation
- Complete VitePress documentation site
- API reference with TypeScript definitions
- Usage guide with 8 real-world use cases
- Security best practices guide
- Performance optimization guide
- Migration guide from v4 to v5

#### Helper Functions
- `joinRoom(socketId, roomName)` - Add socket to room
- `leaveRoom(socketId, roomName)` - Remove socket from room
- `getSocketsInRoom(roomName)` - Get all sockets in room
- `sendPrivateMessage(socketId, event, data)` - Send to specific socket
- `broadcast(socketId, event, data)` - Emit to all except sender
- `emitToNamespace(namespace, event, data)` - Emit to namespace
- `disconnectSocket(socketId, reason)` - Disconnect socket
- `emitToEntity(uid, entityId, event, data)` - Emit to entity subscribers

### Changed

#### Build System
- Migrated to `@strapi/sdk-plugin` build tools
- Optimized bundle sizes
- Source maps for debugging
- Modern build targets (Node 18+)

#### API Improvements
- Better error handling
- Improved TypeScript definitions
- More consistent API naming
- Enhanced logging with structured messages

#### Configuration
- More flexible content type configuration
- Better validation for settings
- Environment variable support
- Redis adapter configuration

### Fixed

- Fixed permission checks for authenticated users
- Fixed role-based room assignments
- Fixed event emission to specific rooms
- Fixed namespace handling
- Fixed memory leaks in event listeners
- Fixed connection cleanup on disconnect

---

## [2.0.0] - 2023-06-15

### Added

#### Strapi v4 Support
- Full rewrite for Strapi v4 compatibility
- New admin panel integration
- Updated dependencies

#### Features
- Basic Socket.IO integration
- Content type event broadcasting
- JWT authentication
- API token support
- Room management
- Custom events
- Namespace support

#### Documentation
- Basic README
- API documentation
- Usage examples

### Changed
- Complete codebase modernization
- Updated to Socket.IO v4
- New configuration format

### Fixed
- Various bug fixes from v1
- Performance improvements
- Memory leak fixes

---

## [1.0.0] - 2021-03-10

### Added
- Initial release
- Basic Socket.IO integration for Strapi v3
- Simple event broadcasting
- Basic authentication

---

## Version Support Matrix

| Plugin Version | Strapi Version | Node.js | Socket.IO | Status |
|----------------|----------------|---------|-----------|---------|
| **v5.x** | v5.x | 18-22 | 4.8+ | Current |
| v3.x | v5.x | 18-22 | 4.8+ | Deprecated |
| v2.x | v4.x | 14-20 | 4.x | Legacy |
| v1.x | v3.x | 12-14 | 3.x | Unsupported |

---

## Migration Paths

### From v2 (Strapi v4) to v5 (Strapi v5)

1. Update Strapi to v5: `npm install @strapi/strapi@5`
2. Uninstall old plugin: `npm uninstall strapi-plugin-io`
3. Install new plugin: `npm install @strapi-community/plugin-io@latest`
4. Restart server: `npm run develop`

**Configuration compatibility**: 100% - no changes needed!

See [Migration Guide](./docs/guide/migration.md) for detailed instructions.

### From v1 (Strapi v3) to v5 (Strapi v5)

Not supported - please upgrade to Strapi v4 first, then to v5.

---

## Deprecation Notices

### v3.0.0 Package Name
The package name `strapi-plugin-io` is deprecated. Use `@strapi-community/plugin-io` instead.

### Strapi v4 Support
Strapi v4 support ended with version 2.x. Please upgrade to Strapi v5 and use v5.x of this plugin.

---

## Upcoming Features

### Planned for v5.1.0
- [ ] Enhanced rate limiting with Redis backend
- [ ] WebSocket compression support
- [ ] Improved monitoring dashboard
- [ ] Custom event validators
- [ ] Advanced namespace routing

### Under Consideration
- GraphQL subscription support
- Message queue integration
- Cluster mode improvements
- Advanced analytics

---

## Support

- **Documentation**: https://strapi-plugin-io.netlify.app/
- **Issues**: https://github.com/strapi-community/strapi-plugin-io/issues
- **Discussions**: https://github.com/strapi-community/strapi-plugin-io/discussions
- **Strapi Discord**: https://discord.strapi.io

---

## Credits

**Original Authors:**
- [@ComfortablyCoding](https://github.com/ComfortablyCoding)
- [@hrdunn](https://github.com/hrdunn)

**v5 Migration & Enhancements:**
- [@Schero94](https://github.com/Schero94)

**Maintained by:** Strapi Community

**Maintained until:** December 2026

---

## License

[MIT License](./LICENSE)

---

*For older versions and legacy documentation, see [GitHub Releases](https://github.com/strapi-community/strapi-plugin-io/releases)*
