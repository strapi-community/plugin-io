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

