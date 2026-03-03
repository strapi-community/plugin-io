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
