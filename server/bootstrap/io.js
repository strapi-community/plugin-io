'use strict';

const { SocketIO } = require('../structures');
const { pluginId } = require('../utils/pluginId');

async function bootstrapIO({ strapi }) {
	const settingsService = strapi.plugin(pluginId).service('settings');
	const settings = await settingsService.getSettings();
	const monitoringService = strapi.plugin(pluginId).service('monitoring');

	const serverOptions = {
		cors: {
			origin: settings.cors?.origins || ['http://localhost:3000'],
			methods: settings.cors?.methods || ['GET', 'POST'],
			credentials: settings.cors?.credentials ?? true,
		},
		pingTimeout: settings.connection?.pingTimeout || 20000,
		pingInterval: settings.connection?.pingInterval || 25000,
		connectTimeout: settings.connection?.connectionTimeout || 45000,
		maxHttpBufferSize: 1e6,
		transports: ['websocket', 'polling'],
		allowEIO3: true,
	};

	// Redis Adapter for multi-server scaling
	if (settings.redis?.enabled) {
		try {
			const { createAdapter } = require('@socket.io/redis-adapter');
			const { createClient } = require('redis');
			
			const pubClient = createClient({
				url: settings.redis.url || 'redis://localhost:6379',
			});
			const subClient = pubClient.duplicate();

			await Promise.all([pubClient.connect(), subClient.connect()]);
			
			serverOptions.adapter = createAdapter(pubClient, subClient);
			strapi.log.info(`socket.io: Redis adapter enabled (${settings.redis.url})`);
		} catch (err) {
			strapi.log.error(`socket.io: Redis adapter failed: ${err.message}`);
		}
	}

	const io = new SocketIO(serverOptions);
	strapi.$io = io;
	strapi.$ioSettings = settings;

	// Namespaces
	const namespaces = {
		main: io.server,
	};

	if (settings.namespaces?.enabled) {
		Object.entries(settings.namespaces.list || {}).forEach(([name, config]) => {
			const nsp = io.server.of(`/${name}`);
			namespaces[name] = nsp;

			// Namespace-specific authentication middleware
			if (config.requireAuth) {
				nsp.use(async (socket, next) => {
					if (!socket.user) {
						strapi.log.warn(`socket.io: Authentication required for namespace /${name}, connection denied`);
						return next(new Error(`Authentication required for namespace /${name}`));
					}
					strapi.log.debug(`socket.io: Authenticated access to namespace /${name} by ${socket.user.username}`);
					next();
				});
			}

			strapi.log.info(`socket.io: Namespace created - /${name} (requireAuth: ${config.requireAuth || false})`);
		});
	}

	strapi.$io.namespaces = namespaces;

	// Connection Middleware
	io.server.use(async (socket, next) => {
		const clientIp = socket.handshake.address;

		if (settings.security?.ipWhitelist?.length > 0) {
			if (!settings.security.ipWhitelist.includes(clientIp)) {
				return next(new Error('IP not whitelisted'));
			}
		}

		if (settings.security?.ipBlacklist?.includes(clientIp)) {
			return next(new Error('IP blacklisted'));
		}

		const currentConnections = io.server.sockets.sockets.size;
		if (currentConnections >= (settings.connection?.maxConnections || 1000)) {
			return next(new Error('Max connections reached'));
		}

		const token = socket.handshake.auth?.token || socket.handshake.query?.token;
		if (token) {
			try {
				const decoded = await strapi.plugin('users-permissions').service('jwt').verify(token);
				strapi.log.info(`socket.io: JWT decoded - user id: ${decoded.id}`);
				
				if (decoded.id) {
					const user = await strapi.query('plugin::users-permissions.user').findOne({
						where: { id: decoded.id },
						populate: { role: true },
					});
					
					if (user) {
						socket.user = {
							id: user.id,
							username: user.username,
							email: user.email,
							role: user.role?.name || 'authenticated',
						};
						strapi.log.info(`socket.io: User authenticated - ${user.username} (${user.email})`);
					} else {
						strapi.log.warn(`socket.io: User not found for id: ${decoded.id}`);
					}
				}
			} catch (err) {
				strapi.log.warn(`socket.io: JWT verification failed: ${err.message}`);
			}
		} else {
			strapi.log.debug(`socket.io: No token provided, connecting as public`);
		}

		if (settings.security?.requireAuthentication && !socket.user) {
			return next(new Error('Authentication required'));
		}

		// Check canConnect permission for user role
		const userRole = socket.user?.role?.toLowerCase() || 'public';
		const rolePermissions = settings.rolePermissions || {};
		
		// Find matching role permission (check multiple possible formats)
		let rolePerms = rolePermissions[userRole];
		if (!rolePerms) {
			// Try 'authenticated' as fallback for logged-in users
			if (socket.user && rolePermissions['authenticated']) {
				rolePerms = rolePermissions['authenticated'];
			} else if (!socket.user && rolePermissions['public']) {
				rolePerms = rolePermissions['public'];
			}
		}

		// Check if role is allowed to connect
		if (rolePerms && rolePerms.canConnect === false) {
			strapi.log.warn(`socket.io: Connection denied for role '${userRole}' (canConnect=false)`);
			return next(new Error(`Role '${userRole}' is not allowed to connect to Socket.IO`));
		}

		// If no explicit permission found, use default behavior
		// Default: allow connection (backward compatibility)
		const canConnect = rolePerms ? (rolePerms.canConnect !== false) : true;
		if (!canConnect) {
			strapi.log.warn(`socket.io: Connection denied for role '${userRole}'`);
			return next(new Error('Connection not allowed for this role'));
		}

		// Store role permissions on socket for later use
		socket.rolePermissions = rolePerms;
		socket.userRole = userRole;

		strapi.log.debug(`socket.io: Connection allowed for role '${userRole}' (canConnect=${canConnect})`);
		next();
	});

	// Custom Middleware
	if (settings.middleware?.enabled && Array.isArray(settings.middleware.handlers)) {
		settings.middleware.handlers.forEach((handler) => {
			if (typeof handler === 'function') {
				io.server.use(handler);
			}
		});
	}

	// Connection Handler
	io.server.on('connection', (socket) => {
		const clientIp = socket.handshake.address || 'unknown';
		const username = socket.user?.username || 'anonymous';
		
		if (settings.monitoring?.enableConnectionLogging) {
			strapi.log.info(`socket.io: Client connected (id: ${socket.id}, user: ${username}, ip: ${clientIp})`);
			monitoringService.logEvent('connection', { 
				socketId: socket.id, 
				ip: clientIp,
				user: socket.user || null,
			});
		}

		if (settings.rooms?.autoJoinByRole) {
			const userRole = socket.user?.role || 'public';
			const rooms = settings.rooms.autoJoinByRole[userRole] || [];
			rooms.forEach((room) => {
				socket.join(room);
				strapi.log.debug(`socket.io: Socket ${socket.id} joined room: ${room}`);
			});
		}

		// Room Management API (with security)
		socket.on('join-room', (roomName, callback) => {
			// Validate room name
			if (typeof roomName !== 'string' || roomName.length === 0) {
				if (callback) callback({ success: false, error: 'Invalid room name' });
				return;
			}

			// Sanitize room name (alphanumeric, dash, underscore only)
			const sanitizedRoom = roomName.replace(/[^a-zA-Z0-9-_]/g, '');
			if (sanitizedRoom !== roomName) {
				strapi.log.warn(`socket.io: Invalid room name attempted: ${roomName}`);
				if (callback) callback({ success: false, error: 'Room name contains invalid characters' });
				return;
			}

			// Check if private rooms are enabled
			if (settings.rooms?.enablePrivateRooms === false) {
				// Only allow predefined rooms from autoJoinByRole
				const allowedRooms = Object.values(settings.rooms?.autoJoinByRole || {}).flat();
				if (!allowedRooms.includes(roomName)) {
					strapi.log.warn(`socket.io: Private rooms disabled, join denied for: ${roomName}`);
					if (callback) callback({ success: false, error: 'Private rooms are disabled' });
					return;
				}
			}

			socket.join(roomName);
			strapi.log.debug(`socket.io: Socket ${socket.id} joined room: ${roomName}`);
			if (callback) callback({ success: true, room: roomName });
		});

		socket.on('leave-room', (roomName, callback) => {
			if (typeof roomName === 'string' && roomName.length > 0) {
				socket.leave(roomName);
				strapi.log.debug(`socket.io: Socket ${socket.id} left room: ${roomName}`);
				if (callback) callback({ success: true, room: roomName });
			} else {
				if (callback) callback({ success: false, error: 'Invalid room name' });
			}
		});

		socket.on('get-rooms', (callback) => {
			const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
			if (callback) callback({ success: true, rooms });
		});

		// Private Messages (with security)
		socket.on('private-message', ({ to, message }, callback) => {
			// Check if private rooms are enabled
			if (settings.rooms?.enablePrivateRooms === false) {
				strapi.log.warn(`socket.io: Private messages disabled for socket ${socket.id}`);
				if (callback) callback({ success: false, error: 'Private messages are disabled' });
				return;
			}

			// Validate parameters
			if (!to || !message) {
				if (callback) callback({ success: false, error: 'Invalid parameters' });
				return;
			}

			// Validate message content
			if (typeof message !== 'string' || message.length === 0 || message.length > 10000) {
				if (callback) callback({ success: false, error: 'Invalid message length' });
				return;
			}

			// Check if target socket exists
			const targetSocket = io.server.sockets.sockets.get(to);
			if (!targetSocket) {
				strapi.log.warn(`socket.io: Private message target not found: ${to}`);
				if (callback) callback({ success: false, error: 'Target socket not found' });
				return;
			}

			// Send message
			io.server.to(to).emit('private-message', {
				from: socket.id,
				fromUser: socket.user?.username || 'anonymous',
				message,
				timestamp: Date.now(),
			});

			strapi.log.debug(`socket.io: Private message from ${socket.id} to ${to}`);
			if (callback) callback({ success: true });
		});

		// Disconnect Handler
		socket.on('disconnect', (reason) => {
			if (settings.monitoring?.enableConnectionLogging) {
				strapi.log.info(`socket.io: Client disconnected (id: ${socket.id}, user: ${username}, reason: ${reason})`);
				monitoringService.logEvent('disconnect', { 
					socketId: socket.id, 
					reason,
					user: socket.user || null,
				});
			}
		});

		// Error Handler
		socket.on('error', (error) => {
			strapi.log.error(`socket.io: Socket error (id: ${socket.id}): ${error.message}`);
			monitoringService.logEvent('error', { 
				socketId: socket.id, 
				error: error.message,
				user: socket.user || null,
			});
		});
	});

	// Rate Limiting
	if (settings.security?.rateLimiting?.enabled) {
		const eventCounts = new Map();
		const maxEvents = settings.security.rateLimiting.maxEventsPerSecond || 10;

		io.server.on('connection', (socket) => {
			eventCounts.set(socket.id, { count: 0, resetAt: Date.now() + 1000 });

			socket.use((packet, next) => {
				const now = Date.now();
				const data = eventCounts.get(socket.id);

				if (now > data.resetAt) {
					data.count = 0;
					data.resetAt = now + 1000;
				}

				data.count++;

				if (data.count > maxEvents) {
					return next(new Error('Rate limit exceeded'));
				}

				next();
			});

			socket.on('disconnect', () => {
				eventCounts.delete(socket.id);
			});
		});
	}

	// Helper Functions
	strapi.$io.joinRoom = (socketId, roomName) => {
		const socket = io.server.sockets.sockets.get(socketId);
		if (socket) {
			socket.join(roomName);
			return true;
		}
		return false;
	};

	strapi.$io.leaveRoom = (socketId, roomName) => {
		const socket = io.server.sockets.sockets.get(socketId);
		if (socket) {
			socket.leave(roomName);
			return true;
		}
		return false;
	};

	strapi.$io.getSocketsInRoom = async (roomName) => {
		const sockets = await io.server.in(roomName).fetchSockets();
		return sockets.map((s) => ({
			id: s.id,
			user: s.user || null,
		}));
	};

	strapi.$io.sendPrivateMessage = (socketId, event, data) => {
		io.server.to(socketId).emit(event, data);
	};

	strapi.$io.broadcast = (socketId, event, data) => {
		const socket = io.server.sockets.sockets.get(socketId);
		if (socket) {
			socket.broadcast.emit(event, data);
		}
	};

	strapi.$io.emitToNamespace = (namespace, event, data) => {
		const nsp = namespaces[namespace];
		if (nsp) {
			nsp.emit(event, data);
		}
	};

	strapi.$io.disconnectSocket = (socketId, reason = 'server disconnect') => {
		const socket = io.server.sockets.sockets.get(socketId);
		if (socket) {
			socket.disconnect(true);
			return true;
		}
		return false;
	};

	// Count enabled content types
	const allContentTypes = new Set();
	Object.values(settings.rolePermissions || {}).forEach((rolePerms) => {
		if (rolePerms.contentTypes) {
			Object.entries(rolePerms.contentTypes).forEach(([uid, actions]) => {
				if (actions.create || actions.update || actions.delete) {
					allContentTypes.add(uid);
				}
			});
		}
	});
	const enabledContentTypes = allContentTypes.size;

	const origins = settings.cors?.origins?.join(', ') || 'http://localhost:3000';
	const features = [];
	if (settings.redis?.enabled) features.push('Redis');
	if (settings.namespaces?.enabled) features.push(`Namespaces(${Object.keys(settings.namespaces.list || {}).length})`);
	if (settings.security?.rateLimiting?.enabled) features.push('RateLimit');
	
	strapi.log.info(`socket.io: Plugin initialized`);
	strapi.log.info(`  • Origins: ${origins}`);
	strapi.log.info(`  • Content Types: ${enabledContentTypes}`);
	strapi.log.info(`  • Max Connections: ${settings.connection?.maxConnections || 1000}`);
	if (features.length > 0) {
		strapi.log.info(`  • Features: ${features.join(', ')}`);
	}
}

module.exports = { bootstrapIO };
