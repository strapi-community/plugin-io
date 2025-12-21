import require$$0$4 from "socket.io";
import { AsyncLocalStorage } from "node:async_hooks";
import * as dates$1 from "date-fns";
import dates__default from "date-fns";
import require$$1 from "crypto";
import require$$0$5 from "child_process";
import require$$0$6 from "os";
import require$$0$8 from "path";
import require$$0$7 from "fs";
import require$$0$9 from "assert";
import require$$2 from "events";
import require$$0$b from "buffer";
import require$$0$a from "stream";
import require$$2$1 from "util";
import require$$0$c from "constants";
import { Writable } from "node:stream";
import { z as z$1 } from "zod";
import * as z from "zod/v4";
var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
function getAugmentedNamespace(n) {
  if (n.__esModule) return n;
  var f = n.default;
  if (typeof f == "function") {
    var a = function a2() {
      if (this instanceof a2) {
        return Reflect.construct(f, arguments, this.constructor);
      }
      return f.apply(this, arguments);
    };
    a.prototype = f.prototype;
  } else a = {};
  Object.defineProperty(a, "__esModule", { value: true });
  Object.keys(n).forEach(function(k) {
    var d = Object.getOwnPropertyDescriptor(n, k);
    Object.defineProperty(a, k, d.get ? d : {
      enumerable: true,
      get: function() {
        return n[k];
      }
    });
  });
  return a;
}
const strapi$1 = {
  name: "io"
};
const require$$0$3 = {
  strapi: strapi$1
};
const pluginPkg = require$$0$3;
const pluginId$7 = pluginPkg.strapi.name;
var pluginId_1 = { pluginId: pluginId$7 };
const { pluginId: pluginId$6 } = pluginId_1;
function getService$3({ name, plugin = pluginId$6, type: type2 = "plugin" }) {
  let serviceUID = `${type2}::${plugin}`;
  if (name && name.length) {
    serviceUID += `.${name}`;
  }
  return strapi.service(serviceUID);
}
var getService_1 = {
  getService: getService$3
};
const { getService: getService$2 } = getService_1;
async function handshake$2(socket, next) {
  const strategyService = getService$2({ name: "strategy" });
  const auth = socket.handshake.auth || {};
  let strategy2 = auth.strategy || "jwt";
  const token = auth.token || "";
  if (!token.length) {
    strategy2 = "";
  }
  try {
    let room;
    if (strategy2 && strategy2.length) {
      const strategyType = strategy2 === "jwt" ? "role" : "token";
      const ctx = await strategyService[strategyType].authenticate(auth);
      room = strategyService[strategyType].getRoomName(ctx);
    } else if (strapi.plugin("users-permissions")) {
      const role = await strapi.query("plugin::users-permissions.role").findOne({ where: { type: "public" }, select: ["id", "name"] });
      room = strategyService["role"].getRoomName(role);
    }
    if (room) {
      socket.join(room.replace(" ", "-"));
    } else {
      throw new Error("No valid room found");
    }
    next();
  } catch (error2) {
    next(new Error(error2.message));
  }
}
var handshake_1 = {
  handshake: handshake$2
};
const { handshake: handshake$1 } = handshake_1;
var middleware = {
  handshake: handshake$1
};
const API_TOKEN_TYPE$2 = {
  READ_ONLY: "read-only",
  FULL_ACCESS: "full-access",
  CUSTOM: "custom"
};
var constants$7 = {
  API_TOKEN_TYPE: API_TOKEN_TYPE$2
};
const { Server } = require$$0$4;
const { handshake } = middleware;
const { getService: getService$1 } = getService_1;
const { pluginId: pluginId$5 } = pluginId_1;
const { API_TOKEN_TYPE: API_TOKEN_TYPE$1 } = constants$7;
let SocketIO$2 = class SocketIO {
  constructor(options) {
    this._socket = new Server(strapi.server.httpServer, options);
    this._socket.use(handshake);
  }
  // eslint-disable-next-line no-unused-vars
  async emit({ event, schema: schema2, data: rawData }) {
    const sanitizeService = getService$1({ name: "sanitize" });
    const strategyService = getService$1({ name: "strategy" });
    const transformService = getService$1({ name: "transform" });
    if (!rawData) {
      return;
    }
    const eventName = `${schema2.singularName}:${event}`;
    const entityId = rawData.id || rawData.documentId;
    const entityRoomName = entityId ? `${schema2.uid}:${entityId}` : null;
    for (const strategyType in strategyService) {
      if (Object.hasOwnProperty.call(strategyService, strategyType)) {
        const strategy2 = strategyService[strategyType];
        const rooms = await strategy2.getRooms();
        for (const room of rooms) {
          const permissions = room.permissions.map(({ action }) => ({ action }));
          const ability = await strapi.contentAPI.permissions.engine.generateAbility(permissions);
          if (room.type === API_TOKEN_TYPE$1.FULL_ACCESS || ability.can(schema2.uid + "." + event)) {
            const sanitizedData = await sanitizeService.output({
              data: rawData,
              schema: schema2,
              options: {
                auth: {
                  name: strategy2.name,
                  ability,
                  strategy: {
                    verify: strategy2.verify
                  },
                  credentials: strategy2.credentials?.(room)
                }
              }
            });
            const roomName = strategy2.getRoomName(room);
            const data = transformService.response({ data: sanitizedData, schema: schema2 });
            this._socket.to(roomName.replace(" ", "-")).emit(eventName, { ...data });
            if (entityRoomName) {
              this._socket.to(entityRoomName).emit(eventName, { ...data });
            }
          }
        }
      }
    }
  }
  async raw({ event, data, rooms }) {
    let emitter = this._socket;
    if (rooms && rooms.length) {
      rooms.forEach((r) => {
        emitter = emitter.to(r);
      });
    }
    emitter.emit(event, { data });
  }
  get server() {
    return this._socket;
  }
};
var SocketIO_1 = {
  SocketIO: SocketIO$2
};
const { SocketIO: SocketIO$1 } = SocketIO_1;
var structures = {
  SocketIO: SocketIO$1
};
var sanitizeSensitiveFields;
var hasRequiredSanitizeSensitiveFields;
function requireSanitizeSensitiveFields() {
  if (hasRequiredSanitizeSensitiveFields) return sanitizeSensitiveFields;
  hasRequiredSanitizeSensitiveFields = 1;
  const SENSITIVE_FIELDS = [
    "password",
    "resetPasswordToken",
    "registrationToken",
    "confirmationToken",
    "privateKey",
    "secretKey",
    "apiKey",
    "secret",
    "hash"
  ];
  function deepSanitize(obj) {
    if (!obj || typeof obj !== "object") {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => deepSanitize(item));
    }
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_FIELDS.includes(key)) {
        continue;
      }
      if (value && typeof value === "object") {
        sanitized[key] = deepSanitize(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  sanitizeSensitiveFields = ({ strapi: strapi2 }) => {
    const originalEmit = strapi2.$io.emit.bind(strapi2.$io);
    strapi2.$io.emit = async function(params) {
      if (params.data) {
        params.data = deepSanitize(params.data);
      }
      return originalEmit(params);
    };
    strapi2.log.info("socket.io: Sensitive fields sanitization middleware active");
  };
  return sanitizeSensitiveFields;
}
const { SocketIO: SocketIO2 } = structures;
const { pluginId: pluginId$4 } = pluginId_1;
async function bootstrapIO$1({ strapi: strapi2 }) {
  const settingsService = strapi2.plugin(pluginId$4).service("settings");
  const settings2 = await settingsService.getSettings();
  const monitoringService = strapi2.plugin(pluginId$4).service("monitoring");
  const serverOptions = {
    cors: {
      origin: settings2.cors?.origins || ["http://localhost:3000"],
      methods: settings2.cors?.methods || ["GET", "POST"],
      credentials: settings2.cors?.credentials ?? true
    },
    pingTimeout: settings2.connection?.pingTimeout || 2e4,
    pingInterval: settings2.connection?.pingInterval || 25e3,
    connectTimeout: settings2.connection?.connectionTimeout || 45e3,
    maxHttpBufferSize: 1e6,
    transports: ["websocket", "polling"],
    allowEIO3: true
  };
  if (settings2.redis?.enabled) {
    try {
      const { createAdapter } = require("@socket.io/redis-adapter");
      const { createClient } = require("redis");
      const pubClient = createClient({
        url: settings2.redis.url || "redis://localhost:6379"
      });
      const subClient = pubClient.duplicate();
      await Promise.all([pubClient.connect(), subClient.connect()]);
      serverOptions.adapter = createAdapter(pubClient, subClient);
      strapi2.log.info(`socket.io: Redis adapter enabled (${settings2.redis.url})`);
    } catch (err) {
      strapi2.log.error(`socket.io: Redis adapter failed: ${err.message}`);
    }
  }
  const io2 = new SocketIO2(serverOptions);
  strapi2.$io = io2;
  strapi2.$ioSettings = settings2;
  const sanitizeSensitiveFields2 = requireSanitizeSensitiveFields();
  sanitizeSensitiveFields2({ strapi: strapi2 });
  const namespaces = {
    main: io2.server
  };
  if (settings2.namespaces?.enabled) {
    Object.entries(settings2.namespaces.list || {}).forEach(([name, config2]) => {
      const nsp = io2.server.of(`/${name}`);
      namespaces[name] = nsp;
      if (config2.requireAuth) {
        nsp.use(async (socket, next) => {
          if (!socket.user) {
            strapi2.log.warn(`socket.io: Authentication required for namespace /${name}, connection denied`);
            return next(new Error(`Authentication required for namespace /${name}`));
          }
          strapi2.log.debug(`socket.io: Authenticated access to namespace /${name} by ${socket.user.username}`);
          next();
        });
      }
      strapi2.log.info(`socket.io: Namespace created - /${name} (requireAuth: ${config2.requireAuth || false})`);
    });
  }
  strapi2.$io.namespaces = namespaces;
  io2.server.use(async (socket, next) => {
    const clientIp = socket.handshake.address;
    if (settings2.security?.ipWhitelist?.length > 0) {
      if (!settings2.security.ipWhitelist.includes(clientIp)) {
        return next(new Error("IP not whitelisted"));
      }
    }
    if (settings2.security?.ipBlacklist?.includes(clientIp)) {
      return next(new Error("IP blacklisted"));
    }
    const currentConnections = io2.server.sockets.sockets.size;
    if (currentConnections >= (settings2.connection?.maxConnections || 1e3)) {
      return next(new Error("Max connections reached"));
    }
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (token) {
      try {
        const decoded = await strapi2.plugin("users-permissions").service("jwt").verify(token);
        strapi2.log.info(`socket.io: JWT decoded - user id: ${decoded.id}`);
        if (decoded.id) {
          const users = await strapi2.documents("plugin::users-permissions.user").findMany({
            filters: { id: decoded.id },
            populate: { role: true },
            limit: 1
          });
          const user = users.length > 0 ? users[0] : null;
          if (user) {
            socket.user = {
              id: user.id,
              username: user.username,
              email: user.email,
              role: user.role?.name || "authenticated"
            };
            strapi2.log.info(`socket.io: User authenticated - ${user.username} (${user.email})`);
          } else {
            strapi2.log.warn(`socket.io: User not found for id: ${decoded.id}`);
          }
        }
      } catch (err) {
        strapi2.log.warn(`socket.io: JWT verification failed: ${err.message}`);
      }
    } else {
      strapi2.log.debug(`socket.io: No token provided, connecting as public`);
    }
    if (settings2.security?.requireAuthentication && !socket.user) {
      return next(new Error("Authentication required"));
    }
    const userRole = socket.user?.role?.toLowerCase() || "public";
    const rolePermissions = settings2.rolePermissions || {};
    let rolePerms = rolePermissions[userRole];
    if (!rolePerms) {
      if (socket.user && rolePermissions["authenticated"]) {
        rolePerms = rolePermissions["authenticated"];
      } else if (!socket.user && rolePermissions["public"]) {
        rolePerms = rolePermissions["public"];
      }
    }
    if (rolePerms && rolePerms.canConnect === false) {
      strapi2.log.warn(`socket.io: Connection denied for role '${userRole}' (canConnect=false)`);
      return next(new Error(`Role '${userRole}' is not allowed to connect to Socket.IO`));
    }
    const canConnect = rolePerms ? rolePerms.canConnect !== false : true;
    if (!canConnect) {
      strapi2.log.warn(`socket.io: Connection denied for role '${userRole}'`);
      return next(new Error("Connection not allowed for this role"));
    }
    socket.rolePermissions = rolePerms;
    socket.userRole = userRole;
    strapi2.log.debug(`socket.io: Connection allowed for role '${userRole}' (canConnect=${canConnect})`);
    next();
  });
  if (settings2.middleware?.enabled && Array.isArray(settings2.middleware.handlers)) {
    settings2.middleware.handlers.forEach((handler) => {
      if (typeof handler === "function") {
        io2.server.use(handler);
      }
    });
  }
  io2.server.on("connection", (socket) => {
    const clientIp = socket.handshake.address || "unknown";
    const username = socket.user?.username || "anonymous";
    if (settings2.monitoring?.enableConnectionLogging) {
      strapi2.log.info(`socket.io: Client connected (id: ${socket.id}, user: ${username}, ip: ${clientIp})`);
      monitoringService.logEvent("connection", {
        socketId: socket.id,
        ip: clientIp,
        user: socket.user || null
      });
    }
    if (settings2.rooms?.autoJoinByRole) {
      const userRole = socket.user?.role || "public";
      const rooms = settings2.rooms.autoJoinByRole[userRole] || [];
      rooms.forEach((room) => {
        socket.join(room);
        strapi2.log.debug(`socket.io: Socket ${socket.id} joined room: ${room}`);
      });
    }
    socket.on("join-room", (roomName, callback) => {
      if (typeof roomName !== "string" || roomName.length === 0) {
        if (callback) callback({ success: false, error: "Invalid room name" });
        return;
      }
      const sanitizedRoom = roomName.replace(/[^a-zA-Z0-9-_]/g, "");
      if (sanitizedRoom !== roomName) {
        strapi2.log.warn(`socket.io: Invalid room name attempted: ${roomName}`);
        if (callback) callback({ success: false, error: "Room name contains invalid characters" });
        return;
      }
      if (settings2.rooms?.enablePrivateRooms === false) {
        const allowedRooms = Object.values(settings2.rooms?.autoJoinByRole || {}).flat();
        if (!allowedRooms.includes(roomName)) {
          strapi2.log.warn(`socket.io: Private rooms disabled, join denied for: ${roomName}`);
          if (callback) callback({ success: false, error: "Private rooms are disabled" });
          return;
        }
      }
      socket.join(roomName);
      strapi2.log.debug(`socket.io: Socket ${socket.id} joined room: ${roomName}`);
      if (callback) callback({ success: true, room: roomName });
    });
    socket.on("leave-room", (roomName, callback) => {
      if (typeof roomName === "string" && roomName.length > 0) {
        socket.leave(roomName);
        strapi2.log.debug(`socket.io: Socket ${socket.id} left room: ${roomName}`);
        if (callback) callback({ success: true, room: roomName });
      } else {
        if (callback) callback({ success: false, error: "Invalid room name" });
      }
    });
    socket.on("get-rooms", (callback) => {
      const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
      if (callback) callback({ success: true, rooms });
    });
    socket.on("subscribe-entity", async ({ uid, id }, callback) => {
      if (settings2.entitySubscriptions?.enabled === false) {
        if (callback) callback({ success: false, error: "Entity subscriptions are disabled" });
        return;
      }
      if (!uid || !id) {
        if (callback) callback({ success: false, error: "Invalid parameters: uid and id are required" });
        return;
      }
      if (typeof uid !== "string" || !uid.match(/^(api|plugin)::[a-z0-9-]+\.[a-z0-9-]+$/)) {
        if (callback) callback({ success: false, error: "Invalid content type uid format" });
        return;
      }
      if (typeof id !== "number" && typeof id !== "string") {
        if (callback) callback({ success: false, error: "Invalid entity id" });
        return;
      }
      if (settings2.entitySubscriptions?.allowedContentTypes?.length > 0) {
        if (!settings2.entitySubscriptions.allowedContentTypes.includes(uid)) {
          if (callback) callback({ success: false, error: "Content type not allowed for entity subscriptions" });
          return;
        }
      }
      const currentSubs = Array.from(socket.rooms).filter((r) => r !== socket.id && r.includes(":")).length;
      const maxSubs = settings2.entitySubscriptions?.maxSubscriptionsPerSocket || 100;
      if (currentSubs >= maxSubs) {
        if (callback) callback({ success: false, error: `Maximum subscriptions (${maxSubs}) reached` });
        return;
      }
      const contentType = strapi2.contentTypes[uid];
      if (!contentType) {
        if (callback) callback({ success: false, error: "Content type not found" });
        return;
      }
      const userRole = socket.user?.role?.toLowerCase() || "public";
      const rolePermissions = settings2.rolePermissions?.[userRole] || settings2.rolePermissions?.["public"] || {};
      const contentTypePerms = rolePermissions.contentTypes?.[uid];
      if (!contentTypePerms || !contentTypePerms.create && !contentTypePerms.update && !contentTypePerms.delete) {
        if (callback) callback({ success: false, error: "Permission denied: no access to this content type" });
        return;
      }
      if (settings2.entitySubscriptions?.requireVerification !== false) {
        try {
          let entity = null;
          if (id && !/^\d+$/.test(String(id))) {
            entity = await strapi2.documents(uid).findOne({ documentId: id });
          } else {
            const results = await strapi2.documents(uid).findMany({
              filters: { id: Number(id) },
              limit: 1
            });
            entity = results.length > 0 ? results[0] : null;
          }
          if (!entity) {
            if (callback) callback({ success: false, error: "Entity not found" });
            return;
          }
        } catch (err) {
          strapi2.log.warn(`socket.io: Entity verification failed for ${uid}:${id} - ${err.message}`);
          if (callback) callback({ success: false, error: "Entity verification failed" });
          return;
        }
      }
      const entityRoomName = `${uid}:${id}`;
      socket.join(entityRoomName);
      if (settings2.entitySubscriptions?.enableMetrics && settings2.monitoring?.enableEventLogging) {
        monitoringService.logEvent("entity-subscribe", {
          socketId: socket.id,
          uid,
          id,
          user: socket.user || null
        });
      }
      strapi2.log.debug(`socket.io: Socket ${socket.id} subscribed to entity: ${entityRoomName}`);
      if (callback) callback({ success: true, room: entityRoomName, uid, id });
    });
    socket.on("unsubscribe-entity", ({ uid, id }, callback) => {
      if (settings2.entitySubscriptions?.enabled === false) {
        if (callback) callback({ success: false, error: "Entity subscriptions are disabled" });
        return;
      }
      if (!uid || !id) {
        if (callback) callback({ success: false, error: "Invalid parameters: uid and id are required" });
        return;
      }
      const entityRoomName = `${uid}:${id}`;
      socket.leave(entityRoomName);
      if (settings2.entitySubscriptions?.enableMetrics && settings2.monitoring?.enableEventLogging) {
        monitoringService.logEvent("entity-unsubscribe", {
          socketId: socket.id,
          uid,
          id,
          user: socket.user || null
        });
      }
      strapi2.log.debug(`socket.io: Socket ${socket.id} unsubscribed from entity: ${entityRoomName}`);
      if (callback) callback({ success: true, room: entityRoomName, uid, id });
    });
    socket.on("get-entity-subscriptions", (callback) => {
      const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id && r.includes(":")).map((room) => {
        const [uid, id] = room.split(":");
        return { uid, id, room };
      });
      if (callback) callback({ success: true, subscriptions: rooms });
    });
    socket.on("private-message", ({ to, message }, callback) => {
      if (settings2.rooms?.enablePrivateRooms === false) {
        strapi2.log.warn(`socket.io: Private messages disabled for socket ${socket.id}`);
        if (callback) callback({ success: false, error: "Private messages are disabled" });
        return;
      }
      if (!to || !message) {
        if (callback) callback({ success: false, error: "Invalid parameters" });
        return;
      }
      if (typeof message !== "string" || message.length === 0 || message.length > 1e4) {
        if (callback) callback({ success: false, error: "Invalid message length" });
        return;
      }
      const targetSocket = io2.server.sockets.sockets.get(to);
      if (!targetSocket) {
        strapi2.log.warn(`socket.io: Private message target not found: ${to}`);
        if (callback) callback({ success: false, error: "Target socket not found" });
        return;
      }
      io2.server.to(to).emit("private-message", {
        from: socket.id,
        fromUser: socket.user?.username || "anonymous",
        message,
        timestamp: Date.now()
      });
      strapi2.log.debug(`socket.io: Private message from ${socket.id} to ${to}`);
      if (callback) callback({ success: true });
    });
    socket.on("disconnect", (reason) => {
      if (settings2.monitoring?.enableConnectionLogging) {
        strapi2.log.info(`socket.io: Client disconnected (id: ${socket.id}, user: ${username}, reason: ${reason})`);
        monitoringService.logEvent("disconnect", {
          socketId: socket.id,
          reason,
          user: socket.user || null
        });
      }
    });
    socket.on("error", (error2) => {
      strapi2.log.error(`socket.io: Socket error (id: ${socket.id}): ${error2.message}`);
      monitoringService.logEvent("error", {
        socketId: socket.id,
        error: error2.message,
        user: socket.user || null
      });
    });
  });
  if (settings2.security?.rateLimiting?.enabled) {
    const eventCounts = /* @__PURE__ */ new Map();
    const maxEvents = settings2.security.rateLimiting.maxEventsPerSecond || 10;
    io2.server.on("connection", (socket) => {
      eventCounts.set(socket.id, { count: 0, resetAt: Date.now() + 1e3 });
      socket.use((packet, next) => {
        const now = Date.now();
        const data = eventCounts.get(socket.id);
        if (now > data.resetAt) {
          data.count = 0;
          data.resetAt = now + 1e3;
        }
        data.count++;
        if (data.count > maxEvents) {
          return next(new Error("Rate limit exceeded"));
        }
        next();
      });
      socket.on("disconnect", () => {
        eventCounts.delete(socket.id);
      });
    });
  }
  strapi2.$io.joinRoom = (socketId, roomName) => {
    const socket = io2.server.sockets.sockets.get(socketId);
    if (socket) {
      socket.join(roomName);
      return true;
    }
    return false;
  };
  strapi2.$io.leaveRoom = (socketId, roomName) => {
    const socket = io2.server.sockets.sockets.get(socketId);
    if (socket) {
      socket.leave(roomName);
      return true;
    }
    return false;
  };
  strapi2.$io.getSocketsInRoom = async (roomName) => {
    const sockets = await io2.server.in(roomName).fetchSockets();
    return sockets.map((s) => ({
      id: s.id,
      user: s.user || null
    }));
  };
  strapi2.$io.sendPrivateMessage = (socketId, event, data) => {
    io2.server.to(socketId).emit(event, data);
  };
  strapi2.$io.broadcast = (socketId, event, data) => {
    const socket = io2.server.sockets.sockets.get(socketId);
    if (socket) {
      socket.broadcast.emit(event, data);
    }
  };
  strapi2.$io.emitToNamespace = (namespace, event, data) => {
    const nsp = namespaces[namespace];
    if (nsp) {
      nsp.emit(event, data);
    }
  };
  strapi2.$io.disconnectSocket = (socketId, reason = "server disconnect") => {
    const socket = io2.server.sockets.sockets.get(socketId);
    if (socket) {
      socket.disconnect(true);
      return true;
    }
    return false;
  };
  strapi2.$io.subscribeToEntity = async (socketId, uid, id) => {
    const socket = io2.server.sockets.sockets.get(socketId);
    if (!socket) {
      return { success: false, error: "Socket not found" };
    }
    const contentType = strapi2.contentTypes[uid];
    if (!contentType) {
      return { success: false, error: "Content type not found" };
    }
    const entityRoomName = `${uid}:${id}`;
    socket.join(entityRoomName);
    strapi2.log.debug(`socket.io: Helper subscribed socket ${socketId} to entity: ${entityRoomName}`);
    return { success: true, room: entityRoomName, uid, id };
  };
  strapi2.$io.unsubscribeFromEntity = (socketId, uid, id) => {
    const socket = io2.server.sockets.sockets.get(socketId);
    if (!socket) {
      return { success: false, error: "Socket not found" };
    }
    const entityRoomName = `${uid}:${id}`;
    socket.leave(entityRoomName);
    strapi2.log.debug(`socket.io: Helper unsubscribed socket ${socketId} from entity: ${entityRoomName}`);
    return { success: true, room: entityRoomName, uid, id };
  };
  strapi2.$io.getEntitySubscriptions = (socketId) => {
    const socket = io2.server.sockets.sockets.get(socketId);
    if (!socket) {
      return { success: false, error: "Socket not found" };
    }
    const subscriptions = Array.from(socket.rooms).filter((r) => r !== socket.id && r.includes(":")).map((room) => {
      const parts = room.split(":");
      if (parts.length >= 3) {
        const uid = parts.slice(0, -1).join(":");
        const id = parts[parts.length - 1];
        return { uid, id, room };
      }
      return null;
    }).filter(Boolean);
    return { success: true, subscriptions };
  };
  strapi2.$io.emitToEntity = (uid, id, event, data) => {
    const entityRoomName = `${uid}:${id}`;
    io2.server.to(entityRoomName).emit(event, data);
    strapi2.log.debug(`socket.io: Emitted '${event}' to entity room: ${entityRoomName}`);
  };
  strapi2.$io.getEntityRoomSockets = async (uid, id) => {
    const entityRoomName = `${uid}:${id}`;
    const sockets = await io2.server.in(entityRoomName).fetchSockets();
    return sockets.map((s) => ({
      id: s.id,
      user: s.user || null
    }));
  };
  const allContentTypes = /* @__PURE__ */ new Set();
  Object.values(settings2.rolePermissions || {}).forEach((rolePerms) => {
    if (rolePerms.contentTypes) {
      Object.entries(rolePerms.contentTypes).forEach(([uid, actions]) => {
        if (actions.create || actions.update || actions.delete) {
          allContentTypes.add(uid);
        }
      });
    }
  });
  const enabledContentTypes = allContentTypes.size;
  const origins = settings2.cors?.origins?.join(", ") || "http://localhost:3000";
  const features = [];
  if (settings2.redis?.enabled) features.push("Redis");
  if (settings2.namespaces?.enabled) features.push(`Namespaces(${Object.keys(settings2.namespaces.list || {}).length})`);
  if (settings2.security?.rateLimiting?.enabled) features.push("RateLimit");
  strapi2.log.info(`socket.io: Plugin initialized`);
  strapi2.log.info(`  • Origins: ${origins}`);
  strapi2.log.info(`  • Content Types: ${enabledContentTypes}`);
  strapi2.log.info(`  • Max Connections: ${settings2.connection?.maxConnections || 1e3}`);
  if (features.length > 0) {
    strapi2.log.info(`  • Features: ${features.join(", ")}`);
  }
}
var io = { bootstrapIO: bootstrapIO$1 };
const storage = new AsyncLocalStorage();
const transactionCtx$1 = {
  async run(trx, cb) {
    const store = storage.getStore();
    return storage.run({
      trx,
      // Fill with existing callbacks if nesting transactions
      commitCallbacks: store?.commitCallbacks || [],
      rollbackCallbacks: store?.rollbackCallbacks || []
    }, cb);
  },
  get() {
    const store = storage.getStore();
    return store?.trx;
  },
  async commit(trx) {
    const store = storage.getStore();
    if (store?.trx) {
      store.trx = null;
    }
    await trx.commit();
    if (!store?.commitCallbacks.length) {
      return;
    }
    store.commitCallbacks.forEach((cb) => cb());
    store.commitCallbacks = [];
  },
  async rollback(trx) {
    const store = storage.getStore();
    if (store?.trx) {
      store.trx = null;
    }
    await trx.rollback();
    if (!store?.rollbackCallbacks.length) {
      return;
    }
    store.rollbackCallbacks.forEach((cb) => cb());
    store.rollbackCallbacks = [];
  },
  onCommit(cb) {
    const store = storage.getStore();
    if (store?.commitCallbacks) {
      store.commitCallbacks.push(cb);
    }
  },
  onRollback(cb) {
    const store = storage.getStore();
    if (store?.rollbackCallbacks) {
      store.rollbackCallbacks.push(cb);
    }
  }
};
const transactionContext = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  transactionCtx: transactionCtx$1
}, Symbol.toStringTag, { value: "Module" }));
const require$$0$2 = /* @__PURE__ */ getAugmentedNamespace(transactionContext);
let transactionCtx = null;
function getTransactionCtx() {
  if (!transactionCtx) {
    try {
      transactionCtx = require$$0$2.transactionCtx;
    } catch (error2) {
      console.warn("[@strapi-community/plugin-io] Unable to access transaction context:", error2.message);
      transactionCtx = { get: () => null, onCommit: () => {
      } };
    }
  }
  return transactionCtx;
}
const { pluginId: pluginId$3 } = pluginId_1;
function scheduleAfterTransaction(callback, delay = 0) {
  const runner = () => setTimeout(callback, delay);
  const ctx = getTransactionCtx();
  if (ctx.get()) {
    ctx.onCommit(runner);
  } else {
    runner();
  }
}
function isActionEnabled(strapi2, uid, action) {
  const settings2 = strapi2.$ioSettings || {};
  const rolePermissions = settings2.rolePermissions || {};
  for (const rolePerms of Object.values(rolePermissions)) {
    if (rolePerms.contentTypes?.[uid]?.[action] === true) {
      return true;
    }
  }
  return false;
}
async function bootstrapLifecycles$1({ strapi: strapi2 }) {
  const settings2 = strapi2.$ioSettings || {};
  const rolePermissions = settings2.rolePermissions || {};
  const allContentTypes = {};
  Object.values(rolePermissions).forEach((rolePerms) => {
    if (rolePerms.contentTypes) {
      Object.entries(rolePerms.contentTypes).forEach(([uid, actions]) => {
        if (!allContentTypes[uid]) {
          allContentTypes[uid] = { create: false, update: false, delete: false };
        }
        if (actions.create) allContentTypes[uid].create = true;
        if (actions.update) allContentTypes[uid].update = true;
        if (actions.delete) allContentTypes[uid].delete = true;
      });
    }
  });
  const enabledUids = Object.entries(allContentTypes).filter(([uid, actions]) => actions.create || actions.update || actions.delete).map(([uid]) => uid);
  enabledUids.forEach((uid) => {
    const subscriber = {
      models: [uid]
    };
    subscriber.afterCreate = async (event) => {
      if (!isActionEnabled(strapi2, uid, "create")) return;
      if (!event.result) {
        strapi2.log.debug(`socket.io: No result data in afterCreate for ${uid}`);
        return;
      }
      try {
        const eventData = {
          event: "create",
          schema: event.model,
          data: JSON.parse(JSON.stringify(event.result))
          // Deep clone
        };
        scheduleAfterTransaction(() => {
          try {
            strapi2.$io.emit(eventData);
          } catch (error2) {
            strapi2.log.error(`socket.io: Could not emit create event for ${uid}:`, error2.message);
          }
        });
      } catch (error2) {
        strapi2.log.error(`socket.io: Error cloning create event data for ${uid}:`, error2.message);
      }
    };
    subscriber.afterCreateMany = async (event) => {
      if (!isActionEnabled(strapi2, uid, "create")) return;
      const query = buildEventQuery({ event });
      if (query.filters) {
        const clonedQuery = JSON.parse(JSON.stringify(query));
        const modelInfo = { singularName: event.model.singularName, uid: event.model.uid };
        scheduleAfterTransaction(async () => {
          try {
            const records = await strapi2.documents(uid).findMany(clonedQuery);
            records.forEach((r) => {
              strapi2.$io.emit({
                event: "create",
                schema: { singularName: modelInfo.singularName, uid: modelInfo.uid },
                data: r
              });
            });
          } catch (error2) {
            strapi2.log.debug(`socket.io: Could not fetch records in afterCreateMany for ${uid}:`, error2.message);
          }
        }, 50);
      }
    };
    subscriber.afterUpdate = async (event) => {
      if (!isActionEnabled(strapi2, uid, "update")) return;
      const eventData = {
        event: "update",
        schema: event.model,
        data: JSON.parse(JSON.stringify(event.result))
        // Deep clone
      };
      scheduleAfterTransaction(() => {
        try {
          strapi2.$io.emit(eventData);
        } catch (error2) {
          strapi2.log.debug(`socket.io: Could not emit update event for ${uid}:`, error2.message);
        }
      });
    };
    subscriber.beforeUpdateMany = async (event) => {
      if (!isActionEnabled(strapi2, uid, "update")) return;
      if (!event.state.io) {
        event.state.io = {};
      }
      event.state.io.params = event.params;
    };
    subscriber.afterUpdateMany = async (event) => {
      if (!isActionEnabled(strapi2, uid, "update")) return;
      const params = event.state.io?.params;
      if (!params || !params.where) return;
      const clonedWhere = JSON.parse(JSON.stringify(params.where));
      const modelInfo = { singularName: event.model.singularName, uid: event.model.uid };
      scheduleAfterTransaction(async () => {
        try {
          const records = await strapi2.documents(uid).findMany({
            filters: clonedWhere
          });
          records.forEach((r) => {
            strapi2.$io.emit({
              event: "update",
              schema: { singularName: modelInfo.singularName, uid: modelInfo.uid },
              data: r
            });
          });
        } catch (error2) {
          strapi2.log.debug(`socket.io: Could not fetch records in afterUpdateMany for ${uid}:`, error2.message);
        }
      }, 50);
    };
    subscriber.afterDelete = async (event) => {
      if (!isActionEnabled(strapi2, uid, "delete")) return;
      const deleteData = {
        id: event.result?.id || event.result?.documentId,
        documentId: event.result?.documentId || event.result?.id
      };
      const modelInfo = {
        singularName: event.model.singularName,
        uid: event.model.uid
      };
      scheduleAfterTransaction(() => {
        try {
          const eventName = `${modelInfo.singularName}:delete`;
          strapi2.$io.raw({
            event: eventName,
            data: deleteData
          });
        } catch (error2) {
          strapi2.log.debug(`socket.io: Could not emit delete event for ${uid}:`, error2.message);
        }
      }, 100);
    };
    strapi2.db.lifecycles.subscribe(subscriber);
  });
  const configuredCount = enabledUids.length;
  if (configuredCount > 0) {
    strapi2.log.info(`socket.io: Lifecycle hooks registered for ${configuredCount} content type(s)`);
  }
}
function buildEventQuery({ event }) {
  const query = {};
  if (event.params.where) {
    query.filters = event.params.where;
  }
  if (event.result?.count) {
    query.limit = event.result.count;
  } else if (event.params.limit) {
    query.limit = event.params.limit;
  }
  if (event.action === "afterCreateMany") {
    query.filters = { id: event.result.ids };
  } else if (event.action === "beforeUpdate") {
    query.fields = ["id"];
  }
  return query;
}
var lifecycle = { bootstrapLifecycles: bootstrapLifecycles$1 };
const { bootstrapIO } = io;
const { bootstrapLifecycles } = lifecycle;
async function bootstrap$1({ strapi: strapi2 }) {
  await bootstrapIO({ strapi: strapi2 });
  bootstrapLifecycles({ strapi: strapi2 });
}
var bootstrap_1 = bootstrap$1;
var config$1 = {
  default() {
    return {
      events: [],
      hooks: {},
      socket: { serverOptions: { cors: { origin: "http://127.0.0.1:8080", methods: ["GET", "POST"] } } }
    };
  },
  validator(config2) {
  }
};
const { pluginId: pluginId$2 } = pluginId_1;
var settings$3 = ({ strapi: strapi2 }) => ({
  /**
   * GET /io/settings
   * Retrieve current plugin settings
   */
  async getSettings(ctx) {
    const settingsService = strapi2.plugin(pluginId$2).service("settings");
    const settings2 = await settingsService.getSettings();
    ctx.body = { data: settings2 };
  },
  /**
   * PUT /io/settings
   * Update plugin settings and hot-reload Socket.IO
   */
  async updateSettings(ctx) {
    const settingsService = strapi2.plugin(pluginId$2).service("settings");
    const { body } = ctx.request;
    await settingsService.getSettings();
    const updatedSettings = await settingsService.setSettings(body);
    strapi2.$ioSettings = updatedSettings;
    let reloaded = false;
    if (strapi2.$io?.server) {
      strapi2.log.info(`socket.io: Settings updated (origin: ${updatedSettings.cors?.origin}, contentTypes: ${updatedSettings.contentTypes?.length || 0})`);
      reloaded = true;
    }
    ctx.body = { data: updatedSettings, reloaded };
  },
  /**
   * GET /io/content-types
   * Get available content types for selection
   */
  async getContentTypes(ctx) {
    const contentTypes2 = Object.keys(strapi2.contentTypes).filter((uid) => uid.startsWith("api::")).map((uid) => {
      const ct = strapi2.contentTypes[uid];
      return {
        uid,
        displayName: ct.info?.displayName || ct.info?.singularName || uid,
        singularName: ct.info?.singularName,
        pluralName: ct.info?.pluralName
      };
    });
    ctx.body = { data: contentTypes2 };
  },
  /**
   * GET /io/stats
   * Get connection and event statistics
   */
  async getStats(ctx) {
    const monitoringService = strapi2.plugin(pluginId$2).service("monitoring");
    const connectionStats = monitoringService.getConnectionStats();
    const eventStats = monitoringService.getEventStats();
    ctx.body = {
      data: {
        connections: connectionStats,
        events: eventStats
      }
    };
  },
  /**
   * GET /io/event-log
   * Get recent event log
   */
  async getEventLog(ctx) {
    const monitoringService = strapi2.plugin(pluginId$2).service("monitoring");
    const limit = parseInt(ctx.query.limit) || 50;
    const log = monitoringService.getEventLog(limit);
    ctx.body = { data: log };
  },
  /**
   * POST /io/test-event
   * Send a test event
   */
  async sendTestEvent(ctx) {
    const monitoringService = strapi2.plugin(pluginId$2).service("monitoring");
    const { eventName, data } = ctx.request.body;
    try {
      const result = monitoringService.sendTestEvent(eventName || "test", data || {});
      ctx.body = { data: result };
    } catch (error2) {
      ctx.throw(500, error2.message);
    }
  },
  /**
   * POST /io/reset-stats
   * Reset monitoring statistics
   */
  async resetStats(ctx) {
    const monitoringService = strapi2.plugin(pluginId$2).service("monitoring");
    monitoringService.resetStats();
    ctx.body = { data: { success: true } };
  },
  /**
   * GET /io/roles
   * Get available user roles for permissions configuration
   */
  async getRoles(ctx) {
    const roles = await strapi2.documents("plugin::users-permissions.role").findMany({});
    ctx.body = {
      data: roles.map((role) => ({
        id: role.id,
        name: role.name,
        type: role.type,
        description: role.description
      }))
    };
  },
  /**
   * GET /io/monitoring/stats
   * Get lightweight stats for dashboard widget
   */
  async getMonitoringStats(ctx) {
    const monitoringService = strapi2.plugin(pluginId$2).service("monitoring");
    const connectionStats = monitoringService.getConnectionStats();
    const eventStats = monitoringService.getEventStats();
    ctx.body = {
      data: {
        connections: {
          connected: connectionStats.connected,
          rooms: connectionStats.rooms || []
        },
        events: {
          totalEvents: eventStats.totalEvents || 0,
          eventsPerSecond: eventStats.eventsPerSecond || 0,
          eventsByType: eventStats.eventsByType || {}
        },
        timestamp: Date.now()
      }
    };
  }
});
const settings$2 = settings$3;
var controllers$1 = {
  settings: settings$2
};
var admin$1 = {
  type: "admin",
  routes: [
    {
      method: "GET",
      path: "/settings",
      handler: "settings.getSettings",
      config: {
        policies: ["admin::isAuthenticatedAdmin"]
      }
    },
    {
      method: "PUT",
      path: "/settings",
      handler: "settings.updateSettings",
      config: {
        policies: ["admin::isAuthenticatedAdmin"]
      }
    },
    {
      method: "GET",
      path: "/content-types",
      handler: "settings.getContentTypes",
      config: {
        policies: ["admin::isAuthenticatedAdmin"]
      }
    },
    {
      method: "GET",
      path: "/stats",
      handler: "settings.getStats",
      config: {
        policies: ["admin::isAuthenticatedAdmin"]
      }
    },
    {
      method: "GET",
      path: "/event-log",
      handler: "settings.getEventLog",
      config: {
        policies: ["admin::isAuthenticatedAdmin"]
      }
    },
    {
      method: "POST",
      path: "/test-event",
      handler: "settings.sendTestEvent",
      config: {
        policies: ["admin::isAuthenticatedAdmin"]
      }
    },
    {
      method: "POST",
      path: "/reset-stats",
      handler: "settings.resetStats",
      config: {
        policies: ["admin::isAuthenticatedAdmin"]
      }
    },
    {
      method: "GET",
      path: "/roles",
      handler: "settings.getRoles",
      config: {
        policies: ["admin::isAuthenticatedAdmin"]
      }
    },
    {
      method: "GET",
      path: "/monitoring/stats",
      handler: "settings.getMonitoringStats",
      config: {
        policies: ["admin::isAuthenticatedAdmin"]
      }
    }
  ]
};
const admin = admin$1;
var routes$1 = {
  admin
};
var lodash_min = { exports: {} };
/**
 * @license
 * Lodash <https://lodash.com/>
 * Copyright OpenJS Foundation and other contributors <https://openjsf.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */
lodash_min.exports;
(function(module, exports$1) {
  (function() {
    function n(n2, t2, r2) {
      switch (r2.length) {
        case 0:
          return n2.call(t2);
        case 1:
          return n2.call(t2, r2[0]);
        case 2:
          return n2.call(t2, r2[0], r2[1]);
        case 3:
          return n2.call(t2, r2[0], r2[1], r2[2]);
      }
      return n2.apply(t2, r2);
    }
    function t(n2, t2, r2, e2) {
      for (var u2 = -1, i2 = null == n2 ? 0 : n2.length; ++u2 < i2; ) {
        var o2 = n2[u2];
        t2(e2, o2, r2(o2), n2);
      }
      return e2;
    }
    function r(n2, t2) {
      for (var r2 = -1, e2 = null == n2 ? 0 : n2.length; ++r2 < e2 && t2(n2[r2], r2, n2) !== false; ) ;
      return n2;
    }
    function e(n2, t2) {
      for (var r2 = null == n2 ? 0 : n2.length; r2-- && t2(n2[r2], r2, n2) !== false; ) ;
      return n2;
    }
    function u(n2, t2) {
      for (var r2 = -1, e2 = null == n2 ? 0 : n2.length; ++r2 < e2; ) if (!t2(n2[r2], r2, n2)) return false;
      return true;
    }
    function i(n2, t2) {
      for (var r2 = -1, e2 = null == n2 ? 0 : n2.length, u2 = 0, i2 = []; ++r2 < e2; ) {
        var o2 = n2[r2];
        t2(o2, r2, n2) && (i2[u2++] = o2);
      }
      return i2;
    }
    function o(n2, t2) {
      return !!(null == n2 ? 0 : n2.length) && y(n2, t2, 0) > -1;
    }
    function f(n2, t2, r2) {
      for (var e2 = -1, u2 = null == n2 ? 0 : n2.length; ++e2 < u2; ) if (r2(t2, n2[e2])) return true;
      return false;
    }
    function c(n2, t2) {
      for (var r2 = -1, e2 = null == n2 ? 0 : n2.length, u2 = Array(e2); ++r2 < e2; ) u2[r2] = t2(n2[r2], r2, n2);
      return u2;
    }
    function a(n2, t2) {
      for (var r2 = -1, e2 = t2.length, u2 = n2.length; ++r2 < e2; ) n2[u2 + r2] = t2[r2];
      return n2;
    }
    function l(n2, t2, r2, e2) {
      var u2 = -1, i2 = null == n2 ? 0 : n2.length;
      for (e2 && i2 && (r2 = n2[++u2]); ++u2 < i2; ) r2 = t2(r2, n2[u2], u2, n2);
      return r2;
    }
    function s(n2, t2, r2, e2) {
      var u2 = null == n2 ? 0 : n2.length;
      for (e2 && u2 && (r2 = n2[--u2]); u2--; ) r2 = t2(r2, n2[u2], u2, n2);
      return r2;
    }
    function h(n2, t2) {
      for (var r2 = -1, e2 = null == n2 ? 0 : n2.length; ++r2 < e2; ) if (t2(n2[r2], r2, n2)) return true;
      return false;
    }
    function p(n2) {
      return n2.split("");
    }
    function _2(n2) {
      return n2.match($t) || [];
    }
    function v(n2, t2, r2) {
      var e2;
      return r2(n2, function(n3, r3, u2) {
        if (t2(n3, r3, u2)) return e2 = r3, false;
      }), e2;
    }
    function g(n2, t2, r2, e2) {
      for (var u2 = n2.length, i2 = r2 + (e2 ? 1 : -1); e2 ? i2-- : ++i2 < u2; ) if (t2(n2[i2], i2, n2)) return i2;
      return -1;
    }
    function y(n2, t2, r2) {
      return t2 === t2 ? Z(n2, t2, r2) : g(n2, b, r2);
    }
    function d(n2, t2, r2, e2) {
      for (var u2 = r2 - 1, i2 = n2.length; ++u2 < i2; ) if (e2(n2[u2], t2)) return u2;
      return -1;
    }
    function b(n2) {
      return n2 !== n2;
    }
    function w(n2, t2) {
      var r2 = null == n2 ? 0 : n2.length;
      return r2 ? k(n2, t2) / r2 : Cn;
    }
    function m(n2) {
      return function(t2) {
        return null == t2 ? X : t2[n2];
      };
    }
    function x(n2) {
      return function(t2) {
        return null == n2 ? X : n2[t2];
      };
    }
    function j(n2, t2, r2, e2, u2) {
      return u2(n2, function(n3, u3, i2) {
        r2 = e2 ? (e2 = false, n3) : t2(r2, n3, u3, i2);
      }), r2;
    }
    function A(n2, t2) {
      var r2 = n2.length;
      for (n2.sort(t2); r2--; ) n2[r2] = n2[r2].value;
      return n2;
    }
    function k(n2, t2) {
      for (var r2, e2 = -1, u2 = n2.length; ++e2 < u2; ) {
        var i2 = t2(n2[e2]);
        i2 !== X && (r2 = r2 === X ? i2 : r2 + i2);
      }
      return r2;
    }
    function O(n2, t2) {
      for (var r2 = -1, e2 = Array(n2); ++r2 < n2; ) e2[r2] = t2(r2);
      return e2;
    }
    function I(n2, t2) {
      return c(t2, function(t3) {
        return [t3, n2[t3]];
      });
    }
    function R(n2) {
      return n2 ? n2.slice(0, H(n2) + 1).replace(Lt, "") : n2;
    }
    function z2(n2) {
      return function(t2) {
        return n2(t2);
      };
    }
    function E(n2, t2) {
      return c(t2, function(t3) {
        return n2[t3];
      });
    }
    function S(n2, t2) {
      return n2.has(t2);
    }
    function W(n2, t2) {
      for (var r2 = -1, e2 = n2.length; ++r2 < e2 && y(t2, n2[r2], 0) > -1; ) ;
      return r2;
    }
    function L(n2, t2) {
      for (var r2 = n2.length; r2-- && y(t2, n2[r2], 0) > -1; ) ;
      return r2;
    }
    function C(n2, t2) {
      for (var r2 = n2.length, e2 = 0; r2--; ) n2[r2] === t2 && ++e2;
      return e2;
    }
    function U(n2) {
      return "\\" + Yr[n2];
    }
    function B(n2, t2) {
      return null == n2 ? X : n2[t2];
    }
    function T(n2) {
      return Nr.test(n2);
    }
    function $(n2) {
      return Pr.test(n2);
    }
    function D(n2) {
      for (var t2, r2 = []; !(t2 = n2.next()).done; ) r2.push(t2.value);
      return r2;
    }
    function M(n2) {
      var t2 = -1, r2 = Array(n2.size);
      return n2.forEach(function(n3, e2) {
        r2[++t2] = [e2, n3];
      }), r2;
    }
    function F(n2, t2) {
      return function(r2) {
        return n2(t2(r2));
      };
    }
    function N(n2, t2) {
      for (var r2 = -1, e2 = n2.length, u2 = 0, i2 = []; ++r2 < e2; ) {
        var o2 = n2[r2];
        o2 !== t2 && o2 !== cn || (n2[r2] = cn, i2[u2++] = r2);
      }
      return i2;
    }
    function P(n2) {
      var t2 = -1, r2 = Array(n2.size);
      return n2.forEach(function(n3) {
        r2[++t2] = n3;
      }), r2;
    }
    function q(n2) {
      var t2 = -1, r2 = Array(n2.size);
      return n2.forEach(function(n3) {
        r2[++t2] = [n3, n3];
      }), r2;
    }
    function Z(n2, t2, r2) {
      for (var e2 = r2 - 1, u2 = n2.length; ++e2 < u2; ) if (n2[e2] === t2) return e2;
      return -1;
    }
    function K(n2, t2, r2) {
      for (var e2 = r2 + 1; e2--; ) if (n2[e2] === t2) return e2;
      return e2;
    }
    function V(n2) {
      return T(n2) ? J(n2) : _e(n2);
    }
    function G(n2) {
      return T(n2) ? Y(n2) : p(n2);
    }
    function H(n2) {
      for (var t2 = n2.length; t2-- && Ct.test(n2.charAt(t2)); ) ;
      return t2;
    }
    function J(n2) {
      for (var t2 = Mr.lastIndex = 0; Mr.test(n2); ) ++t2;
      return t2;
    }
    function Y(n2) {
      return n2.match(Mr) || [];
    }
    function Q(n2) {
      return n2.match(Fr) || [];
    }
    var X, nn = "4.17.21", tn = 200, rn = "Unsupported core-js use. Try https://npms.io/search?q=ponyfill.", en = "Expected a function", un = "Invalid `variable` option passed into `_.template`", on = "__lodash_hash_undefined__", fn = 500, cn = "__lodash_placeholder__", an = 1, ln = 2, sn = 4, hn = 1, pn = 2, _n = 1, vn = 2, gn = 4, yn = 8, dn = 16, bn = 32, wn = 64, mn = 128, xn = 256, jn = 512, An = 30, kn = "...", On = 800, In = 16, Rn = 1, zn = 2, En = 3, Sn = 1 / 0, Wn = 9007199254740991, Ln = 17976931348623157e292, Cn = NaN, Un = 4294967295, Bn = Un - 1, Tn = Un >>> 1, $n = [["ary", mn], ["bind", _n], ["bindKey", vn], ["curry", yn], ["curryRight", dn], ["flip", jn], ["partial", bn], ["partialRight", wn], ["rearg", xn]], Dn = "[object Arguments]", Mn = "[object Array]", Fn = "[object AsyncFunction]", Nn = "[object Boolean]", Pn = "[object Date]", qn = "[object DOMException]", Zn = "[object Error]", Kn = "[object Function]", Vn = "[object GeneratorFunction]", Gn = "[object Map]", Hn = "[object Number]", Jn = "[object Null]", Yn = "[object Object]", Qn = "[object Promise]", Xn = "[object Proxy]", nt = "[object RegExp]", tt = "[object Set]", rt = "[object String]", et = "[object Symbol]", ut = "[object Undefined]", it = "[object WeakMap]", ot = "[object WeakSet]", ft = "[object ArrayBuffer]", ct = "[object DataView]", at = "[object Float32Array]", lt = "[object Float64Array]", st = "[object Int8Array]", ht = "[object Int16Array]", pt = "[object Int32Array]", _t = "[object Uint8Array]", vt = "[object Uint8ClampedArray]", gt = "[object Uint16Array]", yt = "[object Uint32Array]", dt = /\b__p \+= '';/g, bt = /\b(__p \+=) '' \+/g, wt = /(__e\(.*?\)|\b__t\)) \+\n'';/g, mt = /&(?:amp|lt|gt|quot|#39);/g, xt = /[&<>"']/g, jt = RegExp(mt.source), At = RegExp(xt.source), kt = /<%-([\s\S]+?)%>/g, Ot = /<%([\s\S]+?)%>/g, It = /<%=([\s\S]+?)%>/g, Rt = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/, zt = /^\w*$/, Et = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g, St = /[\\^$.*+?()[\]{}|]/g, Wt = RegExp(St.source), Lt = /^\s+/, Ct = /\s/, Ut = /\{(?:\n\/\* \[wrapped with .+\] \*\/)?\n?/, Bt = /\{\n\/\* \[wrapped with (.+)\] \*/, Tt = /,? & /, $t = /[^\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]+/g, Dt = /[()=,{}\[\]\/\s]/, Mt = /\\(\\)?/g, Ft = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g, Nt = /\w*$/, Pt = /^[-+]0x[0-9a-f]+$/i, qt = /^0b[01]+$/i, Zt = /^\[object .+?Constructor\]$/, Kt = /^0o[0-7]+$/i, Vt = /^(?:0|[1-9]\d*)$/, Gt = /[\xc0-\xd6\xd8-\xf6\xf8-\xff\u0100-\u017f]/g, Ht = /($^)/, Jt = /['\n\r\u2028\u2029\\]/g, Yt = "\\ud800-\\udfff", Qt = "\\u0300-\\u036f", Xt = "\\ufe20-\\ufe2f", nr = "\\u20d0-\\u20ff", tr = Qt + Xt + nr, rr = "\\u2700-\\u27bf", er = "a-z\\xdf-\\xf6\\xf8-\\xff", ur = "\\xac\\xb1\\xd7\\xf7", ir = "\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf", or = "\\u2000-\\u206f", fr = " \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000", cr = "A-Z\\xc0-\\xd6\\xd8-\\xde", ar = "\\ufe0e\\ufe0f", lr = ur + ir + or + fr, sr = "['’]", hr = "[" + Yt + "]", pr = "[" + lr + "]", _r = "[" + tr + "]", vr = "\\d+", gr = "[" + rr + "]", yr = "[" + er + "]", dr = "[^" + Yt + lr + vr + rr + er + cr + "]", br = "\\ud83c[\\udffb-\\udfff]", wr = "(?:" + _r + "|" + br + ")", mr = "[^" + Yt + "]", xr = "(?:\\ud83c[\\udde6-\\uddff]){2}", jr = "[\\ud800-\\udbff][\\udc00-\\udfff]", Ar = "[" + cr + "]", kr = "\\u200d", Or = "(?:" + yr + "|" + dr + ")", Ir = "(?:" + Ar + "|" + dr + ")", Rr = "(?:" + sr + "(?:d|ll|m|re|s|t|ve))?", zr = "(?:" + sr + "(?:D|LL|M|RE|S|T|VE))?", Er = wr + "?", Sr = "[" + ar + "]?", Wr = "(?:" + kr + "(?:" + [mr, xr, jr].join("|") + ")" + Sr + Er + ")*", Lr = "\\d*(?:1st|2nd|3rd|(?![123])\\dth)(?=\\b|[A-Z_])", Cr = "\\d*(?:1ST|2ND|3RD|(?![123])\\dTH)(?=\\b|[a-z_])", Ur = Sr + Er + Wr, Br = "(?:" + [gr, xr, jr].join("|") + ")" + Ur, Tr = "(?:" + [mr + _r + "?", _r, xr, jr, hr].join("|") + ")", $r = RegExp(sr, "g"), Dr = RegExp(_r, "g"), Mr = RegExp(br + "(?=" + br + ")|" + Tr + Ur, "g"), Fr = RegExp([Ar + "?" + yr + "+" + Rr + "(?=" + [pr, Ar, "$"].join("|") + ")", Ir + "+" + zr + "(?=" + [pr, Ar + Or, "$"].join("|") + ")", Ar + "?" + Or + "+" + Rr, Ar + "+" + zr, Cr, Lr, vr, Br].join("|"), "g"), Nr = RegExp("[" + kr + Yt + tr + ar + "]"), Pr = /[a-z][A-Z]|[A-Z]{2}[a-z]|[0-9][a-zA-Z]|[a-zA-Z][0-9]|[^a-zA-Z0-9 ]/, qr = ["Array", "Buffer", "DataView", "Date", "Error", "Float32Array", "Float64Array", "Function", "Int8Array", "Int16Array", "Int32Array", "Map", "Math", "Object", "Promise", "RegExp", "Set", "String", "Symbol", "TypeError", "Uint8Array", "Uint8ClampedArray", "Uint16Array", "Uint32Array", "WeakMap", "_", "clearTimeout", "isFinite", "parseInt", "setTimeout"], Zr = -1, Kr = {};
    Kr[at] = Kr[lt] = Kr[st] = Kr[ht] = Kr[pt] = Kr[_t] = Kr[vt] = Kr[gt] = Kr[yt] = true, Kr[Dn] = Kr[Mn] = Kr[ft] = Kr[Nn] = Kr[ct] = Kr[Pn] = Kr[Zn] = Kr[Kn] = Kr[Gn] = Kr[Hn] = Kr[Yn] = Kr[nt] = Kr[tt] = Kr[rt] = Kr[it] = false;
    var Vr = {};
    Vr[Dn] = Vr[Mn] = Vr[ft] = Vr[ct] = Vr[Nn] = Vr[Pn] = Vr[at] = Vr[lt] = Vr[st] = Vr[ht] = Vr[pt] = Vr[Gn] = Vr[Hn] = Vr[Yn] = Vr[nt] = Vr[tt] = Vr[rt] = Vr[et] = Vr[_t] = Vr[vt] = Vr[gt] = Vr[yt] = true, Vr[Zn] = Vr[Kn] = Vr[it] = false;
    var Gr = {
      "À": "A",
      "Á": "A",
      "Â": "A",
      "Ã": "A",
      "Ä": "A",
      "Å": "A",
      "à": "a",
      "á": "a",
      "â": "a",
      "ã": "a",
      "ä": "a",
      "å": "a",
      "Ç": "C",
      "ç": "c",
      "Ð": "D",
      "ð": "d",
      "È": "E",
      "É": "E",
      "Ê": "E",
      "Ë": "E",
      "è": "e",
      "é": "e",
      "ê": "e",
      "ë": "e",
      "Ì": "I",
      "Í": "I",
      "Î": "I",
      "Ï": "I",
      "ì": "i",
      "í": "i",
      "î": "i",
      "ï": "i",
      "Ñ": "N",
      "ñ": "n",
      "Ò": "O",
      "Ó": "O",
      "Ô": "O",
      "Õ": "O",
      "Ö": "O",
      "Ø": "O",
      "ò": "o",
      "ó": "o",
      "ô": "o",
      "õ": "o",
      "ö": "o",
      "ø": "o",
      "Ù": "U",
      "Ú": "U",
      "Û": "U",
      "Ü": "U",
      "ù": "u",
      "ú": "u",
      "û": "u",
      "ü": "u",
      "Ý": "Y",
      "ý": "y",
      "ÿ": "y",
      "Æ": "Ae",
      "æ": "ae",
      "Þ": "Th",
      "þ": "th",
      "ß": "ss",
      "Ā": "A",
      "Ă": "A",
      "Ą": "A",
      "ā": "a",
      "ă": "a",
      "ą": "a",
      "Ć": "C",
      "Ĉ": "C",
      "Ċ": "C",
      "Č": "C",
      "ć": "c",
      "ĉ": "c",
      "ċ": "c",
      "č": "c",
      "Ď": "D",
      "Đ": "D",
      "ď": "d",
      "đ": "d",
      "Ē": "E",
      "Ĕ": "E",
      "Ė": "E",
      "Ę": "E",
      "Ě": "E",
      "ē": "e",
      "ĕ": "e",
      "ė": "e",
      "ę": "e",
      "ě": "e",
      "Ĝ": "G",
      "Ğ": "G",
      "Ġ": "G",
      "Ģ": "G",
      "ĝ": "g",
      "ğ": "g",
      "ġ": "g",
      "ģ": "g",
      "Ĥ": "H",
      "Ħ": "H",
      "ĥ": "h",
      "ħ": "h",
      "Ĩ": "I",
      "Ī": "I",
      "Ĭ": "I",
      "Į": "I",
      "İ": "I",
      "ĩ": "i",
      "ī": "i",
      "ĭ": "i",
      "į": "i",
      "ı": "i",
      "Ĵ": "J",
      "ĵ": "j",
      "Ķ": "K",
      "ķ": "k",
      "ĸ": "k",
      "Ĺ": "L",
      "Ļ": "L",
      "Ľ": "L",
      "Ŀ": "L",
      "Ł": "L",
      "ĺ": "l",
      "ļ": "l",
      "ľ": "l",
      "ŀ": "l",
      "ł": "l",
      "Ń": "N",
      "Ņ": "N",
      "Ň": "N",
      "Ŋ": "N",
      "ń": "n",
      "ņ": "n",
      "ň": "n",
      "ŋ": "n",
      "Ō": "O",
      "Ŏ": "O",
      "Ő": "O",
      "ō": "o",
      "ŏ": "o",
      "ő": "o",
      "Ŕ": "R",
      "Ŗ": "R",
      "Ř": "R",
      "ŕ": "r",
      "ŗ": "r",
      "ř": "r",
      "Ś": "S",
      "Ŝ": "S",
      "Ş": "S",
      "Š": "S",
      "ś": "s",
      "ŝ": "s",
      "ş": "s",
      "š": "s",
      "Ţ": "T",
      "Ť": "T",
      "Ŧ": "T",
      "ţ": "t",
      "ť": "t",
      "ŧ": "t",
      "Ũ": "U",
      "Ū": "U",
      "Ŭ": "U",
      "Ů": "U",
      "Ű": "U",
      "Ų": "U",
      "ũ": "u",
      "ū": "u",
      "ŭ": "u",
      "ů": "u",
      "ű": "u",
      "ų": "u",
      "Ŵ": "W",
      "ŵ": "w",
      "Ŷ": "Y",
      "ŷ": "y",
      "Ÿ": "Y",
      "Ź": "Z",
      "Ż": "Z",
      "Ž": "Z",
      "ź": "z",
      "ż": "z",
      "ž": "z",
      "Ĳ": "IJ",
      "ĳ": "ij",
      "Œ": "Oe",
      "œ": "oe",
      "ŉ": "'n",
      "ſ": "s"
    }, Hr = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }, Jr = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" }, Yr = { "\\": "\\", "'": "'", "\n": "n", "\r": "r", "\u2028": "u2028", "\u2029": "u2029" }, Qr = parseFloat, Xr = parseInt, ne = "object" == typeof commonjsGlobal && commonjsGlobal && commonjsGlobal.Object === Object && commonjsGlobal, te = "object" == typeof self && self && self.Object === Object && self, re = ne || te || Function("return this")(), ee = exports$1 && !exports$1.nodeType && exports$1, ue = ee && true && module && !module.nodeType && module, ie = ue && ue.exports === ee, oe = ie && ne.process, fe = function() {
      try {
        var n2 = ue && ue.require && ue.require("util").types;
        return n2 ? n2 : oe && oe.binding && oe.binding("util");
      } catch (n3) {
      }
    }(), ce = fe && fe.isArrayBuffer, ae = fe && fe.isDate, le = fe && fe.isMap, se = fe && fe.isRegExp, he = fe && fe.isSet, pe = fe && fe.isTypedArray, _e = m("length"), ve = x(Gr), ge = x(Hr), ye = x(Jr), de = function p2(x2) {
      function Z2(n2) {
        if (cc(n2) && !bh(n2) && !(n2 instanceof Ct2)) {
          if (n2 instanceof Y2) return n2;
          if (bl.call(n2, "__wrapped__")) return eo(n2);
        }
        return new Y2(n2);
      }
      function J2() {
      }
      function Y2(n2, t2) {
        this.__wrapped__ = n2, this.__actions__ = [], this.__chain__ = !!t2, this.__index__ = 0, this.__values__ = X;
      }
      function Ct2(n2) {
        this.__wrapped__ = n2, this.__actions__ = [], this.__dir__ = 1, this.__filtered__ = false, this.__iteratees__ = [], this.__takeCount__ = Un, this.__views__ = [];
      }
      function $t2() {
        var n2 = new Ct2(this.__wrapped__);
        return n2.__actions__ = Tu(this.__actions__), n2.__dir__ = this.__dir__, n2.__filtered__ = this.__filtered__, n2.__iteratees__ = Tu(this.__iteratees__), n2.__takeCount__ = this.__takeCount__, n2.__views__ = Tu(this.__views__), n2;
      }
      function Yt2() {
        if (this.__filtered__) {
          var n2 = new Ct2(this);
          n2.__dir__ = -1, n2.__filtered__ = true;
        } else n2 = this.clone(), n2.__dir__ *= -1;
        return n2;
      }
      function Qt2() {
        var n2 = this.__wrapped__.value(), t2 = this.__dir__, r2 = bh(n2), e2 = t2 < 0, u2 = r2 ? n2.length : 0, i2 = Oi(0, u2, this.__views__), o2 = i2.start, f2 = i2.end, c2 = f2 - o2, a2 = e2 ? f2 : o2 - 1, l2 = this.__iteratees__, s2 = l2.length, h2 = 0, p3 = Hl(c2, this.__takeCount__);
        if (!r2 || !e2 && u2 == c2 && p3 == c2) return wu(n2, this.__actions__);
        var _3 = [];
        n: for (; c2-- && h2 < p3; ) {
          a2 += t2;
          for (var v2 = -1, g2 = n2[a2]; ++v2 < s2; ) {
            var y2 = l2[v2], d2 = y2.iteratee, b2 = y2.type, w2 = d2(g2);
            if (b2 == zn) g2 = w2;
            else if (!w2) {
              if (b2 == Rn) continue n;
              break n;
            }
          }
          _3[h2++] = g2;
        }
        return _3;
      }
      function Xt2(n2) {
        var t2 = -1, r2 = null == n2 ? 0 : n2.length;
        for (this.clear(); ++t2 < r2; ) {
          var e2 = n2[t2];
          this.set(e2[0], e2[1]);
        }
      }
      function nr2() {
        this.__data__ = is ? is(null) : {}, this.size = 0;
      }
      function tr2(n2) {
        var t2 = this.has(n2) && delete this.__data__[n2];
        return this.size -= t2 ? 1 : 0, t2;
      }
      function rr2(n2) {
        var t2 = this.__data__;
        if (is) {
          var r2 = t2[n2];
          return r2 === on ? X : r2;
        }
        return bl.call(t2, n2) ? t2[n2] : X;
      }
      function er2(n2) {
        var t2 = this.__data__;
        return is ? t2[n2] !== X : bl.call(t2, n2);
      }
      function ur2(n2, t2) {
        var r2 = this.__data__;
        return this.size += this.has(n2) ? 0 : 1, r2[n2] = is && t2 === X ? on : t2, this;
      }
      function ir2(n2) {
        var t2 = -1, r2 = null == n2 ? 0 : n2.length;
        for (this.clear(); ++t2 < r2; ) {
          var e2 = n2[t2];
          this.set(e2[0], e2[1]);
        }
      }
      function or2() {
        this.__data__ = [], this.size = 0;
      }
      function fr2(n2) {
        var t2 = this.__data__, r2 = Wr2(t2, n2);
        return !(r2 < 0) && (r2 == t2.length - 1 ? t2.pop() : Ll.call(t2, r2, 1), --this.size, true);
      }
      function cr2(n2) {
        var t2 = this.__data__, r2 = Wr2(t2, n2);
        return r2 < 0 ? X : t2[r2][1];
      }
      function ar2(n2) {
        return Wr2(this.__data__, n2) > -1;
      }
      function lr2(n2, t2) {
        var r2 = this.__data__, e2 = Wr2(r2, n2);
        return e2 < 0 ? (++this.size, r2.push([n2, t2])) : r2[e2][1] = t2, this;
      }
      function sr2(n2) {
        var t2 = -1, r2 = null == n2 ? 0 : n2.length;
        for (this.clear(); ++t2 < r2; ) {
          var e2 = n2[t2];
          this.set(e2[0], e2[1]);
        }
      }
      function hr2() {
        this.size = 0, this.__data__ = { hash: new Xt2(), map: new (ts || ir2)(), string: new Xt2() };
      }
      function pr2(n2) {
        var t2 = xi(this, n2).delete(n2);
        return this.size -= t2 ? 1 : 0, t2;
      }
      function _r2(n2) {
        return xi(this, n2).get(n2);
      }
      function vr2(n2) {
        return xi(this, n2).has(n2);
      }
      function gr2(n2, t2) {
        var r2 = xi(this, n2), e2 = r2.size;
        return r2.set(n2, t2), this.size += r2.size == e2 ? 0 : 1, this;
      }
      function yr2(n2) {
        var t2 = -1, r2 = null == n2 ? 0 : n2.length;
        for (this.__data__ = new sr2(); ++t2 < r2; ) this.add(n2[t2]);
      }
      function dr2(n2) {
        return this.__data__.set(n2, on), this;
      }
      function br2(n2) {
        return this.__data__.has(n2);
      }
      function wr2(n2) {
        this.size = (this.__data__ = new ir2(n2)).size;
      }
      function mr2() {
        this.__data__ = new ir2(), this.size = 0;
      }
      function xr2(n2) {
        var t2 = this.__data__, r2 = t2.delete(n2);
        return this.size = t2.size, r2;
      }
      function jr2(n2) {
        return this.__data__.get(n2);
      }
      function Ar2(n2) {
        return this.__data__.has(n2);
      }
      function kr2(n2, t2) {
        var r2 = this.__data__;
        if (r2 instanceof ir2) {
          var e2 = r2.__data__;
          if (!ts || e2.length < tn - 1) return e2.push([n2, t2]), this.size = ++r2.size, this;
          r2 = this.__data__ = new sr2(e2);
        }
        return r2.set(n2, t2), this.size = r2.size, this;
      }
      function Or2(n2, t2) {
        var r2 = bh(n2), e2 = !r2 && dh(n2), u2 = !r2 && !e2 && mh(n2), i2 = !r2 && !e2 && !u2 && Oh(n2), o2 = r2 || e2 || u2 || i2, f2 = o2 ? O(n2.length, hl) : [], c2 = f2.length;
        for (var a2 in n2) !t2 && !bl.call(n2, a2) || o2 && ("length" == a2 || u2 && ("offset" == a2 || "parent" == a2) || i2 && ("buffer" == a2 || "byteLength" == a2 || "byteOffset" == a2) || Ci(a2, c2)) || f2.push(a2);
        return f2;
      }
      function Ir2(n2) {
        var t2 = n2.length;
        return t2 ? n2[tu(0, t2 - 1)] : X;
      }
      function Rr2(n2, t2) {
        return Xi(Tu(n2), Mr2(t2, 0, n2.length));
      }
      function zr2(n2) {
        return Xi(Tu(n2));
      }
      function Er2(n2, t2, r2) {
        (r2 === X || Gf(n2[t2], r2)) && (r2 !== X || t2 in n2) || Br2(n2, t2, r2);
      }
      function Sr2(n2, t2, r2) {
        var e2 = n2[t2];
        bl.call(n2, t2) && Gf(e2, r2) && (r2 !== X || t2 in n2) || Br2(n2, t2, r2);
      }
      function Wr2(n2, t2) {
        for (var r2 = n2.length; r2--; ) if (Gf(n2[r2][0], t2)) return r2;
        return -1;
      }
      function Lr2(n2, t2, r2, e2) {
        return ys(n2, function(n3, u2, i2) {
          t2(e2, n3, r2(n3), i2);
        }), e2;
      }
      function Cr2(n2, t2) {
        return n2 && $u(t2, Pc(t2), n2);
      }
      function Ur2(n2, t2) {
        return n2 && $u(t2, qc(t2), n2);
      }
      function Br2(n2, t2, r2) {
        "__proto__" == t2 && Tl ? Tl(n2, t2, { configurable: true, enumerable: true, value: r2, writable: true }) : n2[t2] = r2;
      }
      function Tr2(n2, t2) {
        for (var r2 = -1, e2 = t2.length, u2 = il(e2), i2 = null == n2; ++r2 < e2; ) u2[r2] = i2 ? X : Mc(n2, t2[r2]);
        return u2;
      }
      function Mr2(n2, t2, r2) {
        return n2 === n2 && (r2 !== X && (n2 = n2 <= r2 ? n2 : r2), t2 !== X && (n2 = n2 >= t2 ? n2 : t2)), n2;
      }
      function Fr2(n2, t2, e2, u2, i2, o2) {
        var f2, c2 = t2 & an, a2 = t2 & ln, l2 = t2 & sn;
        if (e2 && (f2 = i2 ? e2(n2, u2, i2, o2) : e2(n2)), f2 !== X) return f2;
        if (!fc(n2)) return n2;
        var s2 = bh(n2);
        if (s2) {
          if (f2 = zi(n2), !c2) return Tu(n2, f2);
        } else {
          var h2 = zs(n2), p3 = h2 == Kn || h2 == Vn;
          if (mh(n2)) return Iu(n2, c2);
          if (h2 == Yn || h2 == Dn || p3 && !i2) {
            if (f2 = a2 || p3 ? {} : Ei(n2), !c2) return a2 ? Mu(n2, Ur2(f2, n2)) : Du(n2, Cr2(f2, n2));
          } else {
            if (!Vr[h2]) return i2 ? n2 : {};
            f2 = Si(n2, h2, c2);
          }
        }
        o2 || (o2 = new wr2());
        var _3 = o2.get(n2);
        if (_3) return _3;
        o2.set(n2, f2), kh(n2) ? n2.forEach(function(r2) {
          f2.add(Fr2(r2, t2, e2, r2, n2, o2));
        }) : jh(n2) && n2.forEach(function(r2, u3) {
          f2.set(u3, Fr2(r2, t2, e2, u3, n2, o2));
        });
        var v2 = l2 ? a2 ? di : yi : a2 ? qc : Pc, g2 = s2 ? X : v2(n2);
        return r(g2 || n2, function(r2, u3) {
          g2 && (u3 = r2, r2 = n2[u3]), Sr2(f2, u3, Fr2(r2, t2, e2, u3, n2, o2));
        }), f2;
      }
      function Nr2(n2) {
        var t2 = Pc(n2);
        return function(r2) {
          return Pr2(r2, n2, t2);
        };
      }
      function Pr2(n2, t2, r2) {
        var e2 = r2.length;
        if (null == n2) return !e2;
        for (n2 = ll(n2); e2--; ) {
          var u2 = r2[e2], i2 = t2[u2], o2 = n2[u2];
          if (o2 === X && !(u2 in n2) || !i2(o2)) return false;
        }
        return true;
      }
      function Gr2(n2, t2, r2) {
        if ("function" != typeof n2) throw new pl(en);
        return Ws(function() {
          n2.apply(X, r2);
        }, t2);
      }
      function Hr2(n2, t2, r2, e2) {
        var u2 = -1, i2 = o, a2 = true, l2 = n2.length, s2 = [], h2 = t2.length;
        if (!l2) return s2;
        r2 && (t2 = c(t2, z2(r2))), e2 ? (i2 = f, a2 = false) : t2.length >= tn && (i2 = S, a2 = false, t2 = new yr2(t2));
        n: for (; ++u2 < l2; ) {
          var p3 = n2[u2], _3 = null == r2 ? p3 : r2(p3);
          if (p3 = e2 || 0 !== p3 ? p3 : 0, a2 && _3 === _3) {
            for (var v2 = h2; v2--; ) if (t2[v2] === _3) continue n;
            s2.push(p3);
          } else i2(t2, _3, e2) || s2.push(p3);
        }
        return s2;
      }
      function Jr2(n2, t2) {
        var r2 = true;
        return ys(n2, function(n3, e2, u2) {
          return r2 = !!t2(n3, e2, u2);
        }), r2;
      }
      function Yr2(n2, t2, r2) {
        for (var e2 = -1, u2 = n2.length; ++e2 < u2; ) {
          var i2 = n2[e2], o2 = t2(i2);
          if (null != o2 && (f2 === X ? o2 === o2 && !bc(o2) : r2(o2, f2))) var f2 = o2, c2 = i2;
        }
        return c2;
      }
      function ne2(n2, t2, r2, e2) {
        var u2 = n2.length;
        for (r2 = kc(r2), r2 < 0 && (r2 = -r2 > u2 ? 0 : u2 + r2), e2 = e2 === X || e2 > u2 ? u2 : kc(e2), e2 < 0 && (e2 += u2), e2 = r2 > e2 ? 0 : Oc(e2); r2 < e2; ) n2[r2++] = t2;
        return n2;
      }
      function te2(n2, t2) {
        var r2 = [];
        return ys(n2, function(n3, e2, u2) {
          t2(n3, e2, u2) && r2.push(n3);
        }), r2;
      }
      function ee2(n2, t2, r2, e2, u2) {
        var i2 = -1, o2 = n2.length;
        for (r2 || (r2 = Li), u2 || (u2 = []); ++i2 < o2; ) {
          var f2 = n2[i2];
          t2 > 0 && r2(f2) ? t2 > 1 ? ee2(f2, t2 - 1, r2, e2, u2) : a(u2, f2) : e2 || (u2[u2.length] = f2);
        }
        return u2;
      }
      function ue2(n2, t2) {
        return n2 && bs(n2, t2, Pc);
      }
      function oe2(n2, t2) {
        return n2 && ws(n2, t2, Pc);
      }
      function fe2(n2, t2) {
        return i(t2, function(t3) {
          return uc(n2[t3]);
        });
      }
      function _e2(n2, t2) {
        t2 = ku(t2, n2);
        for (var r2 = 0, e2 = t2.length; null != n2 && r2 < e2; ) n2 = n2[no(t2[r2++])];
        return r2 && r2 == e2 ? n2 : X;
      }
      function de2(n2, t2, r2) {
        var e2 = t2(n2);
        return bh(n2) ? e2 : a(e2, r2(n2));
      }
      function we(n2) {
        return null == n2 ? n2 === X ? ut : Jn : Bl && Bl in ll(n2) ? ki(n2) : Ki(n2);
      }
      function me(n2, t2) {
        return n2 > t2;
      }
      function xe(n2, t2) {
        return null != n2 && bl.call(n2, t2);
      }
      function je(n2, t2) {
        return null != n2 && t2 in ll(n2);
      }
      function Ae(n2, t2, r2) {
        return n2 >= Hl(t2, r2) && n2 < Gl(t2, r2);
      }
      function ke(n2, t2, r2) {
        for (var e2 = r2 ? f : o, u2 = n2[0].length, i2 = n2.length, a2 = i2, l2 = il(i2), s2 = 1 / 0, h2 = []; a2--; ) {
          var p3 = n2[a2];
          a2 && t2 && (p3 = c(p3, z2(t2))), s2 = Hl(p3.length, s2), l2[a2] = !r2 && (t2 || u2 >= 120 && p3.length >= 120) ? new yr2(a2 && p3) : X;
        }
        p3 = n2[0];
        var _3 = -1, v2 = l2[0];
        n: for (; ++_3 < u2 && h2.length < s2; ) {
          var g2 = p3[_3], y2 = t2 ? t2(g2) : g2;
          if (g2 = r2 || 0 !== g2 ? g2 : 0, !(v2 ? S(v2, y2) : e2(h2, y2, r2))) {
            for (a2 = i2; --a2; ) {
              var d2 = l2[a2];
              if (!(d2 ? S(d2, y2) : e2(n2[a2], y2, r2))) continue n;
            }
            v2 && v2.push(y2), h2.push(g2);
          }
        }
        return h2;
      }
      function Oe(n2, t2, r2, e2) {
        return ue2(n2, function(n3, u2, i2) {
          t2(e2, r2(n3), u2, i2);
        }), e2;
      }
      function Ie(t2, r2, e2) {
        r2 = ku(r2, t2), t2 = Gi(t2, r2);
        var u2 = null == t2 ? t2 : t2[no(jo(r2))];
        return null == u2 ? X : n(u2, t2, e2);
      }
      function Re(n2) {
        return cc(n2) && we(n2) == Dn;
      }
      function ze(n2) {
        return cc(n2) && we(n2) == ft;
      }
      function Ee(n2) {
        return cc(n2) && we(n2) == Pn;
      }
      function Se(n2, t2, r2, e2, u2) {
        return n2 === t2 || (null == n2 || null == t2 || !cc(n2) && !cc(t2) ? n2 !== n2 && t2 !== t2 : We(n2, t2, r2, e2, Se, u2));
      }
      function We(n2, t2, r2, e2, u2, i2) {
        var o2 = bh(n2), f2 = bh(t2), c2 = o2 ? Mn : zs(n2), a2 = f2 ? Mn : zs(t2);
        c2 = c2 == Dn ? Yn : c2, a2 = a2 == Dn ? Yn : a2;
        var l2 = c2 == Yn, s2 = a2 == Yn, h2 = c2 == a2;
        if (h2 && mh(n2)) {
          if (!mh(t2)) return false;
          o2 = true, l2 = false;
        }
        if (h2 && !l2) return i2 || (i2 = new wr2()), o2 || Oh(n2) ? pi(n2, t2, r2, e2, u2, i2) : _i(n2, t2, c2, r2, e2, u2, i2);
        if (!(r2 & hn)) {
          var p3 = l2 && bl.call(n2, "__wrapped__"), _3 = s2 && bl.call(t2, "__wrapped__");
          if (p3 || _3) {
            var v2 = p3 ? n2.value() : n2, g2 = _3 ? t2.value() : t2;
            return i2 || (i2 = new wr2()), u2(v2, g2, r2, e2, i2);
          }
        }
        return !!h2 && (i2 || (i2 = new wr2()), vi(n2, t2, r2, e2, u2, i2));
      }
      function Le(n2) {
        return cc(n2) && zs(n2) == Gn;
      }
      function Ce(n2, t2, r2, e2) {
        var u2 = r2.length, i2 = u2, o2 = !e2;
        if (null == n2) return !i2;
        for (n2 = ll(n2); u2--; ) {
          var f2 = r2[u2];
          if (o2 && f2[2] ? f2[1] !== n2[f2[0]] : !(f2[0] in n2)) return false;
        }
        for (; ++u2 < i2; ) {
          f2 = r2[u2];
          var c2 = f2[0], a2 = n2[c2], l2 = f2[1];
          if (o2 && f2[2]) {
            if (a2 === X && !(c2 in n2)) return false;
          } else {
            var s2 = new wr2();
            if (e2) var h2 = e2(a2, l2, c2, n2, t2, s2);
            if (!(h2 === X ? Se(l2, a2, hn | pn, e2, s2) : h2)) return false;
          }
        }
        return true;
      }
      function Ue(n2) {
        return !(!fc(n2) || Di(n2)) && (uc(n2) ? kl : Zt).test(to(n2));
      }
      function Be(n2) {
        return cc(n2) && we(n2) == nt;
      }
      function Te(n2) {
        return cc(n2) && zs(n2) == tt;
      }
      function $e(n2) {
        return cc(n2) && oc(n2.length) && !!Kr[we(n2)];
      }
      function De(n2) {
        return "function" == typeof n2 ? n2 : null == n2 ? La : "object" == typeof n2 ? bh(n2) ? Ze(n2[0], n2[1]) : qe(n2) : Fa(n2);
      }
      function Me(n2) {
        if (!Mi(n2)) return Vl(n2);
        var t2 = [];
        for (var r2 in ll(n2)) bl.call(n2, r2) && "constructor" != r2 && t2.push(r2);
        return t2;
      }
      function Fe(n2) {
        if (!fc(n2)) return Zi(n2);
        var t2 = Mi(n2), r2 = [];
        for (var e2 in n2) ("constructor" != e2 || !t2 && bl.call(n2, e2)) && r2.push(e2);
        return r2;
      }
      function Ne(n2, t2) {
        return n2 < t2;
      }
      function Pe(n2, t2) {
        var r2 = -1, e2 = Hf(n2) ? il(n2.length) : [];
        return ys(n2, function(n3, u2, i2) {
          e2[++r2] = t2(n3, u2, i2);
        }), e2;
      }
      function qe(n2) {
        var t2 = ji(n2);
        return 1 == t2.length && t2[0][2] ? Ni(t2[0][0], t2[0][1]) : function(r2) {
          return r2 === n2 || Ce(r2, n2, t2);
        };
      }
      function Ze(n2, t2) {
        return Bi(n2) && Fi(t2) ? Ni(no(n2), t2) : function(r2) {
          var e2 = Mc(r2, n2);
          return e2 === X && e2 === t2 ? Nc(r2, n2) : Se(t2, e2, hn | pn);
        };
      }
      function Ke(n2, t2, r2, e2, u2) {
        n2 !== t2 && bs(t2, function(i2, o2) {
          if (u2 || (u2 = new wr2()), fc(i2)) Ve(n2, t2, o2, r2, Ke, e2, u2);
          else {
            var f2 = e2 ? e2(Ji(n2, o2), i2, o2 + "", n2, t2, u2) : X;
            f2 === X && (f2 = i2), Er2(n2, o2, f2);
          }
        }, qc);
      }
      function Ve(n2, t2, r2, e2, u2, i2, o2) {
        var f2 = Ji(n2, r2), c2 = Ji(t2, r2), a2 = o2.get(c2);
        if (a2) return Er2(n2, r2, a2), X;
        var l2 = i2 ? i2(f2, c2, r2 + "", n2, t2, o2) : X, s2 = l2 === X;
        if (s2) {
          var h2 = bh(c2), p3 = !h2 && mh(c2), _3 = !h2 && !p3 && Oh(c2);
          l2 = c2, h2 || p3 || _3 ? bh(f2) ? l2 = f2 : Jf(f2) ? l2 = Tu(f2) : p3 ? (s2 = false, l2 = Iu(c2, true)) : _3 ? (s2 = false, l2 = Wu(c2, true)) : l2 = [] : gc(c2) || dh(c2) ? (l2 = f2, dh(f2) ? l2 = Rc(f2) : fc(f2) && !uc(f2) || (l2 = Ei(c2))) : s2 = false;
        }
        s2 && (o2.set(c2, l2), u2(l2, c2, e2, i2, o2), o2.delete(c2)), Er2(n2, r2, l2);
      }
      function Ge(n2, t2) {
        var r2 = n2.length;
        if (r2) return t2 += t2 < 0 ? r2 : 0, Ci(t2, r2) ? n2[t2] : X;
      }
      function He(n2, t2, r2) {
        t2 = t2.length ? c(t2, function(n3) {
          return bh(n3) ? function(t3) {
            return _e2(t3, 1 === n3.length ? n3[0] : n3);
          } : n3;
        }) : [La];
        var e2 = -1;
        return t2 = c(t2, z2(mi())), A(Pe(n2, function(n3, r3, u2) {
          return { criteria: c(t2, function(t3) {
            return t3(n3);
          }), index: ++e2, value: n3 };
        }), function(n3, t3) {
          return Cu(n3, t3, r2);
        });
      }
      function Je(n2, t2) {
        return Ye(n2, t2, function(t3, r2) {
          return Nc(n2, r2);
        });
      }
      function Ye(n2, t2, r2) {
        for (var e2 = -1, u2 = t2.length, i2 = {}; ++e2 < u2; ) {
          var o2 = t2[e2], f2 = _e2(n2, o2);
          r2(f2, o2) && fu(i2, ku(o2, n2), f2);
        }
        return i2;
      }
      function Qe(n2) {
        return function(t2) {
          return _e2(t2, n2);
        };
      }
      function Xe(n2, t2, r2, e2) {
        var u2 = e2 ? d : y, i2 = -1, o2 = t2.length, f2 = n2;
        for (n2 === t2 && (t2 = Tu(t2)), r2 && (f2 = c(n2, z2(r2))); ++i2 < o2; ) for (var a2 = 0, l2 = t2[i2], s2 = r2 ? r2(l2) : l2; (a2 = u2(f2, s2, a2, e2)) > -1; ) f2 !== n2 && Ll.call(f2, a2, 1), Ll.call(n2, a2, 1);
        return n2;
      }
      function nu(n2, t2) {
        for (var r2 = n2 ? t2.length : 0, e2 = r2 - 1; r2--; ) {
          var u2 = t2[r2];
          if (r2 == e2 || u2 !== i2) {
            var i2 = u2;
            Ci(u2) ? Ll.call(n2, u2, 1) : yu(n2, u2);
          }
        }
        return n2;
      }
      function tu(n2, t2) {
        return n2 + Nl(Ql() * (t2 - n2 + 1));
      }
      function ru(n2, t2, r2, e2) {
        for (var u2 = -1, i2 = Gl(Fl((t2 - n2) / (r2 || 1)), 0), o2 = il(i2); i2--; ) o2[e2 ? i2 : ++u2] = n2, n2 += r2;
        return o2;
      }
      function eu(n2, t2) {
        var r2 = "";
        if (!n2 || t2 < 1 || t2 > Wn) return r2;
        do
          t2 % 2 && (r2 += n2), t2 = Nl(t2 / 2), t2 && (n2 += n2);
        while (t2);
        return r2;
      }
      function uu(n2, t2) {
        return Ls(Vi(n2, t2, La), n2 + "");
      }
      function iu(n2) {
        return Ir2(ra(n2));
      }
      function ou(n2, t2) {
        var r2 = ra(n2);
        return Xi(r2, Mr2(t2, 0, r2.length));
      }
      function fu(n2, t2, r2, e2) {
        if (!fc(n2)) return n2;
        t2 = ku(t2, n2);
        for (var u2 = -1, i2 = t2.length, o2 = i2 - 1, f2 = n2; null != f2 && ++u2 < i2; ) {
          var c2 = no(t2[u2]), a2 = r2;
          if ("__proto__" === c2 || "constructor" === c2 || "prototype" === c2) return n2;
          if (u2 != o2) {
            var l2 = f2[c2];
            a2 = e2 ? e2(l2, c2, f2) : X, a2 === X && (a2 = fc(l2) ? l2 : Ci(t2[u2 + 1]) ? [] : {});
          }
          Sr2(f2, c2, a2), f2 = f2[c2];
        }
        return n2;
      }
      function cu(n2) {
        return Xi(ra(n2));
      }
      function au(n2, t2, r2) {
        var e2 = -1, u2 = n2.length;
        t2 < 0 && (t2 = -t2 > u2 ? 0 : u2 + t2), r2 = r2 > u2 ? u2 : r2, r2 < 0 && (r2 += u2), u2 = t2 > r2 ? 0 : r2 - t2 >>> 0, t2 >>>= 0;
        for (var i2 = il(u2); ++e2 < u2; ) i2[e2] = n2[e2 + t2];
        return i2;
      }
      function lu(n2, t2) {
        var r2;
        return ys(n2, function(n3, e2, u2) {
          return r2 = t2(n3, e2, u2), !r2;
        }), !!r2;
      }
      function su(n2, t2, r2) {
        var e2 = 0, u2 = null == n2 ? e2 : n2.length;
        if ("number" == typeof t2 && t2 === t2 && u2 <= Tn) {
          for (; e2 < u2; ) {
            var i2 = e2 + u2 >>> 1, o2 = n2[i2];
            null !== o2 && !bc(o2) && (r2 ? o2 <= t2 : o2 < t2) ? e2 = i2 + 1 : u2 = i2;
          }
          return u2;
        }
        return hu(n2, t2, La, r2);
      }
      function hu(n2, t2, r2, e2) {
        var u2 = 0, i2 = null == n2 ? 0 : n2.length;
        if (0 === i2) return 0;
        t2 = r2(t2);
        for (var o2 = t2 !== t2, f2 = null === t2, c2 = bc(t2), a2 = t2 === X; u2 < i2; ) {
          var l2 = Nl((u2 + i2) / 2), s2 = r2(n2[l2]), h2 = s2 !== X, p3 = null === s2, _3 = s2 === s2, v2 = bc(s2);
          if (o2) var g2 = e2 || _3;
          else g2 = a2 ? _3 && (e2 || h2) : f2 ? _3 && h2 && (e2 || !p3) : c2 ? _3 && h2 && !p3 && (e2 || !v2) : !p3 && !v2 && (e2 ? s2 <= t2 : s2 < t2);
          g2 ? u2 = l2 + 1 : i2 = l2;
        }
        return Hl(i2, Bn);
      }
      function pu(n2, t2) {
        for (var r2 = -1, e2 = n2.length, u2 = 0, i2 = []; ++r2 < e2; ) {
          var o2 = n2[r2], f2 = t2 ? t2(o2) : o2;
          if (!r2 || !Gf(f2, c2)) {
            var c2 = f2;
            i2[u2++] = 0 === o2 ? 0 : o2;
          }
        }
        return i2;
      }
      function _u(n2) {
        return "number" == typeof n2 ? n2 : bc(n2) ? Cn : +n2;
      }
      function vu(n2) {
        if ("string" == typeof n2) return n2;
        if (bh(n2)) return c(n2, vu) + "";
        if (bc(n2)) return vs ? vs.call(n2) : "";
        var t2 = n2 + "";
        return "0" == t2 && 1 / n2 == -Sn ? "-0" : t2;
      }
      function gu(n2, t2, r2) {
        var e2 = -1, u2 = o, i2 = n2.length, c2 = true, a2 = [], l2 = a2;
        if (r2) c2 = false, u2 = f;
        else if (i2 >= tn) {
          var s2 = t2 ? null : ks(n2);
          if (s2) return P(s2);
          c2 = false, u2 = S, l2 = new yr2();
        } else l2 = t2 ? [] : a2;
        n: for (; ++e2 < i2; ) {
          var h2 = n2[e2], p3 = t2 ? t2(h2) : h2;
          if (h2 = r2 || 0 !== h2 ? h2 : 0, c2 && p3 === p3) {
            for (var _3 = l2.length; _3--; ) if (l2[_3] === p3) continue n;
            t2 && l2.push(p3), a2.push(h2);
          } else u2(l2, p3, r2) || (l2 !== a2 && l2.push(p3), a2.push(h2));
        }
        return a2;
      }
      function yu(n2, t2) {
        return t2 = ku(t2, n2), n2 = Gi(n2, t2), null == n2 || delete n2[no(jo(t2))];
      }
      function du(n2, t2, r2, e2) {
        return fu(n2, t2, r2(_e2(n2, t2)), e2);
      }
      function bu(n2, t2, r2, e2) {
        for (var u2 = n2.length, i2 = e2 ? u2 : -1; (e2 ? i2-- : ++i2 < u2) && t2(n2[i2], i2, n2); ) ;
        return r2 ? au(n2, e2 ? 0 : i2, e2 ? i2 + 1 : u2) : au(n2, e2 ? i2 + 1 : 0, e2 ? u2 : i2);
      }
      function wu(n2, t2) {
        var r2 = n2;
        return r2 instanceof Ct2 && (r2 = r2.value()), l(t2, function(n3, t3) {
          return t3.func.apply(t3.thisArg, a([n3], t3.args));
        }, r2);
      }
      function mu(n2, t2, r2) {
        var e2 = n2.length;
        if (e2 < 2) return e2 ? gu(n2[0]) : [];
        for (var u2 = -1, i2 = il(e2); ++u2 < e2; ) for (var o2 = n2[u2], f2 = -1; ++f2 < e2; ) f2 != u2 && (i2[u2] = Hr2(i2[u2] || o2, n2[f2], t2, r2));
        return gu(ee2(i2, 1), t2, r2);
      }
      function xu(n2, t2, r2) {
        for (var e2 = -1, u2 = n2.length, i2 = t2.length, o2 = {}; ++e2 < u2; ) {
          r2(o2, n2[e2], e2 < i2 ? t2[e2] : X);
        }
        return o2;
      }
      function ju(n2) {
        return Jf(n2) ? n2 : [];
      }
      function Au(n2) {
        return "function" == typeof n2 ? n2 : La;
      }
      function ku(n2, t2) {
        return bh(n2) ? n2 : Bi(n2, t2) ? [n2] : Cs(Ec(n2));
      }
      function Ou(n2, t2, r2) {
        var e2 = n2.length;
        return r2 = r2 === X ? e2 : r2, !t2 && r2 >= e2 ? n2 : au(n2, t2, r2);
      }
      function Iu(n2, t2) {
        if (t2) return n2.slice();
        var r2 = n2.length, e2 = zl ? zl(r2) : new n2.constructor(r2);
        return n2.copy(e2), e2;
      }
      function Ru(n2) {
        var t2 = new n2.constructor(n2.byteLength);
        return new Rl(t2).set(new Rl(n2)), t2;
      }
      function zu(n2, t2) {
        return new n2.constructor(t2 ? Ru(n2.buffer) : n2.buffer, n2.byteOffset, n2.byteLength);
      }
      function Eu(n2) {
        var t2 = new n2.constructor(n2.source, Nt.exec(n2));
        return t2.lastIndex = n2.lastIndex, t2;
      }
      function Su(n2) {
        return _s ? ll(_s.call(n2)) : {};
      }
      function Wu(n2, t2) {
        return new n2.constructor(t2 ? Ru(n2.buffer) : n2.buffer, n2.byteOffset, n2.length);
      }
      function Lu(n2, t2) {
        if (n2 !== t2) {
          var r2 = n2 !== X, e2 = null === n2, u2 = n2 === n2, i2 = bc(n2), o2 = t2 !== X, f2 = null === t2, c2 = t2 === t2, a2 = bc(t2);
          if (!f2 && !a2 && !i2 && n2 > t2 || i2 && o2 && c2 && !f2 && !a2 || e2 && o2 && c2 || !r2 && c2 || !u2) return 1;
          if (!e2 && !i2 && !a2 && n2 < t2 || a2 && r2 && u2 && !e2 && !i2 || f2 && r2 && u2 || !o2 && u2 || !c2) return -1;
        }
        return 0;
      }
      function Cu(n2, t2, r2) {
        for (var e2 = -1, u2 = n2.criteria, i2 = t2.criteria, o2 = u2.length, f2 = r2.length; ++e2 < o2; ) {
          var c2 = Lu(u2[e2], i2[e2]);
          if (c2) {
            if (e2 >= f2) return c2;
            return c2 * ("desc" == r2[e2] ? -1 : 1);
          }
        }
        return n2.index - t2.index;
      }
      function Uu(n2, t2, r2, e2) {
        for (var u2 = -1, i2 = n2.length, o2 = r2.length, f2 = -1, c2 = t2.length, a2 = Gl(i2 - o2, 0), l2 = il(c2 + a2), s2 = !e2; ++f2 < c2; ) l2[f2] = t2[f2];
        for (; ++u2 < o2; ) (s2 || u2 < i2) && (l2[r2[u2]] = n2[u2]);
        for (; a2--; ) l2[f2++] = n2[u2++];
        return l2;
      }
      function Bu(n2, t2, r2, e2) {
        for (var u2 = -1, i2 = n2.length, o2 = -1, f2 = r2.length, c2 = -1, a2 = t2.length, l2 = Gl(i2 - f2, 0), s2 = il(l2 + a2), h2 = !e2; ++u2 < l2; ) s2[u2] = n2[u2];
        for (var p3 = u2; ++c2 < a2; ) s2[p3 + c2] = t2[c2];
        for (; ++o2 < f2; ) (h2 || u2 < i2) && (s2[p3 + r2[o2]] = n2[u2++]);
        return s2;
      }
      function Tu(n2, t2) {
        var r2 = -1, e2 = n2.length;
        for (t2 || (t2 = il(e2)); ++r2 < e2; ) t2[r2] = n2[r2];
        return t2;
      }
      function $u(n2, t2, r2, e2) {
        var u2 = !r2;
        r2 || (r2 = {});
        for (var i2 = -1, o2 = t2.length; ++i2 < o2; ) {
          var f2 = t2[i2], c2 = e2 ? e2(r2[f2], n2[f2], f2, r2, n2) : X;
          c2 === X && (c2 = n2[f2]), u2 ? Br2(r2, f2, c2) : Sr2(r2, f2, c2);
        }
        return r2;
      }
      function Du(n2, t2) {
        return $u(n2, Is(n2), t2);
      }
      function Mu(n2, t2) {
        return $u(n2, Rs(n2), t2);
      }
      function Fu(n2, r2) {
        return function(e2, u2) {
          var i2 = bh(e2) ? t : Lr2, o2 = r2 ? r2() : {};
          return i2(e2, n2, mi(u2, 2), o2);
        };
      }
      function Nu(n2) {
        return uu(function(t2, r2) {
          var e2 = -1, u2 = r2.length, i2 = u2 > 1 ? r2[u2 - 1] : X, o2 = u2 > 2 ? r2[2] : X;
          for (i2 = n2.length > 3 && "function" == typeof i2 ? (u2--, i2) : X, o2 && Ui(r2[0], r2[1], o2) && (i2 = u2 < 3 ? X : i2, u2 = 1), t2 = ll(t2); ++e2 < u2; ) {
            var f2 = r2[e2];
            f2 && n2(t2, f2, e2, i2);
          }
          return t2;
        });
      }
      function Pu(n2, t2) {
        return function(r2, e2) {
          if (null == r2) return r2;
          if (!Hf(r2)) return n2(r2, e2);
          for (var u2 = r2.length, i2 = t2 ? u2 : -1, o2 = ll(r2); (t2 ? i2-- : ++i2 < u2) && e2(o2[i2], i2, o2) !== false; ) ;
          return r2;
        };
      }
      function qu(n2) {
        return function(t2, r2, e2) {
          for (var u2 = -1, i2 = ll(t2), o2 = e2(t2), f2 = o2.length; f2--; ) {
            var c2 = o2[n2 ? f2 : ++u2];
            if (r2(i2[c2], c2, i2) === false) break;
          }
          return t2;
        };
      }
      function Zu(n2, t2, r2) {
        function e2() {
          return (this && this !== re && this instanceof e2 ? i2 : n2).apply(u2 ? r2 : this, arguments);
        }
        var u2 = t2 & _n, i2 = Gu(n2);
        return e2;
      }
      function Ku(n2) {
        return function(t2) {
          t2 = Ec(t2);
          var r2 = T(t2) ? G(t2) : X, e2 = r2 ? r2[0] : t2.charAt(0), u2 = r2 ? Ou(r2, 1).join("") : t2.slice(1);
          return e2[n2]() + u2;
        };
      }
      function Vu(n2) {
        return function(t2) {
          return l(Ra(ca(t2).replace($r, "")), n2, "");
        };
      }
      function Gu(n2) {
        return function() {
          var t2 = arguments;
          switch (t2.length) {
            case 0:
              return new n2();
            case 1:
              return new n2(t2[0]);
            case 2:
              return new n2(t2[0], t2[1]);
            case 3:
              return new n2(t2[0], t2[1], t2[2]);
            case 4:
              return new n2(t2[0], t2[1], t2[2], t2[3]);
            case 5:
              return new n2(t2[0], t2[1], t2[2], t2[3], t2[4]);
            case 6:
              return new n2(t2[0], t2[1], t2[2], t2[3], t2[4], t2[5]);
            case 7:
              return new n2(t2[0], t2[1], t2[2], t2[3], t2[4], t2[5], t2[6]);
          }
          var r2 = gs(n2.prototype), e2 = n2.apply(r2, t2);
          return fc(e2) ? e2 : r2;
        };
      }
      function Hu(t2, r2, e2) {
        function u2() {
          for (var o2 = arguments.length, f2 = il(o2), c2 = o2, a2 = wi(u2); c2--; ) f2[c2] = arguments[c2];
          var l2 = o2 < 3 && f2[0] !== a2 && f2[o2 - 1] !== a2 ? [] : N(f2, a2);
          return o2 -= l2.length, o2 < e2 ? oi(t2, r2, Qu, u2.placeholder, X, f2, l2, X, X, e2 - o2) : n(this && this !== re && this instanceof u2 ? i2 : t2, this, f2);
        }
        var i2 = Gu(t2);
        return u2;
      }
      function Ju(n2) {
        return function(t2, r2, e2) {
          var u2 = ll(t2);
          if (!Hf(t2)) {
            var i2 = mi(r2, 3);
            t2 = Pc(t2), r2 = function(n3) {
              return i2(u2[n3], n3, u2);
            };
          }
          var o2 = n2(t2, r2, e2);
          return o2 > -1 ? u2[i2 ? t2[o2] : o2] : X;
        };
      }
      function Yu(n2) {
        return gi(function(t2) {
          var r2 = t2.length, e2 = r2, u2 = Y2.prototype.thru;
          for (n2 && t2.reverse(); e2--; ) {
            var i2 = t2[e2];
            if ("function" != typeof i2) throw new pl(en);
            if (u2 && !o2 && "wrapper" == bi(i2)) var o2 = new Y2([], true);
          }
          for (e2 = o2 ? e2 : r2; ++e2 < r2; ) {
            i2 = t2[e2];
            var f2 = bi(i2), c2 = "wrapper" == f2 ? Os(i2) : X;
            o2 = c2 && $i(c2[0]) && c2[1] == (mn | yn | bn | xn) && !c2[4].length && 1 == c2[9] ? o2[bi(c2[0])].apply(o2, c2[3]) : 1 == i2.length && $i(i2) ? o2[f2]() : o2.thru(i2);
          }
          return function() {
            var n3 = arguments, e3 = n3[0];
            if (o2 && 1 == n3.length && bh(e3)) return o2.plant(e3).value();
            for (var u3 = 0, i3 = r2 ? t2[u3].apply(this, n3) : e3; ++u3 < r2; ) i3 = t2[u3].call(this, i3);
            return i3;
          };
        });
      }
      function Qu(n2, t2, r2, e2, u2, i2, o2, f2, c2, a2) {
        function l2() {
          for (var y2 = arguments.length, d2 = il(y2), b2 = y2; b2--; ) d2[b2] = arguments[b2];
          if (_3) var w2 = wi(l2), m2 = C(d2, w2);
          if (e2 && (d2 = Uu(d2, e2, u2, _3)), i2 && (d2 = Bu(d2, i2, o2, _3)), y2 -= m2, _3 && y2 < a2) {
            return oi(n2, t2, Qu, l2.placeholder, r2, d2, N(d2, w2), f2, c2, a2 - y2);
          }
          var x3 = h2 ? r2 : this, j2 = p3 ? x3[n2] : n2;
          return y2 = d2.length, f2 ? d2 = Hi(d2, f2) : v2 && y2 > 1 && d2.reverse(), s2 && c2 < y2 && (d2.length = c2), this && this !== re && this instanceof l2 && (j2 = g2 || Gu(j2)), j2.apply(x3, d2);
        }
        var s2 = t2 & mn, h2 = t2 & _n, p3 = t2 & vn, _3 = t2 & (yn | dn), v2 = t2 & jn, g2 = p3 ? X : Gu(n2);
        return l2;
      }
      function Xu(n2, t2) {
        return function(r2, e2) {
          return Oe(r2, n2, t2(e2), {});
        };
      }
      function ni(n2, t2) {
        return function(r2, e2) {
          var u2;
          if (r2 === X && e2 === X) return t2;
          if (r2 !== X && (u2 = r2), e2 !== X) {
            if (u2 === X) return e2;
            "string" == typeof r2 || "string" == typeof e2 ? (r2 = vu(r2), e2 = vu(e2)) : (r2 = _u(r2), e2 = _u(e2)), u2 = n2(r2, e2);
          }
          return u2;
        };
      }
      function ti(t2) {
        return gi(function(r2) {
          return r2 = c(r2, z2(mi())), uu(function(e2) {
            var u2 = this;
            return t2(r2, function(t3) {
              return n(t3, u2, e2);
            });
          });
        });
      }
      function ri(n2, t2) {
        t2 = t2 === X ? " " : vu(t2);
        var r2 = t2.length;
        if (r2 < 2) return r2 ? eu(t2, n2) : t2;
        var e2 = eu(t2, Fl(n2 / V(t2)));
        return T(t2) ? Ou(G(e2), 0, n2).join("") : e2.slice(0, n2);
      }
      function ei(t2, r2, e2, u2) {
        function i2() {
          for (var r3 = -1, c2 = arguments.length, a2 = -1, l2 = u2.length, s2 = il(l2 + c2), h2 = this && this !== re && this instanceof i2 ? f2 : t2; ++a2 < l2; ) s2[a2] = u2[a2];
          for (; c2--; ) s2[a2++] = arguments[++r3];
          return n(h2, o2 ? e2 : this, s2);
        }
        var o2 = r2 & _n, f2 = Gu(t2);
        return i2;
      }
      function ui(n2) {
        return function(t2, r2, e2) {
          return e2 && "number" != typeof e2 && Ui(t2, r2, e2) && (r2 = e2 = X), t2 = Ac(t2), r2 === X ? (r2 = t2, t2 = 0) : r2 = Ac(r2), e2 = e2 === X ? t2 < r2 ? 1 : -1 : Ac(e2), ru(t2, r2, e2, n2);
        };
      }
      function ii(n2) {
        return function(t2, r2) {
          return "string" == typeof t2 && "string" == typeof r2 || (t2 = Ic(t2), r2 = Ic(r2)), n2(t2, r2);
        };
      }
      function oi(n2, t2, r2, e2, u2, i2, o2, f2, c2, a2) {
        var l2 = t2 & yn, s2 = l2 ? o2 : X, h2 = l2 ? X : o2, p3 = l2 ? i2 : X, _3 = l2 ? X : i2;
        t2 |= l2 ? bn : wn, t2 &= ~(l2 ? wn : bn), t2 & gn || (t2 &= -4);
        var v2 = [n2, t2, u2, p3, s2, _3, h2, f2, c2, a2], g2 = r2.apply(X, v2);
        return $i(n2) && Ss(g2, v2), g2.placeholder = e2, Yi(g2, n2, t2);
      }
      function fi(n2) {
        var t2 = al[n2];
        return function(n3, r2) {
          if (n3 = Ic(n3), r2 = null == r2 ? 0 : Hl(kc(r2), 292), r2 && Zl(n3)) {
            var e2 = (Ec(n3) + "e").split("e");
            return e2 = (Ec(t2(e2[0] + "e" + (+e2[1] + r2))) + "e").split("e"), +(e2[0] + "e" + (+e2[1] - r2));
          }
          return t2(n3);
        };
      }
      function ci(n2) {
        return function(t2) {
          var r2 = zs(t2);
          return r2 == Gn ? M(t2) : r2 == tt ? q(t2) : I(t2, n2(t2));
        };
      }
      function ai(n2, t2, r2, e2, u2, i2, o2, f2) {
        var c2 = t2 & vn;
        if (!c2 && "function" != typeof n2) throw new pl(en);
        var a2 = e2 ? e2.length : 0;
        if (a2 || (t2 &= -97, e2 = u2 = X), o2 = o2 === X ? o2 : Gl(kc(o2), 0), f2 = f2 === X ? f2 : kc(f2), a2 -= u2 ? u2.length : 0, t2 & wn) {
          var l2 = e2, s2 = u2;
          e2 = u2 = X;
        }
        var h2 = c2 ? X : Os(n2), p3 = [n2, t2, r2, e2, u2, l2, s2, i2, o2, f2];
        if (h2 && qi(p3, h2), n2 = p3[0], t2 = p3[1], r2 = p3[2], e2 = p3[3], u2 = p3[4], f2 = p3[9] = p3[9] === X ? c2 ? 0 : n2.length : Gl(p3[9] - a2, 0), !f2 && t2 & (yn | dn) && (t2 &= -25), t2 && t2 != _n) _3 = t2 == yn || t2 == dn ? Hu(n2, t2, f2) : t2 != bn && t2 != (_n | bn) || u2.length ? Qu.apply(X, p3) : ei(n2, t2, r2, e2);
        else var _3 = Zu(n2, t2, r2);
        return Yi((h2 ? ms : Ss)(_3, p3), n2, t2);
      }
      function li(n2, t2, r2, e2) {
        return n2 === X || Gf(n2, gl[r2]) && !bl.call(e2, r2) ? t2 : n2;
      }
      function si(n2, t2, r2, e2, u2, i2) {
        return fc(n2) && fc(t2) && (i2.set(t2, n2), Ke(n2, t2, X, si, i2), i2.delete(t2)), n2;
      }
      function hi(n2) {
        return gc(n2) ? X : n2;
      }
      function pi(n2, t2, r2, e2, u2, i2) {
        var o2 = r2 & hn, f2 = n2.length, c2 = t2.length;
        if (f2 != c2 && !(o2 && c2 > f2)) return false;
        var a2 = i2.get(n2), l2 = i2.get(t2);
        if (a2 && l2) return a2 == t2 && l2 == n2;
        var s2 = -1, p3 = true, _3 = r2 & pn ? new yr2() : X;
        for (i2.set(n2, t2), i2.set(t2, n2); ++s2 < f2; ) {
          var v2 = n2[s2], g2 = t2[s2];
          if (e2) var y2 = o2 ? e2(g2, v2, s2, t2, n2, i2) : e2(v2, g2, s2, n2, t2, i2);
          if (y2 !== X) {
            if (y2) continue;
            p3 = false;
            break;
          }
          if (_3) {
            if (!h(t2, function(n3, t3) {
              if (!S(_3, t3) && (v2 === n3 || u2(v2, n3, r2, e2, i2))) return _3.push(t3);
            })) {
              p3 = false;
              break;
            }
          } else if (v2 !== g2 && !u2(v2, g2, r2, e2, i2)) {
            p3 = false;
            break;
          }
        }
        return i2.delete(n2), i2.delete(t2), p3;
      }
      function _i(n2, t2, r2, e2, u2, i2, o2) {
        switch (r2) {
          case ct:
            if (n2.byteLength != t2.byteLength || n2.byteOffset != t2.byteOffset) return false;
            n2 = n2.buffer, t2 = t2.buffer;
          case ft:
            return !(n2.byteLength != t2.byteLength || !i2(new Rl(n2), new Rl(t2)));
          case Nn:
          case Pn:
          case Hn:
            return Gf(+n2, +t2);
          case Zn:
            return n2.name == t2.name && n2.message == t2.message;
          case nt:
          case rt:
            return n2 == t2 + "";
          case Gn:
            var f2 = M;
          case tt:
            var c2 = e2 & hn;
            if (f2 || (f2 = P), n2.size != t2.size && !c2) return false;
            var a2 = o2.get(n2);
            if (a2) return a2 == t2;
            e2 |= pn, o2.set(n2, t2);
            var l2 = pi(f2(n2), f2(t2), e2, u2, i2, o2);
            return o2.delete(n2), l2;
          case et:
            if (_s) return _s.call(n2) == _s.call(t2);
        }
        return false;
      }
      function vi(n2, t2, r2, e2, u2, i2) {
        var o2 = r2 & hn, f2 = yi(n2), c2 = f2.length;
        if (c2 != yi(t2).length && !o2) return false;
        for (var a2 = c2; a2--; ) {
          var l2 = f2[a2];
          if (!(o2 ? l2 in t2 : bl.call(t2, l2))) return false;
        }
        var s2 = i2.get(n2), h2 = i2.get(t2);
        if (s2 && h2) return s2 == t2 && h2 == n2;
        var p3 = true;
        i2.set(n2, t2), i2.set(t2, n2);
        for (var _3 = o2; ++a2 < c2; ) {
          l2 = f2[a2];
          var v2 = n2[l2], g2 = t2[l2];
          if (e2) var y2 = o2 ? e2(g2, v2, l2, t2, n2, i2) : e2(v2, g2, l2, n2, t2, i2);
          if (!(y2 === X ? v2 === g2 || u2(v2, g2, r2, e2, i2) : y2)) {
            p3 = false;
            break;
          }
          _3 || (_3 = "constructor" == l2);
        }
        if (p3 && !_3) {
          var d2 = n2.constructor, b2 = t2.constructor;
          d2 != b2 && "constructor" in n2 && "constructor" in t2 && !("function" == typeof d2 && d2 instanceof d2 && "function" == typeof b2 && b2 instanceof b2) && (p3 = false);
        }
        return i2.delete(n2), i2.delete(t2), p3;
      }
      function gi(n2) {
        return Ls(Vi(n2, X, _o), n2 + "");
      }
      function yi(n2) {
        return de2(n2, Pc, Is);
      }
      function di(n2) {
        return de2(n2, qc, Rs);
      }
      function bi(n2) {
        for (var t2 = n2.name + "", r2 = fs2[t2], e2 = bl.call(fs2, t2) ? r2.length : 0; e2--; ) {
          var u2 = r2[e2], i2 = u2.func;
          if (null == i2 || i2 == n2) return u2.name;
        }
        return t2;
      }
      function wi(n2) {
        return (bl.call(Z2, "placeholder") ? Z2 : n2).placeholder;
      }
      function mi() {
        var n2 = Z2.iteratee || Ca;
        return n2 = n2 === Ca ? De : n2, arguments.length ? n2(arguments[0], arguments[1]) : n2;
      }
      function xi(n2, t2) {
        var r2 = n2.__data__;
        return Ti(t2) ? r2["string" == typeof t2 ? "string" : "hash"] : r2.map;
      }
      function ji(n2) {
        for (var t2 = Pc(n2), r2 = t2.length; r2--; ) {
          var e2 = t2[r2], u2 = n2[e2];
          t2[r2] = [e2, u2, Fi(u2)];
        }
        return t2;
      }
      function Ai(n2, t2) {
        var r2 = B(n2, t2);
        return Ue(r2) ? r2 : X;
      }
      function ki(n2) {
        var t2 = bl.call(n2, Bl), r2 = n2[Bl];
        try {
          n2[Bl] = X;
          var e2 = true;
        } catch (n3) {
        }
        var u2 = xl.call(n2);
        return e2 && (t2 ? n2[Bl] = r2 : delete n2[Bl]), u2;
      }
      function Oi(n2, t2, r2) {
        for (var e2 = -1, u2 = r2.length; ++e2 < u2; ) {
          var i2 = r2[e2], o2 = i2.size;
          switch (i2.type) {
            case "drop":
              n2 += o2;
              break;
            case "dropRight":
              t2 -= o2;
              break;
            case "take":
              t2 = Hl(t2, n2 + o2);
              break;
            case "takeRight":
              n2 = Gl(n2, t2 - o2);
          }
        }
        return { start: n2, end: t2 };
      }
      function Ii(n2) {
        var t2 = n2.match(Bt);
        return t2 ? t2[1].split(Tt) : [];
      }
      function Ri(n2, t2, r2) {
        t2 = ku(t2, n2);
        for (var e2 = -1, u2 = t2.length, i2 = false; ++e2 < u2; ) {
          var o2 = no(t2[e2]);
          if (!(i2 = null != n2 && r2(n2, o2))) break;
          n2 = n2[o2];
        }
        return i2 || ++e2 != u2 ? i2 : (u2 = null == n2 ? 0 : n2.length, !!u2 && oc(u2) && Ci(o2, u2) && (bh(n2) || dh(n2)));
      }
      function zi(n2) {
        var t2 = n2.length, r2 = new n2.constructor(t2);
        return t2 && "string" == typeof n2[0] && bl.call(n2, "index") && (r2.index = n2.index, r2.input = n2.input), r2;
      }
      function Ei(n2) {
        return "function" != typeof n2.constructor || Mi(n2) ? {} : gs(El(n2));
      }
      function Si(n2, t2, r2) {
        var e2 = n2.constructor;
        switch (t2) {
          case ft:
            return Ru(n2);
          case Nn:
          case Pn:
            return new e2(+n2);
          case ct:
            return zu(n2, r2);
          case at:
          case lt:
          case st:
          case ht:
          case pt:
          case _t:
          case vt:
          case gt:
          case yt:
            return Wu(n2, r2);
          case Gn:
            return new e2();
          case Hn:
          case rt:
            return new e2(n2);
          case nt:
            return Eu(n2);
          case tt:
            return new e2();
          case et:
            return Su(n2);
        }
      }
      function Wi(n2, t2) {
        var r2 = t2.length;
        if (!r2) return n2;
        var e2 = r2 - 1;
        return t2[e2] = (r2 > 1 ? "& " : "") + t2[e2], t2 = t2.join(r2 > 2 ? ", " : " "), n2.replace(Ut, "{\n/* [wrapped with " + t2 + "] */\n");
      }
      function Li(n2) {
        return bh(n2) || dh(n2) || !!(Cl && n2 && n2[Cl]);
      }
      function Ci(n2, t2) {
        var r2 = typeof n2;
        return t2 = null == t2 ? Wn : t2, !!t2 && ("number" == r2 || "symbol" != r2 && Vt.test(n2)) && n2 > -1 && n2 % 1 == 0 && n2 < t2;
      }
      function Ui(n2, t2, r2) {
        if (!fc(r2)) return false;
        var e2 = typeof t2;
        return !!("number" == e2 ? Hf(r2) && Ci(t2, r2.length) : "string" == e2 && t2 in r2) && Gf(r2[t2], n2);
      }
      function Bi(n2, t2) {
        if (bh(n2)) return false;
        var r2 = typeof n2;
        return !("number" != r2 && "symbol" != r2 && "boolean" != r2 && null != n2 && !bc(n2)) || (zt.test(n2) || !Rt.test(n2) || null != t2 && n2 in ll(t2));
      }
      function Ti(n2) {
        var t2 = typeof n2;
        return "string" == t2 || "number" == t2 || "symbol" == t2 || "boolean" == t2 ? "__proto__" !== n2 : null === n2;
      }
      function $i(n2) {
        var t2 = bi(n2), r2 = Z2[t2];
        if ("function" != typeof r2 || !(t2 in Ct2.prototype)) return false;
        if (n2 === r2) return true;
        var e2 = Os(r2);
        return !!e2 && n2 === e2[0];
      }
      function Di(n2) {
        return !!ml && ml in n2;
      }
      function Mi(n2) {
        var t2 = n2 && n2.constructor;
        return n2 === ("function" == typeof t2 && t2.prototype || gl);
      }
      function Fi(n2) {
        return n2 === n2 && !fc(n2);
      }
      function Ni(n2, t2) {
        return function(r2) {
          return null != r2 && (r2[n2] === t2 && (t2 !== X || n2 in ll(r2)));
        };
      }
      function Pi(n2) {
        var t2 = Cf(n2, function(n3) {
          return r2.size === fn && r2.clear(), n3;
        }), r2 = t2.cache;
        return t2;
      }
      function qi(n2, t2) {
        var r2 = n2[1], e2 = t2[1], u2 = r2 | e2, i2 = u2 < (_n | vn | mn), o2 = e2 == mn && r2 == yn || e2 == mn && r2 == xn && n2[7].length <= t2[8] || e2 == (mn | xn) && t2[7].length <= t2[8] && r2 == yn;
        if (!i2 && !o2) return n2;
        e2 & _n && (n2[2] = t2[2], u2 |= r2 & _n ? 0 : gn);
        var f2 = t2[3];
        if (f2) {
          var c2 = n2[3];
          n2[3] = c2 ? Uu(c2, f2, t2[4]) : f2, n2[4] = c2 ? N(n2[3], cn) : t2[4];
        }
        return f2 = t2[5], f2 && (c2 = n2[5], n2[5] = c2 ? Bu(c2, f2, t2[6]) : f2, n2[6] = c2 ? N(n2[5], cn) : t2[6]), f2 = t2[7], f2 && (n2[7] = f2), e2 & mn && (n2[8] = null == n2[8] ? t2[8] : Hl(n2[8], t2[8])), null == n2[9] && (n2[9] = t2[9]), n2[0] = t2[0], n2[1] = u2, n2;
      }
      function Zi(n2) {
        var t2 = [];
        if (null != n2) for (var r2 in ll(n2)) t2.push(r2);
        return t2;
      }
      function Ki(n2) {
        return xl.call(n2);
      }
      function Vi(t2, r2, e2) {
        return r2 = Gl(r2 === X ? t2.length - 1 : r2, 0), function() {
          for (var u2 = arguments, i2 = -1, o2 = Gl(u2.length - r2, 0), f2 = il(o2); ++i2 < o2; ) f2[i2] = u2[r2 + i2];
          i2 = -1;
          for (var c2 = il(r2 + 1); ++i2 < r2; ) c2[i2] = u2[i2];
          return c2[r2] = e2(f2), n(t2, this, c2);
        };
      }
      function Gi(n2, t2) {
        return t2.length < 2 ? n2 : _e2(n2, au(t2, 0, -1));
      }
      function Hi(n2, t2) {
        for (var r2 = n2.length, e2 = Hl(t2.length, r2), u2 = Tu(n2); e2--; ) {
          var i2 = t2[e2];
          n2[e2] = Ci(i2, r2) ? u2[i2] : X;
        }
        return n2;
      }
      function Ji(n2, t2) {
        if (("constructor" !== t2 || "function" != typeof n2[t2]) && "__proto__" != t2) return n2[t2];
      }
      function Yi(n2, t2, r2) {
        var e2 = t2 + "";
        return Ls(n2, Wi(e2, ro(Ii(e2), r2)));
      }
      function Qi(n2) {
        var t2 = 0, r2 = 0;
        return function() {
          var e2 = Jl(), u2 = In - (e2 - r2);
          if (r2 = e2, u2 > 0) {
            if (++t2 >= On) return arguments[0];
          } else t2 = 0;
          return n2.apply(X, arguments);
        };
      }
      function Xi(n2, t2) {
        var r2 = -1, e2 = n2.length, u2 = e2 - 1;
        for (t2 = t2 === X ? e2 : t2; ++r2 < t2; ) {
          var i2 = tu(r2, u2), o2 = n2[i2];
          n2[i2] = n2[r2], n2[r2] = o2;
        }
        return n2.length = t2, n2;
      }
      function no(n2) {
        if ("string" == typeof n2 || bc(n2)) return n2;
        var t2 = n2 + "";
        return "0" == t2 && 1 / n2 == -Sn ? "-0" : t2;
      }
      function to(n2) {
        if (null != n2) {
          try {
            return dl.call(n2);
          } catch (n3) {
          }
          try {
            return n2 + "";
          } catch (n3) {
          }
        }
        return "";
      }
      function ro(n2, t2) {
        return r($n, function(r2) {
          var e2 = "_." + r2[0];
          t2 & r2[1] && !o(n2, e2) && n2.push(e2);
        }), n2.sort();
      }
      function eo(n2) {
        if (n2 instanceof Ct2) return n2.clone();
        var t2 = new Y2(n2.__wrapped__, n2.__chain__);
        return t2.__actions__ = Tu(n2.__actions__), t2.__index__ = n2.__index__, t2.__values__ = n2.__values__, t2;
      }
      function uo(n2, t2, r2) {
        t2 = (r2 ? Ui(n2, t2, r2) : t2 === X) ? 1 : Gl(kc(t2), 0);
        var e2 = null == n2 ? 0 : n2.length;
        if (!e2 || t2 < 1) return [];
        for (var u2 = 0, i2 = 0, o2 = il(Fl(e2 / t2)); u2 < e2; ) o2[i2++] = au(n2, u2, u2 += t2);
        return o2;
      }
      function io2(n2) {
        for (var t2 = -1, r2 = null == n2 ? 0 : n2.length, e2 = 0, u2 = []; ++t2 < r2; ) {
          var i2 = n2[t2];
          i2 && (u2[e2++] = i2);
        }
        return u2;
      }
      function oo() {
        var n2 = arguments.length;
        if (!n2) return [];
        for (var t2 = il(n2 - 1), r2 = arguments[0], e2 = n2; e2--; ) t2[e2 - 1] = arguments[e2];
        return a(bh(r2) ? Tu(r2) : [r2], ee2(t2, 1));
      }
      function fo(n2, t2, r2) {
        var e2 = null == n2 ? 0 : n2.length;
        return e2 ? (t2 = r2 || t2 === X ? 1 : kc(t2), au(n2, t2 < 0 ? 0 : t2, e2)) : [];
      }
      function co(n2, t2, r2) {
        var e2 = null == n2 ? 0 : n2.length;
        return e2 ? (t2 = r2 || t2 === X ? 1 : kc(t2), t2 = e2 - t2, au(n2, 0, t2 < 0 ? 0 : t2)) : [];
      }
      function ao(n2, t2) {
        return n2 && n2.length ? bu(n2, mi(t2, 3), true, true) : [];
      }
      function lo(n2, t2) {
        return n2 && n2.length ? bu(n2, mi(t2, 3), true) : [];
      }
      function so(n2, t2, r2, e2) {
        var u2 = null == n2 ? 0 : n2.length;
        return u2 ? (r2 && "number" != typeof r2 && Ui(n2, t2, r2) && (r2 = 0, e2 = u2), ne2(n2, t2, r2, e2)) : [];
      }
      function ho(n2, t2, r2) {
        var e2 = null == n2 ? 0 : n2.length;
        if (!e2) return -1;
        var u2 = null == r2 ? 0 : kc(r2);
        return u2 < 0 && (u2 = Gl(e2 + u2, 0)), g(n2, mi(t2, 3), u2);
      }
      function po(n2, t2, r2) {
        var e2 = null == n2 ? 0 : n2.length;
        if (!e2) return -1;
        var u2 = e2 - 1;
        return r2 !== X && (u2 = kc(r2), u2 = r2 < 0 ? Gl(e2 + u2, 0) : Hl(u2, e2 - 1)), g(n2, mi(t2, 3), u2, true);
      }
      function _o(n2) {
        return (null == n2 ? 0 : n2.length) ? ee2(n2, 1) : [];
      }
      function vo(n2) {
        return (null == n2 ? 0 : n2.length) ? ee2(n2, Sn) : [];
      }
      function go(n2, t2) {
        return (null == n2 ? 0 : n2.length) ? (t2 = t2 === X ? 1 : kc(t2), ee2(n2, t2)) : [];
      }
      function yo(n2) {
        for (var t2 = -1, r2 = null == n2 ? 0 : n2.length, e2 = {}; ++t2 < r2; ) {
          var u2 = n2[t2];
          e2[u2[0]] = u2[1];
        }
        return e2;
      }
      function bo(n2) {
        return n2 && n2.length ? n2[0] : X;
      }
      function wo(n2, t2, r2) {
        var e2 = null == n2 ? 0 : n2.length;
        if (!e2) return -1;
        var u2 = null == r2 ? 0 : kc(r2);
        return u2 < 0 && (u2 = Gl(e2 + u2, 0)), y(n2, t2, u2);
      }
      function mo(n2) {
        return (null == n2 ? 0 : n2.length) ? au(n2, 0, -1) : [];
      }
      function xo(n2, t2) {
        return null == n2 ? "" : Kl.call(n2, t2);
      }
      function jo(n2) {
        var t2 = null == n2 ? 0 : n2.length;
        return t2 ? n2[t2 - 1] : X;
      }
      function Ao(n2, t2, r2) {
        var e2 = null == n2 ? 0 : n2.length;
        if (!e2) return -1;
        var u2 = e2;
        return r2 !== X && (u2 = kc(r2), u2 = u2 < 0 ? Gl(e2 + u2, 0) : Hl(u2, e2 - 1)), t2 === t2 ? K(n2, t2, u2) : g(n2, b, u2, true);
      }
      function ko(n2, t2) {
        return n2 && n2.length ? Ge(n2, kc(t2)) : X;
      }
      function Oo(n2, t2) {
        return n2 && n2.length && t2 && t2.length ? Xe(n2, t2) : n2;
      }
      function Io(n2, t2, r2) {
        return n2 && n2.length && t2 && t2.length ? Xe(n2, t2, mi(r2, 2)) : n2;
      }
      function Ro(n2, t2, r2) {
        return n2 && n2.length && t2 && t2.length ? Xe(n2, t2, X, r2) : n2;
      }
      function zo(n2, t2) {
        var r2 = [];
        if (!n2 || !n2.length) return r2;
        var e2 = -1, u2 = [], i2 = n2.length;
        for (t2 = mi(t2, 3); ++e2 < i2; ) {
          var o2 = n2[e2];
          t2(o2, e2, n2) && (r2.push(o2), u2.push(e2));
        }
        return nu(n2, u2), r2;
      }
      function Eo(n2) {
        return null == n2 ? n2 : Xl.call(n2);
      }
      function So(n2, t2, r2) {
        var e2 = null == n2 ? 0 : n2.length;
        return e2 ? (r2 && "number" != typeof r2 && Ui(n2, t2, r2) ? (t2 = 0, r2 = e2) : (t2 = null == t2 ? 0 : kc(t2), r2 = r2 === X ? e2 : kc(r2)), au(n2, t2, r2)) : [];
      }
      function Wo(n2, t2) {
        return su(n2, t2);
      }
      function Lo(n2, t2, r2) {
        return hu(n2, t2, mi(r2, 2));
      }
      function Co(n2, t2) {
        var r2 = null == n2 ? 0 : n2.length;
        if (r2) {
          var e2 = su(n2, t2);
          if (e2 < r2 && Gf(n2[e2], t2)) return e2;
        }
        return -1;
      }
      function Uo(n2, t2) {
        return su(n2, t2, true);
      }
      function Bo(n2, t2, r2) {
        return hu(n2, t2, mi(r2, 2), true);
      }
      function To(n2, t2) {
        if (null == n2 ? 0 : n2.length) {
          var r2 = su(n2, t2, true) - 1;
          if (Gf(n2[r2], t2)) return r2;
        }
        return -1;
      }
      function $o(n2) {
        return n2 && n2.length ? pu(n2) : [];
      }
      function Do(n2, t2) {
        return n2 && n2.length ? pu(n2, mi(t2, 2)) : [];
      }
      function Mo(n2) {
        var t2 = null == n2 ? 0 : n2.length;
        return t2 ? au(n2, 1, t2) : [];
      }
      function Fo(n2, t2, r2) {
        return n2 && n2.length ? (t2 = r2 || t2 === X ? 1 : kc(t2), au(n2, 0, t2 < 0 ? 0 : t2)) : [];
      }
      function No(n2, t2, r2) {
        var e2 = null == n2 ? 0 : n2.length;
        return e2 ? (t2 = r2 || t2 === X ? 1 : kc(t2), t2 = e2 - t2, au(n2, t2 < 0 ? 0 : t2, e2)) : [];
      }
      function Po(n2, t2) {
        return n2 && n2.length ? bu(n2, mi(t2, 3), false, true) : [];
      }
      function qo(n2, t2) {
        return n2 && n2.length ? bu(n2, mi(t2, 3)) : [];
      }
      function Zo(n2) {
        return n2 && n2.length ? gu(n2) : [];
      }
      function Ko(n2, t2) {
        return n2 && n2.length ? gu(n2, mi(t2, 2)) : [];
      }
      function Vo(n2, t2) {
        return t2 = "function" == typeof t2 ? t2 : X, n2 && n2.length ? gu(n2, X, t2) : [];
      }
      function Go(n2) {
        if (!n2 || !n2.length) return [];
        var t2 = 0;
        return n2 = i(n2, function(n3) {
          if (Jf(n3)) return t2 = Gl(n3.length, t2), true;
        }), O(t2, function(t3) {
          return c(n2, m(t3));
        });
      }
      function Ho(t2, r2) {
        if (!t2 || !t2.length) return [];
        var e2 = Go(t2);
        return null == r2 ? e2 : c(e2, function(t3) {
          return n(r2, X, t3);
        });
      }
      function Jo(n2, t2) {
        return xu(n2 || [], t2 || [], Sr2);
      }
      function Yo(n2, t2) {
        return xu(n2 || [], t2 || [], fu);
      }
      function Qo(n2) {
        var t2 = Z2(n2);
        return t2.__chain__ = true, t2;
      }
      function Xo(n2, t2) {
        return t2(n2), n2;
      }
      function nf(n2, t2) {
        return t2(n2);
      }
      function tf() {
        return Qo(this);
      }
      function rf() {
        return new Y2(this.value(), this.__chain__);
      }
      function ef() {
        this.__values__ === X && (this.__values__ = jc(this.value()));
        var n2 = this.__index__ >= this.__values__.length;
        return { done: n2, value: n2 ? X : this.__values__[this.__index__++] };
      }
      function uf() {
        return this;
      }
      function of(n2) {
        for (var t2, r2 = this; r2 instanceof J2; ) {
          var e2 = eo(r2);
          e2.__index__ = 0, e2.__values__ = X, t2 ? u2.__wrapped__ = e2 : t2 = e2;
          var u2 = e2;
          r2 = r2.__wrapped__;
        }
        return u2.__wrapped__ = n2, t2;
      }
      function ff() {
        var n2 = this.__wrapped__;
        if (n2 instanceof Ct2) {
          var t2 = n2;
          return this.__actions__.length && (t2 = new Ct2(this)), t2 = t2.reverse(), t2.__actions__.push({ func: nf, args: [Eo], thisArg: X }), new Y2(t2, this.__chain__);
        }
        return this.thru(Eo);
      }
      function cf() {
        return wu(this.__wrapped__, this.__actions__);
      }
      function af(n2, t2, r2) {
        var e2 = bh(n2) ? u : Jr2;
        return r2 && Ui(n2, t2, r2) && (t2 = X), e2(n2, mi(t2, 3));
      }
      function lf(n2, t2) {
        return (bh(n2) ? i : te2)(n2, mi(t2, 3));
      }
      function sf(n2, t2) {
        return ee2(yf(n2, t2), 1);
      }
      function hf(n2, t2) {
        return ee2(yf(n2, t2), Sn);
      }
      function pf(n2, t2, r2) {
        return r2 = r2 === X ? 1 : kc(r2), ee2(yf(n2, t2), r2);
      }
      function _f(n2, t2) {
        return (bh(n2) ? r : ys)(n2, mi(t2, 3));
      }
      function vf(n2, t2) {
        return (bh(n2) ? e : ds)(n2, mi(t2, 3));
      }
      function gf(n2, t2, r2, e2) {
        n2 = Hf(n2) ? n2 : ra(n2), r2 = r2 && !e2 ? kc(r2) : 0;
        var u2 = n2.length;
        return r2 < 0 && (r2 = Gl(u2 + r2, 0)), dc(n2) ? r2 <= u2 && n2.indexOf(t2, r2) > -1 : !!u2 && y(n2, t2, r2) > -1;
      }
      function yf(n2, t2) {
        return (bh(n2) ? c : Pe)(n2, mi(t2, 3));
      }
      function df(n2, t2, r2, e2) {
        return null == n2 ? [] : (bh(t2) || (t2 = null == t2 ? [] : [t2]), r2 = e2 ? X : r2, bh(r2) || (r2 = null == r2 ? [] : [r2]), He(n2, t2, r2));
      }
      function bf(n2, t2, r2) {
        var e2 = bh(n2) ? l : j, u2 = arguments.length < 3;
        return e2(n2, mi(t2, 4), r2, u2, ys);
      }
      function wf(n2, t2, r2) {
        var e2 = bh(n2) ? s : j, u2 = arguments.length < 3;
        return e2(n2, mi(t2, 4), r2, u2, ds);
      }
      function mf(n2, t2) {
        return (bh(n2) ? i : te2)(n2, Uf(mi(t2, 3)));
      }
      function xf(n2) {
        return (bh(n2) ? Ir2 : iu)(n2);
      }
      function jf(n2, t2, r2) {
        return t2 = (r2 ? Ui(n2, t2, r2) : t2 === X) ? 1 : kc(t2), (bh(n2) ? Rr2 : ou)(n2, t2);
      }
      function Af(n2) {
        return (bh(n2) ? zr2 : cu)(n2);
      }
      function kf(n2) {
        if (null == n2) return 0;
        if (Hf(n2)) return dc(n2) ? V(n2) : n2.length;
        var t2 = zs(n2);
        return t2 == Gn || t2 == tt ? n2.size : Me(n2).length;
      }
      function Of(n2, t2, r2) {
        var e2 = bh(n2) ? h : lu;
        return r2 && Ui(n2, t2, r2) && (t2 = X), e2(n2, mi(t2, 3));
      }
      function If(n2, t2) {
        if ("function" != typeof t2) throw new pl(en);
        return n2 = kc(n2), function() {
          if (--n2 < 1) return t2.apply(this, arguments);
        };
      }
      function Rf(n2, t2, r2) {
        return t2 = r2 ? X : t2, t2 = n2 && null == t2 ? n2.length : t2, ai(n2, mn, X, X, X, X, t2);
      }
      function zf(n2, t2) {
        var r2;
        if ("function" != typeof t2) throw new pl(en);
        return n2 = kc(n2), function() {
          return --n2 > 0 && (r2 = t2.apply(this, arguments)), n2 <= 1 && (t2 = X), r2;
        };
      }
      function Ef(n2, t2, r2) {
        t2 = r2 ? X : t2;
        var e2 = ai(n2, yn, X, X, X, X, X, t2);
        return e2.placeholder = Ef.placeholder, e2;
      }
      function Sf(n2, t2, r2) {
        t2 = r2 ? X : t2;
        var e2 = ai(n2, dn, X, X, X, X, X, t2);
        return e2.placeholder = Sf.placeholder, e2;
      }
      function Wf(n2, t2, r2) {
        function e2(t3) {
          var r3 = h2, e3 = p3;
          return h2 = p3 = X, d2 = t3, v2 = n2.apply(e3, r3);
        }
        function u2(n3) {
          return d2 = n3, g2 = Ws(f2, t2), b2 ? e2(n3) : v2;
        }
        function i2(n3) {
          var r3 = n3 - y2, e3 = n3 - d2, u3 = t2 - r3;
          return w2 ? Hl(u3, _3 - e3) : u3;
        }
        function o2(n3) {
          var r3 = n3 - y2, e3 = n3 - d2;
          return y2 === X || r3 >= t2 || r3 < 0 || w2 && e3 >= _3;
        }
        function f2() {
          var n3 = fh();
          return o2(n3) ? c2(n3) : (g2 = Ws(f2, i2(n3)), X);
        }
        function c2(n3) {
          return g2 = X, m2 && h2 ? e2(n3) : (h2 = p3 = X, v2);
        }
        function a2() {
          g2 !== X && As(g2), d2 = 0, h2 = y2 = p3 = g2 = X;
        }
        function l2() {
          return g2 === X ? v2 : c2(fh());
        }
        function s2() {
          var n3 = fh(), r3 = o2(n3);
          if (h2 = arguments, p3 = this, y2 = n3, r3) {
            if (g2 === X) return u2(y2);
            if (w2) return As(g2), g2 = Ws(f2, t2), e2(y2);
          }
          return g2 === X && (g2 = Ws(f2, t2)), v2;
        }
        var h2, p3, _3, v2, g2, y2, d2 = 0, b2 = false, w2 = false, m2 = true;
        if ("function" != typeof n2) throw new pl(en);
        return t2 = Ic(t2) || 0, fc(r2) && (b2 = !!r2.leading, w2 = "maxWait" in r2, _3 = w2 ? Gl(Ic(r2.maxWait) || 0, t2) : _3, m2 = "trailing" in r2 ? !!r2.trailing : m2), s2.cancel = a2, s2.flush = l2, s2;
      }
      function Lf(n2) {
        return ai(n2, jn);
      }
      function Cf(n2, t2) {
        if ("function" != typeof n2 || null != t2 && "function" != typeof t2) throw new pl(en);
        var r2 = function() {
          var e2 = arguments, u2 = t2 ? t2.apply(this, e2) : e2[0], i2 = r2.cache;
          if (i2.has(u2)) return i2.get(u2);
          var o2 = n2.apply(this, e2);
          return r2.cache = i2.set(u2, o2) || i2, o2;
        };
        return r2.cache = new (Cf.Cache || sr2)(), r2;
      }
      function Uf(n2) {
        if ("function" != typeof n2) throw new pl(en);
        return function() {
          var t2 = arguments;
          switch (t2.length) {
            case 0:
              return !n2.call(this);
            case 1:
              return !n2.call(this, t2[0]);
            case 2:
              return !n2.call(this, t2[0], t2[1]);
            case 3:
              return !n2.call(this, t2[0], t2[1], t2[2]);
          }
          return !n2.apply(this, t2);
        };
      }
      function Bf(n2) {
        return zf(2, n2);
      }
      function Tf(n2, t2) {
        if ("function" != typeof n2) throw new pl(en);
        return t2 = t2 === X ? t2 : kc(t2), uu(n2, t2);
      }
      function $f(t2, r2) {
        if ("function" != typeof t2) throw new pl(en);
        return r2 = null == r2 ? 0 : Gl(kc(r2), 0), uu(function(e2) {
          var u2 = e2[r2], i2 = Ou(e2, 0, r2);
          return u2 && a(i2, u2), n(t2, this, i2);
        });
      }
      function Df(n2, t2, r2) {
        var e2 = true, u2 = true;
        if ("function" != typeof n2) throw new pl(en);
        return fc(r2) && (e2 = "leading" in r2 ? !!r2.leading : e2, u2 = "trailing" in r2 ? !!r2.trailing : u2), Wf(n2, t2, { leading: e2, maxWait: t2, trailing: u2 });
      }
      function Mf(n2) {
        return Rf(n2, 1);
      }
      function Ff(n2, t2) {
        return ph(Au(t2), n2);
      }
      function Nf() {
        if (!arguments.length) return [];
        var n2 = arguments[0];
        return bh(n2) ? n2 : [n2];
      }
      function Pf(n2) {
        return Fr2(n2, sn);
      }
      function qf(n2, t2) {
        return t2 = "function" == typeof t2 ? t2 : X, Fr2(n2, sn, t2);
      }
      function Zf(n2) {
        return Fr2(n2, an | sn);
      }
      function Kf(n2, t2) {
        return t2 = "function" == typeof t2 ? t2 : X, Fr2(n2, an | sn, t2);
      }
      function Vf(n2, t2) {
        return null == t2 || Pr2(n2, t2, Pc(t2));
      }
      function Gf(n2, t2) {
        return n2 === t2 || n2 !== n2 && t2 !== t2;
      }
      function Hf(n2) {
        return null != n2 && oc(n2.length) && !uc(n2);
      }
      function Jf(n2) {
        return cc(n2) && Hf(n2);
      }
      function Yf(n2) {
        return n2 === true || n2 === false || cc(n2) && we(n2) == Nn;
      }
      function Qf(n2) {
        return cc(n2) && 1 === n2.nodeType && !gc(n2);
      }
      function Xf(n2) {
        if (null == n2) return true;
        if (Hf(n2) && (bh(n2) || "string" == typeof n2 || "function" == typeof n2.splice || mh(n2) || Oh(n2) || dh(n2))) return !n2.length;
        var t2 = zs(n2);
        if (t2 == Gn || t2 == tt) return !n2.size;
        if (Mi(n2)) return !Me(n2).length;
        for (var r2 in n2) if (bl.call(n2, r2)) return false;
        return true;
      }
      function nc(n2, t2) {
        return Se(n2, t2);
      }
      function tc(n2, t2, r2) {
        r2 = "function" == typeof r2 ? r2 : X;
        var e2 = r2 ? r2(n2, t2) : X;
        return e2 === X ? Se(n2, t2, X, r2) : !!e2;
      }
      function rc(n2) {
        if (!cc(n2)) return false;
        var t2 = we(n2);
        return t2 == Zn || t2 == qn || "string" == typeof n2.message && "string" == typeof n2.name && !gc(n2);
      }
      function ec(n2) {
        return "number" == typeof n2 && Zl(n2);
      }
      function uc(n2) {
        if (!fc(n2)) return false;
        var t2 = we(n2);
        return t2 == Kn || t2 == Vn || t2 == Fn || t2 == Xn;
      }
      function ic(n2) {
        return "number" == typeof n2 && n2 == kc(n2);
      }
      function oc(n2) {
        return "number" == typeof n2 && n2 > -1 && n2 % 1 == 0 && n2 <= Wn;
      }
      function fc(n2) {
        var t2 = typeof n2;
        return null != n2 && ("object" == t2 || "function" == t2);
      }
      function cc(n2) {
        return null != n2 && "object" == typeof n2;
      }
      function ac(n2, t2) {
        return n2 === t2 || Ce(n2, t2, ji(t2));
      }
      function lc(n2, t2, r2) {
        return r2 = "function" == typeof r2 ? r2 : X, Ce(n2, t2, ji(t2), r2);
      }
      function sc(n2) {
        return vc(n2) && n2 != +n2;
      }
      function hc(n2) {
        if (Es(n2)) throw new fl(rn);
        return Ue(n2);
      }
      function pc(n2) {
        return null === n2;
      }
      function _c(n2) {
        return null == n2;
      }
      function vc(n2) {
        return "number" == typeof n2 || cc(n2) && we(n2) == Hn;
      }
      function gc(n2) {
        if (!cc(n2) || we(n2) != Yn) return false;
        var t2 = El(n2);
        if (null === t2) return true;
        var r2 = bl.call(t2, "constructor") && t2.constructor;
        return "function" == typeof r2 && r2 instanceof r2 && dl.call(r2) == jl;
      }
      function yc(n2) {
        return ic(n2) && n2 >= -Wn && n2 <= Wn;
      }
      function dc(n2) {
        return "string" == typeof n2 || !bh(n2) && cc(n2) && we(n2) == rt;
      }
      function bc(n2) {
        return "symbol" == typeof n2 || cc(n2) && we(n2) == et;
      }
      function wc(n2) {
        return n2 === X;
      }
      function mc(n2) {
        return cc(n2) && zs(n2) == it;
      }
      function xc(n2) {
        return cc(n2) && we(n2) == ot;
      }
      function jc(n2) {
        if (!n2) return [];
        if (Hf(n2)) return dc(n2) ? G(n2) : Tu(n2);
        if (Ul && n2[Ul]) return D(n2[Ul]());
        var t2 = zs(n2);
        return (t2 == Gn ? M : t2 == tt ? P : ra)(n2);
      }
      function Ac(n2) {
        if (!n2) return 0 === n2 ? n2 : 0;
        if (n2 = Ic(n2), n2 === Sn || n2 === -Sn) {
          return (n2 < 0 ? -1 : 1) * Ln;
        }
        return n2 === n2 ? n2 : 0;
      }
      function kc(n2) {
        var t2 = Ac(n2), r2 = t2 % 1;
        return t2 === t2 ? r2 ? t2 - r2 : t2 : 0;
      }
      function Oc(n2) {
        return n2 ? Mr2(kc(n2), 0, Un) : 0;
      }
      function Ic(n2) {
        if ("number" == typeof n2) return n2;
        if (bc(n2)) return Cn;
        if (fc(n2)) {
          var t2 = "function" == typeof n2.valueOf ? n2.valueOf() : n2;
          n2 = fc(t2) ? t2 + "" : t2;
        }
        if ("string" != typeof n2) return 0 === n2 ? n2 : +n2;
        n2 = R(n2);
        var r2 = qt.test(n2);
        return r2 || Kt.test(n2) ? Xr(n2.slice(2), r2 ? 2 : 8) : Pt.test(n2) ? Cn : +n2;
      }
      function Rc(n2) {
        return $u(n2, qc(n2));
      }
      function zc(n2) {
        return n2 ? Mr2(kc(n2), -Wn, Wn) : 0 === n2 ? n2 : 0;
      }
      function Ec(n2) {
        return null == n2 ? "" : vu(n2);
      }
      function Sc(n2, t2) {
        var r2 = gs(n2);
        return null == t2 ? r2 : Cr2(r2, t2);
      }
      function Wc(n2, t2) {
        return v(n2, mi(t2, 3), ue2);
      }
      function Lc(n2, t2) {
        return v(n2, mi(t2, 3), oe2);
      }
      function Cc(n2, t2) {
        return null == n2 ? n2 : bs(n2, mi(t2, 3), qc);
      }
      function Uc(n2, t2) {
        return null == n2 ? n2 : ws(n2, mi(t2, 3), qc);
      }
      function Bc(n2, t2) {
        return n2 && ue2(n2, mi(t2, 3));
      }
      function Tc(n2, t2) {
        return n2 && oe2(n2, mi(t2, 3));
      }
      function $c(n2) {
        return null == n2 ? [] : fe2(n2, Pc(n2));
      }
      function Dc(n2) {
        return null == n2 ? [] : fe2(n2, qc(n2));
      }
      function Mc(n2, t2, r2) {
        var e2 = null == n2 ? X : _e2(n2, t2);
        return e2 === X ? r2 : e2;
      }
      function Fc(n2, t2) {
        return null != n2 && Ri(n2, t2, xe);
      }
      function Nc(n2, t2) {
        return null != n2 && Ri(n2, t2, je);
      }
      function Pc(n2) {
        return Hf(n2) ? Or2(n2) : Me(n2);
      }
      function qc(n2) {
        return Hf(n2) ? Or2(n2, true) : Fe(n2);
      }
      function Zc(n2, t2) {
        var r2 = {};
        return t2 = mi(t2, 3), ue2(n2, function(n3, e2, u2) {
          Br2(r2, t2(n3, e2, u2), n3);
        }), r2;
      }
      function Kc(n2, t2) {
        var r2 = {};
        return t2 = mi(t2, 3), ue2(n2, function(n3, e2, u2) {
          Br2(r2, e2, t2(n3, e2, u2));
        }), r2;
      }
      function Vc(n2, t2) {
        return Gc(n2, Uf(mi(t2)));
      }
      function Gc(n2, t2) {
        if (null == n2) return {};
        var r2 = c(di(n2), function(n3) {
          return [n3];
        });
        return t2 = mi(t2), Ye(n2, r2, function(n3, r3) {
          return t2(n3, r3[0]);
        });
      }
      function Hc(n2, t2, r2) {
        t2 = ku(t2, n2);
        var e2 = -1, u2 = t2.length;
        for (u2 || (u2 = 1, n2 = X); ++e2 < u2; ) {
          var i2 = null == n2 ? X : n2[no(t2[e2])];
          i2 === X && (e2 = u2, i2 = r2), n2 = uc(i2) ? i2.call(n2) : i2;
        }
        return n2;
      }
      function Jc(n2, t2, r2) {
        return null == n2 ? n2 : fu(n2, t2, r2);
      }
      function Yc(n2, t2, r2, e2) {
        return e2 = "function" == typeof e2 ? e2 : X, null == n2 ? n2 : fu(n2, t2, r2, e2);
      }
      function Qc(n2, t2, e2) {
        var u2 = bh(n2), i2 = u2 || mh(n2) || Oh(n2);
        if (t2 = mi(t2, 4), null == e2) {
          var o2 = n2 && n2.constructor;
          e2 = i2 ? u2 ? new o2() : [] : fc(n2) && uc(o2) ? gs(El(n2)) : {};
        }
        return (i2 ? r : ue2)(n2, function(n3, r2, u3) {
          return t2(e2, n3, r2, u3);
        }), e2;
      }
      function Xc(n2, t2) {
        return null == n2 || yu(n2, t2);
      }
      function na(n2, t2, r2) {
        return null == n2 ? n2 : du(n2, t2, Au(r2));
      }
      function ta(n2, t2, r2, e2) {
        return e2 = "function" == typeof e2 ? e2 : X, null == n2 ? n2 : du(n2, t2, Au(r2), e2);
      }
      function ra(n2) {
        return null == n2 ? [] : E(n2, Pc(n2));
      }
      function ea(n2) {
        return null == n2 ? [] : E(n2, qc(n2));
      }
      function ua(n2, t2, r2) {
        return r2 === X && (r2 = t2, t2 = X), r2 !== X && (r2 = Ic(r2), r2 = r2 === r2 ? r2 : 0), t2 !== X && (t2 = Ic(t2), t2 = t2 === t2 ? t2 : 0), Mr2(Ic(n2), t2, r2);
      }
      function ia(n2, t2, r2) {
        return t2 = Ac(t2), r2 === X ? (r2 = t2, t2 = 0) : r2 = Ac(r2), n2 = Ic(n2), Ae(n2, t2, r2);
      }
      function oa(n2, t2, r2) {
        if (r2 && "boolean" != typeof r2 && Ui(n2, t2, r2) && (t2 = r2 = X), r2 === X && ("boolean" == typeof t2 ? (r2 = t2, t2 = X) : "boolean" == typeof n2 && (r2 = n2, n2 = X)), n2 === X && t2 === X ? (n2 = 0, t2 = 1) : (n2 = Ac(n2), t2 === X ? (t2 = n2, n2 = 0) : t2 = Ac(t2)), n2 > t2) {
          var e2 = n2;
          n2 = t2, t2 = e2;
        }
        if (r2 || n2 % 1 || t2 % 1) {
          var u2 = Ql();
          return Hl(n2 + u2 * (t2 - n2 + Qr("1e-" + ((u2 + "").length - 1))), t2);
        }
        return tu(n2, t2);
      }
      function fa(n2) {
        return Qh(Ec(n2).toLowerCase());
      }
      function ca(n2) {
        return n2 = Ec(n2), n2 && n2.replace(Gt, ve).replace(Dr, "");
      }
      function aa(n2, t2, r2) {
        n2 = Ec(n2), t2 = vu(t2);
        var e2 = n2.length;
        r2 = r2 === X ? e2 : Mr2(kc(r2), 0, e2);
        var u2 = r2;
        return r2 -= t2.length, r2 >= 0 && n2.slice(r2, u2) == t2;
      }
      function la(n2) {
        return n2 = Ec(n2), n2 && At.test(n2) ? n2.replace(xt, ge) : n2;
      }
      function sa(n2) {
        return n2 = Ec(n2), n2 && Wt.test(n2) ? n2.replace(St, "\\$&") : n2;
      }
      function ha(n2, t2, r2) {
        n2 = Ec(n2), t2 = kc(t2);
        var e2 = t2 ? V(n2) : 0;
        if (!t2 || e2 >= t2) return n2;
        var u2 = (t2 - e2) / 2;
        return ri(Nl(u2), r2) + n2 + ri(Fl(u2), r2);
      }
      function pa(n2, t2, r2) {
        n2 = Ec(n2), t2 = kc(t2);
        var e2 = t2 ? V(n2) : 0;
        return t2 && e2 < t2 ? n2 + ri(t2 - e2, r2) : n2;
      }
      function _a(n2, t2, r2) {
        n2 = Ec(n2), t2 = kc(t2);
        var e2 = t2 ? V(n2) : 0;
        return t2 && e2 < t2 ? ri(t2 - e2, r2) + n2 : n2;
      }
      function va(n2, t2, r2) {
        return r2 || null == t2 ? t2 = 0 : t2 && (t2 = +t2), Yl(Ec(n2).replace(Lt, ""), t2 || 0);
      }
      function ga(n2, t2, r2) {
        return t2 = (r2 ? Ui(n2, t2, r2) : t2 === X) ? 1 : kc(t2), eu(Ec(n2), t2);
      }
      function ya() {
        var n2 = arguments, t2 = Ec(n2[0]);
        return n2.length < 3 ? t2 : t2.replace(n2[1], n2[2]);
      }
      function da(n2, t2, r2) {
        return r2 && "number" != typeof r2 && Ui(n2, t2, r2) && (t2 = r2 = X), (r2 = r2 === X ? Un : r2 >>> 0) ? (n2 = Ec(n2), n2 && ("string" == typeof t2 || null != t2 && !Ah(t2)) && (t2 = vu(t2), !t2 && T(n2)) ? Ou(G(n2), 0, r2) : n2.split(t2, r2)) : [];
      }
      function ba(n2, t2, r2) {
        return n2 = Ec(n2), r2 = null == r2 ? 0 : Mr2(kc(r2), 0, n2.length), t2 = vu(t2), n2.slice(r2, r2 + t2.length) == t2;
      }
      function wa(n2, t2, r2) {
        var e2 = Z2.templateSettings;
        r2 && Ui(n2, t2, r2) && (t2 = X), n2 = Ec(n2), t2 = Sh({}, t2, e2, li);
        var u2, i2, o2 = Sh({}, t2.imports, e2.imports, li), f2 = Pc(o2), c2 = E(o2, f2), a2 = 0, l2 = t2.interpolate || Ht, s2 = "__p += '", h2 = sl((t2.escape || Ht).source + "|" + l2.source + "|" + (l2 === It ? Ft : Ht).source + "|" + (t2.evaluate || Ht).source + "|$", "g"), p3 = "//# sourceURL=" + (bl.call(t2, "sourceURL") ? (t2.sourceURL + "").replace(/\s/g, " ") : "lodash.templateSources[" + ++Zr + "]") + "\n";
        n2.replace(h2, function(t3, r3, e3, o3, f3, c3) {
          return e3 || (e3 = o3), s2 += n2.slice(a2, c3).replace(Jt, U), r3 && (u2 = true, s2 += "' +\n__e(" + r3 + ") +\n'"), f3 && (i2 = true, s2 += "';\n" + f3 + ";\n__p += '"), e3 && (s2 += "' +\n((__t = (" + e3 + ")) == null ? '' : __t) +\n'"), a2 = c3 + t3.length, t3;
        }), s2 += "';\n";
        var _3 = bl.call(t2, "variable") && t2.variable;
        if (_3) {
          if (Dt.test(_3)) throw new fl(un);
        } else s2 = "with (obj) {\n" + s2 + "\n}\n";
        s2 = (i2 ? s2.replace(dt, "") : s2).replace(bt, "$1").replace(wt, "$1;"), s2 = "function(" + (_3 || "obj") + ") {\n" + (_3 ? "" : "obj || (obj = {});\n") + "var __t, __p = ''" + (u2 ? ", __e = _.escape" : "") + (i2 ? ", __j = Array.prototype.join;\nfunction print() { __p += __j.call(arguments, '') }\n" : ";\n") + s2 + "return __p\n}";
        var v2 = Xh(function() {
          return cl(f2, p3 + "return " + s2).apply(X, c2);
        });
        if (v2.source = s2, rc(v2)) throw v2;
        return v2;
      }
      function ma(n2) {
        return Ec(n2).toLowerCase();
      }
      function xa(n2) {
        return Ec(n2).toUpperCase();
      }
      function ja(n2, t2, r2) {
        if (n2 = Ec(n2), n2 && (r2 || t2 === X)) return R(n2);
        if (!n2 || !(t2 = vu(t2))) return n2;
        var e2 = G(n2), u2 = G(t2);
        return Ou(e2, W(e2, u2), L(e2, u2) + 1).join("");
      }
      function Aa(n2, t2, r2) {
        if (n2 = Ec(n2), n2 && (r2 || t2 === X)) return n2.slice(0, H(n2) + 1);
        if (!n2 || !(t2 = vu(t2))) return n2;
        var e2 = G(n2);
        return Ou(e2, 0, L(e2, G(t2)) + 1).join("");
      }
      function ka(n2, t2, r2) {
        if (n2 = Ec(n2), n2 && (r2 || t2 === X)) return n2.replace(Lt, "");
        if (!n2 || !(t2 = vu(t2))) return n2;
        var e2 = G(n2);
        return Ou(e2, W(e2, G(t2))).join("");
      }
      function Oa(n2, t2) {
        var r2 = An, e2 = kn;
        if (fc(t2)) {
          var u2 = "separator" in t2 ? t2.separator : u2;
          r2 = "length" in t2 ? kc(t2.length) : r2, e2 = "omission" in t2 ? vu(t2.omission) : e2;
        }
        n2 = Ec(n2);
        var i2 = n2.length;
        if (T(n2)) {
          var o2 = G(n2);
          i2 = o2.length;
        }
        if (r2 >= i2) return n2;
        var f2 = r2 - V(e2);
        if (f2 < 1) return e2;
        var c2 = o2 ? Ou(o2, 0, f2).join("") : n2.slice(0, f2);
        if (u2 === X) return c2 + e2;
        if (o2 && (f2 += c2.length - f2), Ah(u2)) {
          if (n2.slice(f2).search(u2)) {
            var a2, l2 = c2;
            for (u2.global || (u2 = sl(u2.source, Ec(Nt.exec(u2)) + "g")), u2.lastIndex = 0; a2 = u2.exec(l2); ) var s2 = a2.index;
            c2 = c2.slice(0, s2 === X ? f2 : s2);
          }
        } else if (n2.indexOf(vu(u2), f2) != f2) {
          var h2 = c2.lastIndexOf(u2);
          h2 > -1 && (c2 = c2.slice(0, h2));
        }
        return c2 + e2;
      }
      function Ia(n2) {
        return n2 = Ec(n2), n2 && jt.test(n2) ? n2.replace(mt, ye) : n2;
      }
      function Ra(n2, t2, r2) {
        return n2 = Ec(n2), t2 = r2 ? X : t2, t2 === X ? $(n2) ? Q(n2) : _2(n2) : n2.match(t2) || [];
      }
      function za(t2) {
        var r2 = null == t2 ? 0 : t2.length, e2 = mi();
        return t2 = r2 ? c(t2, function(n2) {
          if ("function" != typeof n2[1]) throw new pl(en);
          return [e2(n2[0]), n2[1]];
        }) : [], uu(function(e3) {
          for (var u2 = -1; ++u2 < r2; ) {
            var i2 = t2[u2];
            if (n(i2[0], this, e3)) return n(i2[1], this, e3);
          }
        });
      }
      function Ea(n2) {
        return Nr2(Fr2(n2, an));
      }
      function Sa(n2) {
        return function() {
          return n2;
        };
      }
      function Wa(n2, t2) {
        return null == n2 || n2 !== n2 ? t2 : n2;
      }
      function La(n2) {
        return n2;
      }
      function Ca(n2) {
        return De("function" == typeof n2 ? n2 : Fr2(n2, an));
      }
      function Ua(n2) {
        return qe(Fr2(n2, an));
      }
      function Ba(n2, t2) {
        return Ze(n2, Fr2(t2, an));
      }
      function Ta(n2, t2, e2) {
        var u2 = Pc(t2), i2 = fe2(t2, u2);
        null != e2 || fc(t2) && (i2.length || !u2.length) || (e2 = t2, t2 = n2, n2 = this, i2 = fe2(t2, Pc(t2)));
        var o2 = !(fc(e2) && "chain" in e2 && !e2.chain), f2 = uc(n2);
        return r(i2, function(r2) {
          var e3 = t2[r2];
          n2[r2] = e3, f2 && (n2.prototype[r2] = function() {
            var t3 = this.__chain__;
            if (o2 || t3) {
              var r3 = n2(this.__wrapped__);
              return (r3.__actions__ = Tu(this.__actions__)).push({ func: e3, args: arguments, thisArg: n2 }), r3.__chain__ = t3, r3;
            }
            return e3.apply(n2, a([this.value()], arguments));
          });
        }), n2;
      }
      function $a() {
        return re._ === this && (re._ = Al), this;
      }
      function Da() {
      }
      function Ma(n2) {
        return n2 = kc(n2), uu(function(t2) {
          return Ge(t2, n2);
        });
      }
      function Fa(n2) {
        return Bi(n2) ? m(no(n2)) : Qe(n2);
      }
      function Na(n2) {
        return function(t2) {
          return null == n2 ? X : _e2(n2, t2);
        };
      }
      function Pa() {
        return [];
      }
      function qa() {
        return false;
      }
      function Za() {
        return {};
      }
      function Ka() {
        return "";
      }
      function Va() {
        return true;
      }
      function Ga(n2, t2) {
        if (n2 = kc(n2), n2 < 1 || n2 > Wn) return [];
        var r2 = Un, e2 = Hl(n2, Un);
        t2 = mi(t2), n2 -= Un;
        for (var u2 = O(e2, t2); ++r2 < n2; ) t2(r2);
        return u2;
      }
      function Ha(n2) {
        return bh(n2) ? c(n2, no) : bc(n2) ? [n2] : Tu(Cs(Ec(n2)));
      }
      function Ja(n2) {
        var t2 = ++wl;
        return Ec(n2) + t2;
      }
      function Ya(n2) {
        return n2 && n2.length ? Yr2(n2, La, me) : X;
      }
      function Qa(n2, t2) {
        return n2 && n2.length ? Yr2(n2, mi(t2, 2), me) : X;
      }
      function Xa(n2) {
        return w(n2, La);
      }
      function nl(n2, t2) {
        return w(n2, mi(t2, 2));
      }
      function tl(n2) {
        return n2 && n2.length ? Yr2(n2, La, Ne) : X;
      }
      function rl(n2, t2) {
        return n2 && n2.length ? Yr2(n2, mi(t2, 2), Ne) : X;
      }
      function el(n2) {
        return n2 && n2.length ? k(n2, La) : 0;
      }
      function ul(n2, t2) {
        return n2 && n2.length ? k(n2, mi(t2, 2)) : 0;
      }
      x2 = null == x2 ? re : be.defaults(re.Object(), x2, be.pick(re, qr));
      var il = x2.Array, ol = x2.Date, fl = x2.Error, cl = x2.Function, al = x2.Math, ll = x2.Object, sl = x2.RegExp, hl = x2.String, pl = x2.TypeError, _l = il.prototype, vl = cl.prototype, gl = ll.prototype, yl = x2["__core-js_shared__"], dl = vl.toString, bl = gl.hasOwnProperty, wl = 0, ml = function() {
        var n2 = /[^.]+$/.exec(yl && yl.keys && yl.keys.IE_PROTO || "");
        return n2 ? "Symbol(src)_1." + n2 : "";
      }(), xl = gl.toString, jl = dl.call(ll), Al = re._, kl = sl("^" + dl.call(bl).replace(St, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"), Ol = ie ? x2.Buffer : X, Il = x2.Symbol, Rl = x2.Uint8Array, zl = Ol ? Ol.allocUnsafe : X, El = F(ll.getPrototypeOf, ll), Sl = ll.create, Wl = gl.propertyIsEnumerable, Ll = _l.splice, Cl = Il ? Il.isConcatSpreadable : X, Ul = Il ? Il.iterator : X, Bl = Il ? Il.toStringTag : X, Tl = function() {
        try {
          var n2 = Ai(ll, "defineProperty");
          return n2({}, "", {}), n2;
        } catch (n3) {
        }
      }(), $l = x2.clearTimeout !== re.clearTimeout && x2.clearTimeout, Dl = ol && ol.now !== re.Date.now && ol.now, Ml = x2.setTimeout !== re.setTimeout && x2.setTimeout, Fl = al.ceil, Nl = al.floor, Pl = ll.getOwnPropertySymbols, ql = Ol ? Ol.isBuffer : X, Zl = x2.isFinite, Kl = _l.join, Vl = F(ll.keys, ll), Gl = al.max, Hl = al.min, Jl = ol.now, Yl = x2.parseInt, Ql = al.random, Xl = _l.reverse, ns = Ai(x2, "DataView"), ts = Ai(x2, "Map"), rs = Ai(x2, "Promise"), es = Ai(x2, "Set"), us = Ai(x2, "WeakMap"), is = Ai(ll, "create"), os2 = us && new us(), fs2 = {}, cs = to(ns), as = to(ts), ls = to(rs), ss = to(es), hs = to(us), ps = Il ? Il.prototype : X, _s = ps ? ps.valueOf : X, vs = ps ? ps.toString : X, gs = /* @__PURE__ */ function() {
        function n2() {
        }
        return function(t2) {
          if (!fc(t2)) return {};
          if (Sl) return Sl(t2);
          n2.prototype = t2;
          var r2 = new n2();
          return n2.prototype = X, r2;
        };
      }();
      Z2.templateSettings = { escape: kt, evaluate: Ot, interpolate: It, variable: "", imports: { _: Z2 } }, Z2.prototype = J2.prototype, Z2.prototype.constructor = Z2, Y2.prototype = gs(J2.prototype), Y2.prototype.constructor = Y2, Ct2.prototype = gs(J2.prototype), Ct2.prototype.constructor = Ct2, Xt2.prototype.clear = nr2, Xt2.prototype.delete = tr2, Xt2.prototype.get = rr2, Xt2.prototype.has = er2, Xt2.prototype.set = ur2, ir2.prototype.clear = or2, ir2.prototype.delete = fr2, ir2.prototype.get = cr2, ir2.prototype.has = ar2, ir2.prototype.set = lr2, sr2.prototype.clear = hr2, sr2.prototype.delete = pr2, sr2.prototype.get = _r2, sr2.prototype.has = vr2, sr2.prototype.set = gr2, yr2.prototype.add = yr2.prototype.push = dr2, yr2.prototype.has = br2, wr2.prototype.clear = mr2, wr2.prototype.delete = xr2, wr2.prototype.get = jr2, wr2.prototype.has = Ar2, wr2.prototype.set = kr2;
      var ys = Pu(ue2), ds = Pu(oe2, true), bs = qu(), ws = qu(true), ms = os2 ? function(n2, t2) {
        return os2.set(n2, t2), n2;
      } : La, xs = Tl ? function(n2, t2) {
        return Tl(n2, "toString", {
          configurable: true,
          enumerable: false,
          value: Sa(t2),
          writable: true
        });
      } : La, js = uu, As = $l || function(n2) {
        return re.clearTimeout(n2);
      }, ks = es && 1 / P(new es([, -0]))[1] == Sn ? function(n2) {
        return new es(n2);
      } : Da, Os = os2 ? function(n2) {
        return os2.get(n2);
      } : Da, Is = Pl ? function(n2) {
        return null == n2 ? [] : (n2 = ll(n2), i(Pl(n2), function(t2) {
          return Wl.call(n2, t2);
        }));
      } : Pa, Rs = Pl ? function(n2) {
        for (var t2 = []; n2; ) a(t2, Is(n2)), n2 = El(n2);
        return t2;
      } : Pa, zs = we;
      (ns && zs(new ns(new ArrayBuffer(1))) != ct || ts && zs(new ts()) != Gn || rs && zs(rs.resolve()) != Qn || es && zs(new es()) != tt || us && zs(new us()) != it) && (zs = function(n2) {
        var t2 = we(n2), r2 = t2 == Yn ? n2.constructor : X, e2 = r2 ? to(r2) : "";
        if (e2) switch (e2) {
          case cs:
            return ct;
          case as:
            return Gn;
          case ls:
            return Qn;
          case ss:
            return tt;
          case hs:
            return it;
        }
        return t2;
      });
      var Es = yl ? uc : qa, Ss = Qi(ms), Ws = Ml || function(n2, t2) {
        return re.setTimeout(n2, t2);
      }, Ls = Qi(xs), Cs = Pi(function(n2) {
        var t2 = [];
        return 46 === n2.charCodeAt(0) && t2.push(""), n2.replace(Et, function(n3, r2, e2, u2) {
          t2.push(e2 ? u2.replace(Mt, "$1") : r2 || n3);
        }), t2;
      }), Us = uu(function(n2, t2) {
        return Jf(n2) ? Hr2(n2, ee2(t2, 1, Jf, true)) : [];
      }), Bs = uu(function(n2, t2) {
        var r2 = jo(t2);
        return Jf(r2) && (r2 = X), Jf(n2) ? Hr2(n2, ee2(t2, 1, Jf, true), mi(r2, 2)) : [];
      }), Ts = uu(function(n2, t2) {
        var r2 = jo(t2);
        return Jf(r2) && (r2 = X), Jf(n2) ? Hr2(n2, ee2(t2, 1, Jf, true), X, r2) : [];
      }), $s = uu(function(n2) {
        var t2 = c(n2, ju);
        return t2.length && t2[0] === n2[0] ? ke(t2) : [];
      }), Ds = uu(function(n2) {
        var t2 = jo(n2), r2 = c(n2, ju);
        return t2 === jo(r2) ? t2 = X : r2.pop(), r2.length && r2[0] === n2[0] ? ke(r2, mi(t2, 2)) : [];
      }), Ms = uu(function(n2) {
        var t2 = jo(n2), r2 = c(n2, ju);
        return t2 = "function" == typeof t2 ? t2 : X, t2 && r2.pop(), r2.length && r2[0] === n2[0] ? ke(r2, X, t2) : [];
      }), Fs = uu(Oo), Ns = gi(function(n2, t2) {
        var r2 = null == n2 ? 0 : n2.length, e2 = Tr2(n2, t2);
        return nu(n2, c(t2, function(n3) {
          return Ci(n3, r2) ? +n3 : n3;
        }).sort(Lu)), e2;
      }), Ps = uu(function(n2) {
        return gu(ee2(n2, 1, Jf, true));
      }), qs = uu(function(n2) {
        var t2 = jo(n2);
        return Jf(t2) && (t2 = X), gu(ee2(n2, 1, Jf, true), mi(t2, 2));
      }), Zs = uu(function(n2) {
        var t2 = jo(n2);
        return t2 = "function" == typeof t2 ? t2 : X, gu(ee2(n2, 1, Jf, true), X, t2);
      }), Ks = uu(function(n2, t2) {
        return Jf(n2) ? Hr2(n2, t2) : [];
      }), Vs = uu(function(n2) {
        return mu(i(n2, Jf));
      }), Gs = uu(function(n2) {
        var t2 = jo(n2);
        return Jf(t2) && (t2 = X), mu(i(n2, Jf), mi(t2, 2));
      }), Hs = uu(function(n2) {
        var t2 = jo(n2);
        return t2 = "function" == typeof t2 ? t2 : X, mu(i(n2, Jf), X, t2);
      }), Js = uu(Go), Ys = uu(function(n2) {
        var t2 = n2.length, r2 = t2 > 1 ? n2[t2 - 1] : X;
        return r2 = "function" == typeof r2 ? (n2.pop(), r2) : X, Ho(n2, r2);
      }), Qs = gi(function(n2) {
        var t2 = n2.length, r2 = t2 ? n2[0] : 0, e2 = this.__wrapped__, u2 = function(t3) {
          return Tr2(t3, n2);
        };
        return !(t2 > 1 || this.__actions__.length) && e2 instanceof Ct2 && Ci(r2) ? (e2 = e2.slice(r2, +r2 + (t2 ? 1 : 0)), e2.__actions__.push({ func: nf, args: [u2], thisArg: X }), new Y2(e2, this.__chain__).thru(function(n3) {
          return t2 && !n3.length && n3.push(X), n3;
        })) : this.thru(u2);
      }), Xs = Fu(function(n2, t2, r2) {
        bl.call(n2, r2) ? ++n2[r2] : Br2(n2, r2, 1);
      }), nh = Ju(ho), th = Ju(po), rh = Fu(function(n2, t2, r2) {
        bl.call(n2, r2) ? n2[r2].push(t2) : Br2(n2, r2, [t2]);
      }), eh = uu(function(t2, r2, e2) {
        var u2 = -1, i2 = "function" == typeof r2, o2 = Hf(t2) ? il(t2.length) : [];
        return ys(t2, function(t3) {
          o2[++u2] = i2 ? n(r2, t3, e2) : Ie(t3, r2, e2);
        }), o2;
      }), uh = Fu(function(n2, t2, r2) {
        Br2(n2, r2, t2);
      }), ih = Fu(function(n2, t2, r2) {
        n2[r2 ? 0 : 1].push(t2);
      }, function() {
        return [[], []];
      }), oh = uu(function(n2, t2) {
        if (null == n2) return [];
        var r2 = t2.length;
        return r2 > 1 && Ui(n2, t2[0], t2[1]) ? t2 = [] : r2 > 2 && Ui(t2[0], t2[1], t2[2]) && (t2 = [t2[0]]), He(n2, ee2(t2, 1), []);
      }), fh = Dl || function() {
        return re.Date.now();
      }, ch = uu(function(n2, t2, r2) {
        var e2 = _n;
        if (r2.length) {
          var u2 = N(r2, wi(ch));
          e2 |= bn;
        }
        return ai(n2, e2, t2, r2, u2);
      }), ah = uu(function(n2, t2, r2) {
        var e2 = _n | vn;
        if (r2.length) {
          var u2 = N(r2, wi(ah));
          e2 |= bn;
        }
        return ai(t2, e2, n2, r2, u2);
      }), lh = uu(function(n2, t2) {
        return Gr2(n2, 1, t2);
      }), sh = uu(function(n2, t2, r2) {
        return Gr2(n2, Ic(t2) || 0, r2);
      });
      Cf.Cache = sr2;
      var hh = js(function(t2, r2) {
        r2 = 1 == r2.length && bh(r2[0]) ? c(r2[0], z2(mi())) : c(ee2(r2, 1), z2(mi()));
        var e2 = r2.length;
        return uu(function(u2) {
          for (var i2 = -1, o2 = Hl(u2.length, e2); ++i2 < o2; ) u2[i2] = r2[i2].call(this, u2[i2]);
          return n(t2, this, u2);
        });
      }), ph = uu(function(n2, t2) {
        return ai(n2, bn, X, t2, N(t2, wi(ph)));
      }), _h = uu(function(n2, t2) {
        return ai(n2, wn, X, t2, N(t2, wi(_h)));
      }), vh = gi(function(n2, t2) {
        return ai(n2, xn, X, X, X, t2);
      }), gh = ii(me), yh = ii(function(n2, t2) {
        return n2 >= t2;
      }), dh = Re(/* @__PURE__ */ function() {
        return arguments;
      }()) ? Re : function(n2) {
        return cc(n2) && bl.call(n2, "callee") && !Wl.call(n2, "callee");
      }, bh = il.isArray, wh = ce ? z2(ce) : ze, mh = ql || qa, xh = ae ? z2(ae) : Ee, jh = le ? z2(le) : Le, Ah = se ? z2(se) : Be, kh = he ? z2(he) : Te, Oh = pe ? z2(pe) : $e, Ih = ii(Ne), Rh = ii(function(n2, t2) {
        return n2 <= t2;
      }), zh = Nu(function(n2, t2) {
        if (Mi(t2) || Hf(t2)) return $u(t2, Pc(t2), n2), X;
        for (var r2 in t2) bl.call(t2, r2) && Sr2(n2, r2, t2[r2]);
      }), Eh = Nu(function(n2, t2) {
        $u(t2, qc(t2), n2);
      }), Sh = Nu(function(n2, t2, r2, e2) {
        $u(t2, qc(t2), n2, e2);
      }), Wh = Nu(function(n2, t2, r2, e2) {
        $u(t2, Pc(t2), n2, e2);
      }), Lh = gi(Tr2), Ch = uu(function(n2, t2) {
        n2 = ll(n2);
        var r2 = -1, e2 = t2.length, u2 = e2 > 2 ? t2[2] : X;
        for (u2 && Ui(t2[0], t2[1], u2) && (e2 = 1); ++r2 < e2; ) for (var i2 = t2[r2], o2 = qc(i2), f2 = -1, c2 = o2.length; ++f2 < c2; ) {
          var a2 = o2[f2], l2 = n2[a2];
          (l2 === X || Gf(l2, gl[a2]) && !bl.call(n2, a2)) && (n2[a2] = i2[a2]);
        }
        return n2;
      }), Uh = uu(function(t2) {
        return t2.push(X, si), n(Mh, X, t2);
      }), Bh = Xu(function(n2, t2, r2) {
        null != t2 && "function" != typeof t2.toString && (t2 = xl.call(t2)), n2[t2] = r2;
      }, Sa(La)), Th = Xu(function(n2, t2, r2) {
        null != t2 && "function" != typeof t2.toString && (t2 = xl.call(t2)), bl.call(n2, t2) ? n2[t2].push(r2) : n2[t2] = [r2];
      }, mi), $h = uu(Ie), Dh = Nu(function(n2, t2, r2) {
        Ke(n2, t2, r2);
      }), Mh = Nu(function(n2, t2, r2, e2) {
        Ke(n2, t2, r2, e2);
      }), Fh = gi(function(n2, t2) {
        var r2 = {};
        if (null == n2) return r2;
        var e2 = false;
        t2 = c(t2, function(t3) {
          return t3 = ku(t3, n2), e2 || (e2 = t3.length > 1), t3;
        }), $u(n2, di(n2), r2), e2 && (r2 = Fr2(r2, an | ln | sn, hi));
        for (var u2 = t2.length; u2--; ) yu(r2, t2[u2]);
        return r2;
      }), Nh = gi(function(n2, t2) {
        return null == n2 ? {} : Je(n2, t2);
      }), Ph = ci(Pc), qh = ci(qc), Zh = Vu(function(n2, t2, r2) {
        return t2 = t2.toLowerCase(), n2 + (r2 ? fa(t2) : t2);
      }), Kh = Vu(function(n2, t2, r2) {
        return n2 + (r2 ? "-" : "") + t2.toLowerCase();
      }), Vh = Vu(function(n2, t2, r2) {
        return n2 + (r2 ? " " : "") + t2.toLowerCase();
      }), Gh = Ku("toLowerCase"), Hh = Vu(function(n2, t2, r2) {
        return n2 + (r2 ? "_" : "") + t2.toLowerCase();
      }), Jh = Vu(function(n2, t2, r2) {
        return n2 + (r2 ? " " : "") + Qh(t2);
      }), Yh = Vu(function(n2, t2, r2) {
        return n2 + (r2 ? " " : "") + t2.toUpperCase();
      }), Qh = Ku("toUpperCase"), Xh = uu(function(t2, r2) {
        try {
          return n(t2, X, r2);
        } catch (n2) {
          return rc(n2) ? n2 : new fl(n2);
        }
      }), np = gi(function(n2, t2) {
        return r(t2, function(t3) {
          t3 = no(t3), Br2(n2, t3, ch(n2[t3], n2));
        }), n2;
      }), tp = Yu(), rp = Yu(true), ep = uu(function(n2, t2) {
        return function(r2) {
          return Ie(r2, n2, t2);
        };
      }), up = uu(function(n2, t2) {
        return function(r2) {
          return Ie(n2, r2, t2);
        };
      }), ip = ti(c), op = ti(u), fp2 = ti(h), cp2 = ui(), ap = ui(true), lp = ni(function(n2, t2) {
        return n2 + t2;
      }, 0), sp = fi("ceil"), hp = ni(function(n2, t2) {
        return n2 / t2;
      }, 1), pp = fi("floor"), _p = ni(function(n2, t2) {
        return n2 * t2;
      }, 1), vp = fi("round"), gp = ni(function(n2, t2) {
        return n2 - t2;
      }, 0);
      return Z2.after = If, Z2.ary = Rf, Z2.assign = zh, Z2.assignIn = Eh, Z2.assignInWith = Sh, Z2.assignWith = Wh, Z2.at = Lh, Z2.before = zf, Z2.bind = ch, Z2.bindAll = np, Z2.bindKey = ah, Z2.castArray = Nf, Z2.chain = Qo, Z2.chunk = uo, Z2.compact = io2, Z2.concat = oo, Z2.cond = za, Z2.conforms = Ea, Z2.constant = Sa, Z2.countBy = Xs, Z2.create = Sc, Z2.curry = Ef, Z2.curryRight = Sf, Z2.debounce = Wf, Z2.defaults = Ch, Z2.defaultsDeep = Uh, Z2.defer = lh, Z2.delay = sh, Z2.difference = Us, Z2.differenceBy = Bs, Z2.differenceWith = Ts, Z2.drop = fo, Z2.dropRight = co, Z2.dropRightWhile = ao, Z2.dropWhile = lo, Z2.fill = so, Z2.filter = lf, Z2.flatMap = sf, Z2.flatMapDeep = hf, Z2.flatMapDepth = pf, Z2.flatten = _o, Z2.flattenDeep = vo, Z2.flattenDepth = go, Z2.flip = Lf, Z2.flow = tp, Z2.flowRight = rp, Z2.fromPairs = yo, Z2.functions = $c, Z2.functionsIn = Dc, Z2.groupBy = rh, Z2.initial = mo, Z2.intersection = $s, Z2.intersectionBy = Ds, Z2.intersectionWith = Ms, Z2.invert = Bh, Z2.invertBy = Th, Z2.invokeMap = eh, Z2.iteratee = Ca, Z2.keyBy = uh, Z2.keys = Pc, Z2.keysIn = qc, Z2.map = yf, Z2.mapKeys = Zc, Z2.mapValues = Kc, Z2.matches = Ua, Z2.matchesProperty = Ba, Z2.memoize = Cf, Z2.merge = Dh, Z2.mergeWith = Mh, Z2.method = ep, Z2.methodOf = up, Z2.mixin = Ta, Z2.negate = Uf, Z2.nthArg = Ma, Z2.omit = Fh, Z2.omitBy = Vc, Z2.once = Bf, Z2.orderBy = df, Z2.over = ip, Z2.overArgs = hh, Z2.overEvery = op, Z2.overSome = fp2, Z2.partial = ph, Z2.partialRight = _h, Z2.partition = ih, Z2.pick = Nh, Z2.pickBy = Gc, Z2.property = Fa, Z2.propertyOf = Na, Z2.pull = Fs, Z2.pullAll = Oo, Z2.pullAllBy = Io, Z2.pullAllWith = Ro, Z2.pullAt = Ns, Z2.range = cp2, Z2.rangeRight = ap, Z2.rearg = vh, Z2.reject = mf, Z2.remove = zo, Z2.rest = Tf, Z2.reverse = Eo, Z2.sampleSize = jf, Z2.set = Jc, Z2.setWith = Yc, Z2.shuffle = Af, Z2.slice = So, Z2.sortBy = oh, Z2.sortedUniq = $o, Z2.sortedUniqBy = Do, Z2.split = da, Z2.spread = $f, Z2.tail = Mo, Z2.take = Fo, Z2.takeRight = No, Z2.takeRightWhile = Po, Z2.takeWhile = qo, Z2.tap = Xo, Z2.throttle = Df, Z2.thru = nf, Z2.toArray = jc, Z2.toPairs = Ph, Z2.toPairsIn = qh, Z2.toPath = Ha, Z2.toPlainObject = Rc, Z2.transform = Qc, Z2.unary = Mf, Z2.union = Ps, Z2.unionBy = qs, Z2.unionWith = Zs, Z2.uniq = Zo, Z2.uniqBy = Ko, Z2.uniqWith = Vo, Z2.unset = Xc, Z2.unzip = Go, Z2.unzipWith = Ho, Z2.update = na, Z2.updateWith = ta, Z2.values = ra, Z2.valuesIn = ea, Z2.without = Ks, Z2.words = Ra, Z2.wrap = Ff, Z2.xor = Vs, Z2.xorBy = Gs, Z2.xorWith = Hs, Z2.zip = Js, Z2.zipObject = Jo, Z2.zipObjectDeep = Yo, Z2.zipWith = Ys, Z2.entries = Ph, Z2.entriesIn = qh, Z2.extend = Eh, Z2.extendWith = Sh, Ta(Z2, Z2), Z2.add = lp, Z2.attempt = Xh, Z2.camelCase = Zh, Z2.capitalize = fa, Z2.ceil = sp, Z2.clamp = ua, Z2.clone = Pf, Z2.cloneDeep = Zf, Z2.cloneDeepWith = Kf, Z2.cloneWith = qf, Z2.conformsTo = Vf, Z2.deburr = ca, Z2.defaultTo = Wa, Z2.divide = hp, Z2.endsWith = aa, Z2.eq = Gf, Z2.escape = la, Z2.escapeRegExp = sa, Z2.every = af, Z2.find = nh, Z2.findIndex = ho, Z2.findKey = Wc, Z2.findLast = th, Z2.findLastIndex = po, Z2.findLastKey = Lc, Z2.floor = pp, Z2.forEach = _f, Z2.forEachRight = vf, Z2.forIn = Cc, Z2.forInRight = Uc, Z2.forOwn = Bc, Z2.forOwnRight = Tc, Z2.get = Mc, Z2.gt = gh, Z2.gte = yh, Z2.has = Fc, Z2.hasIn = Nc, Z2.head = bo, Z2.identity = La, Z2.includes = gf, Z2.indexOf = wo, Z2.inRange = ia, Z2.invoke = $h, Z2.isArguments = dh, Z2.isArray = bh, Z2.isArrayBuffer = wh, Z2.isArrayLike = Hf, Z2.isArrayLikeObject = Jf, Z2.isBoolean = Yf, Z2.isBuffer = mh, Z2.isDate = xh, Z2.isElement = Qf, Z2.isEmpty = Xf, Z2.isEqual = nc, Z2.isEqualWith = tc, Z2.isError = rc, Z2.isFinite = ec, Z2.isFunction = uc, Z2.isInteger = ic, Z2.isLength = oc, Z2.isMap = jh, Z2.isMatch = ac, Z2.isMatchWith = lc, Z2.isNaN = sc, Z2.isNative = hc, Z2.isNil = _c, Z2.isNull = pc, Z2.isNumber = vc, Z2.isObject = fc, Z2.isObjectLike = cc, Z2.isPlainObject = gc, Z2.isRegExp = Ah, Z2.isSafeInteger = yc, Z2.isSet = kh, Z2.isString = dc, Z2.isSymbol = bc, Z2.isTypedArray = Oh, Z2.isUndefined = wc, Z2.isWeakMap = mc, Z2.isWeakSet = xc, Z2.join = xo, Z2.kebabCase = Kh, Z2.last = jo, Z2.lastIndexOf = Ao, Z2.lowerCase = Vh, Z2.lowerFirst = Gh, Z2.lt = Ih, Z2.lte = Rh, Z2.max = Ya, Z2.maxBy = Qa, Z2.mean = Xa, Z2.meanBy = nl, Z2.min = tl, Z2.minBy = rl, Z2.stubArray = Pa, Z2.stubFalse = qa, Z2.stubObject = Za, Z2.stubString = Ka, Z2.stubTrue = Va, Z2.multiply = _p, Z2.nth = ko, Z2.noConflict = $a, Z2.noop = Da, Z2.now = fh, Z2.pad = ha, Z2.padEnd = pa, Z2.padStart = _a, Z2.parseInt = va, Z2.random = oa, Z2.reduce = bf, Z2.reduceRight = wf, Z2.repeat = ga, Z2.replace = ya, Z2.result = Hc, Z2.round = vp, Z2.runInContext = p2, Z2.sample = xf, Z2.size = kf, Z2.snakeCase = Hh, Z2.some = Of, Z2.sortedIndex = Wo, Z2.sortedIndexBy = Lo, Z2.sortedIndexOf = Co, Z2.sortedLastIndex = Uo, Z2.sortedLastIndexBy = Bo, Z2.sortedLastIndexOf = To, Z2.startCase = Jh, Z2.startsWith = ba, Z2.subtract = gp, Z2.sum = el, Z2.sumBy = ul, Z2.template = wa, Z2.times = Ga, Z2.toFinite = Ac, Z2.toInteger = kc, Z2.toLength = Oc, Z2.toLower = ma, Z2.toNumber = Ic, Z2.toSafeInteger = zc, Z2.toString = Ec, Z2.toUpper = xa, Z2.trim = ja, Z2.trimEnd = Aa, Z2.trimStart = ka, Z2.truncate = Oa, Z2.unescape = Ia, Z2.uniqueId = Ja, Z2.upperCase = Yh, Z2.upperFirst = Qh, Z2.each = _f, Z2.eachRight = vf, Z2.first = bo, Ta(Z2, function() {
        var n2 = {};
        return ue2(Z2, function(t2, r2) {
          bl.call(Z2.prototype, r2) || (n2[r2] = t2);
        }), n2;
      }(), { chain: false }), Z2.VERSION = nn, r(["bind", "bindKey", "curry", "curryRight", "partial", "partialRight"], function(n2) {
        Z2[n2].placeholder = Z2;
      }), r(["drop", "take"], function(n2, t2) {
        Ct2.prototype[n2] = function(r2) {
          r2 = r2 === X ? 1 : Gl(kc(r2), 0);
          var e2 = this.__filtered__ && !t2 ? new Ct2(this) : this.clone();
          return e2.__filtered__ ? e2.__takeCount__ = Hl(r2, e2.__takeCount__) : e2.__views__.push({ size: Hl(r2, Un), type: n2 + (e2.__dir__ < 0 ? "Right" : "") }), e2;
        }, Ct2.prototype[n2 + "Right"] = function(t3) {
          return this.reverse()[n2](t3).reverse();
        };
      }), r(["filter", "map", "takeWhile"], function(n2, t2) {
        var r2 = t2 + 1, e2 = r2 == Rn || r2 == En;
        Ct2.prototype[n2] = function(n3) {
          var t3 = this.clone();
          return t3.__iteratees__.push({ iteratee: mi(n3, 3), type: r2 }), t3.__filtered__ = t3.__filtered__ || e2, t3;
        };
      }), r(["head", "last"], function(n2, t2) {
        var r2 = "take" + (t2 ? "Right" : "");
        Ct2.prototype[n2] = function() {
          return this[r2](1).value()[0];
        };
      }), r(["initial", "tail"], function(n2, t2) {
        var r2 = "drop" + (t2 ? "" : "Right");
        Ct2.prototype[n2] = function() {
          return this.__filtered__ ? new Ct2(this) : this[r2](1);
        };
      }), Ct2.prototype.compact = function() {
        return this.filter(La);
      }, Ct2.prototype.find = function(n2) {
        return this.filter(n2).head();
      }, Ct2.prototype.findLast = function(n2) {
        return this.reverse().find(n2);
      }, Ct2.prototype.invokeMap = uu(function(n2, t2) {
        return "function" == typeof n2 ? new Ct2(this) : this.map(function(r2) {
          return Ie(r2, n2, t2);
        });
      }), Ct2.prototype.reject = function(n2) {
        return this.filter(Uf(mi(n2)));
      }, Ct2.prototype.slice = function(n2, t2) {
        n2 = kc(n2);
        var r2 = this;
        return r2.__filtered__ && (n2 > 0 || t2 < 0) ? new Ct2(r2) : (n2 < 0 ? r2 = r2.takeRight(-n2) : n2 && (r2 = r2.drop(n2)), t2 !== X && (t2 = kc(t2), r2 = t2 < 0 ? r2.dropRight(-t2) : r2.take(t2 - n2)), r2);
      }, Ct2.prototype.takeRightWhile = function(n2) {
        return this.reverse().takeWhile(n2).reverse();
      }, Ct2.prototype.toArray = function() {
        return this.take(Un);
      }, ue2(Ct2.prototype, function(n2, t2) {
        var r2 = /^(?:filter|find|map|reject)|While$/.test(t2), e2 = /^(?:head|last)$/.test(t2), u2 = Z2[e2 ? "take" + ("last" == t2 ? "Right" : "") : t2], i2 = e2 || /^find/.test(t2);
        u2 && (Z2.prototype[t2] = function() {
          var t3 = this.__wrapped__, o2 = e2 ? [1] : arguments, f2 = t3 instanceof Ct2, c2 = o2[0], l2 = f2 || bh(t3), s2 = function(n3) {
            var t4 = u2.apply(Z2, a([n3], o2));
            return e2 && h2 ? t4[0] : t4;
          };
          l2 && r2 && "function" == typeof c2 && 1 != c2.length && (f2 = l2 = false);
          var h2 = this.__chain__, p3 = !!this.__actions__.length, _3 = i2 && !h2, v2 = f2 && !p3;
          if (!i2 && l2) {
            t3 = v2 ? t3 : new Ct2(this);
            var g2 = n2.apply(t3, o2);
            return g2.__actions__.push({ func: nf, args: [s2], thisArg: X }), new Y2(g2, h2);
          }
          return _3 && v2 ? n2.apply(this, o2) : (g2 = this.thru(s2), _3 ? e2 ? g2.value()[0] : g2.value() : g2);
        });
      }), r(["pop", "push", "shift", "sort", "splice", "unshift"], function(n2) {
        var t2 = _l[n2], r2 = /^(?:push|sort|unshift)$/.test(n2) ? "tap" : "thru", e2 = /^(?:pop|shift)$/.test(n2);
        Z2.prototype[n2] = function() {
          var n3 = arguments;
          if (e2 && !this.__chain__) {
            var u2 = this.value();
            return t2.apply(bh(u2) ? u2 : [], n3);
          }
          return this[r2](function(r3) {
            return t2.apply(bh(r3) ? r3 : [], n3);
          });
        };
      }), ue2(Ct2.prototype, function(n2, t2) {
        var r2 = Z2[t2];
        if (r2) {
          var e2 = r2.name + "";
          bl.call(fs2, e2) || (fs2[e2] = []), fs2[e2].push({ name: t2, func: r2 });
        }
      }), fs2[Qu(X, vn).name] = [{ name: "wrapper", func: X }], Ct2.prototype.clone = $t2, Ct2.prototype.reverse = Yt2, Ct2.prototype.value = Qt2, Z2.prototype.at = Qs, Z2.prototype.chain = tf, Z2.prototype.commit = rf, Z2.prototype.next = ef, Z2.prototype.plant = of, Z2.prototype.reverse = ff, Z2.prototype.toJSON = Z2.prototype.valueOf = Z2.prototype.value = cf, Z2.prototype.first = Z2.prototype.head, Ul && (Z2.prototype[Ul] = uf), Z2;
    }, be = de();
    ue ? ((ue.exports = be)._ = be, ee._ = be) : re._ = be;
  }).call(commonjsGlobal);
})(lodash_min, lodash_min.exports);
var lodash_minExports = lodash_min.exports;
var _mapping = {};
(function(exports$1) {
  exports$1.aliasToReal = {
    // Lodash aliases.
    "each": "forEach",
    "eachRight": "forEachRight",
    "entries": "toPairs",
    "entriesIn": "toPairsIn",
    "extend": "assignIn",
    "extendAll": "assignInAll",
    "extendAllWith": "assignInAllWith",
    "extendWith": "assignInWith",
    "first": "head",
    // Methods that are curried variants of others.
    "conforms": "conformsTo",
    "matches": "isMatch",
    "property": "get",
    // Ramda aliases.
    "__": "placeholder",
    "F": "stubFalse",
    "T": "stubTrue",
    "all": "every",
    "allPass": "overEvery",
    "always": "constant",
    "any": "some",
    "anyPass": "overSome",
    "apply": "spread",
    "assoc": "set",
    "assocPath": "set",
    "complement": "negate",
    "compose": "flowRight",
    "contains": "includes",
    "dissoc": "unset",
    "dissocPath": "unset",
    "dropLast": "dropRight",
    "dropLastWhile": "dropRightWhile",
    "equals": "isEqual",
    "identical": "eq",
    "indexBy": "keyBy",
    "init": "initial",
    "invertObj": "invert",
    "juxt": "over",
    "omitAll": "omit",
    "nAry": "ary",
    "path": "get",
    "pathEq": "matchesProperty",
    "pathOr": "getOr",
    "paths": "at",
    "pickAll": "pick",
    "pipe": "flow",
    "pluck": "map",
    "prop": "get",
    "propEq": "matchesProperty",
    "propOr": "getOr",
    "props": "at",
    "symmetricDifference": "xor",
    "symmetricDifferenceBy": "xorBy",
    "symmetricDifferenceWith": "xorWith",
    "takeLast": "takeRight",
    "takeLastWhile": "takeRightWhile",
    "unapply": "rest",
    "unnest": "flatten",
    "useWith": "overArgs",
    "where": "conformsTo",
    "whereEq": "isMatch",
    "zipObj": "zipObject"
  };
  exports$1.aryMethod = {
    "1": [
      "assignAll",
      "assignInAll",
      "attempt",
      "castArray",
      "ceil",
      "create",
      "curry",
      "curryRight",
      "defaultsAll",
      "defaultsDeepAll",
      "floor",
      "flow",
      "flowRight",
      "fromPairs",
      "invert",
      "iteratee",
      "memoize",
      "method",
      "mergeAll",
      "methodOf",
      "mixin",
      "nthArg",
      "over",
      "overEvery",
      "overSome",
      "rest",
      "reverse",
      "round",
      "runInContext",
      "spread",
      "template",
      "trim",
      "trimEnd",
      "trimStart",
      "uniqueId",
      "words",
      "zipAll"
    ],
    "2": [
      "add",
      "after",
      "ary",
      "assign",
      "assignAllWith",
      "assignIn",
      "assignInAllWith",
      "at",
      "before",
      "bind",
      "bindAll",
      "bindKey",
      "chunk",
      "cloneDeepWith",
      "cloneWith",
      "concat",
      "conformsTo",
      "countBy",
      "curryN",
      "curryRightN",
      "debounce",
      "defaults",
      "defaultsDeep",
      "defaultTo",
      "delay",
      "difference",
      "divide",
      "drop",
      "dropRight",
      "dropRightWhile",
      "dropWhile",
      "endsWith",
      "eq",
      "every",
      "filter",
      "find",
      "findIndex",
      "findKey",
      "findLast",
      "findLastIndex",
      "findLastKey",
      "flatMap",
      "flatMapDeep",
      "flattenDepth",
      "forEach",
      "forEachRight",
      "forIn",
      "forInRight",
      "forOwn",
      "forOwnRight",
      "get",
      "groupBy",
      "gt",
      "gte",
      "has",
      "hasIn",
      "includes",
      "indexOf",
      "intersection",
      "invertBy",
      "invoke",
      "invokeMap",
      "isEqual",
      "isMatch",
      "join",
      "keyBy",
      "lastIndexOf",
      "lt",
      "lte",
      "map",
      "mapKeys",
      "mapValues",
      "matchesProperty",
      "maxBy",
      "meanBy",
      "merge",
      "mergeAllWith",
      "minBy",
      "multiply",
      "nth",
      "omit",
      "omitBy",
      "overArgs",
      "pad",
      "padEnd",
      "padStart",
      "parseInt",
      "partial",
      "partialRight",
      "partition",
      "pick",
      "pickBy",
      "propertyOf",
      "pull",
      "pullAll",
      "pullAt",
      "random",
      "range",
      "rangeRight",
      "rearg",
      "reject",
      "remove",
      "repeat",
      "restFrom",
      "result",
      "sampleSize",
      "some",
      "sortBy",
      "sortedIndex",
      "sortedIndexOf",
      "sortedLastIndex",
      "sortedLastIndexOf",
      "sortedUniqBy",
      "split",
      "spreadFrom",
      "startsWith",
      "subtract",
      "sumBy",
      "take",
      "takeRight",
      "takeRightWhile",
      "takeWhile",
      "tap",
      "throttle",
      "thru",
      "times",
      "trimChars",
      "trimCharsEnd",
      "trimCharsStart",
      "truncate",
      "union",
      "uniqBy",
      "uniqWith",
      "unset",
      "unzipWith",
      "without",
      "wrap",
      "xor",
      "zip",
      "zipObject",
      "zipObjectDeep"
    ],
    "3": [
      "assignInWith",
      "assignWith",
      "clamp",
      "differenceBy",
      "differenceWith",
      "findFrom",
      "findIndexFrom",
      "findLastFrom",
      "findLastIndexFrom",
      "getOr",
      "includesFrom",
      "indexOfFrom",
      "inRange",
      "intersectionBy",
      "intersectionWith",
      "invokeArgs",
      "invokeArgsMap",
      "isEqualWith",
      "isMatchWith",
      "flatMapDepth",
      "lastIndexOfFrom",
      "mergeWith",
      "orderBy",
      "padChars",
      "padCharsEnd",
      "padCharsStart",
      "pullAllBy",
      "pullAllWith",
      "rangeStep",
      "rangeStepRight",
      "reduce",
      "reduceRight",
      "replace",
      "set",
      "slice",
      "sortedIndexBy",
      "sortedLastIndexBy",
      "transform",
      "unionBy",
      "unionWith",
      "update",
      "xorBy",
      "xorWith",
      "zipWith"
    ],
    "4": [
      "fill",
      "setWith",
      "updateWith"
    ]
  };
  exports$1.aryRearg = {
    "2": [1, 0],
    "3": [2, 0, 1],
    "4": [3, 2, 0, 1]
  };
  exports$1.iterateeAry = {
    "dropRightWhile": 1,
    "dropWhile": 1,
    "every": 1,
    "filter": 1,
    "find": 1,
    "findFrom": 1,
    "findIndex": 1,
    "findIndexFrom": 1,
    "findKey": 1,
    "findLast": 1,
    "findLastFrom": 1,
    "findLastIndex": 1,
    "findLastIndexFrom": 1,
    "findLastKey": 1,
    "flatMap": 1,
    "flatMapDeep": 1,
    "flatMapDepth": 1,
    "forEach": 1,
    "forEachRight": 1,
    "forIn": 1,
    "forInRight": 1,
    "forOwn": 1,
    "forOwnRight": 1,
    "map": 1,
    "mapKeys": 1,
    "mapValues": 1,
    "partition": 1,
    "reduce": 2,
    "reduceRight": 2,
    "reject": 1,
    "remove": 1,
    "some": 1,
    "takeRightWhile": 1,
    "takeWhile": 1,
    "times": 1,
    "transform": 2
  };
  exports$1.iterateeRearg = {
    "mapKeys": [1],
    "reduceRight": [1, 0]
  };
  exports$1.methodRearg = {
    "assignInAllWith": [1, 0],
    "assignInWith": [1, 2, 0],
    "assignAllWith": [1, 0],
    "assignWith": [1, 2, 0],
    "differenceBy": [1, 2, 0],
    "differenceWith": [1, 2, 0],
    "getOr": [2, 1, 0],
    "intersectionBy": [1, 2, 0],
    "intersectionWith": [1, 2, 0],
    "isEqualWith": [1, 2, 0],
    "isMatchWith": [2, 1, 0],
    "mergeAllWith": [1, 0],
    "mergeWith": [1, 2, 0],
    "padChars": [2, 1, 0],
    "padCharsEnd": [2, 1, 0],
    "padCharsStart": [2, 1, 0],
    "pullAllBy": [2, 1, 0],
    "pullAllWith": [2, 1, 0],
    "rangeStep": [1, 2, 0],
    "rangeStepRight": [1, 2, 0],
    "setWith": [3, 1, 2, 0],
    "sortedIndexBy": [2, 1, 0],
    "sortedLastIndexBy": [2, 1, 0],
    "unionBy": [1, 2, 0],
    "unionWith": [1, 2, 0],
    "updateWith": [3, 1, 2, 0],
    "xorBy": [1, 2, 0],
    "xorWith": [1, 2, 0],
    "zipWith": [1, 2, 0]
  };
  exports$1.methodSpread = {
    "assignAll": { "start": 0 },
    "assignAllWith": { "start": 0 },
    "assignInAll": { "start": 0 },
    "assignInAllWith": { "start": 0 },
    "defaultsAll": { "start": 0 },
    "defaultsDeepAll": { "start": 0 },
    "invokeArgs": { "start": 2 },
    "invokeArgsMap": { "start": 2 },
    "mergeAll": { "start": 0 },
    "mergeAllWith": { "start": 0 },
    "partial": { "start": 1 },
    "partialRight": { "start": 1 },
    "without": { "start": 1 },
    "zipAll": { "start": 0 }
  };
  exports$1.mutate = {
    "array": {
      "fill": true,
      "pull": true,
      "pullAll": true,
      "pullAllBy": true,
      "pullAllWith": true,
      "pullAt": true,
      "remove": true,
      "reverse": true
    },
    "object": {
      "assign": true,
      "assignAll": true,
      "assignAllWith": true,
      "assignIn": true,
      "assignInAll": true,
      "assignInAllWith": true,
      "assignInWith": true,
      "assignWith": true,
      "defaults": true,
      "defaultsAll": true,
      "defaultsDeep": true,
      "defaultsDeepAll": true,
      "merge": true,
      "mergeAll": true,
      "mergeAllWith": true,
      "mergeWith": true
    },
    "set": {
      "set": true,
      "setWith": true,
      "unset": true,
      "update": true,
      "updateWith": true
    }
  };
  exports$1.realToAlias = function() {
    var hasOwnProperty2 = Object.prototype.hasOwnProperty, object2 = exports$1.aliasToReal, result = {};
    for (var key in object2) {
      var value = object2[key];
      if (hasOwnProperty2.call(result, value)) {
        result[value].push(key);
      } else {
        result[value] = [key];
      }
    }
    return result;
  }();
  exports$1.remap = {
    "assignAll": "assign",
    "assignAllWith": "assignWith",
    "assignInAll": "assignIn",
    "assignInAllWith": "assignInWith",
    "curryN": "curry",
    "curryRightN": "curryRight",
    "defaultsAll": "defaults",
    "defaultsDeepAll": "defaultsDeep",
    "findFrom": "find",
    "findIndexFrom": "findIndex",
    "findLastFrom": "findLast",
    "findLastIndexFrom": "findLastIndex",
    "getOr": "get",
    "includesFrom": "includes",
    "indexOfFrom": "indexOf",
    "invokeArgs": "invoke",
    "invokeArgsMap": "invokeMap",
    "lastIndexOfFrom": "lastIndexOf",
    "mergeAll": "merge",
    "mergeAllWith": "mergeWith",
    "padChars": "pad",
    "padCharsEnd": "padEnd",
    "padCharsStart": "padStart",
    "propertyOf": "get",
    "rangeStep": "range",
    "rangeStepRight": "rangeRight",
    "restFrom": "rest",
    "spreadFrom": "spread",
    "trimChars": "trim",
    "trimCharsEnd": "trimEnd",
    "trimCharsStart": "trimStart",
    "zipAll": "zip"
  };
  exports$1.skipFixed = {
    "castArray": true,
    "flow": true,
    "flowRight": true,
    "iteratee": true,
    "mixin": true,
    "rearg": true,
    "runInContext": true
  };
  exports$1.skipRearg = {
    "add": true,
    "assign": true,
    "assignIn": true,
    "bind": true,
    "bindKey": true,
    "concat": true,
    "difference": true,
    "divide": true,
    "eq": true,
    "gt": true,
    "gte": true,
    "isEqual": true,
    "lt": true,
    "lte": true,
    "matchesProperty": true,
    "merge": true,
    "multiply": true,
    "overArgs": true,
    "partial": true,
    "partialRight": true,
    "propertyOf": true,
    "random": true,
    "range": true,
    "rangeRight": true,
    "subtract": true,
    "zip": true,
    "zipObject": true,
    "zipObjectDeep": true
  };
})(_mapping);
var placeholder = {};
var mapping = _mapping, fallbackHolder = placeholder;
var push = Array.prototype.push;
function baseArity(func, n) {
  return n == 2 ? function(a, b) {
    return func.apply(void 0, arguments);
  } : function(a) {
    return func.apply(void 0, arguments);
  };
}
function baseAry(func, n) {
  return n == 2 ? function(a, b) {
    return func(a, b);
  } : function(a) {
    return func(a);
  };
}
function cloneArray(array2) {
  var length = array2 ? array2.length : 0, result = Array(length);
  while (length--) {
    result[length] = array2[length];
  }
  return result;
}
function createCloner(func) {
  return function(object2) {
    return func({}, object2);
  };
}
function flatSpread(func, start) {
  return function() {
    var length = arguments.length, lastIndex = length - 1, args = Array(length);
    while (length--) {
      args[length] = arguments[length];
    }
    var array2 = args[start], otherArgs = args.slice(0, start);
    if (array2) {
      push.apply(otherArgs, array2);
    }
    if (start != lastIndex) {
      push.apply(otherArgs, args.slice(start + 1));
    }
    return func.apply(this, otherArgs);
  };
}
function wrapImmutable(func, cloner) {
  return function() {
    var length = arguments.length;
    if (!length) {
      return;
    }
    var args = Array(length);
    while (length--) {
      args[length] = arguments[length];
    }
    var result = args[0] = cloner.apply(void 0, args);
    func.apply(void 0, args);
    return result;
  };
}
function baseConvert(util2, name, func, options) {
  var isLib = typeof name == "function", isObj2 = name === Object(name);
  if (isObj2) {
    options = func;
    func = name;
    name = void 0;
  }
  if (func == null) {
    throw new TypeError();
  }
  options || (options = {});
  var config2 = {
    "cap": "cap" in options ? options.cap : true,
    "curry": "curry" in options ? options.curry : true,
    "fixed": "fixed" in options ? options.fixed : true,
    "immutable": "immutable" in options ? options.immutable : true,
    "rearg": "rearg" in options ? options.rearg : true
  };
  var defaultHolder = isLib ? func : fallbackHolder, forceCurry = "curry" in options && options.curry, forceFixed = "fixed" in options && options.fixed, forceRearg = "rearg" in options && options.rearg, pristine = isLib ? func.runInContext() : void 0;
  var helpers = isLib ? func : {
    "ary": util2.ary,
    "assign": util2.assign,
    "clone": util2.clone,
    "curry": util2.curry,
    "forEach": util2.forEach,
    "isArray": util2.isArray,
    "isError": util2.isError,
    "isFunction": util2.isFunction,
    "isWeakMap": util2.isWeakMap,
    "iteratee": util2.iteratee,
    "keys": util2.keys,
    "rearg": util2.rearg,
    "toInteger": util2.toInteger,
    "toPath": util2.toPath
  };
  var ary = helpers.ary, assign = helpers.assign, clone2 = helpers.clone, curry = helpers.curry, each = helpers.forEach, isArray2 = helpers.isArray, isError = helpers.isError, isFunction3 = helpers.isFunction, isWeakMap = helpers.isWeakMap, keys2 = helpers.keys, rearg = helpers.rearg, toInteger = helpers.toInteger, toPath = helpers.toPath;
  var aryMethodKeys = keys2(mapping.aryMethod);
  var wrappers = {
    "castArray": function(castArray2) {
      return function() {
        var value = arguments[0];
        return isArray2(value) ? castArray2(cloneArray(value)) : castArray2.apply(void 0, arguments);
      };
    },
    "iteratee": function(iteratee) {
      return function() {
        var func2 = arguments[0], arity = arguments[1], result = iteratee(func2, arity), length = result.length;
        if (config2.cap && typeof arity == "number") {
          arity = arity > 2 ? arity - 2 : 1;
          return length && length <= arity ? result : baseAry(result, arity);
        }
        return result;
      };
    },
    "mixin": function(mixin) {
      return function(source) {
        var func2 = this;
        if (!isFunction3(func2)) {
          return mixin(func2, Object(source));
        }
        var pairs3 = [];
        each(keys2(source), function(key) {
          if (isFunction3(source[key])) {
            pairs3.push([key, func2.prototype[key]]);
          }
        });
        mixin(func2, Object(source));
        each(pairs3, function(pair) {
          var value = pair[1];
          if (isFunction3(value)) {
            func2.prototype[pair[0]] = value;
          } else {
            delete func2.prototype[pair[0]];
          }
        });
        return func2;
      };
    },
    "nthArg": function(nthArg) {
      return function(n) {
        var arity = n < 0 ? 1 : toInteger(n) + 1;
        return curry(nthArg(n), arity);
      };
    },
    "rearg": function(rearg2) {
      return function(func2, indexes) {
        var arity = indexes ? indexes.length : 0;
        return curry(rearg2(func2, indexes), arity);
      };
    },
    "runInContext": function(runInContext) {
      return function(context) {
        return baseConvert(util2, runInContext(context), options);
      };
    }
  };
  function castCap(name2, func2) {
    if (config2.cap) {
      var indexes = mapping.iterateeRearg[name2];
      if (indexes) {
        return iterateeRearg(func2, indexes);
      }
      var n = !isLib && mapping.iterateeAry[name2];
      if (n) {
        return iterateeAry(func2, n);
      }
    }
    return func2;
  }
  function castCurry(name2, func2, n) {
    return forceCurry || config2.curry && n > 1 ? curry(func2, n) : func2;
  }
  function castFixed(name2, func2, n) {
    if (config2.fixed && (forceFixed || !mapping.skipFixed[name2])) {
      var data = mapping.methodSpread[name2], start = data && data.start;
      return start === void 0 ? ary(func2, n) : flatSpread(func2, start);
    }
    return func2;
  }
  function castRearg(name2, func2, n) {
    return config2.rearg && n > 1 && (forceRearg || !mapping.skipRearg[name2]) ? rearg(func2, mapping.methodRearg[name2] || mapping.aryRearg[n]) : func2;
  }
  function cloneByPath(object2, path2) {
    path2 = toPath(path2);
    var index2 = -1, length = path2.length, lastIndex = length - 1, result = clone2(Object(object2)), nested = result;
    while (nested != null && ++index2 < length) {
      var key = path2[index2], value = nested[key];
      if (value != null && !(isFunction3(value) || isError(value) || isWeakMap(value))) {
        nested[key] = clone2(index2 == lastIndex ? value : Object(value));
      }
      nested = nested[key];
    }
    return result;
  }
  function convertLib(options2) {
    return _2.runInContext.convert(options2)(void 0);
  }
  function createConverter(name2, func2) {
    var realName = mapping.aliasToReal[name2] || name2, methodName = mapping.remap[realName] || realName, oldOptions = options;
    return function(options2) {
      var newUtil = isLib ? pristine : helpers, newFunc = isLib ? pristine[methodName] : func2, newOptions = assign(assign({}, oldOptions), options2);
      return baseConvert(newUtil, realName, newFunc, newOptions);
    };
  }
  function iterateeAry(func2, n) {
    return overArg2(func2, function(func3) {
      return typeof func3 == "function" ? baseAry(func3, n) : func3;
    });
  }
  function iterateeRearg(func2, indexes) {
    return overArg2(func2, function(func3) {
      var n = indexes.length;
      return baseArity(rearg(baseAry(func3, n), indexes), n);
    });
  }
  function overArg2(func2, transform2) {
    return function() {
      var length = arguments.length;
      if (!length) {
        return func2();
      }
      var args = Array(length);
      while (length--) {
        args[length] = arguments[length];
      }
      var index2 = config2.rearg ? 0 : length - 1;
      args[index2] = transform2(args[index2]);
      return func2.apply(void 0, args);
    };
  }
  function wrap(name2, func2, placeholder2) {
    var result, realName = mapping.aliasToReal[name2] || name2, wrapped = func2, wrapper = wrappers[realName];
    if (wrapper) {
      wrapped = wrapper(func2);
    } else if (config2.immutable) {
      if (mapping.mutate.array[realName]) {
        wrapped = wrapImmutable(func2, cloneArray);
      } else if (mapping.mutate.object[realName]) {
        wrapped = wrapImmutable(func2, createCloner(func2));
      } else if (mapping.mutate.set[realName]) {
        wrapped = wrapImmutable(func2, cloneByPath);
      }
    }
    each(aryMethodKeys, function(aryKey) {
      each(mapping.aryMethod[aryKey], function(otherName) {
        if (realName == otherName) {
          var data = mapping.methodSpread[realName], afterRearg = data && data.afterRearg;
          result = afterRearg ? castFixed(realName, castRearg(realName, wrapped, aryKey), aryKey) : castRearg(realName, castFixed(realName, wrapped, aryKey), aryKey);
          result = castCap(realName, result);
          result = castCurry(realName, result, aryKey);
          return false;
        }
      });
      return !result;
    });
    result || (result = wrapped);
    if (result == func2) {
      result = forceCurry ? curry(result, 1) : function() {
        return func2.apply(this, arguments);
      };
    }
    result.convert = createConverter(realName, func2);
    result.placeholder = func2.placeholder = placeholder2;
    return result;
  }
  if (!isObj2) {
    return wrap(name, func, defaultHolder);
  }
  var _2 = func;
  var pairs2 = [];
  each(aryMethodKeys, function(aryKey) {
    each(mapping.aryMethod[aryKey], function(key) {
      var func2 = _2[mapping.remap[key] || key];
      if (func2) {
        pairs2.push([key, wrap(key, func2, _2)]);
      }
    });
  });
  each(keys2(_2), function(key) {
    var func2 = _2[key];
    if (typeof func2 == "function") {
      var length = pairs2.length;
      while (length--) {
        if (pairs2[length][0] == key) {
          return;
        }
      }
      func2.convert = createConverter(key, func2);
      pairs2.push([key, func2]);
    }
  });
  each(pairs2, function(pair) {
    _2[pair[0]] = pair[1];
  });
  _2.convert = convertLib;
  _2.placeholder = _2;
  each(keys2(_2), function(key) {
    each(mapping.realToAlias[key] || [], function(alias) {
      _2[alias] = _2[key];
    });
  });
  return _2;
}
var _baseConvert = baseConvert;
var _ = lodash_minExports.runInContext();
var fp = _baseConvert(_, _);
var lodash = { exports: {} };
/**
 * @license
 * Lodash <https://lodash.com/>
 * Copyright OpenJS Foundation and other contributors <https://openjsf.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */
lodash.exports;
(function(module, exports$1) {
  (function() {
    var undefined$1;
    var VERSION = "4.17.21";
    var LARGE_ARRAY_SIZE2 = 200;
    var CORE_ERROR_TEXT = "Unsupported core-js use. Try https://npms.io/search?q=ponyfill.", FUNC_ERROR_TEXT2 = "Expected a function", INVALID_TEMPL_VAR_ERROR_TEXT = "Invalid `variable` option passed into `_.template`";
    var HASH_UNDEFINED2 = "__lodash_hash_undefined__";
    var MAX_MEMOIZE_SIZE2 = 500;
    var PLACEHOLDER = "__lodash_placeholder__";
    var CLONE_DEEP_FLAG = 1, CLONE_FLAT_FLAG = 2, CLONE_SYMBOLS_FLAG = 4;
    var COMPARE_PARTIAL_FLAG2 = 1, COMPARE_UNORDERED_FLAG2 = 2;
    var WRAP_BIND_FLAG = 1, WRAP_BIND_KEY_FLAG = 2, WRAP_CURRY_BOUND_FLAG = 4, WRAP_CURRY_FLAG = 8, WRAP_CURRY_RIGHT_FLAG = 16, WRAP_PARTIAL_FLAG = 32, WRAP_PARTIAL_RIGHT_FLAG = 64, WRAP_ARY_FLAG = 128, WRAP_REARG_FLAG = 256, WRAP_FLIP_FLAG = 512;
    var DEFAULT_TRUNC_LENGTH = 30, DEFAULT_TRUNC_OMISSION = "...";
    var HOT_COUNT = 800, HOT_SPAN = 16;
    var LAZY_FILTER_FLAG = 1, LAZY_MAP_FLAG = 2, LAZY_WHILE_FLAG = 3;
    var INFINITY = 1 / 0, MAX_SAFE_INTEGER2 = 9007199254740991, MAX_INTEGER = 17976931348623157e292, NAN = 0 / 0;
    var MAX_ARRAY_LENGTH = 4294967295, MAX_ARRAY_INDEX = MAX_ARRAY_LENGTH - 1, HALF_MAX_ARRAY_LENGTH = MAX_ARRAY_LENGTH >>> 1;
    var wrapFlags = [
      ["ary", WRAP_ARY_FLAG],
      ["bind", WRAP_BIND_FLAG],
      ["bindKey", WRAP_BIND_KEY_FLAG],
      ["curry", WRAP_CURRY_FLAG],
      ["curryRight", WRAP_CURRY_RIGHT_FLAG],
      ["flip", WRAP_FLIP_FLAG],
      ["partial", WRAP_PARTIAL_FLAG],
      ["partialRight", WRAP_PARTIAL_RIGHT_FLAG],
      ["rearg", WRAP_REARG_FLAG]
    ];
    var argsTag2 = "[object Arguments]", arrayTag2 = "[object Array]", asyncTag2 = "[object AsyncFunction]", boolTag2 = "[object Boolean]", dateTag2 = "[object Date]", domExcTag = "[object DOMException]", errorTag2 = "[object Error]", funcTag2 = "[object Function]", genTag2 = "[object GeneratorFunction]", mapTag2 = "[object Map]", numberTag2 = "[object Number]", nullTag2 = "[object Null]", objectTag2 = "[object Object]", promiseTag2 = "[object Promise]", proxyTag2 = "[object Proxy]", regexpTag2 = "[object RegExp]", setTag2 = "[object Set]", stringTag2 = "[object String]", symbolTag2 = "[object Symbol]", undefinedTag2 = "[object Undefined]", weakMapTag2 = "[object WeakMap]", weakSetTag = "[object WeakSet]";
    var arrayBufferTag2 = "[object ArrayBuffer]", dataViewTag2 = "[object DataView]", float32Tag2 = "[object Float32Array]", float64Tag2 = "[object Float64Array]", int8Tag2 = "[object Int8Array]", int16Tag2 = "[object Int16Array]", int32Tag2 = "[object Int32Array]", uint8Tag2 = "[object Uint8Array]", uint8ClampedTag2 = "[object Uint8ClampedArray]", uint16Tag2 = "[object Uint16Array]", uint32Tag2 = "[object Uint32Array]";
    var reEmptyStringLeading = /\b__p \+= '';/g, reEmptyStringMiddle = /\b(__p \+=) '' \+/g, reEmptyStringTrailing = /(__e\(.*?\)|\b__t\)) \+\n'';/g;
    var reEscapedHtml = /&(?:amp|lt|gt|quot|#39);/g, reUnescapedHtml = /[&<>"']/g, reHasEscapedHtml = RegExp(reEscapedHtml.source), reHasUnescapedHtml = RegExp(reUnescapedHtml.source);
    var reEscape = /<%-([\s\S]+?)%>/g, reEvaluate = /<%([\s\S]+?)%>/g, reInterpolate = /<%=([\s\S]+?)%>/g;
    var reIsDeepProp2 = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/, reIsPlainProp2 = /^\w*$/, rePropName2 = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;
    var reRegExpChar2 = /[\\^$.*+?()[\]{}|]/g, reHasRegExpChar = RegExp(reRegExpChar2.source);
    var reTrimStart = /^\s+/;
    var reWhitespace = /\s/;
    var reWrapComment = /\{(?:\n\/\* \[wrapped with .+\] \*\/)?\n?/, reWrapDetails = /\{\n\/\* \[wrapped with (.+)\] \*/, reSplitDetails = /,? & /;
    var reAsciiWord2 = /[^\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]+/g;
    var reForbiddenIdentifierChars = /[()=,{}\[\]\/\s]/;
    var reEscapeChar2 = /\\(\\)?/g;
    var reEsTemplate = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g;
    var reFlags = /\w*$/;
    var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;
    var reIsBinary = /^0b[01]+$/i;
    var reIsHostCtor2 = /^\[object .+?Constructor\]$/;
    var reIsOctal = /^0o[0-7]+$/i;
    var reIsUint2 = /^(?:0|[1-9]\d*)$/;
    var reLatin2 = /[\xc0-\xd6\xd8-\xf6\xf8-\xff\u0100-\u017f]/g;
    var reNoMatch = /($^)/;
    var reUnescapedString = /['\n\r\u2028\u2029\\]/g;
    var rsAstralRange2 = "\\ud800-\\udfff", rsComboMarksRange2 = "\\u0300-\\u036f", reComboHalfMarksRange2 = "\\ufe20-\\ufe2f", rsComboSymbolsRange2 = "\\u20d0-\\u20ff", rsComboRange2 = rsComboMarksRange2 + reComboHalfMarksRange2 + rsComboSymbolsRange2, rsDingbatRange2 = "\\u2700-\\u27bf", rsLowerRange2 = "a-z\\xdf-\\xf6\\xf8-\\xff", rsMathOpRange2 = "\\xac\\xb1\\xd7\\xf7", rsNonCharRange2 = "\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf", rsPunctuationRange2 = "\\u2000-\\u206f", rsSpaceRange2 = " \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000", rsUpperRange2 = "A-Z\\xc0-\\xd6\\xd8-\\xde", rsVarRange2 = "\\ufe0e\\ufe0f", rsBreakRange2 = rsMathOpRange2 + rsNonCharRange2 + rsPunctuationRange2 + rsSpaceRange2;
    var rsApos2 = "['’]", rsAstral2 = "[" + rsAstralRange2 + "]", rsBreak2 = "[" + rsBreakRange2 + "]", rsCombo2 = "[" + rsComboRange2 + "]", rsDigits2 = "\\d+", rsDingbat2 = "[" + rsDingbatRange2 + "]", rsLower2 = "[" + rsLowerRange2 + "]", rsMisc2 = "[^" + rsAstralRange2 + rsBreakRange2 + rsDigits2 + rsDingbatRange2 + rsLowerRange2 + rsUpperRange2 + "]", rsFitz2 = "\\ud83c[\\udffb-\\udfff]", rsModifier2 = "(?:" + rsCombo2 + "|" + rsFitz2 + ")", rsNonAstral2 = "[^" + rsAstralRange2 + "]", rsRegional2 = "(?:\\ud83c[\\udde6-\\uddff]){2}", rsSurrPair2 = "[\\ud800-\\udbff][\\udc00-\\udfff]", rsUpper2 = "[" + rsUpperRange2 + "]", rsZWJ2 = "\\u200d";
    var rsMiscLower2 = "(?:" + rsLower2 + "|" + rsMisc2 + ")", rsMiscUpper2 = "(?:" + rsUpper2 + "|" + rsMisc2 + ")", rsOptContrLower2 = "(?:" + rsApos2 + "(?:d|ll|m|re|s|t|ve))?", rsOptContrUpper2 = "(?:" + rsApos2 + "(?:D|LL|M|RE|S|T|VE))?", reOptMod2 = rsModifier2 + "?", rsOptVar2 = "[" + rsVarRange2 + "]?", rsOptJoin2 = "(?:" + rsZWJ2 + "(?:" + [rsNonAstral2, rsRegional2, rsSurrPair2].join("|") + ")" + rsOptVar2 + reOptMod2 + ")*", rsOrdLower2 = "\\d*(?:1st|2nd|3rd|(?![123])\\dth)(?=\\b|[A-Z_])", rsOrdUpper2 = "\\d*(?:1ST|2ND|3RD|(?![123])\\dTH)(?=\\b|[a-z_])", rsSeq2 = rsOptVar2 + reOptMod2 + rsOptJoin2, rsEmoji2 = "(?:" + [rsDingbat2, rsRegional2, rsSurrPair2].join("|") + ")" + rsSeq2, rsSymbol2 = "(?:" + [rsNonAstral2 + rsCombo2 + "?", rsCombo2, rsRegional2, rsSurrPair2, rsAstral2].join("|") + ")";
    var reApos2 = RegExp(rsApos2, "g");
    var reComboMark2 = RegExp(rsCombo2, "g");
    var reUnicode2 = RegExp(rsFitz2 + "(?=" + rsFitz2 + ")|" + rsSymbol2 + rsSeq2, "g");
    var reUnicodeWord2 = RegExp([
      rsUpper2 + "?" + rsLower2 + "+" + rsOptContrLower2 + "(?=" + [rsBreak2, rsUpper2, "$"].join("|") + ")",
      rsMiscUpper2 + "+" + rsOptContrUpper2 + "(?=" + [rsBreak2, rsUpper2 + rsMiscLower2, "$"].join("|") + ")",
      rsUpper2 + "?" + rsMiscLower2 + "+" + rsOptContrLower2,
      rsUpper2 + "+" + rsOptContrUpper2,
      rsOrdUpper2,
      rsOrdLower2,
      rsDigits2,
      rsEmoji2
    ].join("|"), "g");
    var reHasUnicode2 = RegExp("[" + rsZWJ2 + rsAstralRange2 + rsComboRange2 + rsVarRange2 + "]");
    var reHasUnicodeWord2 = /[a-z][A-Z]|[A-Z]{2}[a-z]|[0-9][a-zA-Z]|[a-zA-Z][0-9]|[^a-zA-Z0-9 ]/;
    var contextProps = [
      "Array",
      "Buffer",
      "DataView",
      "Date",
      "Error",
      "Float32Array",
      "Float64Array",
      "Function",
      "Int8Array",
      "Int16Array",
      "Int32Array",
      "Map",
      "Math",
      "Object",
      "Promise",
      "RegExp",
      "Set",
      "String",
      "Symbol",
      "TypeError",
      "Uint8Array",
      "Uint8ClampedArray",
      "Uint16Array",
      "Uint32Array",
      "WeakMap",
      "_",
      "clearTimeout",
      "isFinite",
      "parseInt",
      "setTimeout"
    ];
    var templateCounter = -1;
    var typedArrayTags2 = {};
    typedArrayTags2[float32Tag2] = typedArrayTags2[float64Tag2] = typedArrayTags2[int8Tag2] = typedArrayTags2[int16Tag2] = typedArrayTags2[int32Tag2] = typedArrayTags2[uint8Tag2] = typedArrayTags2[uint8ClampedTag2] = typedArrayTags2[uint16Tag2] = typedArrayTags2[uint32Tag2] = true;
    typedArrayTags2[argsTag2] = typedArrayTags2[arrayTag2] = typedArrayTags2[arrayBufferTag2] = typedArrayTags2[boolTag2] = typedArrayTags2[dataViewTag2] = typedArrayTags2[dateTag2] = typedArrayTags2[errorTag2] = typedArrayTags2[funcTag2] = typedArrayTags2[mapTag2] = typedArrayTags2[numberTag2] = typedArrayTags2[objectTag2] = typedArrayTags2[regexpTag2] = typedArrayTags2[setTag2] = typedArrayTags2[stringTag2] = typedArrayTags2[weakMapTag2] = false;
    var cloneableTags = {};
    cloneableTags[argsTag2] = cloneableTags[arrayTag2] = cloneableTags[arrayBufferTag2] = cloneableTags[dataViewTag2] = cloneableTags[boolTag2] = cloneableTags[dateTag2] = cloneableTags[float32Tag2] = cloneableTags[float64Tag2] = cloneableTags[int8Tag2] = cloneableTags[int16Tag2] = cloneableTags[int32Tag2] = cloneableTags[mapTag2] = cloneableTags[numberTag2] = cloneableTags[objectTag2] = cloneableTags[regexpTag2] = cloneableTags[setTag2] = cloneableTags[stringTag2] = cloneableTags[symbolTag2] = cloneableTags[uint8Tag2] = cloneableTags[uint8ClampedTag2] = cloneableTags[uint16Tag2] = cloneableTags[uint32Tag2] = true;
    cloneableTags[errorTag2] = cloneableTags[funcTag2] = cloneableTags[weakMapTag2] = false;
    var deburredLetters2 = {
      // Latin-1 Supplement block.
      "À": "A",
      "Á": "A",
      "Â": "A",
      "Ã": "A",
      "Ä": "A",
      "Å": "A",
      "à": "a",
      "á": "a",
      "â": "a",
      "ã": "a",
      "ä": "a",
      "å": "a",
      "Ç": "C",
      "ç": "c",
      "Ð": "D",
      "ð": "d",
      "È": "E",
      "É": "E",
      "Ê": "E",
      "Ë": "E",
      "è": "e",
      "é": "e",
      "ê": "e",
      "ë": "e",
      "Ì": "I",
      "Í": "I",
      "Î": "I",
      "Ï": "I",
      "ì": "i",
      "í": "i",
      "î": "i",
      "ï": "i",
      "Ñ": "N",
      "ñ": "n",
      "Ò": "O",
      "Ó": "O",
      "Ô": "O",
      "Õ": "O",
      "Ö": "O",
      "Ø": "O",
      "ò": "o",
      "ó": "o",
      "ô": "o",
      "õ": "o",
      "ö": "o",
      "ø": "o",
      "Ù": "U",
      "Ú": "U",
      "Û": "U",
      "Ü": "U",
      "ù": "u",
      "ú": "u",
      "û": "u",
      "ü": "u",
      "Ý": "Y",
      "ý": "y",
      "ÿ": "y",
      "Æ": "Ae",
      "æ": "ae",
      "Þ": "Th",
      "þ": "th",
      "ß": "ss",
      // Latin Extended-A block.
      "Ā": "A",
      "Ă": "A",
      "Ą": "A",
      "ā": "a",
      "ă": "a",
      "ą": "a",
      "Ć": "C",
      "Ĉ": "C",
      "Ċ": "C",
      "Č": "C",
      "ć": "c",
      "ĉ": "c",
      "ċ": "c",
      "č": "c",
      "Ď": "D",
      "Đ": "D",
      "ď": "d",
      "đ": "d",
      "Ē": "E",
      "Ĕ": "E",
      "Ė": "E",
      "Ę": "E",
      "Ě": "E",
      "ē": "e",
      "ĕ": "e",
      "ė": "e",
      "ę": "e",
      "ě": "e",
      "Ĝ": "G",
      "Ğ": "G",
      "Ġ": "G",
      "Ģ": "G",
      "ĝ": "g",
      "ğ": "g",
      "ġ": "g",
      "ģ": "g",
      "Ĥ": "H",
      "Ħ": "H",
      "ĥ": "h",
      "ħ": "h",
      "Ĩ": "I",
      "Ī": "I",
      "Ĭ": "I",
      "Į": "I",
      "İ": "I",
      "ĩ": "i",
      "ī": "i",
      "ĭ": "i",
      "į": "i",
      "ı": "i",
      "Ĵ": "J",
      "ĵ": "j",
      "Ķ": "K",
      "ķ": "k",
      "ĸ": "k",
      "Ĺ": "L",
      "Ļ": "L",
      "Ľ": "L",
      "Ŀ": "L",
      "Ł": "L",
      "ĺ": "l",
      "ļ": "l",
      "ľ": "l",
      "ŀ": "l",
      "ł": "l",
      "Ń": "N",
      "Ņ": "N",
      "Ň": "N",
      "Ŋ": "N",
      "ń": "n",
      "ņ": "n",
      "ň": "n",
      "ŋ": "n",
      "Ō": "O",
      "Ŏ": "O",
      "Ő": "O",
      "ō": "o",
      "ŏ": "o",
      "ő": "o",
      "Ŕ": "R",
      "Ŗ": "R",
      "Ř": "R",
      "ŕ": "r",
      "ŗ": "r",
      "ř": "r",
      "Ś": "S",
      "Ŝ": "S",
      "Ş": "S",
      "Š": "S",
      "ś": "s",
      "ŝ": "s",
      "ş": "s",
      "š": "s",
      "Ţ": "T",
      "Ť": "T",
      "Ŧ": "T",
      "ţ": "t",
      "ť": "t",
      "ŧ": "t",
      "Ũ": "U",
      "Ū": "U",
      "Ŭ": "U",
      "Ů": "U",
      "Ű": "U",
      "Ų": "U",
      "ũ": "u",
      "ū": "u",
      "ŭ": "u",
      "ů": "u",
      "ű": "u",
      "ų": "u",
      "Ŵ": "W",
      "ŵ": "w",
      "Ŷ": "Y",
      "ŷ": "y",
      "Ÿ": "Y",
      "Ź": "Z",
      "Ż": "Z",
      "Ž": "Z",
      "ź": "z",
      "ż": "z",
      "ž": "z",
      "Ĳ": "IJ",
      "ĳ": "ij",
      "Œ": "Oe",
      "œ": "oe",
      "ŉ": "'n",
      "ſ": "s"
    };
    var htmlEscapes = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    var htmlUnescapes = {
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&#39;": "'"
    };
    var stringEscapes = {
      "\\": "\\",
      "'": "'",
      "\n": "n",
      "\r": "r",
      "\u2028": "u2028",
      "\u2029": "u2029"
    };
    var freeParseFloat = parseFloat, freeParseInt = parseInt;
    var freeGlobal2 = typeof commonjsGlobal == "object" && commonjsGlobal && commonjsGlobal.Object === Object && commonjsGlobal;
    var freeSelf2 = typeof self == "object" && self && self.Object === Object && self;
    var root2 = freeGlobal2 || freeSelf2 || Function("return this")();
    var freeExports = exports$1 && !exports$1.nodeType && exports$1;
    var freeModule = freeExports && true && module && !module.nodeType && module;
    var moduleExports = freeModule && freeModule.exports === freeExports;
    var freeProcess = moduleExports && freeGlobal2.process;
    var nodeUtil2 = function() {
      try {
        var types = freeModule && freeModule.require && freeModule.require("util").types;
        if (types) {
          return types;
        }
        return freeProcess && freeProcess.binding && freeProcess.binding("util");
      } catch (e) {
      }
    }();
    var nodeIsArrayBuffer = nodeUtil2 && nodeUtil2.isArrayBuffer, nodeIsDate = nodeUtil2 && nodeUtil2.isDate, nodeIsMap = nodeUtil2 && nodeUtil2.isMap, nodeIsRegExp = nodeUtil2 && nodeUtil2.isRegExp, nodeIsSet = nodeUtil2 && nodeUtil2.isSet, nodeIsTypedArray2 = nodeUtil2 && nodeUtil2.isTypedArray;
    function apply(func, thisArg, args) {
      switch (args.length) {
        case 0:
          return func.call(thisArg);
        case 1:
          return func.call(thisArg, args[0]);
        case 2:
          return func.call(thisArg, args[0], args[1]);
        case 3:
          return func.call(thisArg, args[0], args[1], args[2]);
      }
      return func.apply(thisArg, args);
    }
    function arrayAggregator(array2, setter, iteratee, accumulator) {
      var index2 = -1, length = array2 == null ? 0 : array2.length;
      while (++index2 < length) {
        var value = array2[index2];
        setter(accumulator, value, iteratee(value), array2);
      }
      return accumulator;
    }
    function arrayEach(array2, iteratee) {
      var index2 = -1, length = array2 == null ? 0 : array2.length;
      while (++index2 < length) {
        if (iteratee(array2[index2], index2, array2) === false) {
          break;
        }
      }
      return array2;
    }
    function arrayEachRight(array2, iteratee) {
      var length = array2 == null ? 0 : array2.length;
      while (length--) {
        if (iteratee(array2[length], length, array2) === false) {
          break;
        }
      }
      return array2;
    }
    function arrayEvery(array2, predicate) {
      var index2 = -1, length = array2 == null ? 0 : array2.length;
      while (++index2 < length) {
        if (!predicate(array2[index2], index2, array2)) {
          return false;
        }
      }
      return true;
    }
    function arrayFilter2(array2, predicate) {
      var index2 = -1, length = array2 == null ? 0 : array2.length, resIndex = 0, result = [];
      while (++index2 < length) {
        var value = array2[index2];
        if (predicate(value, index2, array2)) {
          result[resIndex++] = value;
        }
      }
      return result;
    }
    function arrayIncludes(array2, value) {
      var length = array2 == null ? 0 : array2.length;
      return !!length && baseIndexOf(array2, value, 0) > -1;
    }
    function arrayIncludesWith(array2, value, comparator) {
      var index2 = -1, length = array2 == null ? 0 : array2.length;
      while (++index2 < length) {
        if (comparator(value, array2[index2])) {
          return true;
        }
      }
      return false;
    }
    function arrayMap2(array2, iteratee) {
      var index2 = -1, length = array2 == null ? 0 : array2.length, result = Array(length);
      while (++index2 < length) {
        result[index2] = iteratee(array2[index2], index2, array2);
      }
      return result;
    }
    function arrayPush2(array2, values) {
      var index2 = -1, length = values.length, offset = array2.length;
      while (++index2 < length) {
        array2[offset + index2] = values[index2];
      }
      return array2;
    }
    function arrayReduce2(array2, iteratee, accumulator, initAccum) {
      var index2 = -1, length = array2 == null ? 0 : array2.length;
      if (initAccum && length) {
        accumulator = array2[++index2];
      }
      while (++index2 < length) {
        accumulator = iteratee(accumulator, array2[index2], index2, array2);
      }
      return accumulator;
    }
    function arrayReduceRight(array2, iteratee, accumulator, initAccum) {
      var length = array2 == null ? 0 : array2.length;
      if (initAccum && length) {
        accumulator = array2[--length];
      }
      while (length--) {
        accumulator = iteratee(accumulator, array2[length], length, array2);
      }
      return accumulator;
    }
    function arraySome2(array2, predicate) {
      var index2 = -1, length = array2 == null ? 0 : array2.length;
      while (++index2 < length) {
        if (predicate(array2[index2], index2, array2)) {
          return true;
        }
      }
      return false;
    }
    var asciiSize = baseProperty2("length");
    function asciiToArray2(string2) {
      return string2.split("");
    }
    function asciiWords2(string2) {
      return string2.match(reAsciiWord2) || [];
    }
    function baseFindKey(collection, predicate, eachFunc) {
      var result;
      eachFunc(collection, function(value, key, collection2) {
        if (predicate(value, key, collection2)) {
          result = key;
          return false;
        }
      });
      return result;
    }
    function baseFindIndex(array2, predicate, fromIndex, fromRight) {
      var length = array2.length, index2 = fromIndex + (fromRight ? 1 : -1);
      while (fromRight ? index2-- : ++index2 < length) {
        if (predicate(array2[index2], index2, array2)) {
          return index2;
        }
      }
      return -1;
    }
    function baseIndexOf(array2, value, fromIndex) {
      return value === value ? strictIndexOf(array2, value, fromIndex) : baseFindIndex(array2, baseIsNaN, fromIndex);
    }
    function baseIndexOfWith(array2, value, fromIndex, comparator) {
      var index2 = fromIndex - 1, length = array2.length;
      while (++index2 < length) {
        if (comparator(array2[index2], value)) {
          return index2;
        }
      }
      return -1;
    }
    function baseIsNaN(value) {
      return value !== value;
    }
    function baseMean(array2, iteratee) {
      var length = array2 == null ? 0 : array2.length;
      return length ? baseSum(array2, iteratee) / length : NAN;
    }
    function baseProperty2(key) {
      return function(object2) {
        return object2 == null ? undefined$1 : object2[key];
      };
    }
    function basePropertyOf2(object2) {
      return function(key) {
        return object2 == null ? undefined$1 : object2[key];
      };
    }
    function baseReduce(collection, iteratee, accumulator, initAccum, eachFunc) {
      eachFunc(collection, function(value, index2, collection2) {
        accumulator = initAccum ? (initAccum = false, value) : iteratee(accumulator, value, index2, collection2);
      });
      return accumulator;
    }
    function baseSortBy(array2, comparer) {
      var length = array2.length;
      array2.sort(comparer);
      while (length--) {
        array2[length] = array2[length].value;
      }
      return array2;
    }
    function baseSum(array2, iteratee) {
      var result, index2 = -1, length = array2.length;
      while (++index2 < length) {
        var current = iteratee(array2[index2]);
        if (current !== undefined$1) {
          result = result === undefined$1 ? current : result + current;
        }
      }
      return result;
    }
    function baseTimes2(n, iteratee) {
      var index2 = -1, result = Array(n);
      while (++index2 < n) {
        result[index2] = iteratee(index2);
      }
      return result;
    }
    function baseToPairs(object2, props) {
      return arrayMap2(props, function(key) {
        return [key, object2[key]];
      });
    }
    function baseTrim(string2) {
      return string2 ? string2.slice(0, trimmedEndIndex(string2) + 1).replace(reTrimStart, "") : string2;
    }
    function baseUnary2(func) {
      return function(value) {
        return func(value);
      };
    }
    function baseValues(object2, props) {
      return arrayMap2(props, function(key) {
        return object2[key];
      });
    }
    function cacheHas2(cache, key) {
      return cache.has(key);
    }
    function charsStartIndex(strSymbols, chrSymbols) {
      var index2 = -1, length = strSymbols.length;
      while (++index2 < length && baseIndexOf(chrSymbols, strSymbols[index2], 0) > -1) {
      }
      return index2;
    }
    function charsEndIndex(strSymbols, chrSymbols) {
      var index2 = strSymbols.length;
      while (index2-- && baseIndexOf(chrSymbols, strSymbols[index2], 0) > -1) {
      }
      return index2;
    }
    function countHolders(array2, placeholder2) {
      var length = array2.length, result = 0;
      while (length--) {
        if (array2[length] === placeholder2) {
          ++result;
        }
      }
      return result;
    }
    var deburrLetter2 = basePropertyOf2(deburredLetters2);
    var escapeHtmlChar = basePropertyOf2(htmlEscapes);
    function escapeStringChar(chr) {
      return "\\" + stringEscapes[chr];
    }
    function getValue2(object2, key) {
      return object2 == null ? undefined$1 : object2[key];
    }
    function hasUnicode2(string2) {
      return reHasUnicode2.test(string2);
    }
    function hasUnicodeWord2(string2) {
      return reHasUnicodeWord2.test(string2);
    }
    function iteratorToArray(iterator) {
      var data, result = [];
      while (!(data = iterator.next()).done) {
        result.push(data.value);
      }
      return result;
    }
    function mapToArray2(map2) {
      var index2 = -1, result = Array(map2.size);
      map2.forEach(function(value, key) {
        result[++index2] = [key, value];
      });
      return result;
    }
    function overArg2(func, transform2) {
      return function(arg) {
        return func(transform2(arg));
      };
    }
    function replaceHolders(array2, placeholder2) {
      var index2 = -1, length = array2.length, resIndex = 0, result = [];
      while (++index2 < length) {
        var value = array2[index2];
        if (value === placeholder2 || value === PLACEHOLDER) {
          array2[index2] = PLACEHOLDER;
          result[resIndex++] = index2;
        }
      }
      return result;
    }
    function setToArray2(set2) {
      var index2 = -1, result = Array(set2.size);
      set2.forEach(function(value) {
        result[++index2] = value;
      });
      return result;
    }
    function setToPairs(set2) {
      var index2 = -1, result = Array(set2.size);
      set2.forEach(function(value) {
        result[++index2] = [value, value];
      });
      return result;
    }
    function strictIndexOf(array2, value, fromIndex) {
      var index2 = fromIndex - 1, length = array2.length;
      while (++index2 < length) {
        if (array2[index2] === value) {
          return index2;
        }
      }
      return -1;
    }
    function strictLastIndexOf(array2, value, fromIndex) {
      var index2 = fromIndex + 1;
      while (index2--) {
        if (array2[index2] === value) {
          return index2;
        }
      }
      return index2;
    }
    function stringSize(string2) {
      return hasUnicode2(string2) ? unicodeSize(string2) : asciiSize(string2);
    }
    function stringToArray2(string2) {
      return hasUnicode2(string2) ? unicodeToArray2(string2) : asciiToArray2(string2);
    }
    function trimmedEndIndex(string2) {
      var index2 = string2.length;
      while (index2-- && reWhitespace.test(string2.charAt(index2))) {
      }
      return index2;
    }
    var unescapeHtmlChar = basePropertyOf2(htmlUnescapes);
    function unicodeSize(string2) {
      var result = reUnicode2.lastIndex = 0;
      while (reUnicode2.test(string2)) {
        ++result;
      }
      return result;
    }
    function unicodeToArray2(string2) {
      return string2.match(reUnicode2) || [];
    }
    function unicodeWords2(string2) {
      return string2.match(reUnicodeWord2) || [];
    }
    var runInContext = function runInContext2(context) {
      context = context == null ? root2 : _2.defaults(root2.Object(), context, _2.pick(root2, contextProps));
      var Array2 = context.Array, Date2 = context.Date, Error2 = context.Error, Function2 = context.Function, Math2 = context.Math, Object2 = context.Object, RegExp2 = context.RegExp, String2 = context.String, TypeError2 = context.TypeError;
      var arrayProto2 = Array2.prototype, funcProto2 = Function2.prototype, objectProto2 = Object2.prototype;
      var coreJsData2 = context["__core-js_shared__"];
      var funcToString2 = funcProto2.toString;
      var hasOwnProperty2 = objectProto2.hasOwnProperty;
      var idCounter = 0;
      var maskSrcKey2 = function() {
        var uid = /[^.]+$/.exec(coreJsData2 && coreJsData2.keys && coreJsData2.keys.IE_PROTO || "");
        return uid ? "Symbol(src)_1." + uid : "";
      }();
      var nativeObjectToString2 = objectProto2.toString;
      var objectCtorString = funcToString2.call(Object2);
      var oldDash = root2._;
      var reIsNative2 = RegExp2(
        "^" + funcToString2.call(hasOwnProperty2).replace(reRegExpChar2, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
      );
      var Buffer2 = moduleExports ? context.Buffer : undefined$1, Symbol2 = context.Symbol, Uint8Array2 = context.Uint8Array, allocUnsafe = Buffer2 ? Buffer2.allocUnsafe : undefined$1, getPrototype = overArg2(Object2.getPrototypeOf, Object2), objectCreate = Object2.create, propertyIsEnumerable2 = objectProto2.propertyIsEnumerable, splice2 = arrayProto2.splice, spreadableSymbol = Symbol2 ? Symbol2.isConcatSpreadable : undefined$1, symIterator = Symbol2 ? Symbol2.iterator : undefined$1, symToStringTag2 = Symbol2 ? Symbol2.toStringTag : undefined$1;
      var defineProperty2 = function() {
        try {
          var func = getNative2(Object2, "defineProperty");
          func({}, "", {});
          return func;
        } catch (e) {
        }
      }();
      var ctxClearTimeout = context.clearTimeout !== root2.clearTimeout && context.clearTimeout, ctxNow = Date2 && Date2.now !== root2.Date.now && Date2.now, ctxSetTimeout = context.setTimeout !== root2.setTimeout && context.setTimeout;
      var nativeCeil = Math2.ceil, nativeFloor = Math2.floor, nativeGetSymbols2 = Object2.getOwnPropertySymbols, nativeIsBuffer = Buffer2 ? Buffer2.isBuffer : undefined$1, nativeIsFinite = context.isFinite, nativeJoin = arrayProto2.join, nativeKeys2 = overArg2(Object2.keys, Object2), nativeMax = Math2.max, nativeMin = Math2.min, nativeNow = Date2.now, nativeParseInt = context.parseInt, nativeRandom = Math2.random, nativeReverse = arrayProto2.reverse;
      var DataView2 = getNative2(context, "DataView"), Map2 = getNative2(context, "Map"), Promise2 = getNative2(context, "Promise"), Set2 = getNative2(context, "Set"), WeakMap2 = getNative2(context, "WeakMap"), nativeCreate2 = getNative2(Object2, "create");
      var metaMap = WeakMap2 && new WeakMap2();
      var realNames = {};
      var dataViewCtorString2 = toSource2(DataView2), mapCtorString2 = toSource2(Map2), promiseCtorString2 = toSource2(Promise2), setCtorString2 = toSource2(Set2), weakMapCtorString2 = toSource2(WeakMap2);
      var symbolProto2 = Symbol2 ? Symbol2.prototype : undefined$1, symbolValueOf2 = symbolProto2 ? symbolProto2.valueOf : undefined$1, symbolToString2 = symbolProto2 ? symbolProto2.toString : undefined$1;
      function lodash2(value) {
        if (isObjectLike2(value) && !isArray2(value) && !(value instanceof LazyWrapper)) {
          if (value instanceof LodashWrapper) {
            return value;
          }
          if (hasOwnProperty2.call(value, "__wrapped__")) {
            return wrapperClone(value);
          }
        }
        return new LodashWrapper(value);
      }
      var baseCreate = /* @__PURE__ */ function() {
        function object2() {
        }
        return function(proto) {
          if (!isObject2(proto)) {
            return {};
          }
          if (objectCreate) {
            return objectCreate(proto);
          }
          object2.prototype = proto;
          var result2 = new object2();
          object2.prototype = undefined$1;
          return result2;
        };
      }();
      function baseLodash() {
      }
      function LodashWrapper(value, chainAll) {
        this.__wrapped__ = value;
        this.__actions__ = [];
        this.__chain__ = !!chainAll;
        this.__index__ = 0;
        this.__values__ = undefined$1;
      }
      lodash2.templateSettings = {
        /**
         * Used to detect `data` property values to be HTML-escaped.
         *
         * @memberOf _.templateSettings
         * @type {RegExp}
         */
        "escape": reEscape,
        /**
         * Used to detect code to be evaluated.
         *
         * @memberOf _.templateSettings
         * @type {RegExp}
         */
        "evaluate": reEvaluate,
        /**
         * Used to detect `data` property values to inject.
         *
         * @memberOf _.templateSettings
         * @type {RegExp}
         */
        "interpolate": reInterpolate,
        /**
         * Used to reference the data object in the template text.
         *
         * @memberOf _.templateSettings
         * @type {string}
         */
        "variable": "",
        /**
         * Used to import variables into the compiled template.
         *
         * @memberOf _.templateSettings
         * @type {Object}
         */
        "imports": {
          /**
           * A reference to the `lodash` function.
           *
           * @memberOf _.templateSettings.imports
           * @type {Function}
           */
          "_": lodash2
        }
      };
      lodash2.prototype = baseLodash.prototype;
      lodash2.prototype.constructor = lodash2;
      LodashWrapper.prototype = baseCreate(baseLodash.prototype);
      LodashWrapper.prototype.constructor = LodashWrapper;
      function LazyWrapper(value) {
        this.__wrapped__ = value;
        this.__actions__ = [];
        this.__dir__ = 1;
        this.__filtered__ = false;
        this.__iteratees__ = [];
        this.__takeCount__ = MAX_ARRAY_LENGTH;
        this.__views__ = [];
      }
      function lazyClone() {
        var result2 = new LazyWrapper(this.__wrapped__);
        result2.__actions__ = copyArray(this.__actions__);
        result2.__dir__ = this.__dir__;
        result2.__filtered__ = this.__filtered__;
        result2.__iteratees__ = copyArray(this.__iteratees__);
        result2.__takeCount__ = this.__takeCount__;
        result2.__views__ = copyArray(this.__views__);
        return result2;
      }
      function lazyReverse() {
        if (this.__filtered__) {
          var result2 = new LazyWrapper(this);
          result2.__dir__ = -1;
          result2.__filtered__ = true;
        } else {
          result2 = this.clone();
          result2.__dir__ *= -1;
        }
        return result2;
      }
      function lazyValue() {
        var array2 = this.__wrapped__.value(), dir = this.__dir__, isArr = isArray2(array2), isRight = dir < 0, arrLength = isArr ? array2.length : 0, view = getView(0, arrLength, this.__views__), start = view.start, end = view.end, length = end - start, index2 = isRight ? end : start - 1, iteratees = this.__iteratees__, iterLength = iteratees.length, resIndex = 0, takeCount = nativeMin(length, this.__takeCount__);
        if (!isArr || !isRight && arrLength == length && takeCount == length) {
          return baseWrapperValue(array2, this.__actions__);
        }
        var result2 = [];
        outer:
          while (length-- && resIndex < takeCount) {
            index2 += dir;
            var iterIndex = -1, value = array2[index2];
            while (++iterIndex < iterLength) {
              var data = iteratees[iterIndex], iteratee2 = data.iteratee, type2 = data.type, computed = iteratee2(value);
              if (type2 == LAZY_MAP_FLAG) {
                value = computed;
              } else if (!computed) {
                if (type2 == LAZY_FILTER_FLAG) {
                  continue outer;
                } else {
                  break outer;
                }
              }
            }
            result2[resIndex++] = value;
          }
        return result2;
      }
      LazyWrapper.prototype = baseCreate(baseLodash.prototype);
      LazyWrapper.prototype.constructor = LazyWrapper;
      function Hash2(entries) {
        var index2 = -1, length = entries == null ? 0 : entries.length;
        this.clear();
        while (++index2 < length) {
          var entry = entries[index2];
          this.set(entry[0], entry[1]);
        }
      }
      function hashClear2() {
        this.__data__ = nativeCreate2 ? nativeCreate2(null) : {};
        this.size = 0;
      }
      function hashDelete2(key) {
        var result2 = this.has(key) && delete this.__data__[key];
        this.size -= result2 ? 1 : 0;
        return result2;
      }
      function hashGet2(key) {
        var data = this.__data__;
        if (nativeCreate2) {
          var result2 = data[key];
          return result2 === HASH_UNDEFINED2 ? undefined$1 : result2;
        }
        return hasOwnProperty2.call(data, key) ? data[key] : undefined$1;
      }
      function hashHas2(key) {
        var data = this.__data__;
        return nativeCreate2 ? data[key] !== undefined$1 : hasOwnProperty2.call(data, key);
      }
      function hashSet2(key, value) {
        var data = this.__data__;
        this.size += this.has(key) ? 0 : 1;
        data[key] = nativeCreate2 && value === undefined$1 ? HASH_UNDEFINED2 : value;
        return this;
      }
      Hash2.prototype.clear = hashClear2;
      Hash2.prototype["delete"] = hashDelete2;
      Hash2.prototype.get = hashGet2;
      Hash2.prototype.has = hashHas2;
      Hash2.prototype.set = hashSet2;
      function ListCache2(entries) {
        var index2 = -1, length = entries == null ? 0 : entries.length;
        this.clear();
        while (++index2 < length) {
          var entry = entries[index2];
          this.set(entry[0], entry[1]);
        }
      }
      function listCacheClear2() {
        this.__data__ = [];
        this.size = 0;
      }
      function listCacheDelete2(key) {
        var data = this.__data__, index2 = assocIndexOf2(data, key);
        if (index2 < 0) {
          return false;
        }
        var lastIndex = data.length - 1;
        if (index2 == lastIndex) {
          data.pop();
        } else {
          splice2.call(data, index2, 1);
        }
        --this.size;
        return true;
      }
      function listCacheGet2(key) {
        var data = this.__data__, index2 = assocIndexOf2(data, key);
        return index2 < 0 ? undefined$1 : data[index2][1];
      }
      function listCacheHas2(key) {
        return assocIndexOf2(this.__data__, key) > -1;
      }
      function listCacheSet2(key, value) {
        var data = this.__data__, index2 = assocIndexOf2(data, key);
        if (index2 < 0) {
          ++this.size;
          data.push([key, value]);
        } else {
          data[index2][1] = value;
        }
        return this;
      }
      ListCache2.prototype.clear = listCacheClear2;
      ListCache2.prototype["delete"] = listCacheDelete2;
      ListCache2.prototype.get = listCacheGet2;
      ListCache2.prototype.has = listCacheHas2;
      ListCache2.prototype.set = listCacheSet2;
      function MapCache2(entries) {
        var index2 = -1, length = entries == null ? 0 : entries.length;
        this.clear();
        while (++index2 < length) {
          var entry = entries[index2];
          this.set(entry[0], entry[1]);
        }
      }
      function mapCacheClear2() {
        this.size = 0;
        this.__data__ = {
          "hash": new Hash2(),
          "map": new (Map2 || ListCache2)(),
          "string": new Hash2()
        };
      }
      function mapCacheDelete2(key) {
        var result2 = getMapData2(this, key)["delete"](key);
        this.size -= result2 ? 1 : 0;
        return result2;
      }
      function mapCacheGet2(key) {
        return getMapData2(this, key).get(key);
      }
      function mapCacheHas2(key) {
        return getMapData2(this, key).has(key);
      }
      function mapCacheSet2(key, value) {
        var data = getMapData2(this, key), size2 = data.size;
        data.set(key, value);
        this.size += data.size == size2 ? 0 : 1;
        return this;
      }
      MapCache2.prototype.clear = mapCacheClear2;
      MapCache2.prototype["delete"] = mapCacheDelete2;
      MapCache2.prototype.get = mapCacheGet2;
      MapCache2.prototype.has = mapCacheHas2;
      MapCache2.prototype.set = mapCacheSet2;
      function SetCache2(values2) {
        var index2 = -1, length = values2 == null ? 0 : values2.length;
        this.__data__ = new MapCache2();
        while (++index2 < length) {
          this.add(values2[index2]);
        }
      }
      function setCacheAdd2(value) {
        this.__data__.set(value, HASH_UNDEFINED2);
        return this;
      }
      function setCacheHas2(value) {
        return this.__data__.has(value);
      }
      SetCache2.prototype.add = SetCache2.prototype.push = setCacheAdd2;
      SetCache2.prototype.has = setCacheHas2;
      function Stack2(entries) {
        var data = this.__data__ = new ListCache2(entries);
        this.size = data.size;
      }
      function stackClear2() {
        this.__data__ = new ListCache2();
        this.size = 0;
      }
      function stackDelete2(key) {
        var data = this.__data__, result2 = data["delete"](key);
        this.size = data.size;
        return result2;
      }
      function stackGet2(key) {
        return this.__data__.get(key);
      }
      function stackHas2(key) {
        return this.__data__.has(key);
      }
      function stackSet2(key, value) {
        var data = this.__data__;
        if (data instanceof ListCache2) {
          var pairs2 = data.__data__;
          if (!Map2 || pairs2.length < LARGE_ARRAY_SIZE2 - 1) {
            pairs2.push([key, value]);
            this.size = ++data.size;
            return this;
          }
          data = this.__data__ = new MapCache2(pairs2);
        }
        data.set(key, value);
        this.size = data.size;
        return this;
      }
      Stack2.prototype.clear = stackClear2;
      Stack2.prototype["delete"] = stackDelete2;
      Stack2.prototype.get = stackGet2;
      Stack2.prototype.has = stackHas2;
      Stack2.prototype.set = stackSet2;
      function arrayLikeKeys2(value, inherited) {
        var isArr = isArray2(value), isArg = !isArr && isArguments2(value), isBuff = !isArr && !isArg && isBuffer2(value), isType = !isArr && !isArg && !isBuff && isTypedArray2(value), skipIndexes = isArr || isArg || isBuff || isType, result2 = skipIndexes ? baseTimes2(value.length, String2) : [], length = result2.length;
        for (var key in value) {
          if ((inherited || hasOwnProperty2.call(value, key)) && !(skipIndexes && // Safari 9 has enumerable `arguments.length` in strict mode.
          (key == "length" || // Node.js 0.10 has enumerable non-index properties on buffers.
          isBuff && (key == "offset" || key == "parent") || // PhantomJS 2 has enumerable non-index properties on typed arrays.
          isType && (key == "buffer" || key == "byteLength" || key == "byteOffset") || // Skip index properties.
          isIndex2(key, length)))) {
            result2.push(key);
          }
        }
        return result2;
      }
      function arraySample(array2) {
        var length = array2.length;
        return length ? array2[baseRandom(0, length - 1)] : undefined$1;
      }
      function arraySampleSize(array2, n) {
        return shuffleSelf(copyArray(array2), baseClamp(n, 0, array2.length));
      }
      function arrayShuffle(array2) {
        return shuffleSelf(copyArray(array2));
      }
      function assignMergeValue(object2, key, value) {
        if (value !== undefined$1 && !eq2(object2[key], value) || value === undefined$1 && !(key in object2)) {
          baseAssignValue2(object2, key, value);
        }
      }
      function assignValue(object2, key, value) {
        var objValue = object2[key];
        if (!(hasOwnProperty2.call(object2, key) && eq2(objValue, value)) || value === undefined$1 && !(key in object2)) {
          baseAssignValue2(object2, key, value);
        }
      }
      function assocIndexOf2(array2, key) {
        var length = array2.length;
        while (length--) {
          if (eq2(array2[length][0], key)) {
            return length;
          }
        }
        return -1;
      }
      function baseAggregator(collection, setter, iteratee2, accumulator) {
        baseEach(collection, function(value, key, collection2) {
          setter(accumulator, value, iteratee2(value), collection2);
        });
        return accumulator;
      }
      function baseAssign(object2, source) {
        return object2 && copyObject(source, keys2(source), object2);
      }
      function baseAssignIn(object2, source) {
        return object2 && copyObject(source, keysIn(source), object2);
      }
      function baseAssignValue2(object2, key, value) {
        if (key == "__proto__" && defineProperty2) {
          defineProperty2(object2, key, {
            "configurable": true,
            "enumerable": true,
            "value": value,
            "writable": true
          });
        } else {
          object2[key] = value;
        }
      }
      function baseAt(object2, paths) {
        var index2 = -1, length = paths.length, result2 = Array2(length), skip = object2 == null;
        while (++index2 < length) {
          result2[index2] = skip ? undefined$1 : get2(object2, paths[index2]);
        }
        return result2;
      }
      function baseClamp(number2, lower, upper) {
        if (number2 === number2) {
          if (upper !== undefined$1) {
            number2 = number2 <= upper ? number2 : upper;
          }
          if (lower !== undefined$1) {
            number2 = number2 >= lower ? number2 : lower;
          }
        }
        return number2;
      }
      function baseClone2(value, bitmask, customizer, key, object2, stack) {
        var result2, isDeep = bitmask & CLONE_DEEP_FLAG, isFlat = bitmask & CLONE_FLAT_FLAG, isFull = bitmask & CLONE_SYMBOLS_FLAG;
        if (customizer) {
          result2 = object2 ? customizer(value, key, object2, stack) : customizer(value);
        }
        if (result2 !== undefined$1) {
          return result2;
        }
        if (!isObject2(value)) {
          return value;
        }
        var isArr = isArray2(value);
        if (isArr) {
          result2 = initCloneArray(value);
          if (!isDeep) {
            return copyArray(value, result2);
          }
        } else {
          var tag = getTag2(value), isFunc = tag == funcTag2 || tag == genTag2;
          if (isBuffer2(value)) {
            return cloneBuffer(value, isDeep);
          }
          if (tag == objectTag2 || tag == argsTag2 || isFunc && !object2) {
            result2 = isFlat || isFunc ? {} : initCloneObject(value);
            if (!isDeep) {
              return isFlat ? copySymbolsIn(value, baseAssignIn(result2, value)) : copySymbols(value, baseAssign(result2, value));
            }
          } else {
            if (!cloneableTags[tag]) {
              return object2 ? value : {};
            }
            result2 = initCloneByTag(value, tag, isDeep);
          }
        }
        stack || (stack = new Stack2());
        var stacked = stack.get(value);
        if (stacked) {
          return stacked;
        }
        stack.set(value, result2);
        if (isSet(value)) {
          value.forEach(function(subValue) {
            result2.add(baseClone2(subValue, bitmask, customizer, subValue, value, stack));
          });
        } else if (isMap(value)) {
          value.forEach(function(subValue, key2) {
            result2.set(key2, baseClone2(subValue, bitmask, customizer, key2, value, stack));
          });
        }
        var keysFunc = isFull ? isFlat ? getAllKeysIn : getAllKeys2 : isFlat ? keysIn : keys2;
        var props = isArr ? undefined$1 : keysFunc(value);
        arrayEach(props || value, function(subValue, key2) {
          if (props) {
            key2 = subValue;
            subValue = value[key2];
          }
          assignValue(result2, key2, baseClone2(subValue, bitmask, customizer, key2, value, stack));
        });
        return result2;
      }
      function baseConforms(source) {
        var props = keys2(source);
        return function(object2) {
          return baseConformsTo(object2, source, props);
        };
      }
      function baseConformsTo(object2, source, props) {
        var length = props.length;
        if (object2 == null) {
          return !length;
        }
        object2 = Object2(object2);
        while (length--) {
          var key = props[length], predicate = source[key], value = object2[key];
          if (value === undefined$1 && !(key in object2) || !predicate(value)) {
            return false;
          }
        }
        return true;
      }
      function baseDelay(func, wait, args) {
        if (typeof func != "function") {
          throw new TypeError2(FUNC_ERROR_TEXT2);
        }
        return setTimeout2(function() {
          func.apply(undefined$1, args);
        }, wait);
      }
      function baseDifference(array2, values2, iteratee2, comparator) {
        var index2 = -1, includes2 = arrayIncludes, isCommon = true, length = array2.length, result2 = [], valuesLength = values2.length;
        if (!length) {
          return result2;
        }
        if (iteratee2) {
          values2 = arrayMap2(values2, baseUnary2(iteratee2));
        }
        if (comparator) {
          includes2 = arrayIncludesWith;
          isCommon = false;
        } else if (values2.length >= LARGE_ARRAY_SIZE2) {
          includes2 = cacheHas2;
          isCommon = false;
          values2 = new SetCache2(values2);
        }
        outer:
          while (++index2 < length) {
            var value = array2[index2], computed = iteratee2 == null ? value : iteratee2(value);
            value = comparator || value !== 0 ? value : 0;
            if (isCommon && computed === computed) {
              var valuesIndex = valuesLength;
              while (valuesIndex--) {
                if (values2[valuesIndex] === computed) {
                  continue outer;
                }
              }
              result2.push(value);
            } else if (!includes2(values2, computed, comparator)) {
              result2.push(value);
            }
          }
        return result2;
      }
      var baseEach = createBaseEach(baseForOwn2);
      var baseEachRight = createBaseEach(baseForOwnRight, true);
      function baseEvery(collection, predicate) {
        var result2 = true;
        baseEach(collection, function(value, index2, collection2) {
          result2 = !!predicate(value, index2, collection2);
          return result2;
        });
        return result2;
      }
      function baseExtremum(array2, iteratee2, comparator) {
        var index2 = -1, length = array2.length;
        while (++index2 < length) {
          var value = array2[index2], current = iteratee2(value);
          if (current != null && (computed === undefined$1 ? current === current && !isSymbol2(current) : comparator(current, computed))) {
            var computed = current, result2 = value;
          }
        }
        return result2;
      }
      function baseFill(array2, value, start, end) {
        var length = array2.length;
        start = toInteger(start);
        if (start < 0) {
          start = -start > length ? 0 : length + start;
        }
        end = end === undefined$1 || end > length ? length : toInteger(end);
        if (end < 0) {
          end += length;
        }
        end = start > end ? 0 : toLength(end);
        while (start < end) {
          array2[start++] = value;
        }
        return array2;
      }
      function baseFilter(collection, predicate) {
        var result2 = [];
        baseEach(collection, function(value, index2, collection2) {
          if (predicate(value, index2, collection2)) {
            result2.push(value);
          }
        });
        return result2;
      }
      function baseFlatten(array2, depth2, predicate, isStrict, result2) {
        var index2 = -1, length = array2.length;
        predicate || (predicate = isFlattenable);
        result2 || (result2 = []);
        while (++index2 < length) {
          var value = array2[index2];
          if (depth2 > 0 && predicate(value)) {
            if (depth2 > 1) {
              baseFlatten(value, depth2 - 1, predicate, isStrict, result2);
            } else {
              arrayPush2(result2, value);
            }
          } else if (!isStrict) {
            result2[result2.length] = value;
          }
        }
        return result2;
      }
      var baseFor2 = createBaseFor2();
      var baseForRight = createBaseFor2(true);
      function baseForOwn2(object2, iteratee2) {
        return object2 && baseFor2(object2, iteratee2, keys2);
      }
      function baseForOwnRight(object2, iteratee2) {
        return object2 && baseForRight(object2, iteratee2, keys2);
      }
      function baseFunctions(object2, props) {
        return arrayFilter2(props, function(key) {
          return isFunction3(object2[key]);
        });
      }
      function baseGet2(object2, path2) {
        path2 = castPath2(path2, object2);
        var index2 = 0, length = path2.length;
        while (object2 != null && index2 < length) {
          object2 = object2[toKey2(path2[index2++])];
        }
        return index2 && index2 == length ? object2 : undefined$1;
      }
      function baseGetAllKeys2(object2, keysFunc, symbolsFunc) {
        var result2 = keysFunc(object2);
        return isArray2(object2) ? result2 : arrayPush2(result2, symbolsFunc(object2));
      }
      function baseGetTag2(value) {
        if (value == null) {
          return value === undefined$1 ? undefinedTag2 : nullTag2;
        }
        return symToStringTag2 && symToStringTag2 in Object2(value) ? getRawTag2(value) : objectToString2(value);
      }
      function baseGt(value, other) {
        return value > other;
      }
      function baseHas2(object2, key) {
        return object2 != null && hasOwnProperty2.call(object2, key);
      }
      function baseHasIn2(object2, key) {
        return object2 != null && key in Object2(object2);
      }
      function baseInRange(number2, start, end) {
        return number2 >= nativeMin(start, end) && number2 < nativeMax(start, end);
      }
      function baseIntersection(arrays2, iteratee2, comparator) {
        var includes2 = comparator ? arrayIncludesWith : arrayIncludes, length = arrays2[0].length, othLength = arrays2.length, othIndex = othLength, caches = Array2(othLength), maxLength = Infinity, result2 = [];
        while (othIndex--) {
          var array2 = arrays2[othIndex];
          if (othIndex && iteratee2) {
            array2 = arrayMap2(array2, baseUnary2(iteratee2));
          }
          maxLength = nativeMin(array2.length, maxLength);
          caches[othIndex] = !comparator && (iteratee2 || length >= 120 && array2.length >= 120) ? new SetCache2(othIndex && array2) : undefined$1;
        }
        array2 = arrays2[0];
        var index2 = -1, seen = caches[0];
        outer:
          while (++index2 < length && result2.length < maxLength) {
            var value = array2[index2], computed = iteratee2 ? iteratee2(value) : value;
            value = comparator || value !== 0 ? value : 0;
            if (!(seen ? cacheHas2(seen, computed) : includes2(result2, computed, comparator))) {
              othIndex = othLength;
              while (--othIndex) {
                var cache = caches[othIndex];
                if (!(cache ? cacheHas2(cache, computed) : includes2(arrays2[othIndex], computed, comparator))) {
                  continue outer;
                }
              }
              if (seen) {
                seen.push(computed);
              }
              result2.push(value);
            }
          }
        return result2;
      }
      function baseInverter(object2, setter, iteratee2, accumulator) {
        baseForOwn2(object2, function(value, key, object3) {
          setter(accumulator, iteratee2(value), key, object3);
        });
        return accumulator;
      }
      function baseInvoke(object2, path2, args) {
        path2 = castPath2(path2, object2);
        object2 = parent(object2, path2);
        var func = object2 == null ? object2 : object2[toKey2(last(path2))];
        return func == null ? undefined$1 : apply(func, object2, args);
      }
      function baseIsArguments2(value) {
        return isObjectLike2(value) && baseGetTag2(value) == argsTag2;
      }
      function baseIsArrayBuffer(value) {
        return isObjectLike2(value) && baseGetTag2(value) == arrayBufferTag2;
      }
      function baseIsDate(value) {
        return isObjectLike2(value) && baseGetTag2(value) == dateTag2;
      }
      function baseIsEqual2(value, other, bitmask, customizer, stack) {
        if (value === other) {
          return true;
        }
        if (value == null || other == null || !isObjectLike2(value) && !isObjectLike2(other)) {
          return value !== value && other !== other;
        }
        return baseIsEqualDeep2(value, other, bitmask, customizer, baseIsEqual2, stack);
      }
      function baseIsEqualDeep2(object2, other, bitmask, customizer, equalFunc, stack) {
        var objIsArr = isArray2(object2), othIsArr = isArray2(other), objTag = objIsArr ? arrayTag2 : getTag2(object2), othTag = othIsArr ? arrayTag2 : getTag2(other);
        objTag = objTag == argsTag2 ? objectTag2 : objTag;
        othTag = othTag == argsTag2 ? objectTag2 : othTag;
        var objIsObj = objTag == objectTag2, othIsObj = othTag == objectTag2, isSameTag = objTag == othTag;
        if (isSameTag && isBuffer2(object2)) {
          if (!isBuffer2(other)) {
            return false;
          }
          objIsArr = true;
          objIsObj = false;
        }
        if (isSameTag && !objIsObj) {
          stack || (stack = new Stack2());
          return objIsArr || isTypedArray2(object2) ? equalArrays2(object2, other, bitmask, customizer, equalFunc, stack) : equalByTag2(object2, other, objTag, bitmask, customizer, equalFunc, stack);
        }
        if (!(bitmask & COMPARE_PARTIAL_FLAG2)) {
          var objIsWrapped = objIsObj && hasOwnProperty2.call(object2, "__wrapped__"), othIsWrapped = othIsObj && hasOwnProperty2.call(other, "__wrapped__");
          if (objIsWrapped || othIsWrapped) {
            var objUnwrapped = objIsWrapped ? object2.value() : object2, othUnwrapped = othIsWrapped ? other.value() : other;
            stack || (stack = new Stack2());
            return equalFunc(objUnwrapped, othUnwrapped, bitmask, customizer, stack);
          }
        }
        if (!isSameTag) {
          return false;
        }
        stack || (stack = new Stack2());
        return equalObjects2(object2, other, bitmask, customizer, equalFunc, stack);
      }
      function baseIsMap(value) {
        return isObjectLike2(value) && getTag2(value) == mapTag2;
      }
      function baseIsMatch2(object2, source, matchData, customizer) {
        var index2 = matchData.length, length = index2, noCustomizer = !customizer;
        if (object2 == null) {
          return !length;
        }
        object2 = Object2(object2);
        while (index2--) {
          var data = matchData[index2];
          if (noCustomizer && data[2] ? data[1] !== object2[data[0]] : !(data[0] in object2)) {
            return false;
          }
        }
        while (++index2 < length) {
          data = matchData[index2];
          var key = data[0], objValue = object2[key], srcValue = data[1];
          if (noCustomizer && data[2]) {
            if (objValue === undefined$1 && !(key in object2)) {
              return false;
            }
          } else {
            var stack = new Stack2();
            if (customizer) {
              var result2 = customizer(objValue, srcValue, key, object2, source, stack);
            }
            if (!(result2 === undefined$1 ? baseIsEqual2(srcValue, objValue, COMPARE_PARTIAL_FLAG2 | COMPARE_UNORDERED_FLAG2, customizer, stack) : result2)) {
              return false;
            }
          }
        }
        return true;
      }
      function baseIsNative2(value) {
        if (!isObject2(value) || isMasked2(value)) {
          return false;
        }
        var pattern = isFunction3(value) ? reIsNative2 : reIsHostCtor2;
        return pattern.test(toSource2(value));
      }
      function baseIsRegExp(value) {
        return isObjectLike2(value) && baseGetTag2(value) == regexpTag2;
      }
      function baseIsSet(value) {
        return isObjectLike2(value) && getTag2(value) == setTag2;
      }
      function baseIsTypedArray2(value) {
        return isObjectLike2(value) && isLength2(value.length) && !!typedArrayTags2[baseGetTag2(value)];
      }
      function baseIteratee2(value) {
        if (typeof value == "function") {
          return value;
        }
        if (value == null) {
          return identity2;
        }
        if (typeof value == "object") {
          return isArray2(value) ? baseMatchesProperty2(value[0], value[1]) : baseMatches2(value);
        }
        return property2(value);
      }
      function baseKeys2(object2) {
        if (!isPrototype2(object2)) {
          return nativeKeys2(object2);
        }
        var result2 = [];
        for (var key in Object2(object2)) {
          if (hasOwnProperty2.call(object2, key) && key != "constructor") {
            result2.push(key);
          }
        }
        return result2;
      }
      function baseKeysIn(object2) {
        if (!isObject2(object2)) {
          return nativeKeysIn(object2);
        }
        var isProto = isPrototype2(object2), result2 = [];
        for (var key in object2) {
          if (!(key == "constructor" && (isProto || !hasOwnProperty2.call(object2, key)))) {
            result2.push(key);
          }
        }
        return result2;
      }
      function baseLt(value, other) {
        return value < other;
      }
      function baseMap(collection, iteratee2) {
        var index2 = -1, result2 = isArrayLike2(collection) ? Array2(collection.length) : [];
        baseEach(collection, function(value, key, collection2) {
          result2[++index2] = iteratee2(value, key, collection2);
        });
        return result2;
      }
      function baseMatches2(source) {
        var matchData = getMatchData2(source);
        if (matchData.length == 1 && matchData[0][2]) {
          return matchesStrictComparable2(matchData[0][0], matchData[0][1]);
        }
        return function(object2) {
          return object2 === source || baseIsMatch2(object2, source, matchData);
        };
      }
      function baseMatchesProperty2(path2, srcValue) {
        if (isKey2(path2) && isStrictComparable2(srcValue)) {
          return matchesStrictComparable2(toKey2(path2), srcValue);
        }
        return function(object2) {
          var objValue = get2(object2, path2);
          return objValue === undefined$1 && objValue === srcValue ? hasIn2(object2, path2) : baseIsEqual2(srcValue, objValue, COMPARE_PARTIAL_FLAG2 | COMPARE_UNORDERED_FLAG2);
        };
      }
      function baseMerge(object2, source, srcIndex, customizer, stack) {
        if (object2 === source) {
          return;
        }
        baseFor2(source, function(srcValue, key) {
          stack || (stack = new Stack2());
          if (isObject2(srcValue)) {
            baseMergeDeep(object2, source, key, srcIndex, baseMerge, customizer, stack);
          } else {
            var newValue = customizer ? customizer(safeGet(object2, key), srcValue, key + "", object2, source, stack) : undefined$1;
            if (newValue === undefined$1) {
              newValue = srcValue;
            }
            assignMergeValue(object2, key, newValue);
          }
        }, keysIn);
      }
      function baseMergeDeep(object2, source, key, srcIndex, mergeFunc, customizer, stack) {
        var objValue = safeGet(object2, key), srcValue = safeGet(source, key), stacked = stack.get(srcValue);
        if (stacked) {
          assignMergeValue(object2, key, stacked);
          return;
        }
        var newValue = customizer ? customizer(objValue, srcValue, key + "", object2, source, stack) : undefined$1;
        var isCommon = newValue === undefined$1;
        if (isCommon) {
          var isArr = isArray2(srcValue), isBuff = !isArr && isBuffer2(srcValue), isTyped = !isArr && !isBuff && isTypedArray2(srcValue);
          newValue = srcValue;
          if (isArr || isBuff || isTyped) {
            if (isArray2(objValue)) {
              newValue = objValue;
            } else if (isArrayLikeObject(objValue)) {
              newValue = copyArray(objValue);
            } else if (isBuff) {
              isCommon = false;
              newValue = cloneBuffer(srcValue, true);
            } else if (isTyped) {
              isCommon = false;
              newValue = cloneTypedArray(srcValue, true);
            } else {
              newValue = [];
            }
          } else if (isPlainObject2(srcValue) || isArguments2(srcValue)) {
            newValue = objValue;
            if (isArguments2(objValue)) {
              newValue = toPlainObject(objValue);
            } else if (!isObject2(objValue) || isFunction3(objValue)) {
              newValue = initCloneObject(srcValue);
            }
          } else {
            isCommon = false;
          }
        }
        if (isCommon) {
          stack.set(srcValue, newValue);
          mergeFunc(newValue, srcValue, srcIndex, customizer, stack);
          stack["delete"](srcValue);
        }
        assignMergeValue(object2, key, newValue);
      }
      function baseNth(array2, n) {
        var length = array2.length;
        if (!length) {
          return;
        }
        n += n < 0 ? length : 0;
        return isIndex2(n, length) ? array2[n] : undefined$1;
      }
      function baseOrderBy(collection, iteratees, orders) {
        if (iteratees.length) {
          iteratees = arrayMap2(iteratees, function(iteratee2) {
            if (isArray2(iteratee2)) {
              return function(value) {
                return baseGet2(value, iteratee2.length === 1 ? iteratee2[0] : iteratee2);
              };
            }
            return iteratee2;
          });
        } else {
          iteratees = [identity2];
        }
        var index2 = -1;
        iteratees = arrayMap2(iteratees, baseUnary2(getIteratee()));
        var result2 = baseMap(collection, function(value, key, collection2) {
          var criteria = arrayMap2(iteratees, function(iteratee2) {
            return iteratee2(value);
          });
          return { "criteria": criteria, "index": ++index2, "value": value };
        });
        return baseSortBy(result2, function(object2, other) {
          return compareMultiple(object2, other, orders);
        });
      }
      function basePick(object2, paths) {
        return basePickBy(object2, paths, function(value, path2) {
          return hasIn2(object2, path2);
        });
      }
      function basePickBy(object2, paths, predicate) {
        var index2 = -1, length = paths.length, result2 = {};
        while (++index2 < length) {
          var path2 = paths[index2], value = baseGet2(object2, path2);
          if (predicate(value, path2)) {
            baseSet(result2, castPath2(path2, object2), value);
          }
        }
        return result2;
      }
      function basePropertyDeep2(path2) {
        return function(object2) {
          return baseGet2(object2, path2);
        };
      }
      function basePullAll(array2, values2, iteratee2, comparator) {
        var indexOf2 = comparator ? baseIndexOfWith : baseIndexOf, index2 = -1, length = values2.length, seen = array2;
        if (array2 === values2) {
          values2 = copyArray(values2);
        }
        if (iteratee2) {
          seen = arrayMap2(array2, baseUnary2(iteratee2));
        }
        while (++index2 < length) {
          var fromIndex = 0, value = values2[index2], computed = iteratee2 ? iteratee2(value) : value;
          while ((fromIndex = indexOf2(seen, computed, fromIndex, comparator)) > -1) {
            if (seen !== array2) {
              splice2.call(seen, fromIndex, 1);
            }
            splice2.call(array2, fromIndex, 1);
          }
        }
        return array2;
      }
      function basePullAt(array2, indexes) {
        var length = array2 ? indexes.length : 0, lastIndex = length - 1;
        while (length--) {
          var index2 = indexes[length];
          if (length == lastIndex || index2 !== previous) {
            var previous = index2;
            if (isIndex2(index2)) {
              splice2.call(array2, index2, 1);
            } else {
              baseUnset(array2, index2);
            }
          }
        }
        return array2;
      }
      function baseRandom(lower, upper) {
        return lower + nativeFloor(nativeRandom() * (upper - lower + 1));
      }
      function baseRange(start, end, step, fromRight) {
        var index2 = -1, length = nativeMax(nativeCeil((end - start) / (step || 1)), 0), result2 = Array2(length);
        while (length--) {
          result2[fromRight ? length : ++index2] = start;
          start += step;
        }
        return result2;
      }
      function baseRepeat(string2, n) {
        var result2 = "";
        if (!string2 || n < 1 || n > MAX_SAFE_INTEGER2) {
          return result2;
        }
        do {
          if (n % 2) {
            result2 += string2;
          }
          n = nativeFloor(n / 2);
          if (n) {
            string2 += string2;
          }
        } while (n);
        return result2;
      }
      function baseRest(func, start) {
        return setToString(overRest(func, start, identity2), func + "");
      }
      function baseSample(collection) {
        return arraySample(values(collection));
      }
      function baseSampleSize(collection, n) {
        var array2 = values(collection);
        return shuffleSelf(array2, baseClamp(n, 0, array2.length));
      }
      function baseSet(object2, path2, value, customizer) {
        if (!isObject2(object2)) {
          return object2;
        }
        path2 = castPath2(path2, object2);
        var index2 = -1, length = path2.length, lastIndex = length - 1, nested = object2;
        while (nested != null && ++index2 < length) {
          var key = toKey2(path2[index2]), newValue = value;
          if (key === "__proto__" || key === "constructor" || key === "prototype") {
            return object2;
          }
          if (index2 != lastIndex) {
            var objValue = nested[key];
            newValue = customizer ? customizer(objValue, key, nested) : undefined$1;
            if (newValue === undefined$1) {
              newValue = isObject2(objValue) ? objValue : isIndex2(path2[index2 + 1]) ? [] : {};
            }
          }
          assignValue(nested, key, newValue);
          nested = nested[key];
        }
        return object2;
      }
      var baseSetData = !metaMap ? identity2 : function(func, data) {
        metaMap.set(func, data);
        return func;
      };
      var baseSetToString = !defineProperty2 ? identity2 : function(func, string2) {
        return defineProperty2(func, "toString", {
          "configurable": true,
          "enumerable": false,
          "value": constant(string2),
          "writable": true
        });
      };
      function baseShuffle(collection) {
        return shuffleSelf(values(collection));
      }
      function baseSlice2(array2, start, end) {
        var index2 = -1, length = array2.length;
        if (start < 0) {
          start = -start > length ? 0 : length + start;
        }
        end = end > length ? length : end;
        if (end < 0) {
          end += length;
        }
        length = start > end ? 0 : end - start >>> 0;
        start >>>= 0;
        var result2 = Array2(length);
        while (++index2 < length) {
          result2[index2] = array2[index2 + start];
        }
        return result2;
      }
      function baseSome(collection, predicate) {
        var result2;
        baseEach(collection, function(value, index2, collection2) {
          result2 = predicate(value, index2, collection2);
          return !result2;
        });
        return !!result2;
      }
      function baseSortedIndex(array2, value, retHighest) {
        var low = 0, high = array2 == null ? low : array2.length;
        if (typeof value == "number" && value === value && high <= HALF_MAX_ARRAY_LENGTH) {
          while (low < high) {
            var mid = low + high >>> 1, computed = array2[mid];
            if (computed !== null && !isSymbol2(computed) && (retHighest ? computed <= value : computed < value)) {
              low = mid + 1;
            } else {
              high = mid;
            }
          }
          return high;
        }
        return baseSortedIndexBy(array2, value, identity2, retHighest);
      }
      function baseSortedIndexBy(array2, value, iteratee2, retHighest) {
        var low = 0, high = array2 == null ? 0 : array2.length;
        if (high === 0) {
          return 0;
        }
        value = iteratee2(value);
        var valIsNaN = value !== value, valIsNull = value === null, valIsSymbol = isSymbol2(value), valIsUndefined = value === undefined$1;
        while (low < high) {
          var mid = nativeFloor((low + high) / 2), computed = iteratee2(array2[mid]), othIsDefined = computed !== undefined$1, othIsNull = computed === null, othIsReflexive = computed === computed, othIsSymbol = isSymbol2(computed);
          if (valIsNaN) {
            var setLow = retHighest || othIsReflexive;
          } else if (valIsUndefined) {
            setLow = othIsReflexive && (retHighest || othIsDefined);
          } else if (valIsNull) {
            setLow = othIsReflexive && othIsDefined && (retHighest || !othIsNull);
          } else if (valIsSymbol) {
            setLow = othIsReflexive && othIsDefined && !othIsNull && (retHighest || !othIsSymbol);
          } else if (othIsNull || othIsSymbol) {
            setLow = false;
          } else {
            setLow = retHighest ? computed <= value : computed < value;
          }
          if (setLow) {
            low = mid + 1;
          } else {
            high = mid;
          }
        }
        return nativeMin(high, MAX_ARRAY_INDEX);
      }
      function baseSortedUniq(array2, iteratee2) {
        var index2 = -1, length = array2.length, resIndex = 0, result2 = [];
        while (++index2 < length) {
          var value = array2[index2], computed = iteratee2 ? iteratee2(value) : value;
          if (!index2 || !eq2(computed, seen)) {
            var seen = computed;
            result2[resIndex++] = value === 0 ? 0 : value;
          }
        }
        return result2;
      }
      function baseToNumber(value) {
        if (typeof value == "number") {
          return value;
        }
        if (isSymbol2(value)) {
          return NAN;
        }
        return +value;
      }
      function baseToString2(value) {
        if (typeof value == "string") {
          return value;
        }
        if (isArray2(value)) {
          return arrayMap2(value, baseToString2) + "";
        }
        if (isSymbol2(value)) {
          return symbolToString2 ? symbolToString2.call(value) : "";
        }
        var result2 = value + "";
        return result2 == "0" && 1 / value == -INFINITY ? "-0" : result2;
      }
      function baseUniq(array2, iteratee2, comparator) {
        var index2 = -1, includes2 = arrayIncludes, length = array2.length, isCommon = true, result2 = [], seen = result2;
        if (comparator) {
          isCommon = false;
          includes2 = arrayIncludesWith;
        } else if (length >= LARGE_ARRAY_SIZE2) {
          var set3 = iteratee2 ? null : createSet(array2);
          if (set3) {
            return setToArray2(set3);
          }
          isCommon = false;
          includes2 = cacheHas2;
          seen = new SetCache2();
        } else {
          seen = iteratee2 ? [] : result2;
        }
        outer:
          while (++index2 < length) {
            var value = array2[index2], computed = iteratee2 ? iteratee2(value) : value;
            value = comparator || value !== 0 ? value : 0;
            if (isCommon && computed === computed) {
              var seenIndex = seen.length;
              while (seenIndex--) {
                if (seen[seenIndex] === computed) {
                  continue outer;
                }
              }
              if (iteratee2) {
                seen.push(computed);
              }
              result2.push(value);
            } else if (!includes2(seen, computed, comparator)) {
              if (seen !== result2) {
                seen.push(computed);
              }
              result2.push(value);
            }
          }
        return result2;
      }
      function baseUnset(object2, path2) {
        path2 = castPath2(path2, object2);
        object2 = parent(object2, path2);
        return object2 == null || delete object2[toKey2(last(path2))];
      }
      function baseUpdate(object2, path2, updater, customizer) {
        return baseSet(object2, path2, updater(baseGet2(object2, path2)), customizer);
      }
      function baseWhile(array2, predicate, isDrop, fromRight) {
        var length = array2.length, index2 = fromRight ? length : -1;
        while ((fromRight ? index2-- : ++index2 < length) && predicate(array2[index2], index2, array2)) {
        }
        return isDrop ? baseSlice2(array2, fromRight ? 0 : index2, fromRight ? index2 + 1 : length) : baseSlice2(array2, fromRight ? index2 + 1 : 0, fromRight ? length : index2);
      }
      function baseWrapperValue(value, actions) {
        var result2 = value;
        if (result2 instanceof LazyWrapper) {
          result2 = result2.value();
        }
        return arrayReduce2(actions, function(result3, action) {
          return action.func.apply(action.thisArg, arrayPush2([result3], action.args));
        }, result2);
      }
      function baseXor(arrays2, iteratee2, comparator) {
        var length = arrays2.length;
        if (length < 2) {
          return length ? baseUniq(arrays2[0]) : [];
        }
        var index2 = -1, result2 = Array2(length);
        while (++index2 < length) {
          var array2 = arrays2[index2], othIndex = -1;
          while (++othIndex < length) {
            if (othIndex != index2) {
              result2[index2] = baseDifference(result2[index2] || array2, arrays2[othIndex], iteratee2, comparator);
            }
          }
        }
        return baseUniq(baseFlatten(result2, 1), iteratee2, comparator);
      }
      function baseZipObject(props, values2, assignFunc) {
        var index2 = -1, length = props.length, valsLength = values2.length, result2 = {};
        while (++index2 < length) {
          var value = index2 < valsLength ? values2[index2] : undefined$1;
          assignFunc(result2, props[index2], value);
        }
        return result2;
      }
      function castArrayLikeObject(value) {
        return isArrayLikeObject(value) ? value : [];
      }
      function castFunction(value) {
        return typeof value == "function" ? value : identity2;
      }
      function castPath2(value, object2) {
        if (isArray2(value)) {
          return value;
        }
        return isKey2(value, object2) ? [value] : stringToPath2(toString4(value));
      }
      var castRest = baseRest;
      function castSlice2(array2, start, end) {
        var length = array2.length;
        end = end === undefined$1 ? length : end;
        return !start && end >= length ? array2 : baseSlice2(array2, start, end);
      }
      var clearTimeout2 = ctxClearTimeout || function(id) {
        return root2.clearTimeout(id);
      };
      function cloneBuffer(buffer, isDeep) {
        if (isDeep) {
          return buffer.slice();
        }
        var length = buffer.length, result2 = allocUnsafe ? allocUnsafe(length) : new buffer.constructor(length);
        buffer.copy(result2);
        return result2;
      }
      function cloneArrayBuffer(arrayBuffer) {
        var result2 = new arrayBuffer.constructor(arrayBuffer.byteLength);
        new Uint8Array2(result2).set(new Uint8Array2(arrayBuffer));
        return result2;
      }
      function cloneDataView(dataView, isDeep) {
        var buffer = isDeep ? cloneArrayBuffer(dataView.buffer) : dataView.buffer;
        return new dataView.constructor(buffer, dataView.byteOffset, dataView.byteLength);
      }
      function cloneRegExp(regexp2) {
        var result2 = new regexp2.constructor(regexp2.source, reFlags.exec(regexp2));
        result2.lastIndex = regexp2.lastIndex;
        return result2;
      }
      function cloneSymbol(symbol) {
        return symbolValueOf2 ? Object2(symbolValueOf2.call(symbol)) : {};
      }
      function cloneTypedArray(typedArray, isDeep) {
        var buffer = isDeep ? cloneArrayBuffer(typedArray.buffer) : typedArray.buffer;
        return new typedArray.constructor(buffer, typedArray.byteOffset, typedArray.length);
      }
      function compareAscending(value, other) {
        if (value !== other) {
          var valIsDefined = value !== undefined$1, valIsNull = value === null, valIsReflexive = value === value, valIsSymbol = isSymbol2(value);
          var othIsDefined = other !== undefined$1, othIsNull = other === null, othIsReflexive = other === other, othIsSymbol = isSymbol2(other);
          if (!othIsNull && !othIsSymbol && !valIsSymbol && value > other || valIsSymbol && othIsDefined && othIsReflexive && !othIsNull && !othIsSymbol || valIsNull && othIsDefined && othIsReflexive || !valIsDefined && othIsReflexive || !valIsReflexive) {
            return 1;
          }
          if (!valIsNull && !valIsSymbol && !othIsSymbol && value < other || othIsSymbol && valIsDefined && valIsReflexive && !valIsNull && !valIsSymbol || othIsNull && valIsDefined && valIsReflexive || !othIsDefined && valIsReflexive || !othIsReflexive) {
            return -1;
          }
        }
        return 0;
      }
      function compareMultiple(object2, other, orders) {
        var index2 = -1, objCriteria = object2.criteria, othCriteria = other.criteria, length = objCriteria.length, ordersLength = orders.length;
        while (++index2 < length) {
          var result2 = compareAscending(objCriteria[index2], othCriteria[index2]);
          if (result2) {
            if (index2 >= ordersLength) {
              return result2;
            }
            var order = orders[index2];
            return result2 * (order == "desc" ? -1 : 1);
          }
        }
        return object2.index - other.index;
      }
      function composeArgs(args, partials, holders, isCurried) {
        var argsIndex = -1, argsLength = args.length, holdersLength = holders.length, leftIndex = -1, leftLength = partials.length, rangeLength = nativeMax(argsLength - holdersLength, 0), result2 = Array2(leftLength + rangeLength), isUncurried = !isCurried;
        while (++leftIndex < leftLength) {
          result2[leftIndex] = partials[leftIndex];
        }
        while (++argsIndex < holdersLength) {
          if (isUncurried || argsIndex < argsLength) {
            result2[holders[argsIndex]] = args[argsIndex];
          }
        }
        while (rangeLength--) {
          result2[leftIndex++] = args[argsIndex++];
        }
        return result2;
      }
      function composeArgsRight(args, partials, holders, isCurried) {
        var argsIndex = -1, argsLength = args.length, holdersIndex = -1, holdersLength = holders.length, rightIndex = -1, rightLength = partials.length, rangeLength = nativeMax(argsLength - holdersLength, 0), result2 = Array2(rangeLength + rightLength), isUncurried = !isCurried;
        while (++argsIndex < rangeLength) {
          result2[argsIndex] = args[argsIndex];
        }
        var offset = argsIndex;
        while (++rightIndex < rightLength) {
          result2[offset + rightIndex] = partials[rightIndex];
        }
        while (++holdersIndex < holdersLength) {
          if (isUncurried || argsIndex < argsLength) {
            result2[offset + holders[holdersIndex]] = args[argsIndex++];
          }
        }
        return result2;
      }
      function copyArray(source, array2) {
        var index2 = -1, length = source.length;
        array2 || (array2 = Array2(length));
        while (++index2 < length) {
          array2[index2] = source[index2];
        }
        return array2;
      }
      function copyObject(source, props, object2, customizer) {
        var isNew = !object2;
        object2 || (object2 = {});
        var index2 = -1, length = props.length;
        while (++index2 < length) {
          var key = props[index2];
          var newValue = customizer ? customizer(object2[key], source[key], key, object2, source) : undefined$1;
          if (newValue === undefined$1) {
            newValue = source[key];
          }
          if (isNew) {
            baseAssignValue2(object2, key, newValue);
          } else {
            assignValue(object2, key, newValue);
          }
        }
        return object2;
      }
      function copySymbols(source, object2) {
        return copyObject(source, getSymbols2(source), object2);
      }
      function copySymbolsIn(source, object2) {
        return copyObject(source, getSymbolsIn(source), object2);
      }
      function createAggregator(setter, initializer) {
        return function(collection, iteratee2) {
          var func = isArray2(collection) ? arrayAggregator : baseAggregator, accumulator = initializer ? initializer() : {};
          return func(collection, setter, getIteratee(iteratee2, 2), accumulator);
        };
      }
      function createAssigner(assigner) {
        return baseRest(function(object2, sources) {
          var index2 = -1, length = sources.length, customizer = length > 1 ? sources[length - 1] : undefined$1, guard = length > 2 ? sources[2] : undefined$1;
          customizer = assigner.length > 3 && typeof customizer == "function" ? (length--, customizer) : undefined$1;
          if (guard && isIterateeCall(sources[0], sources[1], guard)) {
            customizer = length < 3 ? undefined$1 : customizer;
            length = 1;
          }
          object2 = Object2(object2);
          while (++index2 < length) {
            var source = sources[index2];
            if (source) {
              assigner(object2, source, index2, customizer);
            }
          }
          return object2;
        });
      }
      function createBaseEach(eachFunc, fromRight) {
        return function(collection, iteratee2) {
          if (collection == null) {
            return collection;
          }
          if (!isArrayLike2(collection)) {
            return eachFunc(collection, iteratee2);
          }
          var length = collection.length, index2 = fromRight ? length : -1, iterable = Object2(collection);
          while (fromRight ? index2-- : ++index2 < length) {
            if (iteratee2(iterable[index2], index2, iterable) === false) {
              break;
            }
          }
          return collection;
        };
      }
      function createBaseFor2(fromRight) {
        return function(object2, iteratee2, keysFunc) {
          var index2 = -1, iterable = Object2(object2), props = keysFunc(object2), length = props.length;
          while (length--) {
            var key = props[fromRight ? length : ++index2];
            if (iteratee2(iterable[key], key, iterable) === false) {
              break;
            }
          }
          return object2;
        };
      }
      function createBind(func, bitmask, thisArg) {
        var isBind = bitmask & WRAP_BIND_FLAG, Ctor = createCtor(func);
        function wrapper() {
          var fn = this && this !== root2 && this instanceof wrapper ? Ctor : func;
          return fn.apply(isBind ? thisArg : this, arguments);
        }
        return wrapper;
      }
      function createCaseFirst2(methodName) {
        return function(string2) {
          string2 = toString4(string2);
          var strSymbols = hasUnicode2(string2) ? stringToArray2(string2) : undefined$1;
          var chr = strSymbols ? strSymbols[0] : string2.charAt(0);
          var trailing = strSymbols ? castSlice2(strSymbols, 1).join("") : string2.slice(1);
          return chr[methodName]() + trailing;
        };
      }
      function createCompounder2(callback) {
        return function(string2) {
          return arrayReduce2(words2(deburr2(string2).replace(reApos2, "")), callback, "");
        };
      }
      function createCtor(Ctor) {
        return function() {
          var args = arguments;
          switch (args.length) {
            case 0:
              return new Ctor();
            case 1:
              return new Ctor(args[0]);
            case 2:
              return new Ctor(args[0], args[1]);
            case 3:
              return new Ctor(args[0], args[1], args[2]);
            case 4:
              return new Ctor(args[0], args[1], args[2], args[3]);
            case 5:
              return new Ctor(args[0], args[1], args[2], args[3], args[4]);
            case 6:
              return new Ctor(args[0], args[1], args[2], args[3], args[4], args[5]);
            case 7:
              return new Ctor(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
          }
          var thisBinding = baseCreate(Ctor.prototype), result2 = Ctor.apply(thisBinding, args);
          return isObject2(result2) ? result2 : thisBinding;
        };
      }
      function createCurry(func, bitmask, arity) {
        var Ctor = createCtor(func);
        function wrapper() {
          var length = arguments.length, args = Array2(length), index2 = length, placeholder2 = getHolder(wrapper);
          while (index2--) {
            args[index2] = arguments[index2];
          }
          var holders = length < 3 && args[0] !== placeholder2 && args[length - 1] !== placeholder2 ? [] : replaceHolders(args, placeholder2);
          length -= holders.length;
          if (length < arity) {
            return createRecurry(
              func,
              bitmask,
              createHybrid,
              wrapper.placeholder,
              undefined$1,
              args,
              holders,
              undefined$1,
              undefined$1,
              arity - length
            );
          }
          var fn = this && this !== root2 && this instanceof wrapper ? Ctor : func;
          return apply(fn, this, args);
        }
        return wrapper;
      }
      function createFind(findIndexFunc) {
        return function(collection, predicate, fromIndex) {
          var iterable = Object2(collection);
          if (!isArrayLike2(collection)) {
            var iteratee2 = getIteratee(predicate, 3);
            collection = keys2(collection);
            predicate = function(key) {
              return iteratee2(iterable[key], key, iterable);
            };
          }
          var index2 = findIndexFunc(collection, predicate, fromIndex);
          return index2 > -1 ? iterable[iteratee2 ? collection[index2] : index2] : undefined$1;
        };
      }
      function createFlow(fromRight) {
        return flatRest(function(funcs) {
          var length = funcs.length, index2 = length, prereq = LodashWrapper.prototype.thru;
          if (fromRight) {
            funcs.reverse();
          }
          while (index2--) {
            var func = funcs[index2];
            if (typeof func != "function") {
              throw new TypeError2(FUNC_ERROR_TEXT2);
            }
            if (prereq && !wrapper && getFuncName(func) == "wrapper") {
              var wrapper = new LodashWrapper([], true);
            }
          }
          index2 = wrapper ? index2 : length;
          while (++index2 < length) {
            func = funcs[index2];
            var funcName = getFuncName(func), data = funcName == "wrapper" ? getData(func) : undefined$1;
            if (data && isLaziable(data[0]) && data[1] == (WRAP_ARY_FLAG | WRAP_CURRY_FLAG | WRAP_PARTIAL_FLAG | WRAP_REARG_FLAG) && !data[4].length && data[9] == 1) {
              wrapper = wrapper[getFuncName(data[0])].apply(wrapper, data[3]);
            } else {
              wrapper = func.length == 1 && isLaziable(func) ? wrapper[funcName]() : wrapper.thru(func);
            }
          }
          return function() {
            var args = arguments, value = args[0];
            if (wrapper && args.length == 1 && isArray2(value)) {
              return wrapper.plant(value).value();
            }
            var index3 = 0, result2 = length ? funcs[index3].apply(this, args) : value;
            while (++index3 < length) {
              result2 = funcs[index3].call(this, result2);
            }
            return result2;
          };
        });
      }
      function createHybrid(func, bitmask, thisArg, partials, holders, partialsRight, holdersRight, argPos, ary2, arity) {
        var isAry = bitmask & WRAP_ARY_FLAG, isBind = bitmask & WRAP_BIND_FLAG, isBindKey = bitmask & WRAP_BIND_KEY_FLAG, isCurried = bitmask & (WRAP_CURRY_FLAG | WRAP_CURRY_RIGHT_FLAG), isFlip = bitmask & WRAP_FLIP_FLAG, Ctor = isBindKey ? undefined$1 : createCtor(func);
        function wrapper() {
          var length = arguments.length, args = Array2(length), index2 = length;
          while (index2--) {
            args[index2] = arguments[index2];
          }
          if (isCurried) {
            var placeholder2 = getHolder(wrapper), holdersCount = countHolders(args, placeholder2);
          }
          if (partials) {
            args = composeArgs(args, partials, holders, isCurried);
          }
          if (partialsRight) {
            args = composeArgsRight(args, partialsRight, holdersRight, isCurried);
          }
          length -= holdersCount;
          if (isCurried && length < arity) {
            var newHolders = replaceHolders(args, placeholder2);
            return createRecurry(
              func,
              bitmask,
              createHybrid,
              wrapper.placeholder,
              thisArg,
              args,
              newHolders,
              argPos,
              ary2,
              arity - length
            );
          }
          var thisBinding = isBind ? thisArg : this, fn = isBindKey ? thisBinding[func] : func;
          length = args.length;
          if (argPos) {
            args = reorder(args, argPos);
          } else if (isFlip && length > 1) {
            args.reverse();
          }
          if (isAry && ary2 < length) {
            args.length = ary2;
          }
          if (this && this !== root2 && this instanceof wrapper) {
            fn = Ctor || createCtor(fn);
          }
          return fn.apply(thisBinding, args);
        }
        return wrapper;
      }
      function createInverter(setter, toIteratee) {
        return function(object2, iteratee2) {
          return baseInverter(object2, setter, toIteratee(iteratee2), {});
        };
      }
      function createMathOperation(operator, defaultValue) {
        return function(value, other) {
          var result2;
          if (value === undefined$1 && other === undefined$1) {
            return defaultValue;
          }
          if (value !== undefined$1) {
            result2 = value;
          }
          if (other !== undefined$1) {
            if (result2 === undefined$1) {
              return other;
            }
            if (typeof value == "string" || typeof other == "string") {
              value = baseToString2(value);
              other = baseToString2(other);
            } else {
              value = baseToNumber(value);
              other = baseToNumber(other);
            }
            result2 = operator(value, other);
          }
          return result2;
        };
      }
      function createOver(arrayFunc) {
        return flatRest(function(iteratees) {
          iteratees = arrayMap2(iteratees, baseUnary2(getIteratee()));
          return baseRest(function(args) {
            var thisArg = this;
            return arrayFunc(iteratees, function(iteratee2) {
              return apply(iteratee2, thisArg, args);
            });
          });
        });
      }
      function createPadding(length, chars) {
        chars = chars === undefined$1 ? " " : baseToString2(chars);
        var charsLength = chars.length;
        if (charsLength < 2) {
          return charsLength ? baseRepeat(chars, length) : chars;
        }
        var result2 = baseRepeat(chars, nativeCeil(length / stringSize(chars)));
        return hasUnicode2(chars) ? castSlice2(stringToArray2(result2), 0, length).join("") : result2.slice(0, length);
      }
      function createPartial(func, bitmask, thisArg, partials) {
        var isBind = bitmask & WRAP_BIND_FLAG, Ctor = createCtor(func);
        function wrapper() {
          var argsIndex = -1, argsLength = arguments.length, leftIndex = -1, leftLength = partials.length, args = Array2(leftLength + argsLength), fn = this && this !== root2 && this instanceof wrapper ? Ctor : func;
          while (++leftIndex < leftLength) {
            args[leftIndex] = partials[leftIndex];
          }
          while (argsLength--) {
            args[leftIndex++] = arguments[++argsIndex];
          }
          return apply(fn, isBind ? thisArg : this, args);
        }
        return wrapper;
      }
      function createRange(fromRight) {
        return function(start, end, step) {
          if (step && typeof step != "number" && isIterateeCall(start, end, step)) {
            end = step = undefined$1;
          }
          start = toFinite(start);
          if (end === undefined$1) {
            end = start;
            start = 0;
          } else {
            end = toFinite(end);
          }
          step = step === undefined$1 ? start < end ? 1 : -1 : toFinite(step);
          return baseRange(start, end, step, fromRight);
        };
      }
      function createRelationalOperation(operator) {
        return function(value, other) {
          if (!(typeof value == "string" && typeof other == "string")) {
            value = toNumber(value);
            other = toNumber(other);
          }
          return operator(value, other);
        };
      }
      function createRecurry(func, bitmask, wrapFunc, placeholder2, thisArg, partials, holders, argPos, ary2, arity) {
        var isCurry = bitmask & WRAP_CURRY_FLAG, newHolders = isCurry ? holders : undefined$1, newHoldersRight = isCurry ? undefined$1 : holders, newPartials = isCurry ? partials : undefined$1, newPartialsRight = isCurry ? undefined$1 : partials;
        bitmask |= isCurry ? WRAP_PARTIAL_FLAG : WRAP_PARTIAL_RIGHT_FLAG;
        bitmask &= ~(isCurry ? WRAP_PARTIAL_RIGHT_FLAG : WRAP_PARTIAL_FLAG);
        if (!(bitmask & WRAP_CURRY_BOUND_FLAG)) {
          bitmask &= -4;
        }
        var newData = [
          func,
          bitmask,
          thisArg,
          newPartials,
          newHolders,
          newPartialsRight,
          newHoldersRight,
          argPos,
          ary2,
          arity
        ];
        var result2 = wrapFunc.apply(undefined$1, newData);
        if (isLaziable(func)) {
          setData(result2, newData);
        }
        result2.placeholder = placeholder2;
        return setWrapToString(result2, func, bitmask);
      }
      function createRound(methodName) {
        var func = Math2[methodName];
        return function(number2, precision) {
          number2 = toNumber(number2);
          precision = precision == null ? 0 : nativeMin(toInteger(precision), 292);
          if (precision && nativeIsFinite(number2)) {
            var pair = (toString4(number2) + "e").split("e"), value = func(pair[0] + "e" + (+pair[1] + precision));
            pair = (toString4(value) + "e").split("e");
            return +(pair[0] + "e" + (+pair[1] - precision));
          }
          return func(number2);
        };
      }
      var createSet = !(Set2 && 1 / setToArray2(new Set2([, -0]))[1] == INFINITY) ? noop2 : function(values2) {
        return new Set2(values2);
      };
      function createToPairs(keysFunc) {
        return function(object2) {
          var tag = getTag2(object2);
          if (tag == mapTag2) {
            return mapToArray2(object2);
          }
          if (tag == setTag2) {
            return setToPairs(object2);
          }
          return baseToPairs(object2, keysFunc(object2));
        };
      }
      function createWrap(func, bitmask, thisArg, partials, holders, argPos, ary2, arity) {
        var isBindKey = bitmask & WRAP_BIND_KEY_FLAG;
        if (!isBindKey && typeof func != "function") {
          throw new TypeError2(FUNC_ERROR_TEXT2);
        }
        var length = partials ? partials.length : 0;
        if (!length) {
          bitmask &= -97;
          partials = holders = undefined$1;
        }
        ary2 = ary2 === undefined$1 ? ary2 : nativeMax(toInteger(ary2), 0);
        arity = arity === undefined$1 ? arity : toInteger(arity);
        length -= holders ? holders.length : 0;
        if (bitmask & WRAP_PARTIAL_RIGHT_FLAG) {
          var partialsRight = partials, holdersRight = holders;
          partials = holders = undefined$1;
        }
        var data = isBindKey ? undefined$1 : getData(func);
        var newData = [
          func,
          bitmask,
          thisArg,
          partials,
          holders,
          partialsRight,
          holdersRight,
          argPos,
          ary2,
          arity
        ];
        if (data) {
          mergeData(newData, data);
        }
        func = newData[0];
        bitmask = newData[1];
        thisArg = newData[2];
        partials = newData[3];
        holders = newData[4];
        arity = newData[9] = newData[9] === undefined$1 ? isBindKey ? 0 : func.length : nativeMax(newData[9] - length, 0);
        if (!arity && bitmask & (WRAP_CURRY_FLAG | WRAP_CURRY_RIGHT_FLAG)) {
          bitmask &= -25;
        }
        if (!bitmask || bitmask == WRAP_BIND_FLAG) {
          var result2 = createBind(func, bitmask, thisArg);
        } else if (bitmask == WRAP_CURRY_FLAG || bitmask == WRAP_CURRY_RIGHT_FLAG) {
          result2 = createCurry(func, bitmask, arity);
        } else if ((bitmask == WRAP_PARTIAL_FLAG || bitmask == (WRAP_BIND_FLAG | WRAP_PARTIAL_FLAG)) && !holders.length) {
          result2 = createPartial(func, bitmask, thisArg, partials);
        } else {
          result2 = createHybrid.apply(undefined$1, newData);
        }
        var setter = data ? baseSetData : setData;
        return setWrapToString(setter(result2, newData), func, bitmask);
      }
      function customDefaultsAssignIn(objValue, srcValue, key, object2) {
        if (objValue === undefined$1 || eq2(objValue, objectProto2[key]) && !hasOwnProperty2.call(object2, key)) {
          return srcValue;
        }
        return objValue;
      }
      function customDefaultsMerge(objValue, srcValue, key, object2, source, stack) {
        if (isObject2(objValue) && isObject2(srcValue)) {
          stack.set(srcValue, objValue);
          baseMerge(objValue, srcValue, undefined$1, customDefaultsMerge, stack);
          stack["delete"](srcValue);
        }
        return objValue;
      }
      function customOmitClone(value) {
        return isPlainObject2(value) ? undefined$1 : value;
      }
      function equalArrays2(array2, other, bitmask, customizer, equalFunc, stack) {
        var isPartial = bitmask & COMPARE_PARTIAL_FLAG2, arrLength = array2.length, othLength = other.length;
        if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
          return false;
        }
        var arrStacked = stack.get(array2);
        var othStacked = stack.get(other);
        if (arrStacked && othStacked) {
          return arrStacked == other && othStacked == array2;
        }
        var index2 = -1, result2 = true, seen = bitmask & COMPARE_UNORDERED_FLAG2 ? new SetCache2() : undefined$1;
        stack.set(array2, other);
        stack.set(other, array2);
        while (++index2 < arrLength) {
          var arrValue = array2[index2], othValue = other[index2];
          if (customizer) {
            var compared = isPartial ? customizer(othValue, arrValue, index2, other, array2, stack) : customizer(arrValue, othValue, index2, array2, other, stack);
          }
          if (compared !== undefined$1) {
            if (compared) {
              continue;
            }
            result2 = false;
            break;
          }
          if (seen) {
            if (!arraySome2(other, function(othValue2, othIndex) {
              if (!cacheHas2(seen, othIndex) && (arrValue === othValue2 || equalFunc(arrValue, othValue2, bitmask, customizer, stack))) {
                return seen.push(othIndex);
              }
            })) {
              result2 = false;
              break;
            }
          } else if (!(arrValue === othValue || equalFunc(arrValue, othValue, bitmask, customizer, stack))) {
            result2 = false;
            break;
          }
        }
        stack["delete"](array2);
        stack["delete"](other);
        return result2;
      }
      function equalByTag2(object2, other, tag, bitmask, customizer, equalFunc, stack) {
        switch (tag) {
          case dataViewTag2:
            if (object2.byteLength != other.byteLength || object2.byteOffset != other.byteOffset) {
              return false;
            }
            object2 = object2.buffer;
            other = other.buffer;
          case arrayBufferTag2:
            if (object2.byteLength != other.byteLength || !equalFunc(new Uint8Array2(object2), new Uint8Array2(other))) {
              return false;
            }
            return true;
          case boolTag2:
          case dateTag2:
          case numberTag2:
            return eq2(+object2, +other);
          case errorTag2:
            return object2.name == other.name && object2.message == other.message;
          case regexpTag2:
          case stringTag2:
            return object2 == other + "";
          case mapTag2:
            var convert = mapToArray2;
          case setTag2:
            var isPartial = bitmask & COMPARE_PARTIAL_FLAG2;
            convert || (convert = setToArray2);
            if (object2.size != other.size && !isPartial) {
              return false;
            }
            var stacked = stack.get(object2);
            if (stacked) {
              return stacked == other;
            }
            bitmask |= COMPARE_UNORDERED_FLAG2;
            stack.set(object2, other);
            var result2 = equalArrays2(convert(object2), convert(other), bitmask, customizer, equalFunc, stack);
            stack["delete"](object2);
            return result2;
          case symbolTag2:
            if (symbolValueOf2) {
              return symbolValueOf2.call(object2) == symbolValueOf2.call(other);
            }
        }
        return false;
      }
      function equalObjects2(object2, other, bitmask, customizer, equalFunc, stack) {
        var isPartial = bitmask & COMPARE_PARTIAL_FLAG2, objProps = getAllKeys2(object2), objLength = objProps.length, othProps = getAllKeys2(other), othLength = othProps.length;
        if (objLength != othLength && !isPartial) {
          return false;
        }
        var index2 = objLength;
        while (index2--) {
          var key = objProps[index2];
          if (!(isPartial ? key in other : hasOwnProperty2.call(other, key))) {
            return false;
          }
        }
        var objStacked = stack.get(object2);
        var othStacked = stack.get(other);
        if (objStacked && othStacked) {
          return objStacked == other && othStacked == object2;
        }
        var result2 = true;
        stack.set(object2, other);
        stack.set(other, object2);
        var skipCtor = isPartial;
        while (++index2 < objLength) {
          key = objProps[index2];
          var objValue = object2[key], othValue = other[key];
          if (customizer) {
            var compared = isPartial ? customizer(othValue, objValue, key, other, object2, stack) : customizer(objValue, othValue, key, object2, other, stack);
          }
          if (!(compared === undefined$1 ? objValue === othValue || equalFunc(objValue, othValue, bitmask, customizer, stack) : compared)) {
            result2 = false;
            break;
          }
          skipCtor || (skipCtor = key == "constructor");
        }
        if (result2 && !skipCtor) {
          var objCtor = object2.constructor, othCtor = other.constructor;
          if (objCtor != othCtor && ("constructor" in object2 && "constructor" in other) && !(typeof objCtor == "function" && objCtor instanceof objCtor && typeof othCtor == "function" && othCtor instanceof othCtor)) {
            result2 = false;
          }
        }
        stack["delete"](object2);
        stack["delete"](other);
        return result2;
      }
      function flatRest(func) {
        return setToString(overRest(func, undefined$1, flatten), func + "");
      }
      function getAllKeys2(object2) {
        return baseGetAllKeys2(object2, keys2, getSymbols2);
      }
      function getAllKeysIn(object2) {
        return baseGetAllKeys2(object2, keysIn, getSymbolsIn);
      }
      var getData = !metaMap ? noop2 : function(func) {
        return metaMap.get(func);
      };
      function getFuncName(func) {
        var result2 = func.name + "", array2 = realNames[result2], length = hasOwnProperty2.call(realNames, result2) ? array2.length : 0;
        while (length--) {
          var data = array2[length], otherFunc = data.func;
          if (otherFunc == null || otherFunc == func) {
            return data.name;
          }
        }
        return result2;
      }
      function getHolder(func) {
        var object2 = hasOwnProperty2.call(lodash2, "placeholder") ? lodash2 : func;
        return object2.placeholder;
      }
      function getIteratee() {
        var result2 = lodash2.iteratee || iteratee;
        result2 = result2 === iteratee ? baseIteratee2 : result2;
        return arguments.length ? result2(arguments[0], arguments[1]) : result2;
      }
      function getMapData2(map3, key) {
        var data = map3.__data__;
        return isKeyable2(key) ? data[typeof key == "string" ? "string" : "hash"] : data.map;
      }
      function getMatchData2(object2) {
        var result2 = keys2(object2), length = result2.length;
        while (length--) {
          var key = result2[length], value = object2[key];
          result2[length] = [key, value, isStrictComparable2(value)];
        }
        return result2;
      }
      function getNative2(object2, key) {
        var value = getValue2(object2, key);
        return baseIsNative2(value) ? value : undefined$1;
      }
      function getRawTag2(value) {
        var isOwn = hasOwnProperty2.call(value, symToStringTag2), tag = value[symToStringTag2];
        try {
          value[symToStringTag2] = undefined$1;
          var unmasked = true;
        } catch (e) {
        }
        var result2 = nativeObjectToString2.call(value);
        if (unmasked) {
          if (isOwn) {
            value[symToStringTag2] = tag;
          } else {
            delete value[symToStringTag2];
          }
        }
        return result2;
      }
      var getSymbols2 = !nativeGetSymbols2 ? stubArray2 : function(object2) {
        if (object2 == null) {
          return [];
        }
        object2 = Object2(object2);
        return arrayFilter2(nativeGetSymbols2(object2), function(symbol) {
          return propertyIsEnumerable2.call(object2, symbol);
        });
      };
      var getSymbolsIn = !nativeGetSymbols2 ? stubArray2 : function(object2) {
        var result2 = [];
        while (object2) {
          arrayPush2(result2, getSymbols2(object2));
          object2 = getPrototype(object2);
        }
        return result2;
      };
      var getTag2 = baseGetTag2;
      if (DataView2 && getTag2(new DataView2(new ArrayBuffer(1))) != dataViewTag2 || Map2 && getTag2(new Map2()) != mapTag2 || Promise2 && getTag2(Promise2.resolve()) != promiseTag2 || Set2 && getTag2(new Set2()) != setTag2 || WeakMap2 && getTag2(new WeakMap2()) != weakMapTag2) {
        getTag2 = function(value) {
          var result2 = baseGetTag2(value), Ctor = result2 == objectTag2 ? value.constructor : undefined$1, ctorString = Ctor ? toSource2(Ctor) : "";
          if (ctorString) {
            switch (ctorString) {
              case dataViewCtorString2:
                return dataViewTag2;
              case mapCtorString2:
                return mapTag2;
              case promiseCtorString2:
                return promiseTag2;
              case setCtorString2:
                return setTag2;
              case weakMapCtorString2:
                return weakMapTag2;
            }
          }
          return result2;
        };
      }
      function getView(start, end, transforms) {
        var index2 = -1, length = transforms.length;
        while (++index2 < length) {
          var data = transforms[index2], size2 = data.size;
          switch (data.type) {
            case "drop":
              start += size2;
              break;
            case "dropRight":
              end -= size2;
              break;
            case "take":
              end = nativeMin(end, start + size2);
              break;
            case "takeRight":
              start = nativeMax(start, end - size2);
              break;
          }
        }
        return { "start": start, "end": end };
      }
      function getWrapDetails(source) {
        var match = source.match(reWrapDetails);
        return match ? match[1].split(reSplitDetails) : [];
      }
      function hasPath2(object2, path2, hasFunc) {
        path2 = castPath2(path2, object2);
        var index2 = -1, length = path2.length, result2 = false;
        while (++index2 < length) {
          var key = toKey2(path2[index2]);
          if (!(result2 = object2 != null && hasFunc(object2, key))) {
            break;
          }
          object2 = object2[key];
        }
        if (result2 || ++index2 != length) {
          return result2;
        }
        length = object2 == null ? 0 : object2.length;
        return !!length && isLength2(length) && isIndex2(key, length) && (isArray2(object2) || isArguments2(object2));
      }
      function initCloneArray(array2) {
        var length = array2.length, result2 = new array2.constructor(length);
        if (length && typeof array2[0] == "string" && hasOwnProperty2.call(array2, "index")) {
          result2.index = array2.index;
          result2.input = array2.input;
        }
        return result2;
      }
      function initCloneObject(object2) {
        return typeof object2.constructor == "function" && !isPrototype2(object2) ? baseCreate(getPrototype(object2)) : {};
      }
      function initCloneByTag(object2, tag, isDeep) {
        var Ctor = object2.constructor;
        switch (tag) {
          case arrayBufferTag2:
            return cloneArrayBuffer(object2);
          case boolTag2:
          case dateTag2:
            return new Ctor(+object2);
          case dataViewTag2:
            return cloneDataView(object2, isDeep);
          case float32Tag2:
          case float64Tag2:
          case int8Tag2:
          case int16Tag2:
          case int32Tag2:
          case uint8Tag2:
          case uint8ClampedTag2:
          case uint16Tag2:
          case uint32Tag2:
            return cloneTypedArray(object2, isDeep);
          case mapTag2:
            return new Ctor();
          case numberTag2:
          case stringTag2:
            return new Ctor(object2);
          case regexpTag2:
            return cloneRegExp(object2);
          case setTag2:
            return new Ctor();
          case symbolTag2:
            return cloneSymbol(object2);
        }
      }
      function insertWrapDetails(source, details) {
        var length = details.length;
        if (!length) {
          return source;
        }
        var lastIndex = length - 1;
        details[lastIndex] = (length > 1 ? "& " : "") + details[lastIndex];
        details = details.join(length > 2 ? ", " : " ");
        return source.replace(reWrapComment, "{\n/* [wrapped with " + details + "] */\n");
      }
      function isFlattenable(value) {
        return isArray2(value) || isArguments2(value) || !!(spreadableSymbol && value && value[spreadableSymbol]);
      }
      function isIndex2(value, length) {
        var type2 = typeof value;
        length = length == null ? MAX_SAFE_INTEGER2 : length;
        return !!length && (type2 == "number" || type2 != "symbol" && reIsUint2.test(value)) && (value > -1 && value % 1 == 0 && value < length);
      }
      function isIterateeCall(value, index2, object2) {
        if (!isObject2(object2)) {
          return false;
        }
        var type2 = typeof index2;
        if (type2 == "number" ? isArrayLike2(object2) && isIndex2(index2, object2.length) : type2 == "string" && index2 in object2) {
          return eq2(object2[index2], value);
        }
        return false;
      }
      function isKey2(value, object2) {
        if (isArray2(value)) {
          return false;
        }
        var type2 = typeof value;
        if (type2 == "number" || type2 == "symbol" || type2 == "boolean" || value == null || isSymbol2(value)) {
          return true;
        }
        return reIsPlainProp2.test(value) || !reIsDeepProp2.test(value) || object2 != null && value in Object2(object2);
      }
      function isKeyable2(value) {
        var type2 = typeof value;
        return type2 == "string" || type2 == "number" || type2 == "symbol" || type2 == "boolean" ? value !== "__proto__" : value === null;
      }
      function isLaziable(func) {
        var funcName = getFuncName(func), other = lodash2[funcName];
        if (typeof other != "function" || !(funcName in LazyWrapper.prototype)) {
          return false;
        }
        if (func === other) {
          return true;
        }
        var data = getData(other);
        return !!data && func === data[0];
      }
      function isMasked2(func) {
        return !!maskSrcKey2 && maskSrcKey2 in func;
      }
      var isMaskable = coreJsData2 ? isFunction3 : stubFalse2;
      function isPrototype2(value) {
        var Ctor = value && value.constructor, proto = typeof Ctor == "function" && Ctor.prototype || objectProto2;
        return value === proto;
      }
      function isStrictComparable2(value) {
        return value === value && !isObject2(value);
      }
      function matchesStrictComparable2(key, srcValue) {
        return function(object2) {
          if (object2 == null) {
            return false;
          }
          return object2[key] === srcValue && (srcValue !== undefined$1 || key in Object2(object2));
        };
      }
      function memoizeCapped2(func) {
        var result2 = memoize2(func, function(key) {
          if (cache.size === MAX_MEMOIZE_SIZE2) {
            cache.clear();
          }
          return key;
        });
        var cache = result2.cache;
        return result2;
      }
      function mergeData(data, source) {
        var bitmask = data[1], srcBitmask = source[1], newBitmask = bitmask | srcBitmask, isCommon = newBitmask < (WRAP_BIND_FLAG | WRAP_BIND_KEY_FLAG | WRAP_ARY_FLAG);
        var isCombo = srcBitmask == WRAP_ARY_FLAG && bitmask == WRAP_CURRY_FLAG || srcBitmask == WRAP_ARY_FLAG && bitmask == WRAP_REARG_FLAG && data[7].length <= source[8] || srcBitmask == (WRAP_ARY_FLAG | WRAP_REARG_FLAG) && source[7].length <= source[8] && bitmask == WRAP_CURRY_FLAG;
        if (!(isCommon || isCombo)) {
          return data;
        }
        if (srcBitmask & WRAP_BIND_FLAG) {
          data[2] = source[2];
          newBitmask |= bitmask & WRAP_BIND_FLAG ? 0 : WRAP_CURRY_BOUND_FLAG;
        }
        var value = source[3];
        if (value) {
          var partials = data[3];
          data[3] = partials ? composeArgs(partials, value, source[4]) : value;
          data[4] = partials ? replaceHolders(data[3], PLACEHOLDER) : source[4];
        }
        value = source[5];
        if (value) {
          partials = data[5];
          data[5] = partials ? composeArgsRight(partials, value, source[6]) : value;
          data[6] = partials ? replaceHolders(data[5], PLACEHOLDER) : source[6];
        }
        value = source[7];
        if (value) {
          data[7] = value;
        }
        if (srcBitmask & WRAP_ARY_FLAG) {
          data[8] = data[8] == null ? source[8] : nativeMin(data[8], source[8]);
        }
        if (data[9] == null) {
          data[9] = source[9];
        }
        data[0] = source[0];
        data[1] = newBitmask;
        return data;
      }
      function nativeKeysIn(object2) {
        var result2 = [];
        if (object2 != null) {
          for (var key in Object2(object2)) {
            result2.push(key);
          }
        }
        return result2;
      }
      function objectToString2(value) {
        return nativeObjectToString2.call(value);
      }
      function overRest(func, start, transform3) {
        start = nativeMax(start === undefined$1 ? func.length - 1 : start, 0);
        return function() {
          var args = arguments, index2 = -1, length = nativeMax(args.length - start, 0), array2 = Array2(length);
          while (++index2 < length) {
            array2[index2] = args[start + index2];
          }
          index2 = -1;
          var otherArgs = Array2(start + 1);
          while (++index2 < start) {
            otherArgs[index2] = args[index2];
          }
          otherArgs[start] = transform3(array2);
          return apply(func, this, otherArgs);
        };
      }
      function parent(object2, path2) {
        return path2.length < 2 ? object2 : baseGet2(object2, baseSlice2(path2, 0, -1));
      }
      function reorder(array2, indexes) {
        var arrLength = array2.length, length = nativeMin(indexes.length, arrLength), oldArray = copyArray(array2);
        while (length--) {
          var index2 = indexes[length];
          array2[length] = isIndex2(index2, arrLength) ? oldArray[index2] : undefined$1;
        }
        return array2;
      }
      function safeGet(object2, key) {
        if (key === "constructor" && typeof object2[key] === "function") {
          return;
        }
        if (key == "__proto__") {
          return;
        }
        return object2[key];
      }
      var setData = shortOut(baseSetData);
      var setTimeout2 = ctxSetTimeout || function(func, wait) {
        return root2.setTimeout(func, wait);
      };
      var setToString = shortOut(baseSetToString);
      function setWrapToString(wrapper, reference, bitmask) {
        var source = reference + "";
        return setToString(wrapper, insertWrapDetails(source, updateWrapDetails(getWrapDetails(source), bitmask)));
      }
      function shortOut(func) {
        var count = 0, lastCalled = 0;
        return function() {
          var stamp = nativeNow(), remaining = HOT_SPAN - (stamp - lastCalled);
          lastCalled = stamp;
          if (remaining > 0) {
            if (++count >= HOT_COUNT) {
              return arguments[0];
            }
          } else {
            count = 0;
          }
          return func.apply(undefined$1, arguments);
        };
      }
      function shuffleSelf(array2, size2) {
        var index2 = -1, length = array2.length, lastIndex = length - 1;
        size2 = size2 === undefined$1 ? length : size2;
        while (++index2 < size2) {
          var rand = baseRandom(index2, lastIndex), value = array2[rand];
          array2[rand] = array2[index2];
          array2[index2] = value;
        }
        array2.length = size2;
        return array2;
      }
      var stringToPath2 = memoizeCapped2(function(string2) {
        var result2 = [];
        if (string2.charCodeAt(0) === 46) {
          result2.push("");
        }
        string2.replace(rePropName2, function(match, number2, quote, subString) {
          result2.push(quote ? subString.replace(reEscapeChar2, "$1") : number2 || match);
        });
        return result2;
      });
      function toKey2(value) {
        if (typeof value == "string" || isSymbol2(value)) {
          return value;
        }
        var result2 = value + "";
        return result2 == "0" && 1 / value == -INFINITY ? "-0" : result2;
      }
      function toSource2(func) {
        if (func != null) {
          try {
            return funcToString2.call(func);
          } catch (e) {
          }
          try {
            return func + "";
          } catch (e) {
          }
        }
        return "";
      }
      function updateWrapDetails(details, bitmask) {
        arrayEach(wrapFlags, function(pair) {
          var value = "_." + pair[0];
          if (bitmask & pair[1] && !arrayIncludes(details, value)) {
            details.push(value);
          }
        });
        return details.sort();
      }
      function wrapperClone(wrapper) {
        if (wrapper instanceof LazyWrapper) {
          return wrapper.clone();
        }
        var result2 = new LodashWrapper(wrapper.__wrapped__, wrapper.__chain__);
        result2.__actions__ = copyArray(wrapper.__actions__);
        result2.__index__ = wrapper.__index__;
        result2.__values__ = wrapper.__values__;
        return result2;
      }
      function chunk(array2, size2, guard) {
        if (guard ? isIterateeCall(array2, size2, guard) : size2 === undefined$1) {
          size2 = 1;
        } else {
          size2 = nativeMax(toInteger(size2), 0);
        }
        var length = array2 == null ? 0 : array2.length;
        if (!length || size2 < 1) {
          return [];
        }
        var index2 = 0, resIndex = 0, result2 = Array2(nativeCeil(length / size2));
        while (index2 < length) {
          result2[resIndex++] = baseSlice2(array2, index2, index2 += size2);
        }
        return result2;
      }
      function compact(array2) {
        var index2 = -1, length = array2 == null ? 0 : array2.length, resIndex = 0, result2 = [];
        while (++index2 < length) {
          var value = array2[index2];
          if (value) {
            result2[resIndex++] = value;
          }
        }
        return result2;
      }
      function concat() {
        var length = arguments.length;
        if (!length) {
          return [];
        }
        var args = Array2(length - 1), array2 = arguments[0], index2 = length;
        while (index2--) {
          args[index2 - 1] = arguments[index2];
        }
        return arrayPush2(isArray2(array2) ? copyArray(array2) : [array2], baseFlatten(args, 1));
      }
      var difference = baseRest(function(array2, values2) {
        return isArrayLikeObject(array2) ? baseDifference(array2, baseFlatten(values2, 1, isArrayLikeObject, true)) : [];
      });
      var differenceBy = baseRest(function(array2, values2) {
        var iteratee2 = last(values2);
        if (isArrayLikeObject(iteratee2)) {
          iteratee2 = undefined$1;
        }
        return isArrayLikeObject(array2) ? baseDifference(array2, baseFlatten(values2, 1, isArrayLikeObject, true), getIteratee(iteratee2, 2)) : [];
      });
      var differenceWith = baseRest(function(array2, values2) {
        var comparator = last(values2);
        if (isArrayLikeObject(comparator)) {
          comparator = undefined$1;
        }
        return isArrayLikeObject(array2) ? baseDifference(array2, baseFlatten(values2, 1, isArrayLikeObject, true), undefined$1, comparator) : [];
      });
      function drop(array2, n, guard) {
        var length = array2 == null ? 0 : array2.length;
        if (!length) {
          return [];
        }
        n = guard || n === undefined$1 ? 1 : toInteger(n);
        return baseSlice2(array2, n < 0 ? 0 : n, length);
      }
      function dropRight(array2, n, guard) {
        var length = array2 == null ? 0 : array2.length;
        if (!length) {
          return [];
        }
        n = guard || n === undefined$1 ? 1 : toInteger(n);
        n = length - n;
        return baseSlice2(array2, 0, n < 0 ? 0 : n);
      }
      function dropRightWhile(array2, predicate) {
        return array2 && array2.length ? baseWhile(array2, getIteratee(predicate, 3), true, true) : [];
      }
      function dropWhile(array2, predicate) {
        return array2 && array2.length ? baseWhile(array2, getIteratee(predicate, 3), true) : [];
      }
      function fill2(array2, value, start, end) {
        var length = array2 == null ? 0 : array2.length;
        if (!length) {
          return [];
        }
        if (start && typeof start != "number" && isIterateeCall(array2, value, start)) {
          start = 0;
          end = length;
        }
        return baseFill(array2, value, start, end);
      }
      function findIndex2(array2, predicate, fromIndex) {
        var length = array2 == null ? 0 : array2.length;
        if (!length) {
          return -1;
        }
        var index2 = fromIndex == null ? 0 : toInteger(fromIndex);
        if (index2 < 0) {
          index2 = nativeMax(length + index2, 0);
        }
        return baseFindIndex(array2, getIteratee(predicate, 3), index2);
      }
      function findLastIndex(array2, predicate, fromIndex) {
        var length = array2 == null ? 0 : array2.length;
        if (!length) {
          return -1;
        }
        var index2 = length - 1;
        if (fromIndex !== undefined$1) {
          index2 = toInteger(fromIndex);
          index2 = fromIndex < 0 ? nativeMax(length + index2, 0) : nativeMin(index2, length - 1);
        }
        return baseFindIndex(array2, getIteratee(predicate, 3), index2, true);
      }
      function flatten(array2) {
        var length = array2 == null ? 0 : array2.length;
        return length ? baseFlatten(array2, 1) : [];
      }
      function flattenDeep(array2) {
        var length = array2 == null ? 0 : array2.length;
        return length ? baseFlatten(array2, INFINITY) : [];
      }
      function flattenDepth(array2, depth2) {
        var length = array2 == null ? 0 : array2.length;
        if (!length) {
          return [];
        }
        depth2 = depth2 === undefined$1 ? 1 : toInteger(depth2);
        return baseFlatten(array2, depth2);
      }
      function fromPairs(pairs2) {
        var index2 = -1, length = pairs2 == null ? 0 : pairs2.length, result2 = {};
        while (++index2 < length) {
          var pair = pairs2[index2];
          result2[pair[0]] = pair[1];
        }
        return result2;
      }
      function head(array2) {
        return array2 && array2.length ? array2[0] : undefined$1;
      }
      function indexOf(array2, value, fromIndex) {
        var length = array2 == null ? 0 : array2.length;
        if (!length) {
          return -1;
        }
        var index2 = fromIndex == null ? 0 : toInteger(fromIndex);
        if (index2 < 0) {
          index2 = nativeMax(length + index2, 0);
        }
        return baseIndexOf(array2, value, index2);
      }
      function initial(array2) {
        var length = array2 == null ? 0 : array2.length;
        return length ? baseSlice2(array2, 0, -1) : [];
      }
      var intersection = baseRest(function(arrays2) {
        var mapped = arrayMap2(arrays2, castArrayLikeObject);
        return mapped.length && mapped[0] === arrays2[0] ? baseIntersection(mapped) : [];
      });
      var intersectionBy = baseRest(function(arrays2) {
        var iteratee2 = last(arrays2), mapped = arrayMap2(arrays2, castArrayLikeObject);
        if (iteratee2 === last(mapped)) {
          iteratee2 = undefined$1;
        } else {
          mapped.pop();
        }
        return mapped.length && mapped[0] === arrays2[0] ? baseIntersection(mapped, getIteratee(iteratee2, 2)) : [];
      });
      var intersectionWith = baseRest(function(arrays2) {
        var comparator = last(arrays2), mapped = arrayMap2(arrays2, castArrayLikeObject);
        comparator = typeof comparator == "function" ? comparator : undefined$1;
        if (comparator) {
          mapped.pop();
        }
        return mapped.length && mapped[0] === arrays2[0] ? baseIntersection(mapped, undefined$1, comparator) : [];
      });
      function join(array2, separator) {
        return array2 == null ? "" : nativeJoin.call(array2, separator);
      }
      function last(array2) {
        var length = array2 == null ? 0 : array2.length;
        return length ? array2[length - 1] : undefined$1;
      }
      function lastIndexOf(array2, value, fromIndex) {
        var length = array2 == null ? 0 : array2.length;
        if (!length) {
          return -1;
        }
        var index2 = length;
        if (fromIndex !== undefined$1) {
          index2 = toInteger(fromIndex);
          index2 = index2 < 0 ? nativeMax(length + index2, 0) : nativeMin(index2, length - 1);
        }
        return value === value ? strictLastIndexOf(array2, value, index2) : baseFindIndex(array2, baseIsNaN, index2, true);
      }
      function nth(array2, n) {
        return array2 && array2.length ? baseNth(array2, toInteger(n)) : undefined$1;
      }
      var pull = baseRest(pullAll);
      function pullAll(array2, values2) {
        return array2 && array2.length && values2 && values2.length ? basePullAll(array2, values2) : array2;
      }
      function pullAllBy(array2, values2, iteratee2) {
        return array2 && array2.length && values2 && values2.length ? basePullAll(array2, values2, getIteratee(iteratee2, 2)) : array2;
      }
      function pullAllWith(array2, values2, comparator) {
        return array2 && array2.length && values2 && values2.length ? basePullAll(array2, values2, undefined$1, comparator) : array2;
      }
      var pullAt = flatRest(function(array2, indexes) {
        var length = array2 == null ? 0 : array2.length, result2 = baseAt(array2, indexes);
        basePullAt(array2, arrayMap2(indexes, function(index2) {
          return isIndex2(index2, length) ? +index2 : index2;
        }).sort(compareAscending));
        return result2;
      });
      function remove(array2, predicate) {
        var result2 = [];
        if (!(array2 && array2.length)) {
          return result2;
        }
        var index2 = -1, indexes = [], length = array2.length;
        predicate = getIteratee(predicate, 3);
        while (++index2 < length) {
          var value = array2[index2];
          if (predicate(value, index2, array2)) {
            result2.push(value);
            indexes.push(index2);
          }
        }
        basePullAt(array2, indexes);
        return result2;
      }
      function reverse(array2) {
        return array2 == null ? array2 : nativeReverse.call(array2);
      }
      function slice(array2, start, end) {
        var length = array2 == null ? 0 : array2.length;
        if (!length) {
          return [];
        }
        if (end && typeof end != "number" && isIterateeCall(array2, start, end)) {
          start = 0;
          end = length;
        } else {
          start = start == null ? 0 : toInteger(start);
          end = end === undefined$1 ? length : toInteger(end);
        }
        return baseSlice2(array2, start, end);
      }
      function sortedIndex(array2, value) {
        return baseSortedIndex(array2, value);
      }
      function sortedIndexBy(array2, value, iteratee2) {
        return baseSortedIndexBy(array2, value, getIteratee(iteratee2, 2));
      }
      function sortedIndexOf(array2, value) {
        var length = array2 == null ? 0 : array2.length;
        if (length) {
          var index2 = baseSortedIndex(array2, value);
          if (index2 < length && eq2(array2[index2], value)) {
            return index2;
          }
        }
        return -1;
      }
      function sortedLastIndex(array2, value) {
        return baseSortedIndex(array2, value, true);
      }
      function sortedLastIndexBy(array2, value, iteratee2) {
        return baseSortedIndexBy(array2, value, getIteratee(iteratee2, 2), true);
      }
      function sortedLastIndexOf(array2, value) {
        var length = array2 == null ? 0 : array2.length;
        if (length) {
          var index2 = baseSortedIndex(array2, value, true) - 1;
          if (eq2(array2[index2], value)) {
            return index2;
          }
        }
        return -1;
      }
      function sortedUniq(array2) {
        return array2 && array2.length ? baseSortedUniq(array2) : [];
      }
      function sortedUniqBy(array2, iteratee2) {
        return array2 && array2.length ? baseSortedUniq(array2, getIteratee(iteratee2, 2)) : [];
      }
      function tail(array2) {
        var length = array2 == null ? 0 : array2.length;
        return length ? baseSlice2(array2, 1, length) : [];
      }
      function take(array2, n, guard) {
        if (!(array2 && array2.length)) {
          return [];
        }
        n = guard || n === undefined$1 ? 1 : toInteger(n);
        return baseSlice2(array2, 0, n < 0 ? 0 : n);
      }
      function takeRight(array2, n, guard) {
        var length = array2 == null ? 0 : array2.length;
        if (!length) {
          return [];
        }
        n = guard || n === undefined$1 ? 1 : toInteger(n);
        n = length - n;
        return baseSlice2(array2, n < 0 ? 0 : n, length);
      }
      function takeRightWhile(array2, predicate) {
        return array2 && array2.length ? baseWhile(array2, getIteratee(predicate, 3), false, true) : [];
      }
      function takeWhile(array2, predicate) {
        return array2 && array2.length ? baseWhile(array2, getIteratee(predicate, 3)) : [];
      }
      var union = baseRest(function(arrays2) {
        return baseUniq(baseFlatten(arrays2, 1, isArrayLikeObject, true));
      });
      var unionBy = baseRest(function(arrays2) {
        var iteratee2 = last(arrays2);
        if (isArrayLikeObject(iteratee2)) {
          iteratee2 = undefined$1;
        }
        return baseUniq(baseFlatten(arrays2, 1, isArrayLikeObject, true), getIteratee(iteratee2, 2));
      });
      var unionWith = baseRest(function(arrays2) {
        var comparator = last(arrays2);
        comparator = typeof comparator == "function" ? comparator : undefined$1;
        return baseUniq(baseFlatten(arrays2, 1, isArrayLikeObject, true), undefined$1, comparator);
      });
      function uniq(array2) {
        return array2 && array2.length ? baseUniq(array2) : [];
      }
      function uniqBy(array2, iteratee2) {
        return array2 && array2.length ? baseUniq(array2, getIteratee(iteratee2, 2)) : [];
      }
      function uniqWith(array2, comparator) {
        comparator = typeof comparator == "function" ? comparator : undefined$1;
        return array2 && array2.length ? baseUniq(array2, undefined$1, comparator) : [];
      }
      function unzip(array2) {
        if (!(array2 && array2.length)) {
          return [];
        }
        var length = 0;
        array2 = arrayFilter2(array2, function(group) {
          if (isArrayLikeObject(group)) {
            length = nativeMax(group.length, length);
            return true;
          }
        });
        return baseTimes2(length, function(index2) {
          return arrayMap2(array2, baseProperty2(index2));
        });
      }
      function unzipWith(array2, iteratee2) {
        if (!(array2 && array2.length)) {
          return [];
        }
        var result2 = unzip(array2);
        if (iteratee2 == null) {
          return result2;
        }
        return arrayMap2(result2, function(group) {
          return apply(iteratee2, undefined$1, group);
        });
      }
      var without = baseRest(function(array2, values2) {
        return isArrayLikeObject(array2) ? baseDifference(array2, values2) : [];
      });
      var xor = baseRest(function(arrays2) {
        return baseXor(arrayFilter2(arrays2, isArrayLikeObject));
      });
      var xorBy = baseRest(function(arrays2) {
        var iteratee2 = last(arrays2);
        if (isArrayLikeObject(iteratee2)) {
          iteratee2 = undefined$1;
        }
        return baseXor(arrayFilter2(arrays2, isArrayLikeObject), getIteratee(iteratee2, 2));
      });
      var xorWith = baseRest(function(arrays2) {
        var comparator = last(arrays2);
        comparator = typeof comparator == "function" ? comparator : undefined$1;
        return baseXor(arrayFilter2(arrays2, isArrayLikeObject), undefined$1, comparator);
      });
      var zip2 = baseRest(unzip);
      function zipObject(props, values2) {
        return baseZipObject(props || [], values2 || [], assignValue);
      }
      function zipObjectDeep(props, values2) {
        return baseZipObject(props || [], values2 || [], baseSet);
      }
      var zipWith = baseRest(function(arrays2) {
        var length = arrays2.length, iteratee2 = length > 1 ? arrays2[length - 1] : undefined$1;
        iteratee2 = typeof iteratee2 == "function" ? (arrays2.pop(), iteratee2) : undefined$1;
        return unzipWith(arrays2, iteratee2);
      });
      function chain(value) {
        var result2 = lodash2(value);
        result2.__chain__ = true;
        return result2;
      }
      function tap(value, interceptor) {
        interceptor(value);
        return value;
      }
      function thru(value, interceptor) {
        return interceptor(value);
      }
      var wrapperAt = flatRest(function(paths) {
        var length = paths.length, start = length ? paths[0] : 0, value = this.__wrapped__, interceptor = function(object2) {
          return baseAt(object2, paths);
        };
        if (length > 1 || this.__actions__.length || !(value instanceof LazyWrapper) || !isIndex2(start)) {
          return this.thru(interceptor);
        }
        value = value.slice(start, +start + (length ? 1 : 0));
        value.__actions__.push({
          "func": thru,
          "args": [interceptor],
          "thisArg": undefined$1
        });
        return new LodashWrapper(value, this.__chain__).thru(function(array2) {
          if (length && !array2.length) {
            array2.push(undefined$1);
          }
          return array2;
        });
      });
      function wrapperChain() {
        return chain(this);
      }
      function wrapperCommit() {
        return new LodashWrapper(this.value(), this.__chain__);
      }
      function wrapperNext() {
        if (this.__values__ === undefined$1) {
          this.__values__ = toArray2(this.value());
        }
        var done = this.__index__ >= this.__values__.length, value = done ? undefined$1 : this.__values__[this.__index__++];
        return { "done": done, "value": value };
      }
      function wrapperToIterator() {
        return this;
      }
      function wrapperPlant(value) {
        var result2, parent2 = this;
        while (parent2 instanceof baseLodash) {
          var clone3 = wrapperClone(parent2);
          clone3.__index__ = 0;
          clone3.__values__ = undefined$1;
          if (result2) {
            previous.__wrapped__ = clone3;
          } else {
            result2 = clone3;
          }
          var previous = clone3;
          parent2 = parent2.__wrapped__;
        }
        previous.__wrapped__ = value;
        return result2;
      }
      function wrapperReverse() {
        var value = this.__wrapped__;
        if (value instanceof LazyWrapper) {
          var wrapped = value;
          if (this.__actions__.length) {
            wrapped = new LazyWrapper(this);
          }
          wrapped = wrapped.reverse();
          wrapped.__actions__.push({
            "func": thru,
            "args": [reverse],
            "thisArg": undefined$1
          });
          return new LodashWrapper(wrapped, this.__chain__);
        }
        return this.thru(reverse);
      }
      function wrapperValue() {
        return baseWrapperValue(this.__wrapped__, this.__actions__);
      }
      var countBy = createAggregator(function(result2, value, key) {
        if (hasOwnProperty2.call(result2, key)) {
          ++result2[key];
        } else {
          baseAssignValue2(result2, key, 1);
        }
      });
      function every2(collection, predicate, guard) {
        var func = isArray2(collection) ? arrayEvery : baseEvery;
        if (guard && isIterateeCall(collection, predicate, guard)) {
          predicate = undefined$1;
        }
        return func(collection, getIteratee(predicate, 3));
      }
      function filter(collection, predicate) {
        var func = isArray2(collection) ? arrayFilter2 : baseFilter;
        return func(collection, getIteratee(predicate, 3));
      }
      var find = createFind(findIndex2);
      var findLast = createFind(findLastIndex);
      function flatMap(collection, iteratee2) {
        return baseFlatten(map2(collection, iteratee2), 1);
      }
      function flatMapDeep(collection, iteratee2) {
        return baseFlatten(map2(collection, iteratee2), INFINITY);
      }
      function flatMapDepth(collection, iteratee2, depth2) {
        depth2 = depth2 === undefined$1 ? 1 : toInteger(depth2);
        return baseFlatten(map2(collection, iteratee2), depth2);
      }
      function forEach2(collection, iteratee2) {
        var func = isArray2(collection) ? arrayEach : baseEach;
        return func(collection, getIteratee(iteratee2, 3));
      }
      function forEachRight(collection, iteratee2) {
        var func = isArray2(collection) ? arrayEachRight : baseEachRight;
        return func(collection, getIteratee(iteratee2, 3));
      }
      var groupBy = createAggregator(function(result2, value, key) {
        if (hasOwnProperty2.call(result2, key)) {
          result2[key].push(value);
        } else {
          baseAssignValue2(result2, key, [value]);
        }
      });
      function includes(collection, value, fromIndex, guard) {
        collection = isArrayLike2(collection) ? collection : values(collection);
        fromIndex = fromIndex && !guard ? toInteger(fromIndex) : 0;
        var length = collection.length;
        if (fromIndex < 0) {
          fromIndex = nativeMax(length + fromIndex, 0);
        }
        return isString(collection) ? fromIndex <= length && collection.indexOf(value, fromIndex) > -1 : !!length && baseIndexOf(collection, value, fromIndex) > -1;
      }
      var invokeMap = baseRest(function(collection, path2, args) {
        var index2 = -1, isFunc = typeof path2 == "function", result2 = isArrayLike2(collection) ? Array2(collection.length) : [];
        baseEach(collection, function(value) {
          result2[++index2] = isFunc ? apply(path2, value, args) : baseInvoke(value, path2, args);
        });
        return result2;
      });
      var keyBy = createAggregator(function(result2, value, key) {
        baseAssignValue2(result2, key, value);
      });
      function map2(collection, iteratee2) {
        var func = isArray2(collection) ? arrayMap2 : baseMap;
        return func(collection, getIteratee(iteratee2, 3));
      }
      function orderBy(collection, iteratees, orders, guard) {
        if (collection == null) {
          return [];
        }
        if (!isArray2(iteratees)) {
          iteratees = iteratees == null ? [] : [iteratees];
        }
        orders = guard ? undefined$1 : orders;
        if (!isArray2(orders)) {
          orders = orders == null ? [] : [orders];
        }
        return baseOrderBy(collection, iteratees, orders);
      }
      var partition = createAggregator(function(result2, value, key) {
        result2[key ? 0 : 1].push(value);
      }, function() {
        return [[], []];
      });
      function reduce2(collection, iteratee2, accumulator) {
        var func = isArray2(collection) ? arrayReduce2 : baseReduce, initAccum = arguments.length < 3;
        return func(collection, getIteratee(iteratee2, 4), accumulator, initAccum, baseEach);
      }
      function reduceRight(collection, iteratee2, accumulator) {
        var func = isArray2(collection) ? arrayReduceRight : baseReduce, initAccum = arguments.length < 3;
        return func(collection, getIteratee(iteratee2, 4), accumulator, initAccum, baseEachRight);
      }
      function reject(collection, predicate) {
        var func = isArray2(collection) ? arrayFilter2 : baseFilter;
        return func(collection, negate(getIteratee(predicate, 3)));
      }
      function sample(collection) {
        var func = isArray2(collection) ? arraySample : baseSample;
        return func(collection);
      }
      function sampleSize(collection, n, guard) {
        if (guard ? isIterateeCall(collection, n, guard) : n === undefined$1) {
          n = 1;
        } else {
          n = toInteger(n);
        }
        var func = isArray2(collection) ? arraySampleSize : baseSampleSize;
        return func(collection, n);
      }
      function shuffle(collection) {
        var func = isArray2(collection) ? arrayShuffle : baseShuffle;
        return func(collection);
      }
      function size(collection) {
        if (collection == null) {
          return 0;
        }
        if (isArrayLike2(collection)) {
          return isString(collection) ? stringSize(collection) : collection.length;
        }
        var tag = getTag2(collection);
        if (tag == mapTag2 || tag == setTag2) {
          return collection.size;
        }
        return baseKeys2(collection).length;
      }
      function some(collection, predicate, guard) {
        var func = isArray2(collection) ? arraySome2 : baseSome;
        if (guard && isIterateeCall(collection, predicate, guard)) {
          predicate = undefined$1;
        }
        return func(collection, getIteratee(predicate, 3));
      }
      var sortBy = baseRest(function(collection, iteratees) {
        if (collection == null) {
          return [];
        }
        var length = iteratees.length;
        if (length > 1 && isIterateeCall(collection, iteratees[0], iteratees[1])) {
          iteratees = [];
        } else if (length > 2 && isIterateeCall(iteratees[0], iteratees[1], iteratees[2])) {
          iteratees = [iteratees[0]];
        }
        return baseOrderBy(collection, baseFlatten(iteratees, 1), []);
      });
      var now = ctxNow || function() {
        return root2.Date.now();
      };
      function after(n, func) {
        if (typeof func != "function") {
          throw new TypeError2(FUNC_ERROR_TEXT2);
        }
        n = toInteger(n);
        return function() {
          if (--n < 1) {
            return func.apply(this, arguments);
          }
        };
      }
      function ary(func, n, guard) {
        n = guard ? undefined$1 : n;
        n = func && n == null ? func.length : n;
        return createWrap(func, WRAP_ARY_FLAG, undefined$1, undefined$1, undefined$1, undefined$1, n);
      }
      function before(n, func) {
        var result2;
        if (typeof func != "function") {
          throw new TypeError2(FUNC_ERROR_TEXT2);
        }
        n = toInteger(n);
        return function() {
          if (--n > 0) {
            result2 = func.apply(this, arguments);
          }
          if (n <= 1) {
            func = undefined$1;
          }
          return result2;
        };
      }
      var bind = baseRest(function(func, thisArg, partials) {
        var bitmask = WRAP_BIND_FLAG;
        if (partials.length) {
          var holders = replaceHolders(partials, getHolder(bind));
          bitmask |= WRAP_PARTIAL_FLAG;
        }
        return createWrap(func, bitmask, thisArg, partials, holders);
      });
      var bindKey = baseRest(function(object2, key, partials) {
        var bitmask = WRAP_BIND_FLAG | WRAP_BIND_KEY_FLAG;
        if (partials.length) {
          var holders = replaceHolders(partials, getHolder(bindKey));
          bitmask |= WRAP_PARTIAL_FLAG;
        }
        return createWrap(key, bitmask, object2, partials, holders);
      });
      function curry(func, arity, guard) {
        arity = guard ? undefined$1 : arity;
        var result2 = createWrap(func, WRAP_CURRY_FLAG, undefined$1, undefined$1, undefined$1, undefined$1, undefined$1, arity);
        result2.placeholder = curry.placeholder;
        return result2;
      }
      function curryRight(func, arity, guard) {
        arity = guard ? undefined$1 : arity;
        var result2 = createWrap(func, WRAP_CURRY_RIGHT_FLAG, undefined$1, undefined$1, undefined$1, undefined$1, undefined$1, arity);
        result2.placeholder = curryRight.placeholder;
        return result2;
      }
      function debounce(func, wait, options) {
        var lastArgs, lastThis, maxWait, result2, timerId, lastCallTime, lastInvokeTime = 0, leading = false, maxing = false, trailing = true;
        if (typeof func != "function") {
          throw new TypeError2(FUNC_ERROR_TEXT2);
        }
        wait = toNumber(wait) || 0;
        if (isObject2(options)) {
          leading = !!options.leading;
          maxing = "maxWait" in options;
          maxWait = maxing ? nativeMax(toNumber(options.maxWait) || 0, wait) : maxWait;
          trailing = "trailing" in options ? !!options.trailing : trailing;
        }
        function invokeFunc(time) {
          var args = lastArgs, thisArg = lastThis;
          lastArgs = lastThis = undefined$1;
          lastInvokeTime = time;
          result2 = func.apply(thisArg, args);
          return result2;
        }
        function leadingEdge(time) {
          lastInvokeTime = time;
          timerId = setTimeout2(timerExpired, wait);
          return leading ? invokeFunc(time) : result2;
        }
        function remainingWait(time) {
          var timeSinceLastCall = time - lastCallTime, timeSinceLastInvoke = time - lastInvokeTime, timeWaiting = wait - timeSinceLastCall;
          return maxing ? nativeMin(timeWaiting, maxWait - timeSinceLastInvoke) : timeWaiting;
        }
        function shouldInvoke(time) {
          var timeSinceLastCall = time - lastCallTime, timeSinceLastInvoke = time - lastInvokeTime;
          return lastCallTime === undefined$1 || timeSinceLastCall >= wait || timeSinceLastCall < 0 || maxing && timeSinceLastInvoke >= maxWait;
        }
        function timerExpired() {
          var time = now();
          if (shouldInvoke(time)) {
            return trailingEdge(time);
          }
          timerId = setTimeout2(timerExpired, remainingWait(time));
        }
        function trailingEdge(time) {
          timerId = undefined$1;
          if (trailing && lastArgs) {
            return invokeFunc(time);
          }
          lastArgs = lastThis = undefined$1;
          return result2;
        }
        function cancel() {
          if (timerId !== undefined$1) {
            clearTimeout2(timerId);
          }
          lastInvokeTime = 0;
          lastArgs = lastCallTime = lastThis = timerId = undefined$1;
        }
        function flush() {
          return timerId === undefined$1 ? result2 : trailingEdge(now());
        }
        function debounced() {
          var time = now(), isInvoking = shouldInvoke(time);
          lastArgs = arguments;
          lastThis = this;
          lastCallTime = time;
          if (isInvoking) {
            if (timerId === undefined$1) {
              return leadingEdge(lastCallTime);
            }
            if (maxing) {
              clearTimeout2(timerId);
              timerId = setTimeout2(timerExpired, wait);
              return invokeFunc(lastCallTime);
            }
          }
          if (timerId === undefined$1) {
            timerId = setTimeout2(timerExpired, wait);
          }
          return result2;
        }
        debounced.cancel = cancel;
        debounced.flush = flush;
        return debounced;
      }
      var defer = baseRest(function(func, args) {
        return baseDelay(func, 1, args);
      });
      var delay = baseRest(function(func, wait, args) {
        return baseDelay(func, toNumber(wait) || 0, args);
      });
      function flip(func) {
        return createWrap(func, WRAP_FLIP_FLAG);
      }
      function memoize2(func, resolver) {
        if (typeof func != "function" || resolver != null && typeof resolver != "function") {
          throw new TypeError2(FUNC_ERROR_TEXT2);
        }
        var memoized = function() {
          var args = arguments, key = resolver ? resolver.apply(this, args) : args[0], cache = memoized.cache;
          if (cache.has(key)) {
            return cache.get(key);
          }
          var result2 = func.apply(this, args);
          memoized.cache = cache.set(key, result2) || cache;
          return result2;
        };
        memoized.cache = new (memoize2.Cache || MapCache2)();
        return memoized;
      }
      memoize2.Cache = MapCache2;
      function negate(predicate) {
        if (typeof predicate != "function") {
          throw new TypeError2(FUNC_ERROR_TEXT2);
        }
        return function() {
          var args = arguments;
          switch (args.length) {
            case 0:
              return !predicate.call(this);
            case 1:
              return !predicate.call(this, args[0]);
            case 2:
              return !predicate.call(this, args[0], args[1]);
            case 3:
              return !predicate.call(this, args[0], args[1], args[2]);
          }
          return !predicate.apply(this, args);
        };
      }
      function once2(func) {
        return before(2, func);
      }
      var overArgs = castRest(function(func, transforms) {
        transforms = transforms.length == 1 && isArray2(transforms[0]) ? arrayMap2(transforms[0], baseUnary2(getIteratee())) : arrayMap2(baseFlatten(transforms, 1), baseUnary2(getIteratee()));
        var funcsLength = transforms.length;
        return baseRest(function(args) {
          var index2 = -1, length = nativeMin(args.length, funcsLength);
          while (++index2 < length) {
            args[index2] = transforms[index2].call(this, args[index2]);
          }
          return apply(func, this, args);
        });
      });
      var partial = baseRest(function(func, partials) {
        var holders = replaceHolders(partials, getHolder(partial));
        return createWrap(func, WRAP_PARTIAL_FLAG, undefined$1, partials, holders);
      });
      var partialRight = baseRest(function(func, partials) {
        var holders = replaceHolders(partials, getHolder(partialRight));
        return createWrap(func, WRAP_PARTIAL_RIGHT_FLAG, undefined$1, partials, holders);
      });
      var rearg = flatRest(function(func, indexes) {
        return createWrap(func, WRAP_REARG_FLAG, undefined$1, undefined$1, undefined$1, indexes);
      });
      function rest(func, start) {
        if (typeof func != "function") {
          throw new TypeError2(FUNC_ERROR_TEXT2);
        }
        start = start === undefined$1 ? start : toInteger(start);
        return baseRest(func, start);
      }
      function spread(func, start) {
        if (typeof func != "function") {
          throw new TypeError2(FUNC_ERROR_TEXT2);
        }
        start = start == null ? 0 : nativeMax(toInteger(start), 0);
        return baseRest(function(args) {
          var array2 = args[start], otherArgs = castSlice2(args, 0, start);
          if (array2) {
            arrayPush2(otherArgs, array2);
          }
          return apply(func, this, otherArgs);
        });
      }
      function throttle(func, wait, options) {
        var leading = true, trailing = true;
        if (typeof func != "function") {
          throw new TypeError2(FUNC_ERROR_TEXT2);
        }
        if (isObject2(options)) {
          leading = "leading" in options ? !!options.leading : leading;
          trailing = "trailing" in options ? !!options.trailing : trailing;
        }
        return debounce(func, wait, {
          "leading": leading,
          "maxWait": wait,
          "trailing": trailing
        });
      }
      function unary(func) {
        return ary(func, 1);
      }
      function wrap(value, wrapper) {
        return partial(castFunction(wrapper), value);
      }
      function castArray2() {
        if (!arguments.length) {
          return [];
        }
        var value = arguments[0];
        return isArray2(value) ? value : [value];
      }
      function clone2(value) {
        return baseClone2(value, CLONE_SYMBOLS_FLAG);
      }
      function cloneWith(value, customizer) {
        customizer = typeof customizer == "function" ? customizer : undefined$1;
        return baseClone2(value, CLONE_SYMBOLS_FLAG, customizer);
      }
      function cloneDeep(value) {
        return baseClone2(value, CLONE_DEEP_FLAG | CLONE_SYMBOLS_FLAG);
      }
      function cloneDeepWith(value, customizer) {
        customizer = typeof customizer == "function" ? customizer : undefined$1;
        return baseClone2(value, CLONE_DEEP_FLAG | CLONE_SYMBOLS_FLAG, customizer);
      }
      function conformsTo(object2, source) {
        return source == null || baseConformsTo(object2, source, keys2(source));
      }
      function eq2(value, other) {
        return value === other || value !== value && other !== other;
      }
      var gt = createRelationalOperation(baseGt);
      var gte = createRelationalOperation(function(value, other) {
        return value >= other;
      });
      var isArguments2 = baseIsArguments2(/* @__PURE__ */ function() {
        return arguments;
      }()) ? baseIsArguments2 : function(value) {
        return isObjectLike2(value) && hasOwnProperty2.call(value, "callee") && !propertyIsEnumerable2.call(value, "callee");
      };
      var isArray2 = Array2.isArray;
      var isArrayBuffer = nodeIsArrayBuffer ? baseUnary2(nodeIsArrayBuffer) : baseIsArrayBuffer;
      function isArrayLike2(value) {
        return value != null && isLength2(value.length) && !isFunction3(value);
      }
      function isArrayLikeObject(value) {
        return isObjectLike2(value) && isArrayLike2(value);
      }
      function isBoolean2(value) {
        return value === true || value === false || isObjectLike2(value) && baseGetTag2(value) == boolTag2;
      }
      var isBuffer2 = nativeIsBuffer || stubFalse2;
      var isDate2 = nodeIsDate ? baseUnary2(nodeIsDate) : baseIsDate;
      function isElement(value) {
        return isObjectLike2(value) && value.nodeType === 1 && !isPlainObject2(value);
      }
      function isEmpty(value) {
        if (value == null) {
          return true;
        }
        if (isArrayLike2(value) && (isArray2(value) || typeof value == "string" || typeof value.splice == "function" || isBuffer2(value) || isTypedArray2(value) || isArguments2(value))) {
          return !value.length;
        }
        var tag = getTag2(value);
        if (tag == mapTag2 || tag == setTag2) {
          return !value.size;
        }
        if (isPrototype2(value)) {
          return !baseKeys2(value).length;
        }
        for (var key in value) {
          if (hasOwnProperty2.call(value, key)) {
            return false;
          }
        }
        return true;
      }
      function isEqual2(value, other) {
        return baseIsEqual2(value, other);
      }
      function isEqualWith(value, other, customizer) {
        customizer = typeof customizer == "function" ? customizer : undefined$1;
        var result2 = customizer ? customizer(value, other) : undefined$1;
        return result2 === undefined$1 ? baseIsEqual2(value, other, undefined$1, customizer) : !!result2;
      }
      function isError(value) {
        if (!isObjectLike2(value)) {
          return false;
        }
        var tag = baseGetTag2(value);
        return tag == errorTag2 || tag == domExcTag || typeof value.message == "string" && typeof value.name == "string" && !isPlainObject2(value);
      }
      function isFinite2(value) {
        return typeof value == "number" && nativeIsFinite(value);
      }
      function isFunction3(value) {
        if (!isObject2(value)) {
          return false;
        }
        var tag = baseGetTag2(value);
        return tag == funcTag2 || tag == genTag2 || tag == asyncTag2 || tag == proxyTag2;
      }
      function isInteger2(value) {
        return typeof value == "number" && value == toInteger(value);
      }
      function isLength2(value) {
        return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER2;
      }
      function isObject2(value) {
        var type2 = typeof value;
        return value != null && (type2 == "object" || type2 == "function");
      }
      function isObjectLike2(value) {
        return value != null && typeof value == "object";
      }
      var isMap = nodeIsMap ? baseUnary2(nodeIsMap) : baseIsMap;
      function isMatch(object2, source) {
        return object2 === source || baseIsMatch2(object2, source, getMatchData2(source));
      }
      function isMatchWith(object2, source, customizer) {
        customizer = typeof customizer == "function" ? customizer : undefined$1;
        return baseIsMatch2(object2, source, getMatchData2(source), customizer);
      }
      function isNaN2(value) {
        return isNumber2(value) && value != +value;
      }
      function isNative(value) {
        if (isMaskable(value)) {
          throw new Error2(CORE_ERROR_TEXT);
        }
        return baseIsNative2(value);
      }
      function isNull2(value) {
        return value === null;
      }
      function isNil2(value) {
        return value == null;
      }
      function isNumber2(value) {
        return typeof value == "number" || isObjectLike2(value) && baseGetTag2(value) == numberTag2;
      }
      function isPlainObject2(value) {
        if (!isObjectLike2(value) || baseGetTag2(value) != objectTag2) {
          return false;
        }
        var proto = getPrototype(value);
        if (proto === null) {
          return true;
        }
        var Ctor = hasOwnProperty2.call(proto, "constructor") && proto.constructor;
        return typeof Ctor == "function" && Ctor instanceof Ctor && funcToString2.call(Ctor) == objectCtorString;
      }
      var isRegExp2 = nodeIsRegExp ? baseUnary2(nodeIsRegExp) : baseIsRegExp;
      function isSafeInteger(value) {
        return isInteger2(value) && value >= -MAX_SAFE_INTEGER2 && value <= MAX_SAFE_INTEGER2;
      }
      var isSet = nodeIsSet ? baseUnary2(nodeIsSet) : baseIsSet;
      function isString(value) {
        return typeof value == "string" || !isArray2(value) && isObjectLike2(value) && baseGetTag2(value) == stringTag2;
      }
      function isSymbol2(value) {
        return typeof value == "symbol" || isObjectLike2(value) && baseGetTag2(value) == symbolTag2;
      }
      var isTypedArray2 = nodeIsTypedArray2 ? baseUnary2(nodeIsTypedArray2) : baseIsTypedArray2;
      function isUndefined2(value) {
        return value === undefined$1;
      }
      function isWeakMap(value) {
        return isObjectLike2(value) && getTag2(value) == weakMapTag2;
      }
      function isWeakSet(value) {
        return isObjectLike2(value) && baseGetTag2(value) == weakSetTag;
      }
      var lt = createRelationalOperation(baseLt);
      var lte = createRelationalOperation(function(value, other) {
        return value <= other;
      });
      function toArray2(value) {
        if (!value) {
          return [];
        }
        if (isArrayLike2(value)) {
          return isString(value) ? stringToArray2(value) : copyArray(value);
        }
        if (symIterator && value[symIterator]) {
          return iteratorToArray(value[symIterator]());
        }
        var tag = getTag2(value), func = tag == mapTag2 ? mapToArray2 : tag == setTag2 ? setToArray2 : values;
        return func(value);
      }
      function toFinite(value) {
        if (!value) {
          return value === 0 ? value : 0;
        }
        value = toNumber(value);
        if (value === INFINITY || value === -INFINITY) {
          var sign = value < 0 ? -1 : 1;
          return sign * MAX_INTEGER;
        }
        return value === value ? value : 0;
      }
      function toInteger(value) {
        var result2 = toFinite(value), remainder = result2 % 1;
        return result2 === result2 ? remainder ? result2 - remainder : result2 : 0;
      }
      function toLength(value) {
        return value ? baseClamp(toInteger(value), 0, MAX_ARRAY_LENGTH) : 0;
      }
      function toNumber(value) {
        if (typeof value == "number") {
          return value;
        }
        if (isSymbol2(value)) {
          return NAN;
        }
        if (isObject2(value)) {
          var other = typeof value.valueOf == "function" ? value.valueOf() : value;
          value = isObject2(other) ? other + "" : other;
        }
        if (typeof value != "string") {
          return value === 0 ? value : +value;
        }
        value = baseTrim(value);
        var isBinary2 = reIsBinary.test(value);
        return isBinary2 || reIsOctal.test(value) ? freeParseInt(value.slice(2), isBinary2 ? 2 : 8) : reIsBadHex.test(value) ? NAN : +value;
      }
      function toPlainObject(value) {
        return copyObject(value, keysIn(value));
      }
      function toSafeInteger(value) {
        return value ? baseClamp(toInteger(value), -MAX_SAFE_INTEGER2, MAX_SAFE_INTEGER2) : value === 0 ? value : 0;
      }
      function toString4(value) {
        return value == null ? "" : baseToString2(value);
      }
      var assign = createAssigner(function(object2, source) {
        if (isPrototype2(source) || isArrayLike2(source)) {
          copyObject(source, keys2(source), object2);
          return;
        }
        for (var key in source) {
          if (hasOwnProperty2.call(source, key)) {
            assignValue(object2, key, source[key]);
          }
        }
      });
      var assignIn = createAssigner(function(object2, source) {
        copyObject(source, keysIn(source), object2);
      });
      var assignInWith = createAssigner(function(object2, source, srcIndex, customizer) {
        copyObject(source, keysIn(source), object2, customizer);
      });
      var assignWith = createAssigner(function(object2, source, srcIndex, customizer) {
        copyObject(source, keys2(source), object2, customizer);
      });
      var at = flatRest(baseAt);
      function create2(prototype, properties) {
        var result2 = baseCreate(prototype);
        return properties == null ? result2 : baseAssign(result2, properties);
      }
      var defaults = baseRest(function(object2, sources) {
        object2 = Object2(object2);
        var index2 = -1;
        var length = sources.length;
        var guard = length > 2 ? sources[2] : undefined$1;
        if (guard && isIterateeCall(sources[0], sources[1], guard)) {
          length = 1;
        }
        while (++index2 < length) {
          var source = sources[index2];
          var props = keysIn(source);
          var propsIndex = -1;
          var propsLength = props.length;
          while (++propsIndex < propsLength) {
            var key = props[propsIndex];
            var value = object2[key];
            if (value === undefined$1 || eq2(value, objectProto2[key]) && !hasOwnProperty2.call(object2, key)) {
              object2[key] = source[key];
            }
          }
        }
        return object2;
      });
      var defaultsDeep = baseRest(function(args) {
        args.push(undefined$1, customDefaultsMerge);
        return apply(mergeWith, undefined$1, args);
      });
      function findKey(object2, predicate) {
        return baseFindKey(object2, getIteratee(predicate, 3), baseForOwn2);
      }
      function findLastKey(object2, predicate) {
        return baseFindKey(object2, getIteratee(predicate, 3), baseForOwnRight);
      }
      function forIn(object2, iteratee2) {
        return object2 == null ? object2 : baseFor2(object2, getIteratee(iteratee2, 3), keysIn);
      }
      function forInRight(object2, iteratee2) {
        return object2 == null ? object2 : baseForRight(object2, getIteratee(iteratee2, 3), keysIn);
      }
      function forOwn(object2, iteratee2) {
        return object2 && baseForOwn2(object2, getIteratee(iteratee2, 3));
      }
      function forOwnRight(object2, iteratee2) {
        return object2 && baseForOwnRight(object2, getIteratee(iteratee2, 3));
      }
      function functions(object2) {
        return object2 == null ? [] : baseFunctions(object2, keys2(object2));
      }
      function functionsIn(object2) {
        return object2 == null ? [] : baseFunctions(object2, keysIn(object2));
      }
      function get2(object2, path2, defaultValue) {
        var result2 = object2 == null ? undefined$1 : baseGet2(object2, path2);
        return result2 === undefined$1 ? defaultValue : result2;
      }
      function has2(object2, path2) {
        return object2 != null && hasPath2(object2, path2, baseHas2);
      }
      function hasIn2(object2, path2) {
        return object2 != null && hasPath2(object2, path2, baseHasIn2);
      }
      var invert = createInverter(function(result2, value, key) {
        if (value != null && typeof value.toString != "function") {
          value = nativeObjectToString2.call(value);
        }
        result2[value] = key;
      }, constant(identity2));
      var invertBy = createInverter(function(result2, value, key) {
        if (value != null && typeof value.toString != "function") {
          value = nativeObjectToString2.call(value);
        }
        if (hasOwnProperty2.call(result2, value)) {
          result2[value].push(key);
        } else {
          result2[value] = [key];
        }
      }, getIteratee);
      var invoke = baseRest(baseInvoke);
      function keys2(object2) {
        return isArrayLike2(object2) ? arrayLikeKeys2(object2) : baseKeys2(object2);
      }
      function keysIn(object2) {
        return isArrayLike2(object2) ? arrayLikeKeys2(object2, true) : baseKeysIn(object2);
      }
      function mapKeys2(object2, iteratee2) {
        var result2 = {};
        iteratee2 = getIteratee(iteratee2, 3);
        baseForOwn2(object2, function(value, key, object3) {
          baseAssignValue2(result2, iteratee2(value, key, object3), value);
        });
        return result2;
      }
      function mapValues2(object2, iteratee2) {
        var result2 = {};
        iteratee2 = getIteratee(iteratee2, 3);
        baseForOwn2(object2, function(value, key, object3) {
          baseAssignValue2(result2, key, iteratee2(value, key, object3));
        });
        return result2;
      }
      var merge2 = createAssigner(function(object2, source, srcIndex) {
        baseMerge(object2, source, srcIndex);
      });
      var mergeWith = createAssigner(function(object2, source, srcIndex, customizer) {
        baseMerge(object2, source, srcIndex, customizer);
      });
      var omit = flatRest(function(object2, paths) {
        var result2 = {};
        if (object2 == null) {
          return result2;
        }
        var isDeep = false;
        paths = arrayMap2(paths, function(path2) {
          path2 = castPath2(path2, object2);
          isDeep || (isDeep = path2.length > 1);
          return path2;
        });
        copyObject(object2, getAllKeysIn(object2), result2);
        if (isDeep) {
          result2 = baseClone2(result2, CLONE_DEEP_FLAG | CLONE_FLAT_FLAG | CLONE_SYMBOLS_FLAG, customOmitClone);
        }
        var length = paths.length;
        while (length--) {
          baseUnset(result2, paths[length]);
        }
        return result2;
      });
      function omitBy(object2, predicate) {
        return pickBy(object2, negate(getIteratee(predicate)));
      }
      var pick = flatRest(function(object2, paths) {
        return object2 == null ? {} : basePick(object2, paths);
      });
      function pickBy(object2, predicate) {
        if (object2 == null) {
          return {};
        }
        var props = arrayMap2(getAllKeysIn(object2), function(prop) {
          return [prop];
        });
        predicate = getIteratee(predicate);
        return basePickBy(object2, props, function(value, path2) {
          return predicate(value, path2[0]);
        });
      }
      function result(object2, path2, defaultValue) {
        path2 = castPath2(path2, object2);
        var index2 = -1, length = path2.length;
        if (!length) {
          length = 1;
          object2 = undefined$1;
        }
        while (++index2 < length) {
          var value = object2 == null ? undefined$1 : object2[toKey2(path2[index2])];
          if (value === undefined$1) {
            index2 = length;
            value = defaultValue;
          }
          object2 = isFunction3(value) ? value.call(object2) : value;
        }
        return object2;
      }
      function set2(object2, path2, value) {
        return object2 == null ? object2 : baseSet(object2, path2, value);
      }
      function setWith(object2, path2, value, customizer) {
        customizer = typeof customizer == "function" ? customizer : undefined$1;
        return object2 == null ? object2 : baseSet(object2, path2, value, customizer);
      }
      var toPairs = createToPairs(keys2);
      var toPairsIn = createToPairs(keysIn);
      function transform2(object2, iteratee2, accumulator) {
        var isArr = isArray2(object2), isArrLike = isArr || isBuffer2(object2) || isTypedArray2(object2);
        iteratee2 = getIteratee(iteratee2, 4);
        if (accumulator == null) {
          var Ctor = object2 && object2.constructor;
          if (isArrLike) {
            accumulator = isArr ? new Ctor() : [];
          } else if (isObject2(object2)) {
            accumulator = isFunction3(Ctor) ? baseCreate(getPrototype(object2)) : {};
          } else {
            accumulator = {};
          }
        }
        (isArrLike ? arrayEach : baseForOwn2)(object2, function(value, index2, object3) {
          return iteratee2(accumulator, value, index2, object3);
        });
        return accumulator;
      }
      function unset(object2, path2) {
        return object2 == null ? true : baseUnset(object2, path2);
      }
      function update(object2, path2, updater) {
        return object2 == null ? object2 : baseUpdate(object2, path2, castFunction(updater));
      }
      function updateWith(object2, path2, updater, customizer) {
        customizer = typeof customizer == "function" ? customizer : undefined$1;
        return object2 == null ? object2 : baseUpdate(object2, path2, castFunction(updater), customizer);
      }
      function values(object2) {
        return object2 == null ? [] : baseValues(object2, keys2(object2));
      }
      function valuesIn(object2) {
        return object2 == null ? [] : baseValues(object2, keysIn(object2));
      }
      function clamp(number2, lower, upper) {
        if (upper === undefined$1) {
          upper = lower;
          lower = undefined$1;
        }
        if (upper !== undefined$1) {
          upper = toNumber(upper);
          upper = upper === upper ? upper : 0;
        }
        if (lower !== undefined$1) {
          lower = toNumber(lower);
          lower = lower === lower ? lower : 0;
        }
        return baseClamp(toNumber(number2), lower, upper);
      }
      function inRange(number2, start, end) {
        start = toFinite(start);
        if (end === undefined$1) {
          end = start;
          start = 0;
        } else {
          end = toFinite(end);
        }
        number2 = toNumber(number2);
        return baseInRange(number2, start, end);
      }
      function random(lower, upper, floating) {
        if (floating && typeof floating != "boolean" && isIterateeCall(lower, upper, floating)) {
          upper = floating = undefined$1;
        }
        if (floating === undefined$1) {
          if (typeof upper == "boolean") {
            floating = upper;
            upper = undefined$1;
          } else if (typeof lower == "boolean") {
            floating = lower;
            lower = undefined$1;
          }
        }
        if (lower === undefined$1 && upper === undefined$1) {
          lower = 0;
          upper = 1;
        } else {
          lower = toFinite(lower);
          if (upper === undefined$1) {
            upper = lower;
            lower = 0;
          } else {
            upper = toFinite(upper);
          }
        }
        if (lower > upper) {
          var temp = lower;
          lower = upper;
          upper = temp;
        }
        if (floating || lower % 1 || upper % 1) {
          var rand = nativeRandom();
          return nativeMin(lower + rand * (upper - lower + freeParseFloat("1e-" + ((rand + "").length - 1))), upper);
        }
        return baseRandom(lower, upper);
      }
      var camelCase2 = createCompounder2(function(result2, word, index2) {
        word = word.toLowerCase();
        return result2 + (index2 ? capitalize2(word) : word);
      });
      function capitalize2(string2) {
        return upperFirst2(toString4(string2).toLowerCase());
      }
      function deburr2(string2) {
        string2 = toString4(string2);
        return string2 && string2.replace(reLatin2, deburrLetter2).replace(reComboMark2, "");
      }
      function endsWith(string2, target, position) {
        string2 = toString4(string2);
        target = baseToString2(target);
        var length = string2.length;
        position = position === undefined$1 ? length : baseClamp(toInteger(position), 0, length);
        var end = position;
        position -= target.length;
        return position >= 0 && string2.slice(position, end) == target;
      }
      function escape2(string2) {
        string2 = toString4(string2);
        return string2 && reHasUnescapedHtml.test(string2) ? string2.replace(reUnescapedHtml, escapeHtmlChar) : string2;
      }
      function escapeRegExp(string2) {
        string2 = toString4(string2);
        return string2 && reHasRegExpChar.test(string2) ? string2.replace(reRegExpChar2, "\\$&") : string2;
      }
      var kebabCase = createCompounder2(function(result2, word, index2) {
        return result2 + (index2 ? "-" : "") + word.toLowerCase();
      });
      var lowerCase = createCompounder2(function(result2, word, index2) {
        return result2 + (index2 ? " " : "") + word.toLowerCase();
      });
      var lowerFirst = createCaseFirst2("toLowerCase");
      function pad2(string2, length, chars) {
        string2 = toString4(string2);
        length = toInteger(length);
        var strLength = length ? stringSize(string2) : 0;
        if (!length || strLength >= length) {
          return string2;
        }
        var mid = (length - strLength) / 2;
        return createPadding(nativeFloor(mid), chars) + string2 + createPadding(nativeCeil(mid), chars);
      }
      function padEnd(string2, length, chars) {
        string2 = toString4(string2);
        length = toInteger(length);
        var strLength = length ? stringSize(string2) : 0;
        return length && strLength < length ? string2 + createPadding(length - strLength, chars) : string2;
      }
      function padStart(string2, length, chars) {
        string2 = toString4(string2);
        length = toInteger(length);
        var strLength = length ? stringSize(string2) : 0;
        return length && strLength < length ? createPadding(length - strLength, chars) + string2 : string2;
      }
      function parseInt2(string2, radix, guard) {
        if (guard || radix == null) {
          radix = 0;
        } else if (radix) {
          radix = +radix;
        }
        return nativeParseInt(toString4(string2).replace(reTrimStart, ""), radix || 0);
      }
      function repeat2(string2, n, guard) {
        if (guard ? isIterateeCall(string2, n, guard) : n === undefined$1) {
          n = 1;
        } else {
          n = toInteger(n);
        }
        return baseRepeat(toString4(string2), n);
      }
      function replace() {
        var args = arguments, string2 = toString4(args[0]);
        return args.length < 3 ? string2 : string2.replace(args[1], args[2]);
      }
      var snakeCase2 = createCompounder2(function(result2, word, index2) {
        return result2 + (index2 ? "_" : "") + word.toLowerCase();
      });
      function split2(string2, separator, limit) {
        if (limit && typeof limit != "number" && isIterateeCall(string2, separator, limit)) {
          separator = limit = undefined$1;
        }
        limit = limit === undefined$1 ? MAX_ARRAY_LENGTH : limit >>> 0;
        if (!limit) {
          return [];
        }
        string2 = toString4(string2);
        if (string2 && (typeof separator == "string" || separator != null && !isRegExp2(separator))) {
          separator = baseToString2(separator);
          if (!separator && hasUnicode2(string2)) {
            return castSlice2(stringToArray2(string2), 0, limit);
          }
        }
        return string2.split(separator, limit);
      }
      var startCase = createCompounder2(function(result2, word, index2) {
        return result2 + (index2 ? " " : "") + upperFirst2(word);
      });
      function startsWith(string2, target, position) {
        string2 = toString4(string2);
        position = position == null ? 0 : baseClamp(toInteger(position), 0, string2.length);
        target = baseToString2(target);
        return string2.slice(position, position + target.length) == target;
      }
      function template2(string2, options, guard) {
        var settings2 = lodash2.templateSettings;
        if (guard && isIterateeCall(string2, options, guard)) {
          options = undefined$1;
        }
        string2 = toString4(string2);
        options = assignInWith({}, options, settings2, customDefaultsAssignIn);
        var imports = assignInWith({}, options.imports, settings2.imports, customDefaultsAssignIn), importsKeys = keys2(imports), importsValues = baseValues(imports, importsKeys);
        var isEscaping, isEvaluating, index2 = 0, interpolate = options.interpolate || reNoMatch, source = "__p += '";
        var reDelimiters = RegExp2(
          (options.escape || reNoMatch).source + "|" + interpolate.source + "|" + (interpolate === reInterpolate ? reEsTemplate : reNoMatch).source + "|" + (options.evaluate || reNoMatch).source + "|$",
          "g"
        );
        var sourceURL = "//# sourceURL=" + (hasOwnProperty2.call(options, "sourceURL") ? (options.sourceURL + "").replace(/\s/g, " ") : "lodash.templateSources[" + ++templateCounter + "]") + "\n";
        string2.replace(reDelimiters, function(match, escapeValue, interpolateValue, esTemplateValue, evaluateValue, offset) {
          interpolateValue || (interpolateValue = esTemplateValue);
          source += string2.slice(index2, offset).replace(reUnescapedString, escapeStringChar);
          if (escapeValue) {
            isEscaping = true;
            source += "' +\n__e(" + escapeValue + ") +\n'";
          }
          if (evaluateValue) {
            isEvaluating = true;
            source += "';\n" + evaluateValue + ";\n__p += '";
          }
          if (interpolateValue) {
            source += "' +\n((__t = (" + interpolateValue + ")) == null ? '' : __t) +\n'";
          }
          index2 = offset + match.length;
          return match;
        });
        source += "';\n";
        var variable = hasOwnProperty2.call(options, "variable") && options.variable;
        if (!variable) {
          source = "with (obj) {\n" + source + "\n}\n";
        } else if (reForbiddenIdentifierChars.test(variable)) {
          throw new Error2(INVALID_TEMPL_VAR_ERROR_TEXT);
        }
        source = (isEvaluating ? source.replace(reEmptyStringLeading, "") : source).replace(reEmptyStringMiddle, "$1").replace(reEmptyStringTrailing, "$1;");
        source = "function(" + (variable || "obj") + ") {\n" + (variable ? "" : "obj || (obj = {});\n") + "var __t, __p = ''" + (isEscaping ? ", __e = _.escape" : "") + (isEvaluating ? ", __j = Array.prototype.join;\nfunction print() { __p += __j.call(arguments, '') }\n" : ";\n") + source + "return __p\n}";
        var result2 = attempt(function() {
          return Function2(importsKeys, sourceURL + "return " + source).apply(undefined$1, importsValues);
        });
        result2.source = source;
        if (isError(result2)) {
          throw result2;
        }
        return result2;
      }
      function toLower(value) {
        return toString4(value).toLowerCase();
      }
      function toUpper(value) {
        return toString4(value).toUpperCase();
      }
      function trim2(string2, chars, guard) {
        string2 = toString4(string2);
        if (string2 && (guard || chars === undefined$1)) {
          return baseTrim(string2);
        }
        if (!string2 || !(chars = baseToString2(chars))) {
          return string2;
        }
        var strSymbols = stringToArray2(string2), chrSymbols = stringToArray2(chars), start = charsStartIndex(strSymbols, chrSymbols), end = charsEndIndex(strSymbols, chrSymbols) + 1;
        return castSlice2(strSymbols, start, end).join("");
      }
      function trimEnd(string2, chars, guard) {
        string2 = toString4(string2);
        if (string2 && (guard || chars === undefined$1)) {
          return string2.slice(0, trimmedEndIndex(string2) + 1);
        }
        if (!string2 || !(chars = baseToString2(chars))) {
          return string2;
        }
        var strSymbols = stringToArray2(string2), end = charsEndIndex(strSymbols, stringToArray2(chars)) + 1;
        return castSlice2(strSymbols, 0, end).join("");
      }
      function trimStart(string2, chars, guard) {
        string2 = toString4(string2);
        if (string2 && (guard || chars === undefined$1)) {
          return string2.replace(reTrimStart, "");
        }
        if (!string2 || !(chars = baseToString2(chars))) {
          return string2;
        }
        var strSymbols = stringToArray2(string2), start = charsStartIndex(strSymbols, stringToArray2(chars));
        return castSlice2(strSymbols, start).join("");
      }
      function truncate(string2, options) {
        var length = DEFAULT_TRUNC_LENGTH, omission = DEFAULT_TRUNC_OMISSION;
        if (isObject2(options)) {
          var separator = "separator" in options ? options.separator : separator;
          length = "length" in options ? toInteger(options.length) : length;
          omission = "omission" in options ? baseToString2(options.omission) : omission;
        }
        string2 = toString4(string2);
        var strLength = string2.length;
        if (hasUnicode2(string2)) {
          var strSymbols = stringToArray2(string2);
          strLength = strSymbols.length;
        }
        if (length >= strLength) {
          return string2;
        }
        var end = length - stringSize(omission);
        if (end < 1) {
          return omission;
        }
        var result2 = strSymbols ? castSlice2(strSymbols, 0, end).join("") : string2.slice(0, end);
        if (separator === undefined$1) {
          return result2 + omission;
        }
        if (strSymbols) {
          end += result2.length - end;
        }
        if (isRegExp2(separator)) {
          if (string2.slice(end).search(separator)) {
            var match, substring = result2;
            if (!separator.global) {
              separator = RegExp2(separator.source, toString4(reFlags.exec(separator)) + "g");
            }
            separator.lastIndex = 0;
            while (match = separator.exec(substring)) {
              var newEnd = match.index;
            }
            result2 = result2.slice(0, newEnd === undefined$1 ? end : newEnd);
          }
        } else if (string2.indexOf(baseToString2(separator), end) != end) {
          var index2 = result2.lastIndexOf(separator);
          if (index2 > -1) {
            result2 = result2.slice(0, index2);
          }
        }
        return result2 + omission;
      }
      function unescape(string2) {
        string2 = toString4(string2);
        return string2 && reHasEscapedHtml.test(string2) ? string2.replace(reEscapedHtml, unescapeHtmlChar) : string2;
      }
      var upperCase = createCompounder2(function(result2, word, index2) {
        return result2 + (index2 ? " " : "") + word.toUpperCase();
      });
      var upperFirst2 = createCaseFirst2("toUpperCase");
      function words2(string2, pattern, guard) {
        string2 = toString4(string2);
        pattern = guard ? undefined$1 : pattern;
        if (pattern === undefined$1) {
          return hasUnicodeWord2(string2) ? unicodeWords2(string2) : asciiWords2(string2);
        }
        return string2.match(pattern) || [];
      }
      var attempt = baseRest(function(func, args) {
        try {
          return apply(func, undefined$1, args);
        } catch (e) {
          return isError(e) ? e : new Error2(e);
        }
      });
      var bindAll = flatRest(function(object2, methodNames) {
        arrayEach(methodNames, function(key) {
          key = toKey2(key);
          baseAssignValue2(object2, key, bind(object2[key], object2));
        });
        return object2;
      });
      function cond(pairs2) {
        var length = pairs2 == null ? 0 : pairs2.length, toIteratee = getIteratee();
        pairs2 = !length ? [] : arrayMap2(pairs2, function(pair) {
          if (typeof pair[1] != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT2);
          }
          return [toIteratee(pair[0]), pair[1]];
        });
        return baseRest(function(args) {
          var index2 = -1;
          while (++index2 < length) {
            var pair = pairs2[index2];
            if (apply(pair[0], this, args)) {
              return apply(pair[1], this, args);
            }
          }
        });
      }
      function conforms(source) {
        return baseConforms(baseClone2(source, CLONE_DEEP_FLAG));
      }
      function constant(value) {
        return function() {
          return value;
        };
      }
      function defaultTo(value, defaultValue) {
        return value == null || value !== value ? defaultValue : value;
      }
      var flow = createFlow();
      var flowRight = createFlow(true);
      function identity2(value) {
        return value;
      }
      function iteratee(func) {
        return baseIteratee2(typeof func == "function" ? func : baseClone2(func, CLONE_DEEP_FLAG));
      }
      function matches(source) {
        return baseMatches2(baseClone2(source, CLONE_DEEP_FLAG));
      }
      function matchesProperty(path2, srcValue) {
        return baseMatchesProperty2(path2, baseClone2(srcValue, CLONE_DEEP_FLAG));
      }
      var method = baseRest(function(path2, args) {
        return function(object2) {
          return baseInvoke(object2, path2, args);
        };
      });
      var methodOf = baseRest(function(object2, args) {
        return function(path2) {
          return baseInvoke(object2, path2, args);
        };
      });
      function mixin(object2, source, options) {
        var props = keys2(source), methodNames = baseFunctions(source, props);
        if (options == null && !(isObject2(source) && (methodNames.length || !props.length))) {
          options = source;
          source = object2;
          object2 = this;
          methodNames = baseFunctions(source, keys2(source));
        }
        var chain2 = !(isObject2(options) && "chain" in options) || !!options.chain, isFunc = isFunction3(object2);
        arrayEach(methodNames, function(methodName) {
          var func = source[methodName];
          object2[methodName] = func;
          if (isFunc) {
            object2.prototype[methodName] = function() {
              var chainAll = this.__chain__;
              if (chain2 || chainAll) {
                var result2 = object2(this.__wrapped__), actions = result2.__actions__ = copyArray(this.__actions__);
                actions.push({ "func": func, "args": arguments, "thisArg": object2 });
                result2.__chain__ = chainAll;
                return result2;
              }
              return func.apply(object2, arrayPush2([this.value()], arguments));
            };
          }
        });
        return object2;
      }
      function noConflict() {
        if (root2._ === this) {
          root2._ = oldDash;
        }
        return this;
      }
      function noop2() {
      }
      function nthArg(n) {
        n = toInteger(n);
        return baseRest(function(args) {
          return baseNth(args, n);
        });
      }
      var over = createOver(arrayMap2);
      var overEvery = createOver(arrayEvery);
      var overSome = createOver(arraySome2);
      function property2(path2) {
        return isKey2(path2) ? baseProperty2(toKey2(path2)) : basePropertyDeep2(path2);
      }
      function propertyOf(object2) {
        return function(path2) {
          return object2 == null ? undefined$1 : baseGet2(object2, path2);
        };
      }
      var range = createRange();
      var rangeRight = createRange(true);
      function stubArray2() {
        return [];
      }
      function stubFalse2() {
        return false;
      }
      function stubObject() {
        return {};
      }
      function stubString() {
        return "";
      }
      function stubTrue() {
        return true;
      }
      function times(n, iteratee2) {
        n = toInteger(n);
        if (n < 1 || n > MAX_SAFE_INTEGER2) {
          return [];
        }
        var index2 = MAX_ARRAY_LENGTH, length = nativeMin(n, MAX_ARRAY_LENGTH);
        iteratee2 = getIteratee(iteratee2);
        n -= MAX_ARRAY_LENGTH;
        var result2 = baseTimes2(length, iteratee2);
        while (++index2 < n) {
          iteratee2(index2);
        }
        return result2;
      }
      function toPath(value) {
        if (isArray2(value)) {
          return arrayMap2(value, toKey2);
        }
        return isSymbol2(value) ? [value] : copyArray(stringToPath2(toString4(value)));
      }
      function uniqueId(prefix) {
        var id = ++idCounter;
        return toString4(prefix) + id;
      }
      var add = createMathOperation(function(augend, addend) {
        return augend + addend;
      }, 0);
      var ceil = createRound("ceil");
      var divide = createMathOperation(function(dividend, divisor) {
        return dividend / divisor;
      }, 1);
      var floor = createRound("floor");
      function max(array2) {
        return array2 && array2.length ? baseExtremum(array2, identity2, baseGt) : undefined$1;
      }
      function maxBy(array2, iteratee2) {
        return array2 && array2.length ? baseExtremum(array2, getIteratee(iteratee2, 2), baseGt) : undefined$1;
      }
      function mean(array2) {
        return baseMean(array2, identity2);
      }
      function meanBy(array2, iteratee2) {
        return baseMean(array2, getIteratee(iteratee2, 2));
      }
      function min(array2) {
        return array2 && array2.length ? baseExtremum(array2, identity2, baseLt) : undefined$1;
      }
      function minBy(array2, iteratee2) {
        return array2 && array2.length ? baseExtremum(array2, getIteratee(iteratee2, 2), baseLt) : undefined$1;
      }
      var multiply = createMathOperation(function(multiplier, multiplicand) {
        return multiplier * multiplicand;
      }, 1);
      var round = createRound("round");
      var subtract = createMathOperation(function(minuend, subtrahend) {
        return minuend - subtrahend;
      }, 0);
      function sum(array2) {
        return array2 && array2.length ? baseSum(array2, identity2) : 0;
      }
      function sumBy(array2, iteratee2) {
        return array2 && array2.length ? baseSum(array2, getIteratee(iteratee2, 2)) : 0;
      }
      lodash2.after = after;
      lodash2.ary = ary;
      lodash2.assign = assign;
      lodash2.assignIn = assignIn;
      lodash2.assignInWith = assignInWith;
      lodash2.assignWith = assignWith;
      lodash2.at = at;
      lodash2.before = before;
      lodash2.bind = bind;
      lodash2.bindAll = bindAll;
      lodash2.bindKey = bindKey;
      lodash2.castArray = castArray2;
      lodash2.chain = chain;
      lodash2.chunk = chunk;
      lodash2.compact = compact;
      lodash2.concat = concat;
      lodash2.cond = cond;
      lodash2.conforms = conforms;
      lodash2.constant = constant;
      lodash2.countBy = countBy;
      lodash2.create = create2;
      lodash2.curry = curry;
      lodash2.curryRight = curryRight;
      lodash2.debounce = debounce;
      lodash2.defaults = defaults;
      lodash2.defaultsDeep = defaultsDeep;
      lodash2.defer = defer;
      lodash2.delay = delay;
      lodash2.difference = difference;
      lodash2.differenceBy = differenceBy;
      lodash2.differenceWith = differenceWith;
      lodash2.drop = drop;
      lodash2.dropRight = dropRight;
      lodash2.dropRightWhile = dropRightWhile;
      lodash2.dropWhile = dropWhile;
      lodash2.fill = fill2;
      lodash2.filter = filter;
      lodash2.flatMap = flatMap;
      lodash2.flatMapDeep = flatMapDeep;
      lodash2.flatMapDepth = flatMapDepth;
      lodash2.flatten = flatten;
      lodash2.flattenDeep = flattenDeep;
      lodash2.flattenDepth = flattenDepth;
      lodash2.flip = flip;
      lodash2.flow = flow;
      lodash2.flowRight = flowRight;
      lodash2.fromPairs = fromPairs;
      lodash2.functions = functions;
      lodash2.functionsIn = functionsIn;
      lodash2.groupBy = groupBy;
      lodash2.initial = initial;
      lodash2.intersection = intersection;
      lodash2.intersectionBy = intersectionBy;
      lodash2.intersectionWith = intersectionWith;
      lodash2.invert = invert;
      lodash2.invertBy = invertBy;
      lodash2.invokeMap = invokeMap;
      lodash2.iteratee = iteratee;
      lodash2.keyBy = keyBy;
      lodash2.keys = keys2;
      lodash2.keysIn = keysIn;
      lodash2.map = map2;
      lodash2.mapKeys = mapKeys2;
      lodash2.mapValues = mapValues2;
      lodash2.matches = matches;
      lodash2.matchesProperty = matchesProperty;
      lodash2.memoize = memoize2;
      lodash2.merge = merge2;
      lodash2.mergeWith = mergeWith;
      lodash2.method = method;
      lodash2.methodOf = methodOf;
      lodash2.mixin = mixin;
      lodash2.negate = negate;
      lodash2.nthArg = nthArg;
      lodash2.omit = omit;
      lodash2.omitBy = omitBy;
      lodash2.once = once2;
      lodash2.orderBy = orderBy;
      lodash2.over = over;
      lodash2.overArgs = overArgs;
      lodash2.overEvery = overEvery;
      lodash2.overSome = overSome;
      lodash2.partial = partial;
      lodash2.partialRight = partialRight;
      lodash2.partition = partition;
      lodash2.pick = pick;
      lodash2.pickBy = pickBy;
      lodash2.property = property2;
      lodash2.propertyOf = propertyOf;
      lodash2.pull = pull;
      lodash2.pullAll = pullAll;
      lodash2.pullAllBy = pullAllBy;
      lodash2.pullAllWith = pullAllWith;
      lodash2.pullAt = pullAt;
      lodash2.range = range;
      lodash2.rangeRight = rangeRight;
      lodash2.rearg = rearg;
      lodash2.reject = reject;
      lodash2.remove = remove;
      lodash2.rest = rest;
      lodash2.reverse = reverse;
      lodash2.sampleSize = sampleSize;
      lodash2.set = set2;
      lodash2.setWith = setWith;
      lodash2.shuffle = shuffle;
      lodash2.slice = slice;
      lodash2.sortBy = sortBy;
      lodash2.sortedUniq = sortedUniq;
      lodash2.sortedUniqBy = sortedUniqBy;
      lodash2.split = split2;
      lodash2.spread = spread;
      lodash2.tail = tail;
      lodash2.take = take;
      lodash2.takeRight = takeRight;
      lodash2.takeRightWhile = takeRightWhile;
      lodash2.takeWhile = takeWhile;
      lodash2.tap = tap;
      lodash2.throttle = throttle;
      lodash2.thru = thru;
      lodash2.toArray = toArray2;
      lodash2.toPairs = toPairs;
      lodash2.toPairsIn = toPairsIn;
      lodash2.toPath = toPath;
      lodash2.toPlainObject = toPlainObject;
      lodash2.transform = transform2;
      lodash2.unary = unary;
      lodash2.union = union;
      lodash2.unionBy = unionBy;
      lodash2.unionWith = unionWith;
      lodash2.uniq = uniq;
      lodash2.uniqBy = uniqBy;
      lodash2.uniqWith = uniqWith;
      lodash2.unset = unset;
      lodash2.unzip = unzip;
      lodash2.unzipWith = unzipWith;
      lodash2.update = update;
      lodash2.updateWith = updateWith;
      lodash2.values = values;
      lodash2.valuesIn = valuesIn;
      lodash2.without = without;
      lodash2.words = words2;
      lodash2.wrap = wrap;
      lodash2.xor = xor;
      lodash2.xorBy = xorBy;
      lodash2.xorWith = xorWith;
      lodash2.zip = zip2;
      lodash2.zipObject = zipObject;
      lodash2.zipObjectDeep = zipObjectDeep;
      lodash2.zipWith = zipWith;
      lodash2.entries = toPairs;
      lodash2.entriesIn = toPairsIn;
      lodash2.extend = assignIn;
      lodash2.extendWith = assignInWith;
      mixin(lodash2, lodash2);
      lodash2.add = add;
      lodash2.attempt = attempt;
      lodash2.camelCase = camelCase2;
      lodash2.capitalize = capitalize2;
      lodash2.ceil = ceil;
      lodash2.clamp = clamp;
      lodash2.clone = clone2;
      lodash2.cloneDeep = cloneDeep;
      lodash2.cloneDeepWith = cloneDeepWith;
      lodash2.cloneWith = cloneWith;
      lodash2.conformsTo = conformsTo;
      lodash2.deburr = deburr2;
      lodash2.defaultTo = defaultTo;
      lodash2.divide = divide;
      lodash2.endsWith = endsWith;
      lodash2.eq = eq2;
      lodash2.escape = escape2;
      lodash2.escapeRegExp = escapeRegExp;
      lodash2.every = every2;
      lodash2.find = find;
      lodash2.findIndex = findIndex2;
      lodash2.findKey = findKey;
      lodash2.findLast = findLast;
      lodash2.findLastIndex = findLastIndex;
      lodash2.findLastKey = findLastKey;
      lodash2.floor = floor;
      lodash2.forEach = forEach2;
      lodash2.forEachRight = forEachRight;
      lodash2.forIn = forIn;
      lodash2.forInRight = forInRight;
      lodash2.forOwn = forOwn;
      lodash2.forOwnRight = forOwnRight;
      lodash2.get = get2;
      lodash2.gt = gt;
      lodash2.gte = gte;
      lodash2.has = has2;
      lodash2.hasIn = hasIn2;
      lodash2.head = head;
      lodash2.identity = identity2;
      lodash2.includes = includes;
      lodash2.indexOf = indexOf;
      lodash2.inRange = inRange;
      lodash2.invoke = invoke;
      lodash2.isArguments = isArguments2;
      lodash2.isArray = isArray2;
      lodash2.isArrayBuffer = isArrayBuffer;
      lodash2.isArrayLike = isArrayLike2;
      lodash2.isArrayLikeObject = isArrayLikeObject;
      lodash2.isBoolean = isBoolean2;
      lodash2.isBuffer = isBuffer2;
      lodash2.isDate = isDate2;
      lodash2.isElement = isElement;
      lodash2.isEmpty = isEmpty;
      lodash2.isEqual = isEqual2;
      lodash2.isEqualWith = isEqualWith;
      lodash2.isError = isError;
      lodash2.isFinite = isFinite2;
      lodash2.isFunction = isFunction3;
      lodash2.isInteger = isInteger2;
      lodash2.isLength = isLength2;
      lodash2.isMap = isMap;
      lodash2.isMatch = isMatch;
      lodash2.isMatchWith = isMatchWith;
      lodash2.isNaN = isNaN2;
      lodash2.isNative = isNative;
      lodash2.isNil = isNil2;
      lodash2.isNull = isNull2;
      lodash2.isNumber = isNumber2;
      lodash2.isObject = isObject2;
      lodash2.isObjectLike = isObjectLike2;
      lodash2.isPlainObject = isPlainObject2;
      lodash2.isRegExp = isRegExp2;
      lodash2.isSafeInteger = isSafeInteger;
      lodash2.isSet = isSet;
      lodash2.isString = isString;
      lodash2.isSymbol = isSymbol2;
      lodash2.isTypedArray = isTypedArray2;
      lodash2.isUndefined = isUndefined2;
      lodash2.isWeakMap = isWeakMap;
      lodash2.isWeakSet = isWeakSet;
      lodash2.join = join;
      lodash2.kebabCase = kebabCase;
      lodash2.last = last;
      lodash2.lastIndexOf = lastIndexOf;
      lodash2.lowerCase = lowerCase;
      lodash2.lowerFirst = lowerFirst;
      lodash2.lt = lt;
      lodash2.lte = lte;
      lodash2.max = max;
      lodash2.maxBy = maxBy;
      lodash2.mean = mean;
      lodash2.meanBy = meanBy;
      lodash2.min = min;
      lodash2.minBy = minBy;
      lodash2.stubArray = stubArray2;
      lodash2.stubFalse = stubFalse2;
      lodash2.stubObject = stubObject;
      lodash2.stubString = stubString;
      lodash2.stubTrue = stubTrue;
      lodash2.multiply = multiply;
      lodash2.nth = nth;
      lodash2.noConflict = noConflict;
      lodash2.noop = noop2;
      lodash2.now = now;
      lodash2.pad = pad2;
      lodash2.padEnd = padEnd;
      lodash2.padStart = padStart;
      lodash2.parseInt = parseInt2;
      lodash2.random = random;
      lodash2.reduce = reduce2;
      lodash2.reduceRight = reduceRight;
      lodash2.repeat = repeat2;
      lodash2.replace = replace;
      lodash2.result = result;
      lodash2.round = round;
      lodash2.runInContext = runInContext2;
      lodash2.sample = sample;
      lodash2.size = size;
      lodash2.snakeCase = snakeCase2;
      lodash2.some = some;
      lodash2.sortedIndex = sortedIndex;
      lodash2.sortedIndexBy = sortedIndexBy;
      lodash2.sortedIndexOf = sortedIndexOf;
      lodash2.sortedLastIndex = sortedLastIndex;
      lodash2.sortedLastIndexBy = sortedLastIndexBy;
      lodash2.sortedLastIndexOf = sortedLastIndexOf;
      lodash2.startCase = startCase;
      lodash2.startsWith = startsWith;
      lodash2.subtract = subtract;
      lodash2.sum = sum;
      lodash2.sumBy = sumBy;
      lodash2.template = template2;
      lodash2.times = times;
      lodash2.toFinite = toFinite;
      lodash2.toInteger = toInteger;
      lodash2.toLength = toLength;
      lodash2.toLower = toLower;
      lodash2.toNumber = toNumber;
      lodash2.toSafeInteger = toSafeInteger;
      lodash2.toString = toString4;
      lodash2.toUpper = toUpper;
      lodash2.trim = trim2;
      lodash2.trimEnd = trimEnd;
      lodash2.trimStart = trimStart;
      lodash2.truncate = truncate;
      lodash2.unescape = unescape;
      lodash2.uniqueId = uniqueId;
      lodash2.upperCase = upperCase;
      lodash2.upperFirst = upperFirst2;
      lodash2.each = forEach2;
      lodash2.eachRight = forEachRight;
      lodash2.first = head;
      mixin(lodash2, function() {
        var source = {};
        baseForOwn2(lodash2, function(func, methodName) {
          if (!hasOwnProperty2.call(lodash2.prototype, methodName)) {
            source[methodName] = func;
          }
        });
        return source;
      }(), { "chain": false });
      lodash2.VERSION = VERSION;
      arrayEach(["bind", "bindKey", "curry", "curryRight", "partial", "partialRight"], function(methodName) {
        lodash2[methodName].placeholder = lodash2;
      });
      arrayEach(["drop", "take"], function(methodName, index2) {
        LazyWrapper.prototype[methodName] = function(n) {
          n = n === undefined$1 ? 1 : nativeMax(toInteger(n), 0);
          var result2 = this.__filtered__ && !index2 ? new LazyWrapper(this) : this.clone();
          if (result2.__filtered__) {
            result2.__takeCount__ = nativeMin(n, result2.__takeCount__);
          } else {
            result2.__views__.push({
              "size": nativeMin(n, MAX_ARRAY_LENGTH),
              "type": methodName + (result2.__dir__ < 0 ? "Right" : "")
            });
          }
          return result2;
        };
        LazyWrapper.prototype[methodName + "Right"] = function(n) {
          return this.reverse()[methodName](n).reverse();
        };
      });
      arrayEach(["filter", "map", "takeWhile"], function(methodName, index2) {
        var type2 = index2 + 1, isFilter = type2 == LAZY_FILTER_FLAG || type2 == LAZY_WHILE_FLAG;
        LazyWrapper.prototype[methodName] = function(iteratee2) {
          var result2 = this.clone();
          result2.__iteratees__.push({
            "iteratee": getIteratee(iteratee2, 3),
            "type": type2
          });
          result2.__filtered__ = result2.__filtered__ || isFilter;
          return result2;
        };
      });
      arrayEach(["head", "last"], function(methodName, index2) {
        var takeName = "take" + (index2 ? "Right" : "");
        LazyWrapper.prototype[methodName] = function() {
          return this[takeName](1).value()[0];
        };
      });
      arrayEach(["initial", "tail"], function(methodName, index2) {
        var dropName = "drop" + (index2 ? "" : "Right");
        LazyWrapper.prototype[methodName] = function() {
          return this.__filtered__ ? new LazyWrapper(this) : this[dropName](1);
        };
      });
      LazyWrapper.prototype.compact = function() {
        return this.filter(identity2);
      };
      LazyWrapper.prototype.find = function(predicate) {
        return this.filter(predicate).head();
      };
      LazyWrapper.prototype.findLast = function(predicate) {
        return this.reverse().find(predicate);
      };
      LazyWrapper.prototype.invokeMap = baseRest(function(path2, args) {
        if (typeof path2 == "function") {
          return new LazyWrapper(this);
        }
        return this.map(function(value) {
          return baseInvoke(value, path2, args);
        });
      });
      LazyWrapper.prototype.reject = function(predicate) {
        return this.filter(negate(getIteratee(predicate)));
      };
      LazyWrapper.prototype.slice = function(start, end) {
        start = toInteger(start);
        var result2 = this;
        if (result2.__filtered__ && (start > 0 || end < 0)) {
          return new LazyWrapper(result2);
        }
        if (start < 0) {
          result2 = result2.takeRight(-start);
        } else if (start) {
          result2 = result2.drop(start);
        }
        if (end !== undefined$1) {
          end = toInteger(end);
          result2 = end < 0 ? result2.dropRight(-end) : result2.take(end - start);
        }
        return result2;
      };
      LazyWrapper.prototype.takeRightWhile = function(predicate) {
        return this.reverse().takeWhile(predicate).reverse();
      };
      LazyWrapper.prototype.toArray = function() {
        return this.take(MAX_ARRAY_LENGTH);
      };
      baseForOwn2(LazyWrapper.prototype, function(func, methodName) {
        var checkIteratee = /^(?:filter|find|map|reject)|While$/.test(methodName), isTaker = /^(?:head|last)$/.test(methodName), lodashFunc = lodash2[isTaker ? "take" + (methodName == "last" ? "Right" : "") : methodName], retUnwrapped = isTaker || /^find/.test(methodName);
        if (!lodashFunc) {
          return;
        }
        lodash2.prototype[methodName] = function() {
          var value = this.__wrapped__, args = isTaker ? [1] : arguments, isLazy = value instanceof LazyWrapper, iteratee2 = args[0], useLazy = isLazy || isArray2(value);
          var interceptor = function(value2) {
            var result3 = lodashFunc.apply(lodash2, arrayPush2([value2], args));
            return isTaker && chainAll ? result3[0] : result3;
          };
          if (useLazy && checkIteratee && typeof iteratee2 == "function" && iteratee2.length != 1) {
            isLazy = useLazy = false;
          }
          var chainAll = this.__chain__, isHybrid = !!this.__actions__.length, isUnwrapped = retUnwrapped && !chainAll, onlyLazy = isLazy && !isHybrid;
          if (!retUnwrapped && useLazy) {
            value = onlyLazy ? value : new LazyWrapper(this);
            var result2 = func.apply(value, args);
            result2.__actions__.push({ "func": thru, "args": [interceptor], "thisArg": undefined$1 });
            return new LodashWrapper(result2, chainAll);
          }
          if (isUnwrapped && onlyLazy) {
            return func.apply(this, args);
          }
          result2 = this.thru(interceptor);
          return isUnwrapped ? isTaker ? result2.value()[0] : result2.value() : result2;
        };
      });
      arrayEach(["pop", "push", "shift", "sort", "splice", "unshift"], function(methodName) {
        var func = arrayProto2[methodName], chainName = /^(?:push|sort|unshift)$/.test(methodName) ? "tap" : "thru", retUnwrapped = /^(?:pop|shift)$/.test(methodName);
        lodash2.prototype[methodName] = function() {
          var args = arguments;
          if (retUnwrapped && !this.__chain__) {
            var value = this.value();
            return func.apply(isArray2(value) ? value : [], args);
          }
          return this[chainName](function(value2) {
            return func.apply(isArray2(value2) ? value2 : [], args);
          });
        };
      });
      baseForOwn2(LazyWrapper.prototype, function(func, methodName) {
        var lodashFunc = lodash2[methodName];
        if (lodashFunc) {
          var key = lodashFunc.name + "";
          if (!hasOwnProperty2.call(realNames, key)) {
            realNames[key] = [];
          }
          realNames[key].push({ "name": methodName, "func": lodashFunc });
        }
      });
      realNames[createHybrid(undefined$1, WRAP_BIND_KEY_FLAG).name] = [{
        "name": "wrapper",
        "func": undefined$1
      }];
      LazyWrapper.prototype.clone = lazyClone;
      LazyWrapper.prototype.reverse = lazyReverse;
      LazyWrapper.prototype.value = lazyValue;
      lodash2.prototype.at = wrapperAt;
      lodash2.prototype.chain = wrapperChain;
      lodash2.prototype.commit = wrapperCommit;
      lodash2.prototype.next = wrapperNext;
      lodash2.prototype.plant = wrapperPlant;
      lodash2.prototype.reverse = wrapperReverse;
      lodash2.prototype.toJSON = lodash2.prototype.valueOf = lodash2.prototype.value = wrapperValue;
      lodash2.prototype.first = lodash2.prototype.head;
      if (symIterator) {
        lodash2.prototype[symIterator] = wrapperToIterator;
      }
      return lodash2;
    };
    var _2 = runInContext();
    if (freeModule) {
      (freeModule.exports = _2)._ = _2;
      freeExports._ = _2;
    } else {
      root2._ = _2;
    }
  }).call(commonjsGlobal);
})(lodash, lodash.exports);
var lodashExports = lodash.exports;
const ___default = /* @__PURE__ */ getDefaultExportFromCjs(lodashExports);
const timeRegex = /^(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9])(.[0-9]{1,3})?$/;
const isDate$1 = (v) => {
  return dates$1.isDate(v);
};
const parseTime = (value) => {
  if (isDate$1(value)) {
    return dates$1.format(value, "HH:mm:ss.SSS");
  }
  if (typeof value !== "string") {
    throw new Error(`Expected a string, got a ${typeof value}`);
  }
  const result = value.match(timeRegex);
  if (result === null) {
    throw new Error("Invalid time format, expected HH:mm:ss.SSS");
  }
  const [, hours, minutes, seconds, fraction = ".000"] = result;
  const fractionPart = lodashExports.padEnd(fraction.slice(1), 3, "0");
  return `${hours}:${minutes}:${seconds}.${fractionPart}`;
};
const parseDate = (value) => {
  if (isDate$1(value)) {
    return dates$1.format(value, "yyyy-MM-dd");
  }
  if (typeof value !== "string") {
    throw new Error(`Expected a string, got a ${typeof value}`);
  }
  try {
    const date2 = dates$1.parseISO(value);
    if (dates$1.isValid(date2)) return dates$1.format(date2, "yyyy-MM-dd");
    throw new Error(`Invalid format, expected an ISO compatible date`);
  } catch (error2) {
    throw new Error(`Invalid format, expected an ISO compatible date`);
  }
};
const parseDateTimeOrTimestamp = (value) => {
  if (isDate$1(value)) {
    return value;
  }
  if (typeof value !== "string") {
    throw new Error(`Expected a string, got a ${typeof value}`);
  }
  try {
    const date2 = dates$1.parseISO(value);
    if (dates$1.isValid(date2)) return date2;
    const milliUnixDate = dates$1.parse(value, "T", /* @__PURE__ */ new Date());
    if (dates$1.isValid(milliUnixDate)) return milliUnixDate;
    throw new Error(`Invalid format, expected a timestamp or an ISO date`);
  } catch (error2) {
    throw new Error(`Invalid format, expected a timestamp or an ISO date`);
  }
};
const parseBoolean = (value, options) => {
  const { forceCast = false } = options;
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string" || typeof value === "number") {
    if ([
      "true",
      "t",
      "1",
      1
    ].includes(value)) {
      return true;
    }
    if ([
      "false",
      "f",
      "0",
      0
    ].includes(value)) {
      return false;
    }
  }
  if (forceCast) {
    return Boolean(value);
  }
  throw new Error('Invalid boolean input. Expected "t","1","true","false","0","f"');
};
const parseType = (options) => {
  const { type: type2, value, forceCast } = options;
  switch (type2) {
    case "boolean":
      return parseBoolean(value, {
        forceCast
      });
    case "integer":
    case "biginteger":
    case "float":
    case "decimal": {
      return lodashExports.toNumber(value);
    }
    case "time": {
      return parseTime(value);
    }
    case "date": {
      return parseDate(value);
    }
    case "timestamp":
    case "datetime": {
      return parseDateTimeOrTimestamp(value);
    }
    default:
      return value;
  }
};
function envFn(key, defaultValue) {
  return ___default.has(process.env, key) ? process.env[key] : defaultValue;
}
function getKey(key) {
  return process.env[key] ?? "";
}
const utils$9 = {
  int(key, defaultValue) {
    if (!___default.has(process.env, key)) {
      return defaultValue;
    }
    return parseInt(getKey(key), 10);
  },
  float(key, defaultValue) {
    if (!___default.has(process.env, key)) {
      return defaultValue;
    }
    return parseFloat(getKey(key));
  },
  bool(key, defaultValue) {
    if (!___default.has(process.env, key)) {
      return defaultValue;
    }
    return getKey(key) === "true";
  },
  json(key, defaultValue) {
    if (!___default.has(process.env, key)) {
      return defaultValue;
    }
    try {
      return JSON.parse(getKey(key));
    } catch (error2) {
      if (error2 instanceof Error) {
        throw new Error(`Invalid json environment variable ${key}: ${error2.message}`);
      }
      throw error2;
    }
  },
  array(key, defaultValue) {
    if (!___default.has(process.env, key)) {
      return defaultValue;
    }
    let value = getKey(key);
    if (value.startsWith("[") && value.endsWith("]")) {
      value = value.substring(1, value.length - 1);
    }
    return value.split(",").map((v) => {
      return ___default.trim(___default.trim(v, " "), '"');
    });
  },
  date(key, defaultValue) {
    if (!___default.has(process.env, key)) {
      return defaultValue;
    }
    return new Date(getKey(key));
  },
  /**
  * Gets a value from env that matches oneOf provided values
  * @param {string} key
  * @param {string[]} expectedValues
  * @param {string|undefined} defaultValue
  * @returns {string|undefined}
  */
  oneOf(key, expectedValues, defaultValue) {
    if (!expectedValues) {
      throw new Error(`env.oneOf requires expectedValues`);
    }
    if (defaultValue && !expectedValues.includes(defaultValue)) {
      throw new Error(`env.oneOf requires defaultValue to be included in expectedValues`);
    }
    const rawValue = env(key, defaultValue);
    return expectedValues.includes(rawValue) ? rawValue : defaultValue;
  }
};
const env = Object.assign(envFn, utils$9);
const SINGLE_TYPE = "singleType";
const COLLECTION_TYPE = "collectionType";
const ID_ATTRIBUTE$4 = "id";
const DOC_ID_ATTRIBUTE$4 = "documentId";
const PUBLISHED_AT_ATTRIBUTE$1 = "publishedAt";
const FIRST_PUBLISHED_AT_ATTRIBUTE = "firstPublishedAt";
const CREATED_BY_ATTRIBUTE$3 = "createdBy";
const UPDATED_BY_ATTRIBUTE$3 = "updatedBy";
const CREATED_AT_ATTRIBUTE = "createdAt";
const UPDATED_AT_ATTRIBUTE = "updatedAt";
const constants$6 = {
  ID_ATTRIBUTE: ID_ATTRIBUTE$4,
  DOC_ID_ATTRIBUTE: DOC_ID_ATTRIBUTE$4,
  PUBLISHED_AT_ATTRIBUTE: PUBLISHED_AT_ATTRIBUTE$1,
  FIRST_PUBLISHED_AT_ATTRIBUTE,
  CREATED_BY_ATTRIBUTE: CREATED_BY_ATTRIBUTE$3,
  UPDATED_BY_ATTRIBUTE: UPDATED_BY_ATTRIBUTE$3,
  CREATED_AT_ATTRIBUTE,
  UPDATED_AT_ATTRIBUTE,
  SINGLE_TYPE,
  COLLECTION_TYPE
};
const getTimestamps = (model) => {
  const attributes = [];
  if (fp.has(CREATED_AT_ATTRIBUTE, model.attributes)) {
    attributes.push(CREATED_AT_ATTRIBUTE);
  }
  if (fp.has(UPDATED_AT_ATTRIBUTE, model.attributes)) {
    attributes.push(UPDATED_AT_ATTRIBUTE);
  }
  return attributes;
};
const getCreatorFields = (model) => {
  const attributes = [];
  if (fp.has(CREATED_BY_ATTRIBUTE$3, model.attributes)) {
    attributes.push(CREATED_BY_ATTRIBUTE$3);
  }
  if (fp.has(UPDATED_BY_ATTRIBUTE$3, model.attributes)) {
    attributes.push(UPDATED_BY_ATTRIBUTE$3);
  }
  return attributes;
};
const getNonWritableAttributes = (model) => {
  if (!model) return [];
  const nonWritableAttributes = ___default.reduce(model.attributes, (acc, attr, attrName) => attr.writable === false ? acc.concat(attrName) : acc, []);
  return ___default.uniq([
    ID_ATTRIBUTE$4,
    DOC_ID_ATTRIBUTE$4,
    ...getTimestamps(model),
    ...nonWritableAttributes
  ]);
};
const getWritableAttributes = (model) => {
  if (!model) return [];
  return ___default.difference(Object.keys(model.attributes), getNonWritableAttributes(model));
};
const isWritableAttribute = (model, attributeName) => {
  return getWritableAttributes(model).includes(attributeName);
};
const getNonVisibleAttributes = (model) => {
  const nonVisibleAttributes = ___default.reduce(model.attributes, (acc, attr, attrName) => attr.visible === false ? acc.concat(attrName) : acc, []);
  return ___default.uniq([
    ID_ATTRIBUTE$4,
    DOC_ID_ATTRIBUTE$4,
    ...getTimestamps(model),
    ...nonVisibleAttributes
  ]);
};
const getVisibleAttributes = (model) => {
  return ___default.difference(___default.keys(model.attributes), getNonVisibleAttributes(model));
};
const isVisibleAttribute = (model, attributeName) => {
  return getVisibleAttributes(model).includes(attributeName);
};
const getOptions = (model) => ___default.assign({
  draftAndPublish: false
}, ___default.get(model, "options", {}));
const hasDraftAndPublish = (model) => ___default.get(model, "options.draftAndPublish", false) === true;
const hasFirstPublishedAtField = (model) => strapi.config.get("features.future.experimental_firstPublishedAt", false) && hasDraftAndPublish(model);
const isDraft = (data, model) => hasDraftAndPublish(model) && ___default.get(data, PUBLISHED_AT_ATTRIBUTE$1) === null;
const isSchema$1 = (data) => {
  return typeof data === "object" && data !== null && "modelType" in data && typeof data.modelType === "string" && [
    "component",
    "contentType"
  ].includes(data.modelType);
};
const isComponentSchema = (data) => {
  return isSchema$1(data) && data.modelType === "component";
};
const isContentTypeSchema = (data) => {
  return isSchema$1(data) && data.modelType === "contentType";
};
const isSingleType = ({ kind = COLLECTION_TYPE }) => kind === SINGLE_TYPE;
const isCollectionType = ({ kind = COLLECTION_TYPE }) => kind === COLLECTION_TYPE;
const isKind = (kind) => (model) => model.kind === kind;
const getStoredPrivateAttributes = (model) => fp.union(strapi?.config?.get("api.responses.privateAttributes", []) ?? [], fp.getOr([], "options.privateAttributes", model));
const getPrivateAttributes = (model) => {
  return ___default.union(getStoredPrivateAttributes(model), ___default.keys(___default.pickBy(model.attributes, (attr) => !!attr.private)));
};
const isPrivateAttribute = (model, attributeName) => {
  if (model?.attributes?.[attributeName]?.private === true) {
    return true;
  }
  return getStoredPrivateAttributes(model).includes(attributeName);
};
const isScalarAttribute = (attribute) => {
  return attribute && ![
    "media",
    "component",
    "relation",
    "dynamiczone"
  ].includes(attribute.type);
};
const getDoesAttributeRequireValidation = (attribute) => {
  return attribute.required || attribute.unique || Object.prototype.hasOwnProperty.call(attribute, "max") || Object.prototype.hasOwnProperty.call(attribute, "min") || Object.prototype.hasOwnProperty.call(attribute, "maxLength") || Object.prototype.hasOwnProperty.call(attribute, "minLength");
};
const isMediaAttribute = (attribute) => attribute?.type === "media";
const isRelationalAttribute = (attribute) => attribute?.type === "relation";
const HAS_RELATION_REORDERING = [
  "manyToMany",
  "manyToOne",
  "oneToMany"
];
const hasRelationReordering = (attribute) => isRelationalAttribute(attribute) && HAS_RELATION_REORDERING.includes(attribute.relation);
const isComponentAttribute = (attribute) => [
  "component",
  "dynamiczone"
].includes(attribute?.type);
const isDynamicZoneAttribute = (attribute) => !!attribute && attribute.type === "dynamiczone";
const isMorphToRelationalAttribute = (attribute) => {
  return !!attribute && isRelationalAttribute(attribute) && attribute.relation?.startsWith?.("morphTo");
};
const getComponentAttributes = (schema2) => {
  return ___default.reduce(schema2.attributes, (acc, attr, attrName) => {
    if (isComponentAttribute(attr)) acc.push(attrName);
    return acc;
  }, []);
};
const getScalarAttributes = (schema2) => {
  return ___default.reduce(schema2.attributes, (acc, attr, attrName) => {
    if (isScalarAttribute(attr)) acc.push(attrName);
    return acc;
  }, []);
};
const getRelationalAttributes = (schema2) => {
  return ___default.reduce(schema2.attributes, (acc, attr, attrName) => {
    if (isRelationalAttribute(attr)) acc.push(attrName);
    return acc;
  }, []);
};
const isTypedAttribute = (attribute, type2) => {
  return ___default.has(attribute, "type") && attribute.type === type2;
};
const getContentTypeRoutePrefix = (contentType) => {
  return isSingleType(contentType) ? ___default.kebabCase(contentType.info.singularName) : ___default.kebabCase(contentType.info.pluralName);
};
const contentTypes$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  constants: constants$6,
  getComponentAttributes,
  getContentTypeRoutePrefix,
  getCreatorFields,
  getDoesAttributeRequireValidation,
  getNonVisibleAttributes,
  getNonWritableAttributes,
  getOptions,
  getPrivateAttributes,
  getRelationalAttributes,
  getScalarAttributes,
  getTimestamps,
  getVisibleAttributes,
  getWritableAttributes,
  hasDraftAndPublish,
  hasFirstPublishedAtField,
  hasRelationReordering,
  isCollectionType,
  isComponentAttribute,
  isComponentSchema,
  isContentTypeSchema,
  isDraft,
  isDynamicZoneAttribute,
  isKind,
  isMediaAttribute,
  isMorphToRelationalAttribute,
  isPrivateAttribute,
  isRelationalAttribute,
  isScalarAttribute,
  isSchema: isSchema$1,
  isSingleType,
  isTypedAttribute,
  isVisibleAttribute,
  isWritableAttribute
}, Symbol.toStringTag, { value: "Module" }));
const { CREATED_BY_ATTRIBUTE: CREATED_BY_ATTRIBUTE$2, UPDATED_BY_ATTRIBUTE: UPDATED_BY_ATTRIBUTE$2 } = constants$6;
const setCreatorFields = ({ user, isEdition = false }) => (data) => {
  if (isEdition) {
    return fp.assoc(UPDATED_BY_ATTRIBUTE$2, user.id, data);
  }
  return fp.assign(data, {
    [CREATED_BY_ATTRIBUTE$2]: user.id,
    [UPDATED_BY_ATTRIBUTE$2]: user.id
  });
};
const createHook = () => {
  const state = {
    handlers: []
  };
  return {
    getHandlers() {
      return state.handlers;
    },
    register(handler) {
      state.handlers.push(handler);
      return this;
    },
    delete(handler) {
      state.handlers = fp.remove(fp.eq(handler), state.handlers);
      return this;
    },
    call() {
      throw new Error("Method not implemented");
    }
  };
};
const createAsyncSeriesHook = () => ({
  ...createHook(),
  async call(context) {
    for (const handler of this.getHandlers()) {
      await handler(context);
    }
  }
});
const createAsyncSeriesWaterfallHook = () => ({
  ...createHook(),
  async call(param) {
    let res = param;
    for (const handler of this.getHandlers()) {
      res = await handler(res);
    }
    return res;
  }
});
const createAsyncParallelHook = () => ({
  ...createHook(),
  async call(context) {
    const promises = this.getHandlers().map((handler) => handler(fp.cloneDeep(context)));
    return Promise.all(promises);
  }
});
const createAsyncBailHook = () => ({
  ...createHook(),
  async call(context) {
    for (const handler of this.getHandlers()) {
      const result = await handler(context);
      if (result !== void 0) {
        return result;
      }
    }
  }
});
const internals = {
  // Internal utils
  createHook
};
const hooks = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  createAsyncBailHook,
  createAsyncParallelHook,
  createAsyncSeriesHook,
  createAsyncSeriesWaterfallHook,
  internals
}, Symbol.toStringTag, { value: "Module" }));
const createProviderHooksMap = () => ({
  // Register events
  willRegister: createAsyncSeriesHook(),
  didRegister: createAsyncParallelHook(),
  // Delete events
  willDelete: createAsyncParallelHook(),
  didDelete: createAsyncParallelHook()
});
const providerFactory = (options = {}) => {
  const { throwOnDuplicates = true } = options;
  const state = {
    hooks: createProviderHooksMap(),
    registry: /* @__PURE__ */ new Map()
  };
  return {
    hooks: state.hooks,
    async register(key, item) {
      if (throwOnDuplicates && this.has(key)) {
        throw new Error(`Duplicated item key: ${key}`);
      }
      await state.hooks.willRegister.call({
        key,
        value: item
      });
      state.registry.set(key, item);
      await state.hooks.didRegister.call({
        key,
        value: fp.cloneDeep(item)
      });
      return this;
    },
    async delete(key) {
      if (this.has(key)) {
        const item = this.get(key);
        await state.hooks.willDelete.call({
          key,
          value: fp.cloneDeep(item)
        });
        state.registry.delete(key);
        await state.hooks.didDelete.call({
          key,
          value: fp.cloneDeep(item)
        });
      }
      return this;
    },
    get(key) {
      return state.registry.get(key);
    },
    values() {
      return Array.from(state.registry.values());
    },
    keys() {
      return Array.from(state.registry.keys());
    },
    has(key) {
      return state.registry.has(key);
    },
    size() {
      return state.registry.size;
    },
    async clear() {
      const keys2 = this.keys();
      for (const key of keys2) {
        await this.delete(key);
      }
      return this;
    }
  };
};
const traverseEntity = async (visitor2, options, entity) => {
  const { path: path2 = {
    raw: null,
    attribute: null,
    rawWithIndices: null
  }, schema: schema2, getModel } = options;
  let parent = options.parent;
  const traverseMorphRelationTarget = async (visitor3, path3, entry) => {
    const targetSchema = getModel(entry.__type);
    const traverseOptions = {
      schema: targetSchema,
      path: path3,
      getModel,
      parent
    };
    return traverseEntity(visitor3, traverseOptions, entry);
  };
  const traverseRelationTarget = (schema3) => async (visitor3, path3, entry) => {
    const traverseOptions = {
      schema: schema3,
      path: path3,
      getModel,
      parent
    };
    return traverseEntity(visitor3, traverseOptions, entry);
  };
  const traverseMediaTarget = async (visitor3, path3, entry) => {
    const targetSchemaUID = "plugin::upload.file";
    const targetSchema = getModel(targetSchemaUID);
    const traverseOptions = {
      schema: targetSchema,
      path: path3,
      getModel,
      parent
    };
    return traverseEntity(visitor3, traverseOptions, entry);
  };
  const traverseComponent = async (visitor3, path3, schema3, entry) => {
    const traverseOptions = {
      schema: schema3,
      path: path3,
      getModel,
      parent
    };
    return traverseEntity(visitor3, traverseOptions, entry);
  };
  const visitDynamicZoneEntry = async (visitor3, path3, entry) => {
    const targetSchema = getModel(entry.__component);
    const traverseOptions = {
      schema: targetSchema,
      path: path3,
      getModel,
      parent
    };
    return traverseEntity(visitor3, traverseOptions, entry);
  };
  if (!fp.isObject(entity) || fp.isNil(schema2)) {
    return entity;
  }
  const copy = fp.clone(entity);
  const visitorUtils = createVisitorUtils({
    data: copy
  });
  const keys2 = Object.keys(copy);
  for (let i = 0; i < keys2.length; i += 1) {
    const key = keys2[i];
    const attribute = schema2.attributes[key];
    const newPath = {
      ...path2
    };
    newPath.raw = fp.isNil(path2.raw) ? key : `${path2.raw}.${key}`;
    newPath.rawWithIndices = fp.isNil(path2.rawWithIndices) ? key : `${path2.rawWithIndices}.${key}`;
    if (!fp.isNil(attribute)) {
      newPath.attribute = fp.isNil(path2.attribute) ? key : `${path2.attribute}.${key}`;
    }
    const visitorOptions = {
      data: copy,
      schema: schema2,
      key,
      value: copy[key],
      attribute,
      path: newPath,
      getModel,
      parent
    };
    await visitor2(visitorOptions, visitorUtils);
    const value = copy[key];
    if (fp.isNil(value) || fp.isNil(attribute)) {
      continue;
    }
    if (isRelationalAttribute(attribute)) {
      parent = {
        schema: schema2,
        key,
        attribute,
        path: newPath
      };
      const isMorphRelation = attribute.relation.toLowerCase().startsWith("morph");
      const method = isMorphRelation ? traverseMorphRelationTarget : traverseRelationTarget(getModel(attribute.target));
      if (fp.isArray(value)) {
        const res = new Array(value.length);
        for (let i2 = 0; i2 < value.length; i2 += 1) {
          const arrayPath = {
            ...newPath,
            rawWithIndices: fp.isNil(newPath.rawWithIndices) ? `${i2}` : `${newPath.rawWithIndices}.${i2}`
          };
          res[i2] = await method(visitor2, arrayPath, value[i2]);
        }
        copy[key] = res;
      } else {
        copy[key] = await method(visitor2, newPath, value);
      }
      continue;
    }
    if (isMediaAttribute(attribute)) {
      parent = {
        schema: schema2,
        key,
        attribute,
        path: newPath
      };
      if (fp.isArray(value)) {
        const res = new Array(value.length);
        for (let i2 = 0; i2 < value.length; i2 += 1) {
          const arrayPath = {
            ...newPath,
            rawWithIndices: fp.isNil(newPath.rawWithIndices) ? `${i2}` : `${newPath.rawWithIndices}.${i2}`
          };
          res[i2] = await traverseMediaTarget(visitor2, arrayPath, value[i2]);
        }
        copy[key] = res;
      } else {
        copy[key] = await traverseMediaTarget(visitor2, newPath, value);
      }
      continue;
    }
    if (attribute.type === "component") {
      parent = {
        schema: schema2,
        key,
        attribute,
        path: newPath
      };
      const targetSchema = getModel(attribute.component);
      if (fp.isArray(value)) {
        const res = new Array(value.length);
        for (let i2 = 0; i2 < value.length; i2 += 1) {
          const arrayPath = {
            ...newPath,
            rawWithIndices: fp.isNil(newPath.rawWithIndices) ? `${i2}` : `${newPath.rawWithIndices}.${i2}`
          };
          res[i2] = await traverseComponent(visitor2, arrayPath, targetSchema, value[i2]);
        }
        copy[key] = res;
      } else {
        copy[key] = await traverseComponent(visitor2, newPath, targetSchema, value);
      }
      continue;
    }
    if (attribute.type === "dynamiczone" && fp.isArray(value)) {
      parent = {
        schema: schema2,
        key,
        attribute,
        path: newPath
      };
      const res = new Array(value.length);
      for (let i2 = 0; i2 < value.length; i2 += 1) {
        const arrayPath = {
          ...newPath,
          rawWithIndices: fp.isNil(newPath.rawWithIndices) ? `${i2}` : `${newPath.rawWithIndices}.${i2}`
        };
        res[i2] = await visitDynamicZoneEntry(visitor2, arrayPath, value[i2]);
      }
      copy[key] = res;
      continue;
    }
  }
  return copy;
};
const createVisitorUtils = ({ data }) => ({
  remove(key) {
    delete data[key];
  },
  set(key, value) {
    data[key] = value;
  }
});
var traverseEntity$1 = fp.curry(traverseEntity);
function importDefault(modName) {
  const mod = require(modName);
  return mod && mod.__esModule ? mod.default : mod;
}
var dist$1 = { exports: {} };
(function(module, exports$1) {
  !function(t, n) {
    module.exports = n(require$$0$5, require$$1);
  }(commonjsGlobal, function(t, n) {
    return function(t2) {
      function n2(e) {
        if (r[e]) return r[e].exports;
        var o = r[e] = { exports: {}, id: e, loaded: false };
        return t2[e].call(o.exports, o, o.exports, n2), o.loaded = true, o.exports;
      }
      var r = {};
      return n2.m = t2, n2.c = r, n2.p = "", n2(0);
    }([function(t2, n2, r) {
      t2.exports = r(34);
    }, function(t2, n2, r) {
      var e = r(29)("wks"), o = r(33), i = r(2).Symbol, c = "function" == typeof i, u = t2.exports = function(t3) {
        return e[t3] || (e[t3] = c && i[t3] || (c ? i : o)("Symbol." + t3));
      };
      u.store = e;
    }, function(t2, n2) {
      var r = t2.exports = "undefined" != typeof window && window.Math == Math ? window : "undefined" != typeof self && self.Math == Math ? self : Function("return this")();
      "number" == typeof __g && (__g = r);
    }, function(t2, n2, r) {
      var e = r(9);
      t2.exports = function(t3) {
        if (!e(t3)) throw TypeError(t3 + " is not an object!");
        return t3;
      };
    }, function(t2, n2, r) {
      t2.exports = !r(24)(function() {
        return 7 != Object.defineProperty({}, "a", { get: function() {
          return 7;
        } }).a;
      });
    }, function(t2, n2, r) {
      var e = r(12), o = r(17);
      t2.exports = r(4) ? function(t3, n3, r2) {
        return e.f(t3, n3, o(1, r2));
      } : function(t3, n3, r2) {
        return t3[n3] = r2, t3;
      };
    }, function(t2, n2) {
      var r = t2.exports = { version: "2.4.0" };
      "number" == typeof __e && (__e = r);
    }, function(t2, n2, r) {
      var e = r(14);
      t2.exports = function(t3, n3, r2) {
        if (e(t3), void 0 === n3) return t3;
        switch (r2) {
          case 1:
            return function(r3) {
              return t3.call(n3, r3);
            };
          case 2:
            return function(r3, e2) {
              return t3.call(n3, r3, e2);
            };
          case 3:
            return function(r3, e2, o) {
              return t3.call(n3, r3, e2, o);
            };
        }
        return function() {
          return t3.apply(n3, arguments);
        };
      };
    }, function(t2, n2) {
      var r = {}.hasOwnProperty;
      t2.exports = function(t3, n3) {
        return r.call(t3, n3);
      };
    }, function(t2, n2) {
      t2.exports = function(t3) {
        return "object" == typeof t3 ? null !== t3 : "function" == typeof t3;
      };
    }, function(t2, n2) {
      t2.exports = {};
    }, function(t2, n2) {
      var r = {}.toString;
      t2.exports = function(t3) {
        return r.call(t3).slice(8, -1);
      };
    }, function(t2, n2, r) {
      var e = r(3), o = r(26), i = r(32), c = Object.defineProperty;
      n2.f = r(4) ? Object.defineProperty : function(t3, n3, r2) {
        if (e(t3), n3 = i(n3, true), e(r2), o) try {
          return c(t3, n3, r2);
        } catch (t4) {
        }
        if ("get" in r2 || "set" in r2) throw TypeError("Accessors not supported!");
        return "value" in r2 && (t3[n3] = r2.value), t3;
      };
    }, function(t2, n2, r) {
      var e = r(42), o = r(15);
      t2.exports = function(t3) {
        return e(o(t3));
      };
    }, function(t2, n2) {
      t2.exports = function(t3) {
        if ("function" != typeof t3) throw TypeError(t3 + " is not a function!");
        return t3;
      };
    }, function(t2, n2) {
      t2.exports = function(t3) {
        if (void 0 == t3) throw TypeError("Can't call method on  " + t3);
        return t3;
      };
    }, function(t2, n2, r) {
      var e = r(9), o = r(2).document, i = e(o) && e(o.createElement);
      t2.exports = function(t3) {
        return i ? o.createElement(t3) : {};
      };
    }, function(t2, n2) {
      t2.exports = function(t3, n3) {
        return { enumerable: !(1 & t3), configurable: !(2 & t3), writable: !(4 & t3), value: n3 };
      };
    }, function(t2, n2, r) {
      var e = r(12).f, o = r(8), i = r(1)("toStringTag");
      t2.exports = function(t3, n3, r2) {
        t3 && !o(t3 = r2 ? t3 : t3.prototype, i) && e(t3, i, { configurable: true, value: n3 });
      };
    }, function(t2, n2, r) {
      var e = r(29)("keys"), o = r(33);
      t2.exports = function(t3) {
        return e[t3] || (e[t3] = o(t3));
      };
    }, function(t2, n2) {
      var r = Math.ceil, e = Math.floor;
      t2.exports = function(t3) {
        return isNaN(t3 = +t3) ? 0 : (t3 > 0 ? e : r)(t3);
      };
    }, function(t2, n2, r) {
      var e = r(11), o = r(1)("toStringTag"), i = "Arguments" == e(/* @__PURE__ */ function() {
        return arguments;
      }()), c = function(t3, n3) {
        try {
          return t3[n3];
        } catch (t4) {
        }
      };
      t2.exports = function(t3) {
        var n3, r2, u;
        return void 0 === t3 ? "Undefined" : null === t3 ? "Null" : "string" == typeof (r2 = c(n3 = Object(t3), o)) ? r2 : i ? e(n3) : "Object" == (u = e(n3)) && "function" == typeof n3.callee ? "Arguments" : u;
      };
    }, function(t2, n2) {
      t2.exports = "constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toLocaleString,toString,valueOf".split(",");
    }, function(t2, n2, r) {
      var e = r(2), o = r(6), i = r(7), c = r(5), u = "prototype", s = function(t3, n3, r2) {
        var f, a, p, l = t3 & s.F, v = t3 & s.G, h = t3 & s.S, d = t3 & s.P, y = t3 & s.B, _2 = t3 & s.W, x = v ? o : o[n3] || (o[n3] = {}), m = x[u], w = v ? e : h ? e[n3] : (e[n3] || {})[u];
        v && (r2 = n3);
        for (f in r2) a = !l && w && void 0 !== w[f], a && f in x || (p = a ? w[f] : r2[f], x[f] = v && "function" != typeof w[f] ? r2[f] : y && a ? i(p, e) : _2 && w[f] == p ? function(t4) {
          var n4 = function(n5, r3, e2) {
            if (this instanceof t4) {
              switch (arguments.length) {
                case 0:
                  return new t4();
                case 1:
                  return new t4(n5);
                case 2:
                  return new t4(n5, r3);
              }
              return new t4(n5, r3, e2);
            }
            return t4.apply(this, arguments);
          };
          return n4[u] = t4[u], n4;
        }(p) : d && "function" == typeof p ? i(Function.call, p) : p, d && ((x.virtual || (x.virtual = {}))[f] = p, t3 & s.R && m && !m[f] && c(m, f, p)));
      };
      s.F = 1, s.G = 2, s.S = 4, s.P = 8, s.B = 16, s.W = 32, s.U = 64, s.R = 128, t2.exports = s;
    }, function(t2, n2) {
      t2.exports = function(t3) {
        try {
          return !!t3();
        } catch (t4) {
          return true;
        }
      };
    }, function(t2, n2, r) {
      t2.exports = r(2).document && document.documentElement;
    }, function(t2, n2, r) {
      t2.exports = !r(4) && !r(24)(function() {
        return 7 != Object.defineProperty(r(16)("div"), "a", { get: function() {
          return 7;
        } }).a;
      });
    }, function(t2, n2, r) {
      var e = r(28), o = r(23), i = r(57), c = r(5), u = r(8), s = r(10), f = r(45), a = r(18), p = r(52), l = r(1)("iterator"), v = !([].keys && "next" in [].keys()), h = "@@iterator", d = "keys", y = "values", _2 = function() {
        return this;
      };
      t2.exports = function(t3, n3, r2, x, m, w, g) {
        f(r2, n3, x);
        var b, O, j, S = function(t4) {
          if (!v && t4 in T) return T[t4];
          switch (t4) {
            case d:
              return function() {
                return new r2(this, t4);
              };
            case y:
              return function() {
                return new r2(this, t4);
              };
          }
          return function() {
            return new r2(this, t4);
          };
        }, E = n3 + " Iterator", P = m == y, M = false, T = t3.prototype, A = T[l] || T[h] || m && T[m], k = A || S(m), C = m ? P ? S("entries") : k : void 0, I = "Array" == n3 ? T.entries || A : A;
        if (I && (j = p(I.call(new t3())), j !== Object.prototype && (a(j, E, true), e || u(j, l) || c(j, l, _2))), P && A && A.name !== y && (M = true, k = function() {
          return A.call(this);
        }), e && !g || !v && !M && T[l] || c(T, l, k), s[n3] = k, s[E] = _2, m) if (b = { values: P ? k : S(y), keys: w ? k : S(d), entries: C }, g) for (O in b) O in T || i(T, O, b[O]);
        else o(o.P + o.F * (v || M), n3, b);
        return b;
      };
    }, function(t2, n2) {
      t2.exports = true;
    }, function(t2, n2, r) {
      var e = r(2), o = "__core-js_shared__", i = e[o] || (e[o] = {});
      t2.exports = function(t3) {
        return i[t3] || (i[t3] = {});
      };
    }, function(t2, n2, r) {
      var e, o, i, c = r(7), u = r(41), s = r(25), f = r(16), a = r(2), p = a.process, l = a.setImmediate, v = a.clearImmediate, h = a.MessageChannel, d = 0, y = {}, _2 = "onreadystatechange", x = function() {
        var t3 = +this;
        if (y.hasOwnProperty(t3)) {
          var n3 = y[t3];
          delete y[t3], n3();
        }
      }, m = function(t3) {
        x.call(t3.data);
      };
      l && v || (l = function(t3) {
        for (var n3 = [], r2 = 1; arguments.length > r2; ) n3.push(arguments[r2++]);
        return y[++d] = function() {
          u("function" == typeof t3 ? t3 : Function(t3), n3);
        }, e(d), d;
      }, v = function(t3) {
        delete y[t3];
      }, "process" == r(11)(p) ? e = function(t3) {
        p.nextTick(c(x, t3, 1));
      } : h ? (o = new h(), i = o.port2, o.port1.onmessage = m, e = c(i.postMessage, i, 1)) : a.addEventListener && "function" == typeof postMessage && !a.importScripts ? (e = function(t3) {
        a.postMessage(t3 + "", "*");
      }, a.addEventListener("message", m, false)) : e = _2 in f("script") ? function(t3) {
        s.appendChild(f("script"))[_2] = function() {
          s.removeChild(this), x.call(t3);
        };
      } : function(t3) {
        setTimeout(c(x, t3, 1), 0);
      }), t2.exports = { set: l, clear: v };
    }, function(t2, n2, r) {
      var e = r(20), o = Math.min;
      t2.exports = function(t3) {
        return t3 > 0 ? o(e(t3), 9007199254740991) : 0;
      };
    }, function(t2, n2, r) {
      var e = r(9);
      t2.exports = function(t3, n3) {
        if (!e(t3)) return t3;
        var r2, o;
        if (n3 && "function" == typeof (r2 = t3.toString) && !e(o = r2.call(t3))) return o;
        if ("function" == typeof (r2 = t3.valueOf) && !e(o = r2.call(t3))) return o;
        if (!n3 && "function" == typeof (r2 = t3.toString) && !e(o = r2.call(t3))) return o;
        throw TypeError("Can't convert object to primitive value");
      };
    }, function(t2, n2) {
      var r = 0, e = Math.random();
      t2.exports = function(t3) {
        return "Symbol(".concat(void 0 === t3 ? "" : t3, ")_", (++r + e).toString(36));
      };
    }, function(t2, n2, r) {
      function e(t3) {
        return t3 && t3.__esModule ? t3 : { default: t3 };
      }
      function o() {
        return "win32" !== process.platform ? "" : "ia32" === process.arch && process.env.hasOwnProperty("PROCESSOR_ARCHITEW6432") ? "mixed" : "native";
      }
      function i(t3) {
        return (0, l.createHash)("sha256").update(t3).digest("hex");
      }
      function c(t3) {
        switch (h) {
          case "darwin":
            return t3.split("IOPlatformUUID")[1].split("\n")[0].replace(/\=|\s+|\"/gi, "").toLowerCase();
          case "win32":
            return t3.toString().split("REG_SZ")[1].replace(/\r+|\n+|\s+/gi, "").toLowerCase();
          case "linux":
            return t3.toString().replace(/\r+|\n+|\s+/gi, "").toLowerCase();
          case "freebsd":
            return t3.toString().replace(/\r+|\n+|\s+/gi, "").toLowerCase();
          default:
            throw new Error("Unsupported platform: " + process.platform);
        }
      }
      function u(t3) {
        var n3 = c((0, p.execSync)(y[h]).toString());
        return t3 ? n3 : i(n3);
      }
      function s(t3) {
        return new a.default(function(n3, r2) {
          return (0, p.exec)(y[h], {}, function(e2, o2, u2) {
            if (e2) return r2(new Error("Error while obtaining machine id: " + e2.stack));
            var s2 = c(o2.toString());
            return n3(t3 ? s2 : i(s2));
          });
        });
      }
      Object.defineProperty(n2, "__esModule", { value: true });
      var f = r(35), a = e(f);
      n2.machineIdSync = u, n2.machineId = s;
      var p = r(70), l = r(71), v = process, h = v.platform, d = { native: "%windir%\\System32", mixed: "%windir%\\sysnative\\cmd.exe /c %windir%\\System32" }, y = { darwin: "ioreg -rd1 -c IOPlatformExpertDevice", win32: d[o()] + "\\REG.exe QUERY HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid", linux: "( cat /var/lib/dbus/machine-id /etc/machine-id 2> /dev/null || hostname ) | head -n 1 || :", freebsd: "kenv -q smbios.system.uuid || sysctl -n kern.hostuuid" };
    }, function(t2, n2, r) {
      t2.exports = { default: r(36), __esModule: true };
    }, function(t2, n2, r) {
      r(66), r(68), r(69), r(67), t2.exports = r(6).Promise;
    }, function(t2, n2) {
      t2.exports = function() {
      };
    }, function(t2, n2) {
      t2.exports = function(t3, n3, r, e) {
        if (!(t3 instanceof n3) || void 0 !== e && e in t3) throw TypeError(r + ": incorrect invocation!");
        return t3;
      };
    }, function(t2, n2, r) {
      var e = r(13), o = r(31), i = r(62);
      t2.exports = function(t3) {
        return function(n3, r2, c) {
          var u, s = e(n3), f = o(s.length), a = i(c, f);
          if (t3 && r2 != r2) {
            for (; f > a; ) if (u = s[a++], u != u) return true;
          } else for (; f > a; a++) if ((t3 || a in s) && s[a] === r2) return t3 || a || 0;
          return !t3 && -1;
        };
      };
    }, function(t2, n2, r) {
      var e = r(7), o = r(44), i = r(43), c = r(3), u = r(31), s = r(64), f = {}, a = {}, n2 = t2.exports = function(t3, n3, r2, p, l) {
        var v, h, d, y, _2 = l ? function() {
          return t3;
        } : s(t3), x = e(r2, p, n3 ? 2 : 1), m = 0;
        if ("function" != typeof _2) throw TypeError(t3 + " is not iterable!");
        if (i(_2)) {
          for (v = u(t3.length); v > m; m++) if (y = n3 ? x(c(h = t3[m])[0], h[1]) : x(t3[m]), y === f || y === a) return y;
        } else for (d = _2.call(t3); !(h = d.next()).done; ) if (y = o(d, x, h.value, n3), y === f || y === a) return y;
      };
      n2.BREAK = f, n2.RETURN = a;
    }, function(t2, n2) {
      t2.exports = function(t3, n3, r) {
        var e = void 0 === r;
        switch (n3.length) {
          case 0:
            return e ? t3() : t3.call(r);
          case 1:
            return e ? t3(n3[0]) : t3.call(r, n3[0]);
          case 2:
            return e ? t3(n3[0], n3[1]) : t3.call(r, n3[0], n3[1]);
          case 3:
            return e ? t3(n3[0], n3[1], n3[2]) : t3.call(r, n3[0], n3[1], n3[2]);
          case 4:
            return e ? t3(n3[0], n3[1], n3[2], n3[3]) : t3.call(r, n3[0], n3[1], n3[2], n3[3]);
        }
        return t3.apply(r, n3);
      };
    }, function(t2, n2, r) {
      var e = r(11);
      t2.exports = Object("z").propertyIsEnumerable(0) ? Object : function(t3) {
        return "String" == e(t3) ? t3.split("") : Object(t3);
      };
    }, function(t2, n2, r) {
      var e = r(10), o = r(1)("iterator"), i = Array.prototype;
      t2.exports = function(t3) {
        return void 0 !== t3 && (e.Array === t3 || i[o] === t3);
      };
    }, function(t2, n2, r) {
      var e = r(3);
      t2.exports = function(t3, n3, r2, o) {
        try {
          return o ? n3(e(r2)[0], r2[1]) : n3(r2);
        } catch (n4) {
          var i = t3.return;
          throw void 0 !== i && e(i.call(t3)), n4;
        }
      };
    }, function(t2, n2, r) {
      var e = r(49), o = r(17), i = r(18), c = {};
      r(5)(c, r(1)("iterator"), function() {
        return this;
      }), t2.exports = function(t3, n3, r2) {
        t3.prototype = e(c, { next: o(1, r2) }), i(t3, n3 + " Iterator");
      };
    }, function(t2, n2, r) {
      var e = r(1)("iterator"), o = false;
      try {
        var i = [7][e]();
        i.return = function() {
          o = true;
        }, Array.from(i, function() {
          throw 2;
        });
      } catch (t3) {
      }
      t2.exports = function(t3, n3) {
        if (!n3 && !o) return false;
        var r2 = false;
        try {
          var i2 = [7], c = i2[e]();
          c.next = function() {
            return { done: r2 = true };
          }, i2[e] = function() {
            return c;
          }, t3(i2);
        } catch (t4) {
        }
        return r2;
      };
    }, function(t2, n2) {
      t2.exports = function(t3, n3) {
        return { value: n3, done: !!t3 };
      };
    }, function(t2, n2, r) {
      var e = r(2), o = r(30).set, i = e.MutationObserver || e.WebKitMutationObserver, c = e.process, u = e.Promise, s = "process" == r(11)(c);
      t2.exports = function() {
        var t3, n3, r2, f = function() {
          var e2, o2;
          for (s && (e2 = c.domain) && e2.exit(); t3; ) {
            o2 = t3.fn, t3 = t3.next;
            try {
              o2();
            } catch (e3) {
              throw t3 ? r2() : n3 = void 0, e3;
            }
          }
          n3 = void 0, e2 && e2.enter();
        };
        if (s) r2 = function() {
          c.nextTick(f);
        };
        else if (i) {
          var a = true, p = document.createTextNode("");
          new i(f).observe(p, { characterData: true }), r2 = function() {
            p.data = a = !a;
          };
        } else if (u && u.resolve) {
          var l = u.resolve();
          r2 = function() {
            l.then(f);
          };
        } else r2 = function() {
          o.call(e, f);
        };
        return function(e2) {
          var o2 = { fn: e2, next: void 0 };
          n3 && (n3.next = o2), t3 || (t3 = o2, r2()), n3 = o2;
        };
      };
    }, function(t2, n2, r) {
      var e = r(3), o = r(50), i = r(22), c = r(19)("IE_PROTO"), u = function() {
      }, s = "prototype", f = function() {
        var t3, n3 = r(16)("iframe"), e2 = i.length, o2 = ">";
        for (n3.style.display = "none", r(25).appendChild(n3), n3.src = "javascript:", t3 = n3.contentWindow.document, t3.open(), t3.write("<script>document.F=Object<\/script" + o2), t3.close(), f = t3.F; e2--; ) delete f[s][i[e2]];
        return f();
      };
      t2.exports = Object.create || function(t3, n3) {
        var r2;
        return null !== t3 ? (u[s] = e(t3), r2 = new u(), u[s] = null, r2[c] = t3) : r2 = f(), void 0 === n3 ? r2 : o(r2, n3);
      };
    }, function(t2, n2, r) {
      var e = r(12), o = r(3), i = r(54);
      t2.exports = r(4) ? Object.defineProperties : function(t3, n3) {
        o(t3);
        for (var r2, c = i(n3), u = c.length, s = 0; u > s; ) e.f(t3, r2 = c[s++], n3[r2]);
        return t3;
      };
    }, function(t2, n2, r) {
      var e = r(55), o = r(17), i = r(13), c = r(32), u = r(8), s = r(26), f = Object.getOwnPropertyDescriptor;
      n2.f = r(4) ? f : function(t3, n3) {
        if (t3 = i(t3), n3 = c(n3, true), s) try {
          return f(t3, n3);
        } catch (t4) {
        }
        if (u(t3, n3)) return o(!e.f.call(t3, n3), t3[n3]);
      };
    }, function(t2, n2, r) {
      var e = r(8), o = r(63), i = r(19)("IE_PROTO"), c = Object.prototype;
      t2.exports = Object.getPrototypeOf || function(t3) {
        return t3 = o(t3), e(t3, i) ? t3[i] : "function" == typeof t3.constructor && t3 instanceof t3.constructor ? t3.constructor.prototype : t3 instanceof Object ? c : null;
      };
    }, function(t2, n2, r) {
      var e = r(8), o = r(13), i = r(39)(false), c = r(19)("IE_PROTO");
      t2.exports = function(t3, n3) {
        var r2, u = o(t3), s = 0, f = [];
        for (r2 in u) r2 != c && e(u, r2) && f.push(r2);
        for (; n3.length > s; ) e(u, r2 = n3[s++]) && (~i(f, r2) || f.push(r2));
        return f;
      };
    }, function(t2, n2, r) {
      var e = r(53), o = r(22);
      t2.exports = Object.keys || function(t3) {
        return e(t3, o);
      };
    }, function(t2, n2) {
      n2.f = {}.propertyIsEnumerable;
    }, function(t2, n2, r) {
      var e = r(5);
      t2.exports = function(t3, n3, r2) {
        for (var o in n3) r2 && t3[o] ? t3[o] = n3[o] : e(t3, o, n3[o]);
        return t3;
      };
    }, function(t2, n2, r) {
      t2.exports = r(5);
    }, function(t2, n2, r) {
      var e = r(9), o = r(3), i = function(t3, n3) {
        if (o(t3), !e(n3) && null !== n3) throw TypeError(n3 + ": can't set as prototype!");
      };
      t2.exports = { set: Object.setPrototypeOf || ("__proto__" in {} ? function(t3, n3, e2) {
        try {
          e2 = r(7)(Function.call, r(51).f(Object.prototype, "__proto__").set, 2), e2(t3, []), n3 = !(t3 instanceof Array);
        } catch (t4) {
          n3 = true;
        }
        return function(t4, r2) {
          return i(t4, r2), n3 ? t4.__proto__ = r2 : e2(t4, r2), t4;
        };
      }({}, false) : void 0), check: i };
    }, function(t2, n2, r) {
      var e = r(2), o = r(6), i = r(12), c = r(4), u = r(1)("species");
      t2.exports = function(t3) {
        var n3 = "function" == typeof o[t3] ? o[t3] : e[t3];
        c && n3 && !n3[u] && i.f(n3, u, { configurable: true, get: function() {
          return this;
        } });
      };
    }, function(t2, n2, r) {
      var e = r(3), o = r(14), i = r(1)("species");
      t2.exports = function(t3, n3) {
        var r2, c = e(t3).constructor;
        return void 0 === c || void 0 == (r2 = e(c)[i]) ? n3 : o(r2);
      };
    }, function(t2, n2, r) {
      var e = r(20), o = r(15);
      t2.exports = function(t3) {
        return function(n3, r2) {
          var i, c, u = String(o(n3)), s = e(r2), f = u.length;
          return s < 0 || s >= f ? t3 ? "" : void 0 : (i = u.charCodeAt(s), i < 55296 || i > 56319 || s + 1 === f || (c = u.charCodeAt(s + 1)) < 56320 || c > 57343 ? t3 ? u.charAt(s) : i : t3 ? u.slice(s, s + 2) : (i - 55296 << 10) + (c - 56320) + 65536);
        };
      };
    }, function(t2, n2, r) {
      var e = r(20), o = Math.max, i = Math.min;
      t2.exports = function(t3, n3) {
        return t3 = e(t3), t3 < 0 ? o(t3 + n3, 0) : i(t3, n3);
      };
    }, function(t2, n2, r) {
      var e = r(15);
      t2.exports = function(t3) {
        return Object(e(t3));
      };
    }, function(t2, n2, r) {
      var e = r(21), o = r(1)("iterator"), i = r(10);
      t2.exports = r(6).getIteratorMethod = function(t3) {
        if (void 0 != t3) return t3[o] || t3["@@iterator"] || i[e(t3)];
      };
    }, function(t2, n2, r) {
      var e = r(37), o = r(47), i = r(10), c = r(13);
      t2.exports = r(27)(Array, "Array", function(t3, n3) {
        this._t = c(t3), this._i = 0, this._k = n3;
      }, function() {
        var t3 = this._t, n3 = this._k, r2 = this._i++;
        return !t3 || r2 >= t3.length ? (this._t = void 0, o(1)) : "keys" == n3 ? o(0, r2) : "values" == n3 ? o(0, t3[r2]) : o(0, [r2, t3[r2]]);
      }, "values"), i.Arguments = i.Array, e("keys"), e("values"), e("entries");
    }, function(t2, n2) {
    }, function(t2, n2, r) {
      var e, o, i, c = r(28), u = r(2), s = r(7), f = r(21), a = r(23), p = r(9), l = (r(3), r(14)), v = r(38), h = r(40), d = (r(58).set, r(60)), y = r(30).set, _2 = r(48)(), x = "Promise", m = u.TypeError, w = u.process, g = u[x], w = u.process, b = "process" == f(w), O = function() {
      }, j = !!function() {
        try {
          var t3 = g.resolve(1), n3 = (t3.constructor = {})[r(1)("species")] = function(t4) {
            t4(O, O);
          };
          return (b || "function" == typeof PromiseRejectionEvent) && t3.then(O) instanceof n3;
        } catch (t4) {
        }
      }(), S = function(t3, n3) {
        return t3 === n3 || t3 === g && n3 === i;
      }, E = function(t3) {
        var n3;
        return !(!p(t3) || "function" != typeof (n3 = t3.then)) && n3;
      }, P = function(t3) {
        return S(g, t3) ? new M(t3) : new o(t3);
      }, M = o = function(t3) {
        var n3, r2;
        this.promise = new t3(function(t4, e2) {
          if (void 0 !== n3 || void 0 !== r2) throw m("Bad Promise constructor");
          n3 = t4, r2 = e2;
        }), this.resolve = l(n3), this.reject = l(r2);
      }, T = function(t3) {
        try {
          t3();
        } catch (t4) {
          return { error: t4 };
        }
      }, A = function(t3, n3) {
        if (!t3._n) {
          t3._n = true;
          var r2 = t3._c;
          _2(function() {
            for (var e2 = t3._v, o2 = 1 == t3._s, i2 = 0, c2 = function(n4) {
              var r3, i3, c3 = o2 ? n4.ok : n4.fail, u2 = n4.resolve, s2 = n4.reject, f2 = n4.domain;
              try {
                c3 ? (o2 || (2 == t3._h && I(t3), t3._h = 1), c3 === true ? r3 = e2 : (f2 && f2.enter(), r3 = c3(e2), f2 && f2.exit()), r3 === n4.promise ? s2(m("Promise-chain cycle")) : (i3 = E(r3)) ? i3.call(r3, u2, s2) : u2(r3)) : s2(e2);
              } catch (t4) {
                s2(t4);
              }
            }; r2.length > i2; ) c2(r2[i2++]);
            t3._c = [], t3._n = false, n3 && !t3._h && k(t3);
          });
        }
      }, k = function(t3) {
        y.call(u, function() {
          var n3, r2, e2, o2 = t3._v;
          if (C(t3) && (n3 = T(function() {
            b ? w.emit("unhandledRejection", o2, t3) : (r2 = u.onunhandledrejection) ? r2({ promise: t3, reason: o2 }) : (e2 = u.console) && e2.error && e2.error("Unhandled promise rejection", o2);
          }), t3._h = b || C(t3) ? 2 : 1), t3._a = void 0, n3) throw n3.error;
        });
      }, C = function(t3) {
        if (1 == t3._h) return false;
        for (var n3, r2 = t3._a || t3._c, e2 = 0; r2.length > e2; ) if (n3 = r2[e2++], n3.fail || !C(n3.promise)) return false;
        return true;
      }, I = function(t3) {
        y.call(u, function() {
          var n3;
          b ? w.emit("rejectionHandled", t3) : (n3 = u.onrejectionhandled) && n3({ promise: t3, reason: t3._v });
        });
      }, R = function(t3) {
        var n3 = this;
        n3._d || (n3._d = true, n3 = n3._w || n3, n3._v = t3, n3._s = 2, n3._a || (n3._a = n3._c.slice()), A(n3, true));
      }, F = function(t3) {
        var n3, r2 = this;
        if (!r2._d) {
          r2._d = true, r2 = r2._w || r2;
          try {
            if (r2 === t3) throw m("Promise can't be resolved itself");
            (n3 = E(t3)) ? _2(function() {
              var e2 = { _w: r2, _d: false };
              try {
                n3.call(t3, s(F, e2, 1), s(R, e2, 1));
              } catch (t4) {
                R.call(e2, t4);
              }
            }) : (r2._v = t3, r2._s = 1, A(r2, false));
          } catch (t4) {
            R.call({ _w: r2, _d: false }, t4);
          }
        }
      };
      j || (g = function(t3) {
        v(this, g, x, "_h"), l(t3), e.call(this);
        try {
          t3(s(F, this, 1), s(R, this, 1));
        } catch (t4) {
          R.call(this, t4);
        }
      }, e = function(t3) {
        this._c = [], this._a = void 0, this._s = 0, this._d = false, this._v = void 0, this._h = 0, this._n = false;
      }, e.prototype = r(56)(g.prototype, { then: function(t3, n3) {
        var r2 = P(d(this, g));
        return r2.ok = "function" != typeof t3 || t3, r2.fail = "function" == typeof n3 && n3, r2.domain = b ? w.domain : void 0, this._c.push(r2), this._a && this._a.push(r2), this._s && A(this, false), r2.promise;
      }, catch: function(t3) {
        return this.then(void 0, t3);
      } }), M = function() {
        var t3 = new e();
        this.promise = t3, this.resolve = s(F, t3, 1), this.reject = s(R, t3, 1);
      }), a(a.G + a.W + a.F * !j, { Promise: g }), r(18)(g, x), r(59)(x), i = r(6)[x], a(a.S + a.F * !j, x, { reject: function(t3) {
        var n3 = P(this), r2 = n3.reject;
        return r2(t3), n3.promise;
      } }), a(a.S + a.F * (c || !j), x, { resolve: function(t3) {
        if (t3 instanceof g && S(t3.constructor, this)) return t3;
        var n3 = P(this), r2 = n3.resolve;
        return r2(t3), n3.promise;
      } }), a(a.S + a.F * !(j && r(46)(function(t3) {
        g.all(t3).catch(O);
      })), x, { all: function(t3) {
        var n3 = this, r2 = P(n3), e2 = r2.resolve, o2 = r2.reject, i2 = T(function() {
          var r3 = [], i3 = 0, c2 = 1;
          h(t3, false, function(t4) {
            var u2 = i3++, s2 = false;
            r3.push(void 0), c2++, n3.resolve(t4).then(function(t5) {
              s2 || (s2 = true, r3[u2] = t5, --c2 || e2(r3));
            }, o2);
          }), --c2 || e2(r3);
        });
        return i2 && o2(i2.error), r2.promise;
      }, race: function(t3) {
        var n3 = this, r2 = P(n3), e2 = r2.reject, o2 = T(function() {
          h(t3, false, function(t4) {
            n3.resolve(t4).then(r2.resolve, e2);
          });
        });
        return o2 && e2(o2.error), r2.promise;
      } });
    }, function(t2, n2, r) {
      var e = r(61)(true);
      r(27)(String, "String", function(t3) {
        this._t = String(t3), this._i = 0;
      }, function() {
        var t3, n3 = this._t, r2 = this._i;
        return r2 >= n3.length ? { value: void 0, done: true } : (t3 = e(n3, r2), this._i += t3.length, { value: t3, done: false });
      });
    }, function(t2, n2, r) {
      r(65);
      for (var e = r(2), o = r(5), i = r(10), c = r(1)("toStringTag"), u = ["NodeList", "DOMTokenList", "MediaList", "StyleSheetList", "CSSRuleList"], s = 0; s < 5; s++) {
        var f = u[s], a = e[f], p = a && a.prototype;
        p && !p[c] && o(p, c, f), i[f] = i.Array;
      }
    }, function(t2, n2) {
      t2.exports = require$$0$5;
    }, function(t2, n2) {
      t2.exports = require$$1;
    }]);
  });
})(dist$1);
var distExports = dist$1.exports;
const generateInstallId = (projectId, installId) => {
  if (installId) return installId;
  try {
    const machineId = distExports.machineIdSync();
    return projectId ? require$$1.createHash("sha256").update(`${machineId}-${projectId}`).digest("hex") : require$$1.randomUUID();
  } catch (error2) {
    return require$$1.randomUUID();
  }
};
var map$2;
try {
  map$2 = Map;
} catch (_2) {
}
var set$1;
try {
  set$1 = Set;
} catch (_2) {
}
function baseClone(src, circulars, clones) {
  if (!src || typeof src !== "object" || typeof src === "function") {
    return src;
  }
  if (src.nodeType && "cloneNode" in src) {
    return src.cloneNode(true);
  }
  if (src instanceof Date) {
    return new Date(src.getTime());
  }
  if (src instanceof RegExp) {
    return new RegExp(src);
  }
  if (Array.isArray(src)) {
    return src.map(clone$2);
  }
  if (map$2 && src instanceof map$2) {
    return new Map(Array.from(src.entries()));
  }
  if (set$1 && src instanceof set$1) {
    return new Set(Array.from(src.values()));
  }
  if (src instanceof Object) {
    circulars.push(src);
    var obj = Object.create(src);
    clones.push(obj);
    for (var key in src) {
      var idx = circulars.findIndex(function(i) {
        return i === src[key];
      });
      obj[key] = idx > -1 ? clones[idx] : baseClone(src[key], circulars, clones);
    }
    return obj;
  }
  return src;
}
function clone$2(src) {
  return baseClone(src, [], []);
}
const toString$8 = Object.prototype.toString;
const errorToString$1 = Error.prototype.toString;
const regExpToString$1 = RegExp.prototype.toString;
const symbolToString$3 = typeof Symbol !== "undefined" ? Symbol.prototype.toString : () => "";
const SYMBOL_REGEXP$1 = /^Symbol\((.*)\)(.*)$/;
function printNumber$1(val) {
  if (val != +val) return "NaN";
  const isNegativeZero2 = val === 0 && 1 / val < 0;
  return isNegativeZero2 ? "-0" : "" + val;
}
function printSimpleValue$1(val, quoteStrings = false) {
  if (val == null || val === true || val === false) return "" + val;
  const typeOf = typeof val;
  if (typeOf === "number") return printNumber$1(val);
  if (typeOf === "string") return quoteStrings ? `"${val}"` : val;
  if (typeOf === "function") return "[Function " + (val.name || "anonymous") + "]";
  if (typeOf === "symbol") return symbolToString$3.call(val).replace(SYMBOL_REGEXP$1, "Symbol($1)");
  const tag = toString$8.call(val).slice(8, -1);
  if (tag === "Date") return isNaN(val.getTime()) ? "" + val : val.toISOString(val);
  if (tag === "Error" || val instanceof Error) return "[" + errorToString$1.call(val) + "]";
  if (tag === "RegExp") return regExpToString$1.call(val);
  return null;
}
function printValue$1(value, quoteStrings) {
  let result = printSimpleValue$1(value, quoteStrings);
  if (result !== null) return result;
  return JSON.stringify(value, function(key, value2) {
    let result2 = printSimpleValue$1(this[key], quoteStrings);
    if (result2 !== null) return result2;
    return value2;
  }, 2);
}
let mixed = {
  default: "${path} is invalid",
  required: "${path} is a required field",
  oneOf: "${path} must be one of the following values: ${values}",
  notOneOf: "${path} must not be one of the following values: ${values}",
  notType: ({
    path: path2,
    type: type2,
    value,
    originalValue
  }) => {
    let isCast = originalValue != null && originalValue !== value;
    let msg = `${path2} must be a \`${type2}\` type, but the final value was: \`${printValue$1(value, true)}\`` + (isCast ? ` (cast from the value \`${printValue$1(originalValue, true)}\`).` : ".");
    if (value === null) {
      msg += `
 If "null" is intended as an empty value be sure to mark the schema as \`.nullable()\``;
    }
    return msg;
  },
  defined: "${path} must be defined"
};
let string = {
  length: "${path} must be exactly ${length} characters",
  min: "${path} must be at least ${min} characters",
  max: "${path} must be at most ${max} characters",
  matches: '${path} must match the following: "${regex}"',
  email: "${path} must be a valid email",
  url: "${path} must be a valid URL",
  uuid: "${path} must be a valid UUID",
  trim: "${path} must be a trimmed string",
  lowercase: "${path} must be a lowercase string",
  uppercase: "${path} must be a upper case string"
};
let number = {
  min: "${path} must be greater than or equal to ${min}",
  max: "${path} must be less than or equal to ${max}",
  lessThan: "${path} must be less than ${less}",
  moreThan: "${path} must be greater than ${more}",
  positive: "${path} must be a positive number",
  negative: "${path} must be a negative number",
  integer: "${path} must be an integer"
};
let date = {
  min: "${path} field must be later than ${min}",
  max: "${path} field must be at earlier than ${max}"
};
let boolean = {
  isValue: "${path} field must be ${value}"
};
let object = {
  noUnknown: "${path} field has unspecified keys: ${unknown}"
};
let array = {
  min: "${path} field must have at least ${min} items",
  max: "${path} field must have less than or equal to ${max} items",
  length: "${path} must be have ${length} items"
};
const locale = Object.assign(/* @__PURE__ */ Object.create(null), {
  mixed,
  string,
  number,
  date,
  object,
  array,
  boolean
});
var objectProto$d = Object.prototype;
var hasOwnProperty$9 = objectProto$d.hasOwnProperty;
function baseHas$1(object2, key) {
  return object2 != null && hasOwnProperty$9.call(object2, key);
}
var _baseHas = baseHas$1;
var isArray$8 = Array.isArray;
var isArray_1 = isArray$8;
var freeGlobal$2 = typeof commonjsGlobal == "object" && commonjsGlobal && commonjsGlobal.Object === Object && commonjsGlobal;
var _freeGlobal = freeGlobal$2;
var freeGlobal$1 = _freeGlobal;
var freeSelf$1 = typeof self == "object" && self && self.Object === Object && self;
var root$9 = freeGlobal$1 || freeSelf$1 || Function("return this")();
var _root = root$9;
var root$8 = _root;
var Symbol$6 = root$8.Symbol;
var _Symbol = Symbol$6;
var Symbol$5 = _Symbol;
var objectProto$c = Object.prototype;
var hasOwnProperty$8 = objectProto$c.hasOwnProperty;
var nativeObjectToString$1 = objectProto$c.toString;
var symToStringTag$1 = Symbol$5 ? Symbol$5.toStringTag : void 0;
function getRawTag$1(value) {
  var isOwn = hasOwnProperty$8.call(value, symToStringTag$1), tag = value[symToStringTag$1];
  try {
    value[symToStringTag$1] = void 0;
    var unmasked = true;
  } catch (e) {
  }
  var result = nativeObjectToString$1.call(value);
  if (unmasked) {
    if (isOwn) {
      value[symToStringTag$1] = tag;
    } else {
      delete value[symToStringTag$1];
    }
  }
  return result;
}
var _getRawTag = getRawTag$1;
var objectProto$b = Object.prototype;
var nativeObjectToString = objectProto$b.toString;
function objectToString$2(value) {
  return nativeObjectToString.call(value);
}
var _objectToString = objectToString$2;
var Symbol$4 = _Symbol, getRawTag = _getRawTag, objectToString$1 = _objectToString;
var nullTag = "[object Null]", undefinedTag = "[object Undefined]";
var symToStringTag = Symbol$4 ? Symbol$4.toStringTag : void 0;
function baseGetTag$5(value) {
  if (value == null) {
    return value === void 0 ? undefinedTag : nullTag;
  }
  return symToStringTag && symToStringTag in Object(value) ? getRawTag(value) : objectToString$1(value);
}
var _baseGetTag = baseGetTag$5;
function isObjectLike$6(value) {
  return value != null && typeof value == "object";
}
var isObjectLike_1 = isObjectLike$6;
var baseGetTag$4 = _baseGetTag, isObjectLike$5 = isObjectLike_1;
var symbolTag$2 = "[object Symbol]";
function isSymbol$4(value) {
  return typeof value == "symbol" || isObjectLike$5(value) && baseGetTag$4(value) == symbolTag$2;
}
var isSymbol_1 = isSymbol$4;
var isArray$7 = isArray_1, isSymbol$3 = isSymbol_1;
var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/, reIsPlainProp = /^\w*$/;
function isKey$3(value, object2) {
  if (isArray$7(value)) {
    return false;
  }
  var type2 = typeof value;
  if (type2 == "number" || type2 == "symbol" || type2 == "boolean" || value == null || isSymbol$3(value)) {
    return true;
  }
  return reIsPlainProp.test(value) || !reIsDeepProp.test(value) || object2 != null && value in Object(object2);
}
var _isKey = isKey$3;
function isObject$7(value) {
  var type2 = typeof value;
  return value != null && (type2 == "object" || type2 == "function");
}
var isObject_1 = isObject$7;
var baseGetTag$3 = _baseGetTag, isObject$6 = isObject_1;
var asyncTag = "[object AsyncFunction]", funcTag$1 = "[object Function]", genTag = "[object GeneratorFunction]", proxyTag = "[object Proxy]";
function isFunction$3(value) {
  if (!isObject$6(value)) {
    return false;
  }
  var tag = baseGetTag$3(value);
  return tag == funcTag$1 || tag == genTag || tag == asyncTag || tag == proxyTag;
}
var isFunction_1 = isFunction$3;
var root$7 = _root;
var coreJsData$1 = root$7["__core-js_shared__"];
var _coreJsData = coreJsData$1;
var coreJsData = _coreJsData;
var maskSrcKey = function() {
  var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || "");
  return uid ? "Symbol(src)_1." + uid : "";
}();
function isMasked$1(func) {
  return !!maskSrcKey && maskSrcKey in func;
}
var _isMasked = isMasked$1;
var funcProto$1 = Function.prototype;
var funcToString$1 = funcProto$1.toString;
function toSource$2(func) {
  if (func != null) {
    try {
      return funcToString$1.call(func);
    } catch (e) {
    }
    try {
      return func + "";
    } catch (e) {
    }
  }
  return "";
}
var _toSource = toSource$2;
var isFunction$2 = isFunction_1, isMasked = _isMasked, isObject$5 = isObject_1, toSource$1 = _toSource;
var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;
var reIsHostCtor = /^\[object .+?Constructor\]$/;
var funcProto = Function.prototype, objectProto$a = Object.prototype;
var funcToString = funcProto.toString;
var hasOwnProperty$7 = objectProto$a.hasOwnProperty;
var reIsNative = RegExp(
  "^" + funcToString.call(hasOwnProperty$7).replace(reRegExpChar, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
);
function baseIsNative$1(value) {
  if (!isObject$5(value) || isMasked(value)) {
    return false;
  }
  var pattern = isFunction$2(value) ? reIsNative : reIsHostCtor;
  return pattern.test(toSource$1(value));
}
var _baseIsNative = baseIsNative$1;
function getValue$1(object2, key) {
  return object2 == null ? void 0 : object2[key];
}
var _getValue = getValue$1;
var baseIsNative = _baseIsNative, getValue = _getValue;
function getNative$7(object2, key) {
  var value = getValue(object2, key);
  return baseIsNative(value) ? value : void 0;
}
var _getNative = getNative$7;
var getNative$6 = _getNative;
var nativeCreate$4 = getNative$6(Object, "create");
var _nativeCreate = nativeCreate$4;
var nativeCreate$3 = _nativeCreate;
function hashClear$1() {
  this.__data__ = nativeCreate$3 ? nativeCreate$3(null) : {};
  this.size = 0;
}
var _hashClear = hashClear$1;
function hashDelete$1(key) {
  var result = this.has(key) && delete this.__data__[key];
  this.size -= result ? 1 : 0;
  return result;
}
var _hashDelete = hashDelete$1;
var nativeCreate$2 = _nativeCreate;
var HASH_UNDEFINED$2 = "__lodash_hash_undefined__";
var objectProto$9 = Object.prototype;
var hasOwnProperty$6 = objectProto$9.hasOwnProperty;
function hashGet$1(key) {
  var data = this.__data__;
  if (nativeCreate$2) {
    var result = data[key];
    return result === HASH_UNDEFINED$2 ? void 0 : result;
  }
  return hasOwnProperty$6.call(data, key) ? data[key] : void 0;
}
var _hashGet = hashGet$1;
var nativeCreate$1 = _nativeCreate;
var objectProto$8 = Object.prototype;
var hasOwnProperty$5 = objectProto$8.hasOwnProperty;
function hashHas$1(key) {
  var data = this.__data__;
  return nativeCreate$1 ? data[key] !== void 0 : hasOwnProperty$5.call(data, key);
}
var _hashHas = hashHas$1;
var nativeCreate = _nativeCreate;
var HASH_UNDEFINED$1 = "__lodash_hash_undefined__";
function hashSet$1(key, value) {
  var data = this.__data__;
  this.size += this.has(key) ? 0 : 1;
  data[key] = nativeCreate && value === void 0 ? HASH_UNDEFINED$1 : value;
  return this;
}
var _hashSet = hashSet$1;
var hashClear = _hashClear, hashDelete = _hashDelete, hashGet = _hashGet, hashHas = _hashHas, hashSet = _hashSet;
function Hash$1(entries) {
  var index2 = -1, length = entries == null ? 0 : entries.length;
  this.clear();
  while (++index2 < length) {
    var entry = entries[index2];
    this.set(entry[0], entry[1]);
  }
}
Hash$1.prototype.clear = hashClear;
Hash$1.prototype["delete"] = hashDelete;
Hash$1.prototype.get = hashGet;
Hash$1.prototype.has = hashHas;
Hash$1.prototype.set = hashSet;
var _Hash = Hash$1;
function listCacheClear$1() {
  this.__data__ = [];
  this.size = 0;
}
var _listCacheClear = listCacheClear$1;
function eq$2(value, other) {
  return value === other || value !== value && other !== other;
}
var eq_1 = eq$2;
var eq$1 = eq_1;
function assocIndexOf$4(array2, key) {
  var length = array2.length;
  while (length--) {
    if (eq$1(array2[length][0], key)) {
      return length;
    }
  }
  return -1;
}
var _assocIndexOf = assocIndexOf$4;
var assocIndexOf$3 = _assocIndexOf;
var arrayProto = Array.prototype;
var splice = arrayProto.splice;
function listCacheDelete$1(key) {
  var data = this.__data__, index2 = assocIndexOf$3(data, key);
  if (index2 < 0) {
    return false;
  }
  var lastIndex = data.length - 1;
  if (index2 == lastIndex) {
    data.pop();
  } else {
    splice.call(data, index2, 1);
  }
  --this.size;
  return true;
}
var _listCacheDelete = listCacheDelete$1;
var assocIndexOf$2 = _assocIndexOf;
function listCacheGet$1(key) {
  var data = this.__data__, index2 = assocIndexOf$2(data, key);
  return index2 < 0 ? void 0 : data[index2][1];
}
var _listCacheGet = listCacheGet$1;
var assocIndexOf$1 = _assocIndexOf;
function listCacheHas$1(key) {
  return assocIndexOf$1(this.__data__, key) > -1;
}
var _listCacheHas = listCacheHas$1;
var assocIndexOf = _assocIndexOf;
function listCacheSet$1(key, value) {
  var data = this.__data__, index2 = assocIndexOf(data, key);
  if (index2 < 0) {
    ++this.size;
    data.push([key, value]);
  } else {
    data[index2][1] = value;
  }
  return this;
}
var _listCacheSet = listCacheSet$1;
var listCacheClear = _listCacheClear, listCacheDelete = _listCacheDelete, listCacheGet = _listCacheGet, listCacheHas = _listCacheHas, listCacheSet = _listCacheSet;
function ListCache$4(entries) {
  var index2 = -1, length = entries == null ? 0 : entries.length;
  this.clear();
  while (++index2 < length) {
    var entry = entries[index2];
    this.set(entry[0], entry[1]);
  }
}
ListCache$4.prototype.clear = listCacheClear;
ListCache$4.prototype["delete"] = listCacheDelete;
ListCache$4.prototype.get = listCacheGet;
ListCache$4.prototype.has = listCacheHas;
ListCache$4.prototype.set = listCacheSet;
var _ListCache = ListCache$4;
var getNative$5 = _getNative, root$6 = _root;
var Map$4 = getNative$5(root$6, "Map");
var _Map = Map$4;
var Hash = _Hash, ListCache$3 = _ListCache, Map$3 = _Map;
function mapCacheClear$1() {
  this.size = 0;
  this.__data__ = {
    "hash": new Hash(),
    "map": new (Map$3 || ListCache$3)(),
    "string": new Hash()
  };
}
var _mapCacheClear = mapCacheClear$1;
function isKeyable$1(value) {
  var type2 = typeof value;
  return type2 == "string" || type2 == "number" || type2 == "symbol" || type2 == "boolean" ? value !== "__proto__" : value === null;
}
var _isKeyable = isKeyable$1;
var isKeyable = _isKeyable;
function getMapData$4(map2, key) {
  var data = map2.__data__;
  return isKeyable(key) ? data[typeof key == "string" ? "string" : "hash"] : data.map;
}
var _getMapData = getMapData$4;
var getMapData$3 = _getMapData;
function mapCacheDelete$1(key) {
  var result = getMapData$3(this, key)["delete"](key);
  this.size -= result ? 1 : 0;
  return result;
}
var _mapCacheDelete = mapCacheDelete$1;
var getMapData$2 = _getMapData;
function mapCacheGet$1(key) {
  return getMapData$2(this, key).get(key);
}
var _mapCacheGet = mapCacheGet$1;
var getMapData$1 = _getMapData;
function mapCacheHas$1(key) {
  return getMapData$1(this, key).has(key);
}
var _mapCacheHas = mapCacheHas$1;
var getMapData = _getMapData;
function mapCacheSet$1(key, value) {
  var data = getMapData(this, key), size = data.size;
  data.set(key, value);
  this.size += data.size == size ? 0 : 1;
  return this;
}
var _mapCacheSet = mapCacheSet$1;
var mapCacheClear = _mapCacheClear, mapCacheDelete = _mapCacheDelete, mapCacheGet = _mapCacheGet, mapCacheHas = _mapCacheHas, mapCacheSet = _mapCacheSet;
function MapCache$3(entries) {
  var index2 = -1, length = entries == null ? 0 : entries.length;
  this.clear();
  while (++index2 < length) {
    var entry = entries[index2];
    this.set(entry[0], entry[1]);
  }
}
MapCache$3.prototype.clear = mapCacheClear;
MapCache$3.prototype["delete"] = mapCacheDelete;
MapCache$3.prototype.get = mapCacheGet;
MapCache$3.prototype.has = mapCacheHas;
MapCache$3.prototype.set = mapCacheSet;
var _MapCache = MapCache$3;
var MapCache$2 = _MapCache;
var FUNC_ERROR_TEXT = "Expected a function";
function memoize$1(func, resolver) {
  if (typeof func != "function" || resolver != null && typeof resolver != "function") {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  var memoized = function() {
    var args = arguments, key = resolver ? resolver.apply(this, args) : args[0], cache = memoized.cache;
    if (cache.has(key)) {
      return cache.get(key);
    }
    var result = func.apply(this, args);
    memoized.cache = cache.set(key, result) || cache;
    return result;
  };
  memoized.cache = new (memoize$1.Cache || MapCache$2)();
  return memoized;
}
memoize$1.Cache = MapCache$2;
var memoize_1 = memoize$1;
var memoize = memoize_1;
var MAX_MEMOIZE_SIZE = 500;
function memoizeCapped$1(func) {
  var result = memoize(func, function(key) {
    if (cache.size === MAX_MEMOIZE_SIZE) {
      cache.clear();
    }
    return key;
  });
  var cache = result.cache;
  return result;
}
var _memoizeCapped = memoizeCapped$1;
var memoizeCapped = _memoizeCapped;
var rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;
var reEscapeChar = /\\(\\)?/g;
var stringToPath$1 = memoizeCapped(function(string2) {
  var result = [];
  if (string2.charCodeAt(0) === 46) {
    result.push("");
  }
  string2.replace(rePropName, function(match, number2, quote, subString) {
    result.push(quote ? subString.replace(reEscapeChar, "$1") : number2 || match);
  });
  return result;
});
var _stringToPath = stringToPath$1;
function arrayMap$1(array2, iteratee) {
  var index2 = -1, length = array2 == null ? 0 : array2.length, result = Array(length);
  while (++index2 < length) {
    result[index2] = iteratee(array2[index2], index2, array2);
  }
  return result;
}
var _arrayMap = arrayMap$1;
var Symbol$3 = _Symbol, arrayMap = _arrayMap, isArray$6 = isArray_1, isSymbol$2 = isSymbol_1;
var symbolProto$2 = Symbol$3 ? Symbol$3.prototype : void 0, symbolToString$2 = symbolProto$2 ? symbolProto$2.toString : void 0;
function baseToString$2(value) {
  if (typeof value == "string") {
    return value;
  }
  if (isArray$6(value)) {
    return arrayMap(value, baseToString$2) + "";
  }
  if (isSymbol$2(value)) {
    return symbolToString$2 ? symbolToString$2.call(value) : "";
  }
  var result = value + "";
  return result == "0" && 1 / value == -Infinity ? "-0" : result;
}
var _baseToString = baseToString$2;
var baseToString$1 = _baseToString;
function toString$7(value) {
  return value == null ? "" : baseToString$1(value);
}
var toString_1 = toString$7;
var isArray$5 = isArray_1, isKey$2 = _isKey, stringToPath = _stringToPath, toString$6 = toString_1;
function castPath$2(value, object2) {
  if (isArray$5(value)) {
    return value;
  }
  return isKey$2(value, object2) ? [value] : stringToPath(toString$6(value));
}
var _castPath = castPath$2;
var baseGetTag$2 = _baseGetTag, isObjectLike$4 = isObjectLike_1;
var argsTag$2 = "[object Arguments]";
function baseIsArguments$1(value) {
  return isObjectLike$4(value) && baseGetTag$2(value) == argsTag$2;
}
var _baseIsArguments = baseIsArguments$1;
var baseIsArguments = _baseIsArguments, isObjectLike$3 = isObjectLike_1;
var objectProto$7 = Object.prototype;
var hasOwnProperty$4 = objectProto$7.hasOwnProperty;
var propertyIsEnumerable$1 = objectProto$7.propertyIsEnumerable;
var isArguments$2 = baseIsArguments(/* @__PURE__ */ function() {
  return arguments;
}()) ? baseIsArguments : function(value) {
  return isObjectLike$3(value) && hasOwnProperty$4.call(value, "callee") && !propertyIsEnumerable$1.call(value, "callee");
};
var isArguments_1 = isArguments$2;
var MAX_SAFE_INTEGER$1 = 9007199254740991;
var reIsUint = /^(?:0|[1-9]\d*)$/;
function isIndex$2(value, length) {
  var type2 = typeof value;
  length = length == null ? MAX_SAFE_INTEGER$1 : length;
  return !!length && (type2 == "number" || type2 != "symbol" && reIsUint.test(value)) && (value > -1 && value % 1 == 0 && value < length);
}
var _isIndex = isIndex$2;
var MAX_SAFE_INTEGER = 9007199254740991;
function isLength$3(value) {
  return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}
var isLength_1 = isLength$3;
var isSymbol$1 = isSymbol_1;
function toKey$4(value) {
  if (typeof value == "string" || isSymbol$1(value)) {
    return value;
  }
  var result = value + "";
  return result == "0" && 1 / value == -Infinity ? "-0" : result;
}
var _toKey = toKey$4;
var castPath$1 = _castPath, isArguments$1 = isArguments_1, isArray$4 = isArray_1, isIndex$1 = _isIndex, isLength$2 = isLength_1, toKey$3 = _toKey;
function hasPath$2(object2, path2, hasFunc) {
  path2 = castPath$1(path2, object2);
  var index2 = -1, length = path2.length, result = false;
  while (++index2 < length) {
    var key = toKey$3(path2[index2]);
    if (!(result = object2 != null && hasFunc(object2, key))) {
      break;
    }
    object2 = object2[key];
  }
  if (result || ++index2 != length) {
    return result;
  }
  length = object2 == null ? 0 : object2.length;
  return !!length && isLength$2(length) && isIndex$1(key, length) && (isArray$4(object2) || isArguments$1(object2));
}
var _hasPath = hasPath$2;
var baseHas = _baseHas, hasPath$1 = _hasPath;
function has(object2, path2) {
  return object2 != null && hasPath$1(object2, path2, baseHas);
}
var has_1 = has;
const has$1 = /* @__PURE__ */ getDefaultExportFromCjs(has_1);
const isSchema = (obj) => obj && obj.__isYupSchema__;
class Condition {
  constructor(refs, options) {
    this.refs = refs;
    this.refs = refs;
    if (typeof options === "function") {
      this.fn = options;
      return;
    }
    if (!has$1(options, "is")) throw new TypeError("`is:` is required for `when()` conditions");
    if (!options.then && !options.otherwise) throw new TypeError("either `then:` or `otherwise:` is required for `when()` conditions");
    let {
      is,
      then,
      otherwise
    } = options;
    let check = typeof is === "function" ? is : (...values) => values.every((value) => value === is);
    this.fn = function(...args) {
      let options2 = args.pop();
      let schema2 = args.pop();
      let branch = check(...args) ? then : otherwise;
      if (!branch) return void 0;
      if (typeof branch === "function") return branch(schema2);
      return schema2.concat(branch.resolve(options2));
    };
  }
  resolve(base, options) {
    let values = this.refs.map((ref) => ref.getValue(options == null ? void 0 : options.value, options == null ? void 0 : options.parent, options == null ? void 0 : options.context));
    let schema2 = this.fn.apply(base, values.concat(base, options));
    if (schema2 === void 0 || schema2 === base) return base;
    if (!isSchema(schema2)) throw new TypeError("conditions must return a schema object");
    return schema2.resolve(options);
  }
}
function toArray$1(value) {
  return value == null ? [] : [].concat(value);
}
function _extends$4() {
  _extends$4 = Object.assign || function(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  return _extends$4.apply(this, arguments);
}
let strReg = /\$\{\s*(\w+)\s*\}/g;
let ValidationError$1 = class ValidationError extends Error {
  static formatError(message, params) {
    const path2 = params.label || params.path || "this";
    if (path2 !== params.path) params = _extends$4({}, params, {
      path: path2
    });
    if (typeof message === "string") return message.replace(strReg, (_2, key) => printValue$1(params[key]));
    if (typeof message === "function") return message(params);
    return message;
  }
  static isError(err) {
    return err && err.name === "ValidationError";
  }
  constructor(errorOrErrors, value, field, type2) {
    super();
    this.name = "ValidationError";
    this.value = value;
    this.path = field;
    this.type = type2;
    this.errors = [];
    this.inner = [];
    toArray$1(errorOrErrors).forEach((err) => {
      if (ValidationError.isError(err)) {
        this.errors.push(...err.errors);
        this.inner = this.inner.concat(err.inner.length ? err.inner : err);
      } else {
        this.errors.push(err);
      }
    });
    this.message = this.errors.length > 1 ? `${this.errors.length} errors occurred` : this.errors[0];
    if (Error.captureStackTrace) Error.captureStackTrace(this, ValidationError);
  }
};
const once = (cb) => {
  let fired = false;
  return (...args) => {
    if (fired) return;
    fired = true;
    cb(...args);
  };
};
function runTests(options, cb) {
  let {
    endEarly,
    tests,
    args,
    value,
    errors: errors2,
    sort: sort2,
    path: path2
  } = options;
  let callback = once(cb);
  let count = tests.length;
  const nestedErrors = [];
  errors2 = errors2 ? errors2 : [];
  if (!count) return errors2.length ? callback(new ValidationError$1(errors2, value, path2)) : callback(null, value);
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    test(args, function finishTestRun(err) {
      if (err) {
        if (!ValidationError$1.isError(err)) {
          return callback(err, value);
        }
        if (endEarly) {
          err.value = value;
          return callback(err, value);
        }
        nestedErrors.push(err);
      }
      if (--count <= 0) {
        if (nestedErrors.length) {
          if (sort2) nestedErrors.sort(sort2);
          if (errors2.length) nestedErrors.push(...errors2);
          errors2 = nestedErrors;
        }
        if (errors2.length) {
          callback(new ValidationError$1(errors2, value, path2), value);
          return;
        }
        callback(null, value);
      }
    });
  }
}
var getNative$4 = _getNative;
var defineProperty$1 = function() {
  try {
    var func = getNative$4(Object, "defineProperty");
    func({}, "", {});
    return func;
  } catch (e) {
  }
}();
var _defineProperty = defineProperty$1;
var defineProperty = _defineProperty;
function baseAssignValue$2(object2, key, value) {
  if (key == "__proto__" && defineProperty) {
    defineProperty(object2, key, {
      "configurable": true,
      "enumerable": true,
      "value": value,
      "writable": true
    });
  } else {
    object2[key] = value;
  }
}
var _baseAssignValue = baseAssignValue$2;
function createBaseFor$1(fromRight) {
  return function(object2, iteratee, keysFunc) {
    var index2 = -1, iterable = Object(object2), props = keysFunc(object2), length = props.length;
    while (length--) {
      var key = props[fromRight ? length : ++index2];
      if (iteratee(iterable[key], key, iterable) === false) {
        break;
      }
    }
    return object2;
  };
}
var _createBaseFor = createBaseFor$1;
var createBaseFor = _createBaseFor;
var baseFor$1 = createBaseFor();
var _baseFor = baseFor$1;
function baseTimes$1(n, iteratee) {
  var index2 = -1, result = Array(n);
  while (++index2 < n) {
    result[index2] = iteratee(index2);
  }
  return result;
}
var _baseTimes = baseTimes$1;
var isBuffer$2 = { exports: {} };
function stubFalse() {
  return false;
}
var stubFalse_1 = stubFalse;
isBuffer$2.exports;
(function(module, exports$1) {
  var root2 = _root, stubFalse2 = stubFalse_1;
  var freeExports = exports$1 && !exports$1.nodeType && exports$1;
  var freeModule = freeExports && true && module && !module.nodeType && module;
  var moduleExports = freeModule && freeModule.exports === freeExports;
  var Buffer2 = moduleExports ? root2.Buffer : void 0;
  var nativeIsBuffer = Buffer2 ? Buffer2.isBuffer : void 0;
  var isBuffer2 = nativeIsBuffer || stubFalse2;
  module.exports = isBuffer2;
})(isBuffer$2, isBuffer$2.exports);
var isBufferExports = isBuffer$2.exports;
var baseGetTag$1 = _baseGetTag, isLength$1 = isLength_1, isObjectLike$2 = isObjectLike_1;
var argsTag$1 = "[object Arguments]", arrayTag$1 = "[object Array]", boolTag$1 = "[object Boolean]", dateTag$1 = "[object Date]", errorTag$1 = "[object Error]", funcTag = "[object Function]", mapTag$2 = "[object Map]", numberTag$1 = "[object Number]", objectTag$2 = "[object Object]", regexpTag$1 = "[object RegExp]", setTag$2 = "[object Set]", stringTag$1 = "[object String]", weakMapTag$1 = "[object WeakMap]";
var arrayBufferTag$1 = "[object ArrayBuffer]", dataViewTag$2 = "[object DataView]", float32Tag = "[object Float32Array]", float64Tag = "[object Float64Array]", int8Tag = "[object Int8Array]", int16Tag = "[object Int16Array]", int32Tag = "[object Int32Array]", uint8Tag = "[object Uint8Array]", uint8ClampedTag = "[object Uint8ClampedArray]", uint16Tag = "[object Uint16Array]", uint32Tag = "[object Uint32Array]";
var typedArrayTags = {};
typedArrayTags[float32Tag] = typedArrayTags[float64Tag] = typedArrayTags[int8Tag] = typedArrayTags[int16Tag] = typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] = typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] = typedArrayTags[uint32Tag] = true;
typedArrayTags[argsTag$1] = typedArrayTags[arrayTag$1] = typedArrayTags[arrayBufferTag$1] = typedArrayTags[boolTag$1] = typedArrayTags[dataViewTag$2] = typedArrayTags[dateTag$1] = typedArrayTags[errorTag$1] = typedArrayTags[funcTag] = typedArrayTags[mapTag$2] = typedArrayTags[numberTag$1] = typedArrayTags[objectTag$2] = typedArrayTags[regexpTag$1] = typedArrayTags[setTag$2] = typedArrayTags[stringTag$1] = typedArrayTags[weakMapTag$1] = false;
function baseIsTypedArray$1(value) {
  return isObjectLike$2(value) && isLength$1(value.length) && !!typedArrayTags[baseGetTag$1(value)];
}
var _baseIsTypedArray = baseIsTypedArray$1;
function baseUnary$1(func) {
  return function(value) {
    return func(value);
  };
}
var _baseUnary = baseUnary$1;
var _nodeUtil = { exports: {} };
_nodeUtil.exports;
(function(module, exports$1) {
  var freeGlobal2 = _freeGlobal;
  var freeExports = exports$1 && !exports$1.nodeType && exports$1;
  var freeModule = freeExports && true && module && !module.nodeType && module;
  var moduleExports = freeModule && freeModule.exports === freeExports;
  var freeProcess = moduleExports && freeGlobal2.process;
  var nodeUtil2 = function() {
    try {
      var types = freeModule && freeModule.require && freeModule.require("util").types;
      if (types) {
        return types;
      }
      return freeProcess && freeProcess.binding && freeProcess.binding("util");
    } catch (e) {
    }
  }();
  module.exports = nodeUtil2;
})(_nodeUtil, _nodeUtil.exports);
var _nodeUtilExports = _nodeUtil.exports;
var baseIsTypedArray = _baseIsTypedArray, baseUnary = _baseUnary, nodeUtil = _nodeUtilExports;
var nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;
var isTypedArray$2 = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;
var isTypedArray_1 = isTypedArray$2;
var baseTimes = _baseTimes, isArguments = isArguments_1, isArray$3 = isArray_1, isBuffer$1 = isBufferExports, isIndex = _isIndex, isTypedArray$1 = isTypedArray_1;
var objectProto$6 = Object.prototype;
var hasOwnProperty$3 = objectProto$6.hasOwnProperty;
function arrayLikeKeys$1(value, inherited) {
  var isArr = isArray$3(value), isArg = !isArr && isArguments(value), isBuff = !isArr && !isArg && isBuffer$1(value), isType = !isArr && !isArg && !isBuff && isTypedArray$1(value), skipIndexes = isArr || isArg || isBuff || isType, result = skipIndexes ? baseTimes(value.length, String) : [], length = result.length;
  for (var key in value) {
    if ((inherited || hasOwnProperty$3.call(value, key)) && !(skipIndexes && // Safari 9 has enumerable `arguments.length` in strict mode.
    (key == "length" || // Node.js 0.10 has enumerable non-index properties on buffers.
    isBuff && (key == "offset" || key == "parent") || // PhantomJS 2 has enumerable non-index properties on typed arrays.
    isType && (key == "buffer" || key == "byteLength" || key == "byteOffset") || // Skip index properties.
    isIndex(key, length)))) {
      result.push(key);
    }
  }
  return result;
}
var _arrayLikeKeys = arrayLikeKeys$1;
var objectProto$5 = Object.prototype;
function isPrototype$1(value) {
  var Ctor = value && value.constructor, proto = typeof Ctor == "function" && Ctor.prototype || objectProto$5;
  return value === proto;
}
var _isPrototype = isPrototype$1;
function overArg$1(func, transform2) {
  return function(arg) {
    return func(transform2(arg));
  };
}
var _overArg = overArg$1;
var overArg = _overArg;
var nativeKeys$1 = overArg(Object.keys, Object);
var _nativeKeys = nativeKeys$1;
var isPrototype = _isPrototype, nativeKeys = _nativeKeys;
var objectProto$4 = Object.prototype;
var hasOwnProperty$2 = objectProto$4.hasOwnProperty;
function baseKeys$1(object2) {
  if (!isPrototype(object2)) {
    return nativeKeys(object2);
  }
  var result = [];
  for (var key in Object(object2)) {
    if (hasOwnProperty$2.call(object2, key) && key != "constructor") {
      result.push(key);
    }
  }
  return result;
}
var _baseKeys = baseKeys$1;
var isFunction$1 = isFunction_1, isLength = isLength_1;
function isArrayLike$1(value) {
  return value != null && isLength(value.length) && !isFunction$1(value);
}
var isArrayLike_1 = isArrayLike$1;
var arrayLikeKeys = _arrayLikeKeys, baseKeys = _baseKeys, isArrayLike = isArrayLike_1;
function keys$3(object2) {
  return isArrayLike(object2) ? arrayLikeKeys(object2) : baseKeys(object2);
}
var keys_1 = keys$3;
var baseFor = _baseFor, keys$2 = keys_1;
function baseForOwn$2(object2, iteratee) {
  return object2 && baseFor(object2, iteratee, keys$2);
}
var _baseForOwn = baseForOwn$2;
var ListCache$2 = _ListCache;
function stackClear$1() {
  this.__data__ = new ListCache$2();
  this.size = 0;
}
var _stackClear = stackClear$1;
function stackDelete$1(key) {
  var data = this.__data__, result = data["delete"](key);
  this.size = data.size;
  return result;
}
var _stackDelete = stackDelete$1;
function stackGet$1(key) {
  return this.__data__.get(key);
}
var _stackGet = stackGet$1;
function stackHas$1(key) {
  return this.__data__.has(key);
}
var _stackHas = stackHas$1;
var ListCache$1 = _ListCache, Map$2 = _Map, MapCache$1 = _MapCache;
var LARGE_ARRAY_SIZE = 200;
function stackSet$1(key, value) {
  var data = this.__data__;
  if (data instanceof ListCache$1) {
    var pairs2 = data.__data__;
    if (!Map$2 || pairs2.length < LARGE_ARRAY_SIZE - 1) {
      pairs2.push([key, value]);
      this.size = ++data.size;
      return this;
    }
    data = this.__data__ = new MapCache$1(pairs2);
  }
  data.set(key, value);
  this.size = data.size;
  return this;
}
var _stackSet = stackSet$1;
var ListCache = _ListCache, stackClear = _stackClear, stackDelete = _stackDelete, stackGet = _stackGet, stackHas = _stackHas, stackSet = _stackSet;
function Stack$2(entries) {
  var data = this.__data__ = new ListCache(entries);
  this.size = data.size;
}
Stack$2.prototype.clear = stackClear;
Stack$2.prototype["delete"] = stackDelete;
Stack$2.prototype.get = stackGet;
Stack$2.prototype.has = stackHas;
Stack$2.prototype.set = stackSet;
var _Stack = Stack$2;
var HASH_UNDEFINED = "__lodash_hash_undefined__";
function setCacheAdd$1(value) {
  this.__data__.set(value, HASH_UNDEFINED);
  return this;
}
var _setCacheAdd = setCacheAdd$1;
function setCacheHas$1(value) {
  return this.__data__.has(value);
}
var _setCacheHas = setCacheHas$1;
var MapCache = _MapCache, setCacheAdd = _setCacheAdd, setCacheHas = _setCacheHas;
function SetCache$1(values) {
  var index2 = -1, length = values == null ? 0 : values.length;
  this.__data__ = new MapCache();
  while (++index2 < length) {
    this.add(values[index2]);
  }
}
SetCache$1.prototype.add = SetCache$1.prototype.push = setCacheAdd;
SetCache$1.prototype.has = setCacheHas;
var _SetCache = SetCache$1;
function arraySome$1(array2, predicate) {
  var index2 = -1, length = array2 == null ? 0 : array2.length;
  while (++index2 < length) {
    if (predicate(array2[index2], index2, array2)) {
      return true;
    }
  }
  return false;
}
var _arraySome = arraySome$1;
function cacheHas$1(cache, key) {
  return cache.has(key);
}
var _cacheHas = cacheHas$1;
var SetCache = _SetCache, arraySome = _arraySome, cacheHas = _cacheHas;
var COMPARE_PARTIAL_FLAG$5 = 1, COMPARE_UNORDERED_FLAG$3 = 2;
function equalArrays$2(array2, other, bitmask, customizer, equalFunc, stack) {
  var isPartial = bitmask & COMPARE_PARTIAL_FLAG$5, arrLength = array2.length, othLength = other.length;
  if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
    return false;
  }
  var arrStacked = stack.get(array2);
  var othStacked = stack.get(other);
  if (arrStacked && othStacked) {
    return arrStacked == other && othStacked == array2;
  }
  var index2 = -1, result = true, seen = bitmask & COMPARE_UNORDERED_FLAG$3 ? new SetCache() : void 0;
  stack.set(array2, other);
  stack.set(other, array2);
  while (++index2 < arrLength) {
    var arrValue = array2[index2], othValue = other[index2];
    if (customizer) {
      var compared = isPartial ? customizer(othValue, arrValue, index2, other, array2, stack) : customizer(arrValue, othValue, index2, array2, other, stack);
    }
    if (compared !== void 0) {
      if (compared) {
        continue;
      }
      result = false;
      break;
    }
    if (seen) {
      if (!arraySome(other, function(othValue2, othIndex) {
        if (!cacheHas(seen, othIndex) && (arrValue === othValue2 || equalFunc(arrValue, othValue2, bitmask, customizer, stack))) {
          return seen.push(othIndex);
        }
      })) {
        result = false;
        break;
      }
    } else if (!(arrValue === othValue || equalFunc(arrValue, othValue, bitmask, customizer, stack))) {
      result = false;
      break;
    }
  }
  stack["delete"](array2);
  stack["delete"](other);
  return result;
}
var _equalArrays = equalArrays$2;
var root$5 = _root;
var Uint8Array$1 = root$5.Uint8Array;
var _Uint8Array = Uint8Array$1;
function mapToArray$1(map2) {
  var index2 = -1, result = Array(map2.size);
  map2.forEach(function(value, key) {
    result[++index2] = [key, value];
  });
  return result;
}
var _mapToArray = mapToArray$1;
function setToArray$1(set2) {
  var index2 = -1, result = Array(set2.size);
  set2.forEach(function(value) {
    result[++index2] = value;
  });
  return result;
}
var _setToArray = setToArray$1;
var Symbol$2 = _Symbol, Uint8Array = _Uint8Array, eq = eq_1, equalArrays$1 = _equalArrays, mapToArray = _mapToArray, setToArray = _setToArray;
var COMPARE_PARTIAL_FLAG$4 = 1, COMPARE_UNORDERED_FLAG$2 = 2;
var boolTag = "[object Boolean]", dateTag = "[object Date]", errorTag = "[object Error]", mapTag$1 = "[object Map]", numberTag = "[object Number]", regexpTag = "[object RegExp]", setTag$1 = "[object Set]", stringTag = "[object String]", symbolTag$1 = "[object Symbol]";
var arrayBufferTag = "[object ArrayBuffer]", dataViewTag$1 = "[object DataView]";
var symbolProto$1 = Symbol$2 ? Symbol$2.prototype : void 0, symbolValueOf = symbolProto$1 ? symbolProto$1.valueOf : void 0;
function equalByTag$1(object2, other, tag, bitmask, customizer, equalFunc, stack) {
  switch (tag) {
    case dataViewTag$1:
      if (object2.byteLength != other.byteLength || object2.byteOffset != other.byteOffset) {
        return false;
      }
      object2 = object2.buffer;
      other = other.buffer;
    case arrayBufferTag:
      if (object2.byteLength != other.byteLength || !equalFunc(new Uint8Array(object2), new Uint8Array(other))) {
        return false;
      }
      return true;
    case boolTag:
    case dateTag:
    case numberTag:
      return eq(+object2, +other);
    case errorTag:
      return object2.name == other.name && object2.message == other.message;
    case regexpTag:
    case stringTag:
      return object2 == other + "";
    case mapTag$1:
      var convert = mapToArray;
    case setTag$1:
      var isPartial = bitmask & COMPARE_PARTIAL_FLAG$4;
      convert || (convert = setToArray);
      if (object2.size != other.size && !isPartial) {
        return false;
      }
      var stacked = stack.get(object2);
      if (stacked) {
        return stacked == other;
      }
      bitmask |= COMPARE_UNORDERED_FLAG$2;
      stack.set(object2, other);
      var result = equalArrays$1(convert(object2), convert(other), bitmask, customizer, equalFunc, stack);
      stack["delete"](object2);
      return result;
    case symbolTag$1:
      if (symbolValueOf) {
        return symbolValueOf.call(object2) == symbolValueOf.call(other);
      }
  }
  return false;
}
var _equalByTag = equalByTag$1;
function arrayPush$1(array2, values) {
  var index2 = -1, length = values.length, offset = array2.length;
  while (++index2 < length) {
    array2[offset + index2] = values[index2];
  }
  return array2;
}
var _arrayPush = arrayPush$1;
var arrayPush = _arrayPush, isArray$2 = isArray_1;
function baseGetAllKeys$1(object2, keysFunc, symbolsFunc) {
  var result = keysFunc(object2);
  return isArray$2(object2) ? result : arrayPush(result, symbolsFunc(object2));
}
var _baseGetAllKeys = baseGetAllKeys$1;
function arrayFilter$1(array2, predicate) {
  var index2 = -1, length = array2 == null ? 0 : array2.length, resIndex = 0, result = [];
  while (++index2 < length) {
    var value = array2[index2];
    if (predicate(value, index2, array2)) {
      result[resIndex++] = value;
    }
  }
  return result;
}
var _arrayFilter = arrayFilter$1;
function stubArray$1() {
  return [];
}
var stubArray_1 = stubArray$1;
var arrayFilter = _arrayFilter, stubArray = stubArray_1;
var objectProto$3 = Object.prototype;
var propertyIsEnumerable = objectProto$3.propertyIsEnumerable;
var nativeGetSymbols = Object.getOwnPropertySymbols;
var getSymbols$1 = !nativeGetSymbols ? stubArray : function(object2) {
  if (object2 == null) {
    return [];
  }
  object2 = Object(object2);
  return arrayFilter(nativeGetSymbols(object2), function(symbol) {
    return propertyIsEnumerable.call(object2, symbol);
  });
};
var _getSymbols = getSymbols$1;
var baseGetAllKeys = _baseGetAllKeys, getSymbols = _getSymbols, keys$1 = keys_1;
function getAllKeys$1(object2) {
  return baseGetAllKeys(object2, keys$1, getSymbols);
}
var _getAllKeys = getAllKeys$1;
var getAllKeys = _getAllKeys;
var COMPARE_PARTIAL_FLAG$3 = 1;
var objectProto$2 = Object.prototype;
var hasOwnProperty$1 = objectProto$2.hasOwnProperty;
function equalObjects$1(object2, other, bitmask, customizer, equalFunc, stack) {
  var isPartial = bitmask & COMPARE_PARTIAL_FLAG$3, objProps = getAllKeys(object2), objLength = objProps.length, othProps = getAllKeys(other), othLength = othProps.length;
  if (objLength != othLength && !isPartial) {
    return false;
  }
  var index2 = objLength;
  while (index2--) {
    var key = objProps[index2];
    if (!(isPartial ? key in other : hasOwnProperty$1.call(other, key))) {
      return false;
    }
  }
  var objStacked = stack.get(object2);
  var othStacked = stack.get(other);
  if (objStacked && othStacked) {
    return objStacked == other && othStacked == object2;
  }
  var result = true;
  stack.set(object2, other);
  stack.set(other, object2);
  var skipCtor = isPartial;
  while (++index2 < objLength) {
    key = objProps[index2];
    var objValue = object2[key], othValue = other[key];
    if (customizer) {
      var compared = isPartial ? customizer(othValue, objValue, key, other, object2, stack) : customizer(objValue, othValue, key, object2, other, stack);
    }
    if (!(compared === void 0 ? objValue === othValue || equalFunc(objValue, othValue, bitmask, customizer, stack) : compared)) {
      result = false;
      break;
    }
    skipCtor || (skipCtor = key == "constructor");
  }
  if (result && !skipCtor) {
    var objCtor = object2.constructor, othCtor = other.constructor;
    if (objCtor != othCtor && ("constructor" in object2 && "constructor" in other) && !(typeof objCtor == "function" && objCtor instanceof objCtor && typeof othCtor == "function" && othCtor instanceof othCtor)) {
      result = false;
    }
  }
  stack["delete"](object2);
  stack["delete"](other);
  return result;
}
var _equalObjects = equalObjects$1;
var getNative$3 = _getNative, root$4 = _root;
var DataView$1 = getNative$3(root$4, "DataView");
var _DataView = DataView$1;
var getNative$2 = _getNative, root$3 = _root;
var Promise$2 = getNative$2(root$3, "Promise");
var _Promise = Promise$2;
var getNative$1 = _getNative, root$2 = _root;
var Set$2 = getNative$1(root$2, "Set");
var _Set = Set$2;
var getNative = _getNative, root$1 = _root;
var WeakMap$2 = getNative(root$1, "WeakMap");
var _WeakMap = WeakMap$2;
var DataView = _DataView, Map$1 = _Map, Promise$1 = _Promise, Set$1 = _Set, WeakMap$1 = _WeakMap, baseGetTag = _baseGetTag, toSource = _toSource;
var mapTag = "[object Map]", objectTag$1 = "[object Object]", promiseTag = "[object Promise]", setTag = "[object Set]", weakMapTag = "[object WeakMap]";
var dataViewTag = "[object DataView]";
var dataViewCtorString = toSource(DataView), mapCtorString = toSource(Map$1), promiseCtorString = toSource(Promise$1), setCtorString = toSource(Set$1), weakMapCtorString = toSource(WeakMap$1);
var getTag$1 = baseGetTag;
if (DataView && getTag$1(new DataView(new ArrayBuffer(1))) != dataViewTag || Map$1 && getTag$1(new Map$1()) != mapTag || Promise$1 && getTag$1(Promise$1.resolve()) != promiseTag || Set$1 && getTag$1(new Set$1()) != setTag || WeakMap$1 && getTag$1(new WeakMap$1()) != weakMapTag) {
  getTag$1 = function(value) {
    var result = baseGetTag(value), Ctor = result == objectTag$1 ? value.constructor : void 0, ctorString = Ctor ? toSource(Ctor) : "";
    if (ctorString) {
      switch (ctorString) {
        case dataViewCtorString:
          return dataViewTag;
        case mapCtorString:
          return mapTag;
        case promiseCtorString:
          return promiseTag;
        case setCtorString:
          return setTag;
        case weakMapCtorString:
          return weakMapTag;
      }
    }
    return result;
  };
}
var _getTag = getTag$1;
var Stack$1 = _Stack, equalArrays = _equalArrays, equalByTag = _equalByTag, equalObjects = _equalObjects, getTag = _getTag, isArray$1 = isArray_1, isBuffer = isBufferExports, isTypedArray = isTypedArray_1;
var COMPARE_PARTIAL_FLAG$2 = 1;
var argsTag = "[object Arguments]", arrayTag = "[object Array]", objectTag = "[object Object]";
var objectProto$1 = Object.prototype;
var hasOwnProperty = objectProto$1.hasOwnProperty;
function baseIsEqualDeep$1(object2, other, bitmask, customizer, equalFunc, stack) {
  var objIsArr = isArray$1(object2), othIsArr = isArray$1(other), objTag = objIsArr ? arrayTag : getTag(object2), othTag = othIsArr ? arrayTag : getTag(other);
  objTag = objTag == argsTag ? objectTag : objTag;
  othTag = othTag == argsTag ? objectTag : othTag;
  var objIsObj = objTag == objectTag, othIsObj = othTag == objectTag, isSameTag = objTag == othTag;
  if (isSameTag && isBuffer(object2)) {
    if (!isBuffer(other)) {
      return false;
    }
    objIsArr = true;
    objIsObj = false;
  }
  if (isSameTag && !objIsObj) {
    stack || (stack = new Stack$1());
    return objIsArr || isTypedArray(object2) ? equalArrays(object2, other, bitmask, customizer, equalFunc, stack) : equalByTag(object2, other, objTag, bitmask, customizer, equalFunc, stack);
  }
  if (!(bitmask & COMPARE_PARTIAL_FLAG$2)) {
    var objIsWrapped = objIsObj && hasOwnProperty.call(object2, "__wrapped__"), othIsWrapped = othIsObj && hasOwnProperty.call(other, "__wrapped__");
    if (objIsWrapped || othIsWrapped) {
      var objUnwrapped = objIsWrapped ? object2.value() : object2, othUnwrapped = othIsWrapped ? other.value() : other;
      stack || (stack = new Stack$1());
      return equalFunc(objUnwrapped, othUnwrapped, bitmask, customizer, stack);
    }
  }
  if (!isSameTag) {
    return false;
  }
  stack || (stack = new Stack$1());
  return equalObjects(object2, other, bitmask, customizer, equalFunc, stack);
}
var _baseIsEqualDeep = baseIsEqualDeep$1;
var baseIsEqualDeep = _baseIsEqualDeep, isObjectLike$1 = isObjectLike_1;
function baseIsEqual$2(value, other, bitmask, customizer, stack) {
  if (value === other) {
    return true;
  }
  if (value == null || other == null || !isObjectLike$1(value) && !isObjectLike$1(other)) {
    return value !== value && other !== other;
  }
  return baseIsEqualDeep(value, other, bitmask, customizer, baseIsEqual$2, stack);
}
var _baseIsEqual = baseIsEqual$2;
var Stack = _Stack, baseIsEqual$1 = _baseIsEqual;
var COMPARE_PARTIAL_FLAG$1 = 1, COMPARE_UNORDERED_FLAG$1 = 2;
function baseIsMatch$1(object2, source, matchData, customizer) {
  var index2 = matchData.length, length = index2, noCustomizer = !customizer;
  if (object2 == null) {
    return !length;
  }
  object2 = Object(object2);
  while (index2--) {
    var data = matchData[index2];
    if (noCustomizer && data[2] ? data[1] !== object2[data[0]] : !(data[0] in object2)) {
      return false;
    }
  }
  while (++index2 < length) {
    data = matchData[index2];
    var key = data[0], objValue = object2[key], srcValue = data[1];
    if (noCustomizer && data[2]) {
      if (objValue === void 0 && !(key in object2)) {
        return false;
      }
    } else {
      var stack = new Stack();
      if (customizer) {
        var result = customizer(objValue, srcValue, key, object2, source, stack);
      }
      if (!(result === void 0 ? baseIsEqual$1(srcValue, objValue, COMPARE_PARTIAL_FLAG$1 | COMPARE_UNORDERED_FLAG$1, customizer, stack) : result)) {
        return false;
      }
    }
  }
  return true;
}
var _baseIsMatch = baseIsMatch$1;
var isObject$4 = isObject_1;
function isStrictComparable$2(value) {
  return value === value && !isObject$4(value);
}
var _isStrictComparable = isStrictComparable$2;
var isStrictComparable$1 = _isStrictComparable, keys = keys_1;
function getMatchData$1(object2) {
  var result = keys(object2), length = result.length;
  while (length--) {
    var key = result[length], value = object2[key];
    result[length] = [key, value, isStrictComparable$1(value)];
  }
  return result;
}
var _getMatchData = getMatchData$1;
function matchesStrictComparable$2(key, srcValue) {
  return function(object2) {
    if (object2 == null) {
      return false;
    }
    return object2[key] === srcValue && (srcValue !== void 0 || key in Object(object2));
  };
}
var _matchesStrictComparable = matchesStrictComparable$2;
var baseIsMatch = _baseIsMatch, getMatchData = _getMatchData, matchesStrictComparable$1 = _matchesStrictComparable;
function baseMatches$1(source) {
  var matchData = getMatchData(source);
  if (matchData.length == 1 && matchData[0][2]) {
    return matchesStrictComparable$1(matchData[0][0], matchData[0][1]);
  }
  return function(object2) {
    return object2 === source || baseIsMatch(object2, source, matchData);
  };
}
var _baseMatches = baseMatches$1;
var castPath = _castPath, toKey$2 = _toKey;
function baseGet$2(object2, path2) {
  path2 = castPath(path2, object2);
  var index2 = 0, length = path2.length;
  while (object2 != null && index2 < length) {
    object2 = object2[toKey$2(path2[index2++])];
  }
  return index2 && index2 == length ? object2 : void 0;
}
var _baseGet = baseGet$2;
var baseGet$1 = _baseGet;
function get$1(object2, path2, defaultValue) {
  var result = object2 == null ? void 0 : baseGet$1(object2, path2);
  return result === void 0 ? defaultValue : result;
}
var get_1 = get$1;
function baseHasIn$1(object2, key) {
  return object2 != null && key in Object(object2);
}
var _baseHasIn = baseHasIn$1;
var baseHasIn = _baseHasIn, hasPath = _hasPath;
function hasIn$1(object2, path2) {
  return object2 != null && hasPath(object2, path2, baseHasIn);
}
var hasIn_1 = hasIn$1;
var baseIsEqual = _baseIsEqual, get = get_1, hasIn = hasIn_1, isKey$1 = _isKey, isStrictComparable = _isStrictComparable, matchesStrictComparable = _matchesStrictComparable, toKey$1 = _toKey;
var COMPARE_PARTIAL_FLAG = 1, COMPARE_UNORDERED_FLAG = 2;
function baseMatchesProperty$1(path2, srcValue) {
  if (isKey$1(path2) && isStrictComparable(srcValue)) {
    return matchesStrictComparable(toKey$1(path2), srcValue);
  }
  return function(object2) {
    var objValue = get(object2, path2);
    return objValue === void 0 && objValue === srcValue ? hasIn(object2, path2) : baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG | COMPARE_UNORDERED_FLAG);
  };
}
var _baseMatchesProperty = baseMatchesProperty$1;
function identity$1(value) {
  return value;
}
var identity_1 = identity$1;
function baseProperty$1(key) {
  return function(object2) {
    return object2 == null ? void 0 : object2[key];
  };
}
var _baseProperty = baseProperty$1;
var baseGet = _baseGet;
function basePropertyDeep$1(path2) {
  return function(object2) {
    return baseGet(object2, path2);
  };
}
var _basePropertyDeep = basePropertyDeep$1;
var baseProperty = _baseProperty, basePropertyDeep = _basePropertyDeep, isKey = _isKey, toKey = _toKey;
function property$1(path2) {
  return isKey(path2) ? baseProperty(toKey(path2)) : basePropertyDeep(path2);
}
var property_1 = property$1;
var baseMatches = _baseMatches, baseMatchesProperty = _baseMatchesProperty, identity = identity_1, isArray = isArray_1, property = property_1;
function baseIteratee$2(value) {
  if (typeof value == "function") {
    return value;
  }
  if (value == null) {
    return identity;
  }
  if (typeof value == "object") {
    return isArray(value) ? baseMatchesProperty(value[0], value[1]) : baseMatches(value);
  }
  return property(value);
}
var _baseIteratee = baseIteratee$2;
var baseAssignValue$1 = _baseAssignValue, baseForOwn$1 = _baseForOwn, baseIteratee$1 = _baseIteratee;
function mapValues(object2, iteratee) {
  var result = {};
  iteratee = baseIteratee$1(iteratee);
  baseForOwn$1(object2, function(value, key, object3) {
    baseAssignValue$1(result, key, iteratee(value, key, object3));
  });
  return result;
}
var mapValues_1 = mapValues;
const mapValues$1 = /* @__PURE__ */ getDefaultExportFromCjs(mapValues_1);
function Cache(maxSize) {
  this._maxSize = maxSize;
  this.clear();
}
Cache.prototype.clear = function() {
  this._size = 0;
  this._values = /* @__PURE__ */ Object.create(null);
};
Cache.prototype.get = function(key) {
  return this._values[key];
};
Cache.prototype.set = function(key, value) {
  this._size >= this._maxSize && this.clear();
  if (!(key in this._values)) this._size++;
  return this._values[key] = value;
};
var SPLIT_REGEX = /[^.^\]^[]+|(?=\[\]|\.\.)/g, DIGIT_REGEX = /^\d+$/, LEAD_DIGIT_REGEX = /^\d/, SPEC_CHAR_REGEX = /[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/g, CLEAN_QUOTES_REGEX = /^\s*(['"]?)(.*?)(\1)\s*$/, MAX_CACHE_SIZE = 512;
var pathCache = new Cache(MAX_CACHE_SIZE), setCache = new Cache(MAX_CACHE_SIZE), getCache = new Cache(MAX_CACHE_SIZE);
var propertyExpr = {
  Cache,
  split,
  normalizePath,
  setter: function(path2) {
    var parts = normalizePath(path2);
    return setCache.get(path2) || setCache.set(path2, function setter(obj, value) {
      var index2 = 0;
      var len = parts.length;
      var data = obj;
      while (index2 < len - 1) {
        var part = parts[index2];
        if (part === "__proto__" || part === "constructor" || part === "prototype") {
          return obj;
        }
        data = data[parts[index2++]];
      }
      data[parts[index2]] = value;
    });
  },
  getter: function(path2, safe) {
    var parts = normalizePath(path2);
    return getCache.get(path2) || getCache.set(path2, function getter(data) {
      var index2 = 0, len = parts.length;
      while (index2 < len) {
        if (data != null || !safe) data = data[parts[index2++]];
        else return;
      }
      return data;
    });
  },
  join: function(segments) {
    return segments.reduce(function(path2, part) {
      return path2 + (isQuoted(part) || DIGIT_REGEX.test(part) ? "[" + part + "]" : (path2 ? "." : "") + part);
    }, "");
  },
  forEach: function(path2, cb, thisArg) {
    forEach(Array.isArray(path2) ? path2 : split(path2), cb, thisArg);
  }
};
function normalizePath(path2) {
  return pathCache.get(path2) || pathCache.set(
    path2,
    split(path2).map(function(part) {
      return part.replace(CLEAN_QUOTES_REGEX, "$2");
    })
  );
}
function split(path2) {
  return path2.match(SPLIT_REGEX) || [""];
}
function forEach(parts, iter, thisArg) {
  var len = parts.length, part, idx, isArray2, isBracket;
  for (idx = 0; idx < len; idx++) {
    part = parts[idx];
    if (part) {
      if (shouldBeQuoted(part)) {
        part = '"' + part + '"';
      }
      isBracket = isQuoted(part);
      isArray2 = !isBracket && /^\d+$/.test(part);
      iter.call(thisArg, part, isBracket, isArray2, idx, parts);
    }
  }
}
function isQuoted(str2) {
  return typeof str2 === "string" && str2 && ["'", '"'].indexOf(str2.charAt(0)) !== -1;
}
function hasLeadingNumber(part) {
  return part.match(LEAD_DIGIT_REGEX) && !part.match(DIGIT_REGEX);
}
function hasSpecialChars(part) {
  return SPEC_CHAR_REGEX.test(part);
}
function shouldBeQuoted(part) {
  return !isQuoted(part) && (hasLeadingNumber(part) || hasSpecialChars(part));
}
const prefixes = {
  context: "$",
  value: "."
};
function create$8(key, options) {
  return new Reference(key, options);
}
class Reference {
  constructor(key, options = {}) {
    if (typeof key !== "string") throw new TypeError("ref must be a string, got: " + key);
    this.key = key.trim();
    if (key === "") throw new TypeError("ref must be a non-empty string");
    this.isContext = this.key[0] === prefixes.context;
    this.isValue = this.key[0] === prefixes.value;
    this.isSibling = !this.isContext && !this.isValue;
    let prefix = this.isContext ? prefixes.context : this.isValue ? prefixes.value : "";
    this.path = this.key.slice(prefix.length);
    this.getter = this.path && propertyExpr.getter(this.path, true);
    this.map = options.map;
  }
  getValue(value, parent, context) {
    let result = this.isContext ? context : this.isValue ? value : parent;
    if (this.getter) result = this.getter(result || {});
    if (this.map) result = this.map(result);
    return result;
  }
  /**
   *
   * @param {*} value
   * @param {Object} options
   * @param {Object=} options.context
   * @param {Object=} options.parent
   */
  cast(value, options) {
    return this.getValue(value, options == null ? void 0 : options.parent, options == null ? void 0 : options.context);
  }
  resolve() {
    return this;
  }
  describe() {
    return {
      type: "ref",
      key: this.key
    };
  }
  toString() {
    return `Ref(${this.key})`;
  }
  static isRef(value) {
    return value && value.__isYupRef;
  }
}
Reference.prototype.__isYupRef = true;
function _extends$3() {
  _extends$3 = Object.assign || function(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  return _extends$3.apply(this, arguments);
}
function _objectWithoutPropertiesLoose(source, excluded) {
  if (source == null) return {};
  var target = {};
  var sourceKeys = Object.keys(source);
  var key, i;
  for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i];
    if (excluded.indexOf(key) >= 0) continue;
    target[key] = source[key];
  }
  return target;
}
function createValidation(config2) {
  function validate(_ref, cb) {
    let {
      value,
      path: path2 = "",
      label,
      options,
      originalValue,
      sync: sync2
    } = _ref, rest = _objectWithoutPropertiesLoose(_ref, ["value", "path", "label", "options", "originalValue", "sync"]);
    const {
      name,
      test,
      params,
      message
    } = config2;
    let {
      parent,
      context
    } = options;
    function resolve(item) {
      return Reference.isRef(item) ? item.getValue(value, parent, context) : item;
    }
    function createError(overrides = {}) {
      const nextParams = mapValues$1(_extends$3({
        value,
        originalValue,
        label,
        path: overrides.path || path2
      }, params, overrides.params), resolve);
      const error2 = new ValidationError$1(ValidationError$1.formatError(overrides.message || message, nextParams), value, nextParams.path, overrides.type || name);
      error2.params = nextParams;
      return error2;
    }
    let ctx = _extends$3({
      path: path2,
      parent,
      type: name,
      createError,
      resolve,
      options,
      originalValue
    }, rest);
    if (!sync2) {
      try {
        Promise.resolve(test.call(ctx, value, ctx)).then((validOrError) => {
          if (ValidationError$1.isError(validOrError)) cb(validOrError);
          else if (!validOrError) cb(createError());
          else cb(null, validOrError);
        });
      } catch (err) {
        cb(err);
      }
      return;
    }
    let result;
    try {
      var _ref2;
      result = test.call(ctx, value, ctx);
      if (typeof ((_ref2 = result) == null ? void 0 : _ref2.then) === "function") {
        throw new Error(`Validation test of type: "${ctx.type}" returned a Promise during a synchronous validate. This test will finish after the validate call has returned`);
      }
    } catch (err) {
      cb(err);
      return;
    }
    if (ValidationError$1.isError(result)) cb(result);
    else if (!result) cb(createError());
    else cb(null, result);
  }
  validate.OPTIONS = config2;
  return validate;
}
let trim = (part) => part.substr(0, part.length - 1).substr(1);
function getIn(schema2, path2, value, context = value) {
  let parent, lastPart, lastPartDebug;
  if (!path2) return {
    parent,
    parentPath: path2,
    schema: schema2
  };
  propertyExpr.forEach(path2, (_part, isBracket, isArray2) => {
    let part = isBracket ? trim(_part) : _part;
    schema2 = schema2.resolve({
      context,
      parent,
      value
    });
    if (schema2.innerType) {
      let idx = isArray2 ? parseInt(part, 10) : 0;
      if (value && idx >= value.length) {
        throw new Error(`Yup.reach cannot resolve an array item at index: ${_part}, in the path: ${path2}. because there is no value at that index. `);
      }
      parent = value;
      value = value && value[idx];
      schema2 = schema2.innerType;
    }
    if (!isArray2) {
      if (!schema2.fields || !schema2.fields[part]) throw new Error(`The schema does not contain the path: ${path2}. (failed at: ${lastPartDebug} which is a type: "${schema2._type}")`);
      parent = value;
      value = value && value[part];
      schema2 = schema2.fields[part];
    }
    lastPart = part;
    lastPartDebug = isBracket ? "[" + _part + "]" : "." + _part;
  });
  return {
    schema: schema2,
    parent,
    parentPath: lastPart
  };
}
const reach = (obj, path2, value, context) => getIn(obj, path2, value, context).schema;
class ReferenceSet {
  constructor() {
    this.list = /* @__PURE__ */ new Set();
    this.refs = /* @__PURE__ */ new Map();
  }
  get size() {
    return this.list.size + this.refs.size;
  }
  describe() {
    const description = [];
    for (const item of this.list) description.push(item);
    for (const [, ref] of this.refs) description.push(ref.describe());
    return description;
  }
  toArray() {
    return Array.from(this.list).concat(Array.from(this.refs.values()));
  }
  add(value) {
    Reference.isRef(value) ? this.refs.set(value.key, value) : this.list.add(value);
  }
  delete(value) {
    Reference.isRef(value) ? this.refs.delete(value.key) : this.list.delete(value);
  }
  has(value, resolve) {
    if (this.list.has(value)) return true;
    let item, values = this.refs.values();
    while (item = values.next(), !item.done) if (resolve(item.value) === value) return true;
    return false;
  }
  clone() {
    const next = new ReferenceSet();
    next.list = new Set(this.list);
    next.refs = new Map(this.refs);
    return next;
  }
  merge(newItems, removeItems) {
    const next = this.clone();
    newItems.list.forEach((value) => next.add(value));
    newItems.refs.forEach((value) => next.add(value));
    removeItems.list.forEach((value) => next.delete(value));
    removeItems.refs.forEach((value) => next.delete(value));
    return next;
  }
}
function _extends$2() {
  _extends$2 = Object.assign || function(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  return _extends$2.apply(this, arguments);
}
class BaseSchema {
  constructor(options) {
    this.deps = [];
    this.conditions = [];
    this._whitelist = new ReferenceSet();
    this._blacklist = new ReferenceSet();
    this.exclusiveTests = /* @__PURE__ */ Object.create(null);
    this.tests = [];
    this.transforms = [];
    this.withMutation(() => {
      this.typeError(mixed.notType);
    });
    this.type = (options == null ? void 0 : options.type) || "mixed";
    this.spec = _extends$2({
      strip: false,
      strict: false,
      abortEarly: true,
      recursive: true,
      nullable: false,
      presence: "optional"
    }, options == null ? void 0 : options.spec);
  }
  // TODO: remove
  get _type() {
    return this.type;
  }
  _typeCheck(_value) {
    return true;
  }
  clone(spec) {
    if (this._mutate) {
      if (spec) Object.assign(this.spec, spec);
      return this;
    }
    const next = Object.create(Object.getPrototypeOf(this));
    next.type = this.type;
    next._typeError = this._typeError;
    next._whitelistError = this._whitelistError;
    next._blacklistError = this._blacklistError;
    next._whitelist = this._whitelist.clone();
    next._blacklist = this._blacklist.clone();
    next.exclusiveTests = _extends$2({}, this.exclusiveTests);
    next.deps = [...this.deps];
    next.conditions = [...this.conditions];
    next.tests = [...this.tests];
    next.transforms = [...this.transforms];
    next.spec = clone$2(_extends$2({}, this.spec, spec));
    return next;
  }
  label(label) {
    var next = this.clone();
    next.spec.label = label;
    return next;
  }
  meta(...args) {
    if (args.length === 0) return this.spec.meta;
    let next = this.clone();
    next.spec.meta = Object.assign(next.spec.meta || {}, args[0]);
    return next;
  }
  // withContext<TContext extends AnyObject>(): BaseSchema<
  //   TCast,
  //   TContext,
  //   TOutput
  // > {
  //   return this as any;
  // }
  withMutation(fn) {
    let before = this._mutate;
    this._mutate = true;
    let result = fn(this);
    this._mutate = before;
    return result;
  }
  concat(schema2) {
    if (!schema2 || schema2 === this) return this;
    if (schema2.type !== this.type && this.type !== "mixed") throw new TypeError(`You cannot \`concat()\` schema's of different types: ${this.type} and ${schema2.type}`);
    let base = this;
    let combined = schema2.clone();
    const mergedSpec = _extends$2({}, base.spec, combined.spec);
    combined.spec = mergedSpec;
    combined._typeError || (combined._typeError = base._typeError);
    combined._whitelistError || (combined._whitelistError = base._whitelistError);
    combined._blacklistError || (combined._blacklistError = base._blacklistError);
    combined._whitelist = base._whitelist.merge(schema2._whitelist, schema2._blacklist);
    combined._blacklist = base._blacklist.merge(schema2._blacklist, schema2._whitelist);
    combined.tests = base.tests;
    combined.exclusiveTests = base.exclusiveTests;
    combined.withMutation((next) => {
      schema2.tests.forEach((fn) => {
        next.test(fn.OPTIONS);
      });
    });
    return combined;
  }
  isType(v) {
    if (this.spec.nullable && v === null) return true;
    return this._typeCheck(v);
  }
  resolve(options) {
    let schema2 = this;
    if (schema2.conditions.length) {
      let conditions = schema2.conditions;
      schema2 = schema2.clone();
      schema2.conditions = [];
      schema2 = conditions.reduce((schema3, condition) => condition.resolve(schema3, options), schema2);
      schema2 = schema2.resolve(options);
    }
    return schema2;
  }
  /**
   *
   * @param {*} value
   * @param {Object} options
   * @param {*=} options.parent
   * @param {*=} options.context
   */
  cast(value, options = {}) {
    let resolvedSchema = this.resolve(_extends$2({
      value
    }, options));
    let result = resolvedSchema._cast(value, options);
    if (value !== void 0 && options.assert !== false && resolvedSchema.isType(result) !== true) {
      let formattedValue = printValue$1(value);
      let formattedResult = printValue$1(result);
      throw new TypeError(`The value of ${options.path || "field"} could not be cast to a value that satisfies the schema type: "${resolvedSchema._type}". 

attempted value: ${formattedValue} 
` + (formattedResult !== formattedValue ? `result of cast: ${formattedResult}` : ""));
    }
    return result;
  }
  _cast(rawValue, _options) {
    let value = rawValue === void 0 ? rawValue : this.transforms.reduce((value2, fn) => fn.call(this, value2, rawValue, this), rawValue);
    if (value === void 0) {
      value = this.getDefault();
    }
    return value;
  }
  _validate(_value, options = {}, cb) {
    let {
      sync: sync2,
      path: path2,
      from = [],
      originalValue = _value,
      strict = this.spec.strict,
      abortEarly = this.spec.abortEarly
    } = options;
    let value = _value;
    if (!strict) {
      value = this._cast(value, _extends$2({
        assert: false
      }, options));
    }
    let args = {
      value,
      path: path2,
      options,
      originalValue,
      schema: this,
      label: this.spec.label,
      sync: sync2,
      from
    };
    let initialTests = [];
    if (this._typeError) initialTests.push(this._typeError);
    if (this._whitelistError) initialTests.push(this._whitelistError);
    if (this._blacklistError) initialTests.push(this._blacklistError);
    runTests({
      args,
      value,
      path: path2,
      tests: initialTests,
      endEarly: abortEarly
    }, (err) => {
      if (err) return void cb(err, value);
      runTests({
        tests: this.tests,
        args,
        path: path2,
        sync: sync2,
        value,
        endEarly: abortEarly
      }, cb);
    });
  }
  validate(value, options, maybeCb) {
    let schema2 = this.resolve(_extends$2({}, options, {
      value
    }));
    return typeof maybeCb === "function" ? schema2._validate(value, options, maybeCb) : new Promise((resolve, reject) => schema2._validate(value, options, (err, value2) => {
      if (err) reject(err);
      else resolve(value2);
    }));
  }
  validateSync(value, options) {
    let schema2 = this.resolve(_extends$2({}, options, {
      value
    }));
    let result;
    schema2._validate(value, _extends$2({}, options, {
      sync: true
    }), (err, value2) => {
      if (err) throw err;
      result = value2;
    });
    return result;
  }
  isValid(value, options) {
    return this.validate(value, options).then(() => true, (err) => {
      if (ValidationError$1.isError(err)) return false;
      throw err;
    });
  }
  isValidSync(value, options) {
    try {
      this.validateSync(value, options);
      return true;
    } catch (err) {
      if (ValidationError$1.isError(err)) return false;
      throw err;
    }
  }
  _getDefault() {
    let defaultValue = this.spec.default;
    if (defaultValue == null) {
      return defaultValue;
    }
    return typeof defaultValue === "function" ? defaultValue.call(this) : clone$2(defaultValue);
  }
  getDefault(options) {
    let schema2 = this.resolve(options || {});
    return schema2._getDefault();
  }
  default(def) {
    if (arguments.length === 0) {
      return this._getDefault();
    }
    let next = this.clone({
      default: def
    });
    return next;
  }
  strict(isStrict = true) {
    var next = this.clone();
    next.spec.strict = isStrict;
    return next;
  }
  _isPresent(value) {
    return value != null;
  }
  defined(message = mixed.defined) {
    return this.test({
      message,
      name: "defined",
      exclusive: true,
      test(value) {
        return value !== void 0;
      }
    });
  }
  required(message = mixed.required) {
    return this.clone({
      presence: "required"
    }).withMutation((s) => s.test({
      message,
      name: "required",
      exclusive: true,
      test(value) {
        return this.schema._isPresent(value);
      }
    }));
  }
  notRequired() {
    var next = this.clone({
      presence: "optional"
    });
    next.tests = next.tests.filter((test) => test.OPTIONS.name !== "required");
    return next;
  }
  nullable(isNullable = true) {
    var next = this.clone({
      nullable: isNullable !== false
    });
    return next;
  }
  transform(fn) {
    var next = this.clone();
    next.transforms.push(fn);
    return next;
  }
  /**
   * Adds a test function to the schema's queue of tests.
   * tests can be exclusive or non-exclusive.
   *
   * - exclusive tests, will replace any existing tests of the same name.
   * - non-exclusive: can be stacked
   *
   * If a non-exclusive test is added to a schema with an exclusive test of the same name
   * the exclusive test is removed and further tests of the same name will be stacked.
   *
   * If an exclusive test is added to a schema with non-exclusive tests of the same name
   * the previous tests are removed and further tests of the same name will replace each other.
   */
  test(...args) {
    let opts;
    if (args.length === 1) {
      if (typeof args[0] === "function") {
        opts = {
          test: args[0]
        };
      } else {
        opts = args[0];
      }
    } else if (args.length === 2) {
      opts = {
        name: args[0],
        test: args[1]
      };
    } else {
      opts = {
        name: args[0],
        message: args[1],
        test: args[2]
      };
    }
    if (opts.message === void 0) opts.message = mixed.default;
    if (typeof opts.test !== "function") throw new TypeError("`test` is a required parameters");
    let next = this.clone();
    let validate = createValidation(opts);
    let isExclusive = opts.exclusive || opts.name && next.exclusiveTests[opts.name] === true;
    if (opts.exclusive) {
      if (!opts.name) throw new TypeError("Exclusive tests must provide a unique `name` identifying the test");
    }
    if (opts.name) next.exclusiveTests[opts.name] = !!opts.exclusive;
    next.tests = next.tests.filter((fn) => {
      if (fn.OPTIONS.name === opts.name) {
        if (isExclusive) return false;
        if (fn.OPTIONS.test === validate.OPTIONS.test) return false;
      }
      return true;
    });
    next.tests.push(validate);
    return next;
  }
  when(keys2, options) {
    if (!Array.isArray(keys2) && typeof keys2 !== "string") {
      options = keys2;
      keys2 = ".";
    }
    let next = this.clone();
    let deps = toArray$1(keys2).map((key) => new Reference(key));
    deps.forEach((dep) => {
      if (dep.isSibling) next.deps.push(dep.key);
    });
    next.conditions.push(new Condition(deps, options));
    return next;
  }
  typeError(message) {
    var next = this.clone();
    next._typeError = createValidation({
      message,
      name: "typeError",
      test(value) {
        if (value !== void 0 && !this.schema.isType(value)) return this.createError({
          params: {
            type: this.schema._type
          }
        });
        return true;
      }
    });
    return next;
  }
  oneOf(enums, message = mixed.oneOf) {
    var next = this.clone();
    enums.forEach((val) => {
      next._whitelist.add(val);
      next._blacklist.delete(val);
    });
    next._whitelistError = createValidation({
      message,
      name: "oneOf",
      test(value) {
        if (value === void 0) return true;
        let valids = this.schema._whitelist;
        return valids.has(value, this.resolve) ? true : this.createError({
          params: {
            values: valids.toArray().join(", ")
          }
        });
      }
    });
    return next;
  }
  notOneOf(enums, message = mixed.notOneOf) {
    var next = this.clone();
    enums.forEach((val) => {
      next._blacklist.add(val);
      next._whitelist.delete(val);
    });
    next._blacklistError = createValidation({
      message,
      name: "notOneOf",
      test(value) {
        let invalids = this.schema._blacklist;
        if (invalids.has(value, this.resolve)) return this.createError({
          params: {
            values: invalids.toArray().join(", ")
          }
        });
        return true;
      }
    });
    return next;
  }
  strip(strip = true) {
    let next = this.clone();
    next.spec.strip = strip;
    return next;
  }
  describe() {
    const next = this.clone();
    const {
      label,
      meta
    } = next.spec;
    const description = {
      meta,
      label,
      type: next.type,
      oneOf: next._whitelist.describe(),
      notOneOf: next._blacklist.describe(),
      tests: next.tests.map((fn) => ({
        name: fn.OPTIONS.name,
        params: fn.OPTIONS.params
      })).filter((n, idx, list) => list.findIndex((c) => c.name === n.name) === idx)
    };
    return description;
  }
}
BaseSchema.prototype.__isYupSchema__ = true;
for (const method of ["validate", "validateSync"]) BaseSchema.prototype[`${method}At`] = function(path2, value, options = {}) {
  const {
    parent,
    parentPath,
    schema: schema2
  } = getIn(this, path2, value, options.context);
  return schema2[method](parent && parent[parentPath], _extends$2({}, options, {
    parent,
    path: path2
  }));
};
for (const alias of ["equals", "is"]) BaseSchema.prototype[alias] = BaseSchema.prototype.oneOf;
for (const alias of ["not", "nope"]) BaseSchema.prototype[alias] = BaseSchema.prototype.notOneOf;
BaseSchema.prototype.optional = BaseSchema.prototype.notRequired;
const Mixed = BaseSchema;
function create$7() {
  return new Mixed();
}
create$7.prototype = Mixed.prototype;
const isAbsent = (value) => value == null;
function create$6() {
  return new BooleanSchema();
}
class BooleanSchema extends BaseSchema {
  constructor() {
    super({
      type: "boolean"
    });
    this.withMutation(() => {
      this.transform(function(value) {
        if (!this.isType(value)) {
          if (/^(true|1)$/i.test(String(value))) return true;
          if (/^(false|0)$/i.test(String(value))) return false;
        }
        return value;
      });
    });
  }
  _typeCheck(v) {
    if (v instanceof Boolean) v = v.valueOf();
    return typeof v === "boolean";
  }
  isTrue(message = boolean.isValue) {
    return this.test({
      message,
      name: "is-value",
      exclusive: true,
      params: {
        value: "true"
      },
      test(value) {
        return isAbsent(value) || value === true;
      }
    });
  }
  isFalse(message = boolean.isValue) {
    return this.test({
      message,
      name: "is-value",
      exclusive: true,
      params: {
        value: "false"
      },
      test(value) {
        return isAbsent(value) || value === false;
      }
    });
  }
}
create$6.prototype = BooleanSchema.prototype;
let rEmail = /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i;
let rUrl = /^((https?|ftp):)?\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i;
let rUUID = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;
let isTrimmed = (value) => isAbsent(value) || value === value.trim();
let objStringTag = {}.toString();
function create$5() {
  return new StringSchema();
}
class StringSchema extends BaseSchema {
  constructor() {
    super({
      type: "string"
    });
    this.withMutation(() => {
      this.transform(function(value) {
        if (this.isType(value)) return value;
        if (Array.isArray(value)) return value;
        const strValue = value != null && value.toString ? value.toString() : value;
        if (strValue === objStringTag) return value;
        return strValue;
      });
    });
  }
  _typeCheck(value) {
    if (value instanceof String) value = value.valueOf();
    return typeof value === "string";
  }
  _isPresent(value) {
    return super._isPresent(value) && !!value.length;
  }
  length(length, message = string.length) {
    return this.test({
      message,
      name: "length",
      exclusive: true,
      params: {
        length
      },
      test(value) {
        return isAbsent(value) || value.length === this.resolve(length);
      }
    });
  }
  min(min, message = string.min) {
    return this.test({
      message,
      name: "min",
      exclusive: true,
      params: {
        min
      },
      test(value) {
        return isAbsent(value) || value.length >= this.resolve(min);
      }
    });
  }
  max(max, message = string.max) {
    return this.test({
      name: "max",
      exclusive: true,
      message,
      params: {
        max
      },
      test(value) {
        return isAbsent(value) || value.length <= this.resolve(max);
      }
    });
  }
  matches(regex, options) {
    let excludeEmptyString = false;
    let message;
    let name;
    if (options) {
      if (typeof options === "object") {
        ({
          excludeEmptyString = false,
          message,
          name
        } = options);
      } else {
        message = options;
      }
    }
    return this.test({
      name: name || "matches",
      message: message || string.matches,
      params: {
        regex
      },
      test: (value) => isAbsent(value) || value === "" && excludeEmptyString || value.search(regex) !== -1
    });
  }
  email(message = string.email) {
    return this.matches(rEmail, {
      name: "email",
      message,
      excludeEmptyString: true
    });
  }
  url(message = string.url) {
    return this.matches(rUrl, {
      name: "url",
      message,
      excludeEmptyString: true
    });
  }
  uuid(message = string.uuid) {
    return this.matches(rUUID, {
      name: "uuid",
      message,
      excludeEmptyString: false
    });
  }
  //-- transforms --
  ensure() {
    return this.default("").transform((val) => val === null ? "" : val);
  }
  trim(message = string.trim) {
    return this.transform((val) => val != null ? val.trim() : val).test({
      message,
      name: "trim",
      test: isTrimmed
    });
  }
  lowercase(message = string.lowercase) {
    return this.transform((value) => !isAbsent(value) ? value.toLowerCase() : value).test({
      message,
      name: "string_case",
      exclusive: true,
      test: (value) => isAbsent(value) || value === value.toLowerCase()
    });
  }
  uppercase(message = string.uppercase) {
    return this.transform((value) => !isAbsent(value) ? value.toUpperCase() : value).test({
      message,
      name: "string_case",
      exclusive: true,
      test: (value) => isAbsent(value) || value === value.toUpperCase()
    });
  }
}
create$5.prototype = StringSchema.prototype;
let isNaN$1 = (value) => value != +value;
function create$4() {
  return new NumberSchema();
}
class NumberSchema extends BaseSchema {
  constructor() {
    super({
      type: "number"
    });
    this.withMutation(() => {
      this.transform(function(value) {
        let parsed = value;
        if (typeof parsed === "string") {
          parsed = parsed.replace(/\s/g, "");
          if (parsed === "") return NaN;
          parsed = +parsed;
        }
        if (this.isType(parsed)) return parsed;
        return parseFloat(parsed);
      });
    });
  }
  _typeCheck(value) {
    if (value instanceof Number) value = value.valueOf();
    return typeof value === "number" && !isNaN$1(value);
  }
  min(min, message = number.min) {
    return this.test({
      message,
      name: "min",
      exclusive: true,
      params: {
        min
      },
      test(value) {
        return isAbsent(value) || value >= this.resolve(min);
      }
    });
  }
  max(max, message = number.max) {
    return this.test({
      message,
      name: "max",
      exclusive: true,
      params: {
        max
      },
      test(value) {
        return isAbsent(value) || value <= this.resolve(max);
      }
    });
  }
  lessThan(less, message = number.lessThan) {
    return this.test({
      message,
      name: "max",
      exclusive: true,
      params: {
        less
      },
      test(value) {
        return isAbsent(value) || value < this.resolve(less);
      }
    });
  }
  moreThan(more, message = number.moreThan) {
    return this.test({
      message,
      name: "min",
      exclusive: true,
      params: {
        more
      },
      test(value) {
        return isAbsent(value) || value > this.resolve(more);
      }
    });
  }
  positive(msg = number.positive) {
    return this.moreThan(0, msg);
  }
  negative(msg = number.negative) {
    return this.lessThan(0, msg);
  }
  integer(message = number.integer) {
    return this.test({
      name: "integer",
      message,
      test: (val) => isAbsent(val) || Number.isInteger(val)
    });
  }
  truncate() {
    return this.transform((value) => !isAbsent(value) ? value | 0 : value);
  }
  round(method) {
    var _method;
    var avail = ["ceil", "floor", "round", "trunc"];
    method = ((_method = method) == null ? void 0 : _method.toLowerCase()) || "round";
    if (method === "trunc") return this.truncate();
    if (avail.indexOf(method.toLowerCase()) === -1) throw new TypeError("Only valid options for round() are: " + avail.join(", "));
    return this.transform((value) => !isAbsent(value) ? Math[method](value) : value);
  }
}
create$4.prototype = NumberSchema.prototype;
var isoReg = /^(\d{4}|[+\-]\d{6})(?:-?(\d{2})(?:-?(\d{2}))?)?(?:[ T]?(\d{2}):?(\d{2})(?::?(\d{2})(?:[,\.](\d{1,}))?)?(?:(Z)|([+\-])(\d{2})(?::?(\d{2}))?)?)?$/;
function parseIsoDate(date2) {
  var numericKeys = [1, 4, 5, 6, 7, 10, 11], minutesOffset = 0, timestamp2, struct;
  if (struct = isoReg.exec(date2)) {
    for (var i = 0, k; k = numericKeys[i]; ++i) struct[k] = +struct[k] || 0;
    struct[2] = (+struct[2] || 1) - 1;
    struct[3] = +struct[3] || 1;
    struct[7] = struct[7] ? String(struct[7]).substr(0, 3) : 0;
    if ((struct[8] === void 0 || struct[8] === "") && (struct[9] === void 0 || struct[9] === "")) timestamp2 = +new Date(struct[1], struct[2], struct[3], struct[4], struct[5], struct[6], struct[7]);
    else {
      if (struct[8] !== "Z" && struct[9] !== void 0) {
        minutesOffset = struct[10] * 60 + struct[11];
        if (struct[9] === "+") minutesOffset = 0 - minutesOffset;
      }
      timestamp2 = Date.UTC(struct[1], struct[2], struct[3], struct[4], struct[5] + minutesOffset, struct[6], struct[7]);
    }
  } else timestamp2 = Date.parse ? Date.parse(date2) : NaN;
  return timestamp2;
}
let invalidDate = /* @__PURE__ */ new Date("");
let isDate = (obj) => Object.prototype.toString.call(obj) === "[object Date]";
function create$3() {
  return new DateSchema();
}
class DateSchema extends BaseSchema {
  constructor() {
    super({
      type: "date"
    });
    this.withMutation(() => {
      this.transform(function(value) {
        if (this.isType(value)) return value;
        value = parseIsoDate(value);
        return !isNaN(value) ? new Date(value) : invalidDate;
      });
    });
  }
  _typeCheck(v) {
    return isDate(v) && !isNaN(v.getTime());
  }
  prepareParam(ref, name) {
    let param;
    if (!Reference.isRef(ref)) {
      let cast = this.cast(ref);
      if (!this._typeCheck(cast)) throw new TypeError(`\`${name}\` must be a Date or a value that can be \`cast()\` to a Date`);
      param = cast;
    } else {
      param = ref;
    }
    return param;
  }
  min(min, message = date.min) {
    let limit = this.prepareParam(min, "min");
    return this.test({
      message,
      name: "min",
      exclusive: true,
      params: {
        min
      },
      test(value) {
        return isAbsent(value) || value >= this.resolve(limit);
      }
    });
  }
  max(max, message = date.max) {
    var limit = this.prepareParam(max, "max");
    return this.test({
      message,
      name: "max",
      exclusive: true,
      params: {
        max
      },
      test(value) {
        return isAbsent(value) || value <= this.resolve(limit);
      }
    });
  }
}
DateSchema.INVALID_DATE = invalidDate;
create$3.prototype = DateSchema.prototype;
create$3.INVALID_DATE = invalidDate;
function arrayReduce$1(array2, iteratee, accumulator, initAccum) {
  var index2 = -1, length = array2 == null ? 0 : array2.length;
  if (initAccum && length) {
    accumulator = array2[++index2];
  }
  while (++index2 < length) {
    accumulator = iteratee(accumulator, array2[index2], index2, array2);
  }
  return accumulator;
}
var _arrayReduce = arrayReduce$1;
function basePropertyOf$2(object2) {
  return function(key) {
    return object2 == null ? void 0 : object2[key];
  };
}
var _basePropertyOf = basePropertyOf$2;
var basePropertyOf$1 = _basePropertyOf;
var deburredLetters$1 = {
  // Latin-1 Supplement block.
  "À": "A",
  "Á": "A",
  "Â": "A",
  "Ã": "A",
  "Ä": "A",
  "Å": "A",
  "à": "a",
  "á": "a",
  "â": "a",
  "ã": "a",
  "ä": "a",
  "å": "a",
  "Ç": "C",
  "ç": "c",
  "Ð": "D",
  "ð": "d",
  "È": "E",
  "É": "E",
  "Ê": "E",
  "Ë": "E",
  "è": "e",
  "é": "e",
  "ê": "e",
  "ë": "e",
  "Ì": "I",
  "Í": "I",
  "Î": "I",
  "Ï": "I",
  "ì": "i",
  "í": "i",
  "î": "i",
  "ï": "i",
  "Ñ": "N",
  "ñ": "n",
  "Ò": "O",
  "Ó": "O",
  "Ô": "O",
  "Õ": "O",
  "Ö": "O",
  "Ø": "O",
  "ò": "o",
  "ó": "o",
  "ô": "o",
  "õ": "o",
  "ö": "o",
  "ø": "o",
  "Ù": "U",
  "Ú": "U",
  "Û": "U",
  "Ü": "U",
  "ù": "u",
  "ú": "u",
  "û": "u",
  "ü": "u",
  "Ý": "Y",
  "ý": "y",
  "ÿ": "y",
  "Æ": "Ae",
  "æ": "ae",
  "Þ": "Th",
  "þ": "th",
  "ß": "ss",
  // Latin Extended-A block.
  "Ā": "A",
  "Ă": "A",
  "Ą": "A",
  "ā": "a",
  "ă": "a",
  "ą": "a",
  "Ć": "C",
  "Ĉ": "C",
  "Ċ": "C",
  "Č": "C",
  "ć": "c",
  "ĉ": "c",
  "ċ": "c",
  "č": "c",
  "Ď": "D",
  "Đ": "D",
  "ď": "d",
  "đ": "d",
  "Ē": "E",
  "Ĕ": "E",
  "Ė": "E",
  "Ę": "E",
  "Ě": "E",
  "ē": "e",
  "ĕ": "e",
  "ė": "e",
  "ę": "e",
  "ě": "e",
  "Ĝ": "G",
  "Ğ": "G",
  "Ġ": "G",
  "Ģ": "G",
  "ĝ": "g",
  "ğ": "g",
  "ġ": "g",
  "ģ": "g",
  "Ĥ": "H",
  "Ħ": "H",
  "ĥ": "h",
  "ħ": "h",
  "Ĩ": "I",
  "Ī": "I",
  "Ĭ": "I",
  "Į": "I",
  "İ": "I",
  "ĩ": "i",
  "ī": "i",
  "ĭ": "i",
  "į": "i",
  "ı": "i",
  "Ĵ": "J",
  "ĵ": "j",
  "Ķ": "K",
  "ķ": "k",
  "ĸ": "k",
  "Ĺ": "L",
  "Ļ": "L",
  "Ľ": "L",
  "Ŀ": "L",
  "Ł": "L",
  "ĺ": "l",
  "ļ": "l",
  "ľ": "l",
  "ŀ": "l",
  "ł": "l",
  "Ń": "N",
  "Ņ": "N",
  "Ň": "N",
  "Ŋ": "N",
  "ń": "n",
  "ņ": "n",
  "ň": "n",
  "ŋ": "n",
  "Ō": "O",
  "Ŏ": "O",
  "Ő": "O",
  "ō": "o",
  "ŏ": "o",
  "ő": "o",
  "Ŕ": "R",
  "Ŗ": "R",
  "Ř": "R",
  "ŕ": "r",
  "ŗ": "r",
  "ř": "r",
  "Ś": "S",
  "Ŝ": "S",
  "Ş": "S",
  "Š": "S",
  "ś": "s",
  "ŝ": "s",
  "ş": "s",
  "š": "s",
  "Ţ": "T",
  "Ť": "T",
  "Ŧ": "T",
  "ţ": "t",
  "ť": "t",
  "ŧ": "t",
  "Ũ": "U",
  "Ū": "U",
  "Ŭ": "U",
  "Ů": "U",
  "Ű": "U",
  "Ų": "U",
  "ũ": "u",
  "ū": "u",
  "ŭ": "u",
  "ů": "u",
  "ű": "u",
  "ų": "u",
  "Ŵ": "W",
  "ŵ": "w",
  "Ŷ": "Y",
  "ŷ": "y",
  "Ÿ": "Y",
  "Ź": "Z",
  "Ż": "Z",
  "Ž": "Z",
  "ź": "z",
  "ż": "z",
  "ž": "z",
  "Ĳ": "IJ",
  "ĳ": "ij",
  "Œ": "Oe",
  "œ": "oe",
  "ŉ": "'n",
  "ſ": "s"
};
var deburrLetter$2 = basePropertyOf$1(deburredLetters$1);
var _deburrLetter = deburrLetter$2;
var deburrLetter$1 = _deburrLetter, toString$5 = toString_1;
var reLatin$1 = /[\xc0-\xd6\xd8-\xf6\xf8-\xff\u0100-\u017f]/g;
var rsComboMarksRange$4 = "\\u0300-\\u036f", reComboHalfMarksRange$3 = "\\ufe20-\\ufe2f", rsComboSymbolsRange$4 = "\\u20d0-\\u20ff", rsComboRange$3 = rsComboMarksRange$4 + reComboHalfMarksRange$3 + rsComboSymbolsRange$4;
var rsCombo$3 = "[" + rsComboRange$3 + "]";
var reComboMark$1 = RegExp(rsCombo$3, "g");
function deburr$3(string2) {
  string2 = toString$5(string2);
  return string2 && string2.replace(reLatin$1, deburrLetter$1).replace(reComboMark$1, "");
}
var deburr_1 = deburr$3;
var reAsciiWord = /[^\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]+/g;
function asciiWords$1(string2) {
  return string2.match(reAsciiWord) || [];
}
var _asciiWords = asciiWords$1;
var reHasUnicodeWord = /[a-z][A-Z]|[A-Z]{2}[a-z]|[0-9][a-zA-Z]|[a-zA-Z][0-9]|[^a-zA-Z0-9 ]/;
function hasUnicodeWord$1(string2) {
  return reHasUnicodeWord.test(string2);
}
var _hasUnicodeWord = hasUnicodeWord$1;
var rsAstralRange$2 = "\\ud800-\\udfff", rsComboMarksRange$3 = "\\u0300-\\u036f", reComboHalfMarksRange$2 = "\\ufe20-\\ufe2f", rsComboSymbolsRange$3 = "\\u20d0-\\u20ff", rsComboRange$2 = rsComboMarksRange$3 + reComboHalfMarksRange$2 + rsComboSymbolsRange$3, rsDingbatRange = "\\u2700-\\u27bf", rsLowerRange = "a-z\\xdf-\\xf6\\xf8-\\xff", rsMathOpRange = "\\xac\\xb1\\xd7\\xf7", rsNonCharRange = "\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf", rsPunctuationRange = "\\u2000-\\u206f", rsSpaceRange = " \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000", rsUpperRange = "A-Z\\xc0-\\xd6\\xd8-\\xde", rsVarRange$2 = "\\ufe0e\\ufe0f", rsBreakRange = rsMathOpRange + rsNonCharRange + rsPunctuationRange + rsSpaceRange;
var rsApos$1 = "['’]", rsBreak = "[" + rsBreakRange + "]", rsCombo$2 = "[" + rsComboRange$2 + "]", rsDigits = "\\d+", rsDingbat = "[" + rsDingbatRange + "]", rsLower = "[" + rsLowerRange + "]", rsMisc = "[^" + rsAstralRange$2 + rsBreakRange + rsDigits + rsDingbatRange + rsLowerRange + rsUpperRange + "]", rsFitz$1 = "\\ud83c[\\udffb-\\udfff]", rsModifier$1 = "(?:" + rsCombo$2 + "|" + rsFitz$1 + ")", rsNonAstral$1 = "[^" + rsAstralRange$2 + "]", rsRegional$1 = "(?:\\ud83c[\\udde6-\\uddff]){2}", rsSurrPair$1 = "[\\ud800-\\udbff][\\udc00-\\udfff]", rsUpper = "[" + rsUpperRange + "]", rsZWJ$2 = "\\u200d";
var rsMiscLower = "(?:" + rsLower + "|" + rsMisc + ")", rsMiscUpper = "(?:" + rsUpper + "|" + rsMisc + ")", rsOptContrLower = "(?:" + rsApos$1 + "(?:d|ll|m|re|s|t|ve))?", rsOptContrUpper = "(?:" + rsApos$1 + "(?:D|LL|M|RE|S|T|VE))?", reOptMod$1 = rsModifier$1 + "?", rsOptVar$1 = "[" + rsVarRange$2 + "]?", rsOptJoin$1 = "(?:" + rsZWJ$2 + "(?:" + [rsNonAstral$1, rsRegional$1, rsSurrPair$1].join("|") + ")" + rsOptVar$1 + reOptMod$1 + ")*", rsOrdLower = "\\d*(?:1st|2nd|3rd|(?![123])\\dth)(?=\\b|[A-Z_])", rsOrdUpper = "\\d*(?:1ST|2ND|3RD|(?![123])\\dTH)(?=\\b|[a-z_])", rsSeq$1 = rsOptVar$1 + reOptMod$1 + rsOptJoin$1, rsEmoji = "(?:" + [rsDingbat, rsRegional$1, rsSurrPair$1].join("|") + ")" + rsSeq$1;
var reUnicodeWord = RegExp([
  rsUpper + "?" + rsLower + "+" + rsOptContrLower + "(?=" + [rsBreak, rsUpper, "$"].join("|") + ")",
  rsMiscUpper + "+" + rsOptContrUpper + "(?=" + [rsBreak, rsUpper + rsMiscLower, "$"].join("|") + ")",
  rsUpper + "?" + rsMiscLower + "+" + rsOptContrLower,
  rsUpper + "+" + rsOptContrUpper,
  rsOrdUpper,
  rsOrdLower,
  rsDigits,
  rsEmoji
].join("|"), "g");
function unicodeWords$1(string2) {
  return string2.match(reUnicodeWord) || [];
}
var _unicodeWords = unicodeWords$1;
var asciiWords = _asciiWords, hasUnicodeWord = _hasUnicodeWord, toString$4 = toString_1, unicodeWords = _unicodeWords;
function words$1(string2, pattern, guard) {
  string2 = toString$4(string2);
  pattern = guard ? void 0 : pattern;
  if (pattern === void 0) {
    return hasUnicodeWord(string2) ? unicodeWords(string2) : asciiWords(string2);
  }
  return string2.match(pattern) || [];
}
var words_1 = words$1;
var arrayReduce = _arrayReduce, deburr$2 = deburr_1, words = words_1;
var rsApos = "['’]";
var reApos = RegExp(rsApos, "g");
function createCompounder$2(callback) {
  return function(string2) {
    return arrayReduce(words(deburr$2(string2).replace(reApos, "")), callback, "");
  };
}
var _createCompounder = createCompounder$2;
var createCompounder$1 = _createCompounder;
var snakeCase = createCompounder$1(function(result, word, index2) {
  return result + (index2 ? "_" : "") + word.toLowerCase();
});
var snakeCase_1 = snakeCase;
const snakeCase$1 = /* @__PURE__ */ getDefaultExportFromCjs(snakeCase_1);
function baseSlice$1(array2, start, end) {
  var index2 = -1, length = array2.length;
  if (start < 0) {
    start = -start > length ? 0 : length + start;
  }
  end = end > length ? length : end;
  if (end < 0) {
    end += length;
  }
  length = start > end ? 0 : end - start >>> 0;
  start >>>= 0;
  var result = Array(length);
  while (++index2 < length) {
    result[index2] = array2[index2 + start];
  }
  return result;
}
var _baseSlice = baseSlice$1;
var baseSlice = _baseSlice;
function castSlice$1(array2, start, end) {
  var length = array2.length;
  end = end === void 0 ? length : end;
  return !start && end >= length ? array2 : baseSlice(array2, start, end);
}
var _castSlice = castSlice$1;
var rsAstralRange$1 = "\\ud800-\\udfff", rsComboMarksRange$2 = "\\u0300-\\u036f", reComboHalfMarksRange$1 = "\\ufe20-\\ufe2f", rsComboSymbolsRange$2 = "\\u20d0-\\u20ff", rsComboRange$1 = rsComboMarksRange$2 + reComboHalfMarksRange$1 + rsComboSymbolsRange$2, rsVarRange$1 = "\\ufe0e\\ufe0f";
var rsZWJ$1 = "\\u200d";
var reHasUnicode = RegExp("[" + rsZWJ$1 + rsAstralRange$1 + rsComboRange$1 + rsVarRange$1 + "]");
function hasUnicode$2(string2) {
  return reHasUnicode.test(string2);
}
var _hasUnicode = hasUnicode$2;
function asciiToArray$1(string2) {
  return string2.split("");
}
var _asciiToArray = asciiToArray$1;
var rsAstralRange = "\\ud800-\\udfff", rsComboMarksRange$1 = "\\u0300-\\u036f", reComboHalfMarksRange = "\\ufe20-\\ufe2f", rsComboSymbolsRange$1 = "\\u20d0-\\u20ff", rsComboRange = rsComboMarksRange$1 + reComboHalfMarksRange + rsComboSymbolsRange$1, rsVarRange = "\\ufe0e\\ufe0f";
var rsAstral = "[" + rsAstralRange + "]", rsCombo$1 = "[" + rsComboRange + "]", rsFitz = "\\ud83c[\\udffb-\\udfff]", rsModifier = "(?:" + rsCombo$1 + "|" + rsFitz + ")", rsNonAstral = "[^" + rsAstralRange + "]", rsRegional = "(?:\\ud83c[\\udde6-\\uddff]){2}", rsSurrPair = "[\\ud800-\\udbff][\\udc00-\\udfff]", rsZWJ = "\\u200d";
var reOptMod = rsModifier + "?", rsOptVar = "[" + rsVarRange + "]?", rsOptJoin = "(?:" + rsZWJ + "(?:" + [rsNonAstral, rsRegional, rsSurrPair].join("|") + ")" + rsOptVar + reOptMod + ")*", rsSeq = rsOptVar + reOptMod + rsOptJoin, rsSymbol = "(?:" + [rsNonAstral + rsCombo$1 + "?", rsCombo$1, rsRegional, rsSurrPair, rsAstral].join("|") + ")";
var reUnicode = RegExp(rsFitz + "(?=" + rsFitz + ")|" + rsSymbol + rsSeq, "g");
function unicodeToArray$1(string2) {
  return string2.match(reUnicode) || [];
}
var _unicodeToArray = unicodeToArray$1;
var asciiToArray = _asciiToArray, hasUnicode$1 = _hasUnicode, unicodeToArray = _unicodeToArray;
function stringToArray$1(string2) {
  return hasUnicode$1(string2) ? unicodeToArray(string2) : asciiToArray(string2);
}
var _stringToArray = stringToArray$1;
var castSlice = _castSlice, hasUnicode = _hasUnicode, stringToArray = _stringToArray, toString$3 = toString_1;
function createCaseFirst$1(methodName) {
  return function(string2) {
    string2 = toString$3(string2);
    var strSymbols = hasUnicode(string2) ? stringToArray(string2) : void 0;
    var chr = strSymbols ? strSymbols[0] : string2.charAt(0);
    var trailing = strSymbols ? castSlice(strSymbols, 1).join("") : string2.slice(1);
    return chr[methodName]() + trailing;
  };
}
var _createCaseFirst = createCaseFirst$1;
var createCaseFirst = _createCaseFirst;
var upperFirst$1 = createCaseFirst("toUpperCase");
var upperFirst_1 = upperFirst$1;
var toString$2 = toString_1, upperFirst = upperFirst_1;
function capitalize$1(string2) {
  return upperFirst(toString$2(string2).toLowerCase());
}
var capitalize_1 = capitalize$1;
var capitalize = capitalize_1, createCompounder = _createCompounder;
var camelCase = createCompounder(function(result, word, index2) {
  word = word.toLowerCase();
  return result + (index2 ? capitalize(word) : word);
});
var camelCase_1 = camelCase;
const camelCase$1 = /* @__PURE__ */ getDefaultExportFromCjs(camelCase_1);
var baseAssignValue = _baseAssignValue, baseForOwn = _baseForOwn, baseIteratee = _baseIteratee;
function mapKeys(object2, iteratee) {
  var result = {};
  iteratee = baseIteratee(iteratee);
  baseForOwn(object2, function(value, key, object3) {
    baseAssignValue(result, iteratee(value, key, object3), value);
  });
  return result;
}
var mapKeys_1 = mapKeys;
const mapKeys$1 = /* @__PURE__ */ getDefaultExportFromCjs(mapKeys_1);
var toposort$2 = { exports: {} };
toposort$2.exports = function(edges) {
  return toposort(uniqueNodes(edges), edges);
};
toposort$2.exports.array = toposort;
function toposort(nodes, edges) {
  var cursor = nodes.length, sorted = new Array(cursor), visited = {}, i = cursor, outgoingEdges = makeOutgoingEdges(edges), nodesHash = makeNodesHash(nodes);
  edges.forEach(function(edge) {
    if (!nodesHash.has(edge[0]) || !nodesHash.has(edge[1])) {
      throw new Error("Unknown node. There is an unknown node in the supplied edges.");
    }
  });
  while (i--) {
    if (!visited[i]) visit(nodes[i], i, /* @__PURE__ */ new Set());
  }
  return sorted;
  function visit(node, i2, predecessors) {
    if (predecessors.has(node)) {
      var nodeRep;
      try {
        nodeRep = ", node was:" + JSON.stringify(node);
      } catch (e) {
        nodeRep = "";
      }
      throw new Error("Cyclic dependency" + nodeRep);
    }
    if (!nodesHash.has(node)) {
      throw new Error("Found unknown node. Make sure to provided all involved nodes. Unknown node: " + JSON.stringify(node));
    }
    if (visited[i2]) return;
    visited[i2] = true;
    var outgoing = outgoingEdges.get(node) || /* @__PURE__ */ new Set();
    outgoing = Array.from(outgoing);
    if (i2 = outgoing.length) {
      predecessors.add(node);
      do {
        var child = outgoing[--i2];
        visit(child, nodesHash.get(child), predecessors);
      } while (i2);
      predecessors.delete(node);
    }
    sorted[--cursor] = node;
  }
}
function uniqueNodes(arr) {
  var res = /* @__PURE__ */ new Set();
  for (var i = 0, len = arr.length; i < len; i++) {
    var edge = arr[i];
    res.add(edge[0]);
    res.add(edge[1]);
  }
  return Array.from(res);
}
function makeOutgoingEdges(arr) {
  var edges = /* @__PURE__ */ new Map();
  for (var i = 0, len = arr.length; i < len; i++) {
    var edge = arr[i];
    if (!edges.has(edge[0])) edges.set(edge[0], /* @__PURE__ */ new Set());
    if (!edges.has(edge[1])) edges.set(edge[1], /* @__PURE__ */ new Set());
    edges.get(edge[0]).add(edge[1]);
  }
  return edges;
}
function makeNodesHash(arr) {
  var res = /* @__PURE__ */ new Map();
  for (var i = 0, len = arr.length; i < len; i++) {
    res.set(arr[i], i);
  }
  return res;
}
var toposortExports = toposort$2.exports;
const toposort$1 = /* @__PURE__ */ getDefaultExportFromCjs(toposortExports);
function sortFields(fields2, excludes = []) {
  let edges = [];
  let nodes = [];
  function addNode(depPath, key) {
    var node = propertyExpr.split(depPath)[0];
    if (!~nodes.indexOf(node)) nodes.push(node);
    if (!~excludes.indexOf(`${key}-${node}`)) edges.push([key, node]);
  }
  for (const key in fields2) if (has$1(fields2, key)) {
    let value = fields2[key];
    if (!~nodes.indexOf(key)) nodes.push(key);
    if (Reference.isRef(value) && value.isSibling) addNode(value.path, key);
    else if (isSchema(value) && "deps" in value) value.deps.forEach((path2) => addNode(path2, key));
  }
  return toposort$1.array(nodes, edges).reverse();
}
function findIndex(arr, err) {
  let idx = Infinity;
  arr.some((key, ii) => {
    var _err$path;
    if (((_err$path = err.path) == null ? void 0 : _err$path.indexOf(key)) !== -1) {
      idx = ii;
      return true;
    }
  });
  return idx;
}
function sortByKeyOrder(keys2) {
  return (a, b) => {
    return findIndex(keys2, a) - findIndex(keys2, b);
  };
}
function _extends$1() {
  _extends$1 = Object.assign || function(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  return _extends$1.apply(this, arguments);
}
let isObject$3 = (obj) => Object.prototype.toString.call(obj) === "[object Object]";
function unknown(ctx, value) {
  let known = Object.keys(ctx.fields);
  return Object.keys(value).filter((key) => known.indexOf(key) === -1);
}
const defaultSort = sortByKeyOrder([]);
class ObjectSchema extends BaseSchema {
  constructor(spec) {
    super({
      type: "object"
    });
    this.fields = /* @__PURE__ */ Object.create(null);
    this._sortErrors = defaultSort;
    this._nodes = [];
    this._excludedEdges = [];
    this.withMutation(() => {
      this.transform(function coerce(value) {
        if (typeof value === "string") {
          try {
            value = JSON.parse(value);
          } catch (err) {
            value = null;
          }
        }
        if (this.isType(value)) return value;
        return null;
      });
      if (spec) {
        this.shape(spec);
      }
    });
  }
  _typeCheck(value) {
    return isObject$3(value) || typeof value === "function";
  }
  _cast(_value, options = {}) {
    var _options$stripUnknown;
    let value = super._cast(_value, options);
    if (value === void 0) return this.getDefault();
    if (!this._typeCheck(value)) return value;
    let fields2 = this.fields;
    let strip = (_options$stripUnknown = options.stripUnknown) != null ? _options$stripUnknown : this.spec.noUnknown;
    let props = this._nodes.concat(Object.keys(value).filter((v) => this._nodes.indexOf(v) === -1));
    let intermediateValue = {};
    let innerOptions = _extends$1({}, options, {
      parent: intermediateValue,
      __validating: options.__validating || false
    });
    let isChanged = false;
    for (const prop of props) {
      let field = fields2[prop];
      let exists = has$1(value, prop);
      if (field) {
        let fieldValue;
        let inputValue = value[prop];
        innerOptions.path = (options.path ? `${options.path}.` : "") + prop;
        field = field.resolve({
          value: inputValue,
          context: options.context,
          parent: intermediateValue
        });
        let fieldSpec = "spec" in field ? field.spec : void 0;
        let strict = fieldSpec == null ? void 0 : fieldSpec.strict;
        if (fieldSpec == null ? void 0 : fieldSpec.strip) {
          isChanged = isChanged || prop in value;
          continue;
        }
        fieldValue = !options.__validating || !strict ? (
          // TODO: use _cast, this is double resolving
          field.cast(value[prop], innerOptions)
        ) : value[prop];
        if (fieldValue !== void 0) {
          intermediateValue[prop] = fieldValue;
        }
      } else if (exists && !strip) {
        intermediateValue[prop] = value[prop];
      }
      if (intermediateValue[prop] !== value[prop]) {
        isChanged = true;
      }
    }
    return isChanged ? intermediateValue : value;
  }
  _validate(_value, opts = {}, callback) {
    let errors2 = [];
    let {
      sync: sync2,
      from = [],
      originalValue = _value,
      abortEarly = this.spec.abortEarly,
      recursive = this.spec.recursive
    } = opts;
    from = [{
      schema: this,
      value: originalValue
    }, ...from];
    opts.__validating = true;
    opts.originalValue = originalValue;
    opts.from = from;
    super._validate(_value, opts, (err, value) => {
      if (err) {
        if (!ValidationError$1.isError(err) || abortEarly) {
          return void callback(err, value);
        }
        errors2.push(err);
      }
      if (!recursive || !isObject$3(value)) {
        callback(errors2[0] || null, value);
        return;
      }
      originalValue = originalValue || value;
      let tests = this._nodes.map((key) => (_2, cb) => {
        let path2 = key.indexOf(".") === -1 ? (opts.path ? `${opts.path}.` : "") + key : `${opts.path || ""}["${key}"]`;
        let field = this.fields[key];
        if (field && "validate" in field) {
          field.validate(value[key], _extends$1({}, opts, {
            // @ts-ignore
            path: path2,
            from,
            // inner fields are always strict:
            // 1. this isn't strict so the casting will also have cast inner values
            // 2. this is strict in which case the nested values weren't cast either
            strict: true,
            parent: value,
            originalValue: originalValue[key]
          }), cb);
          return;
        }
        cb(null);
      });
      runTests({
        tests,
        value,
        errors: errors2,
        endEarly: abortEarly,
        sort: this._sortErrors,
        path: opts.path
      }, callback);
    });
  }
  clone(spec) {
    const next = super.clone(spec);
    next.fields = _extends$1({}, this.fields);
    next._nodes = this._nodes;
    next._excludedEdges = this._excludedEdges;
    next._sortErrors = this._sortErrors;
    return next;
  }
  concat(schema2) {
    let next = super.concat(schema2);
    let nextFields = next.fields;
    for (let [field, schemaOrRef] of Object.entries(this.fields)) {
      const target = nextFields[field];
      if (target === void 0) {
        nextFields[field] = schemaOrRef;
      } else if (target instanceof BaseSchema && schemaOrRef instanceof BaseSchema) {
        nextFields[field] = schemaOrRef.concat(target);
      }
    }
    return next.withMutation(() => next.shape(nextFields));
  }
  getDefaultFromShape() {
    let dft = {};
    this._nodes.forEach((key) => {
      const field = this.fields[key];
      dft[key] = "default" in field ? field.getDefault() : void 0;
    });
    return dft;
  }
  _getDefault() {
    if ("default" in this.spec) {
      return super._getDefault();
    }
    if (!this._nodes.length) {
      return void 0;
    }
    return this.getDefaultFromShape();
  }
  shape(additions, excludes = []) {
    let next = this.clone();
    let fields2 = Object.assign(next.fields, additions);
    next.fields = fields2;
    next._sortErrors = sortByKeyOrder(Object.keys(fields2));
    if (excludes.length) {
      if (!Array.isArray(excludes[0])) excludes = [excludes];
      let keys2 = excludes.map(([first, second]) => `${first}-${second}`);
      next._excludedEdges = next._excludedEdges.concat(keys2);
    }
    next._nodes = sortFields(fields2, next._excludedEdges);
    return next;
  }
  pick(keys2) {
    const picked = {};
    for (const key of keys2) {
      if (this.fields[key]) picked[key] = this.fields[key];
    }
    return this.clone().withMutation((next) => {
      next.fields = {};
      return next.shape(picked);
    });
  }
  omit(keys2) {
    const next = this.clone();
    const fields2 = next.fields;
    next.fields = {};
    for (const key of keys2) {
      delete fields2[key];
    }
    return next.withMutation(() => next.shape(fields2));
  }
  from(from, to, alias) {
    let fromGetter = propertyExpr.getter(from, true);
    return this.transform((obj) => {
      if (obj == null) return obj;
      let newObj = obj;
      if (has$1(obj, from)) {
        newObj = _extends$1({}, obj);
        if (!alias) delete newObj[from];
        newObj[to] = fromGetter(obj);
      }
      return newObj;
    });
  }
  noUnknown(noAllow = true, message = object.noUnknown) {
    if (typeof noAllow === "string") {
      message = noAllow;
      noAllow = true;
    }
    let next = this.test({
      name: "noUnknown",
      exclusive: true,
      message,
      test(value) {
        if (value == null) return true;
        const unknownKeys = unknown(this.schema, value);
        return !noAllow || unknownKeys.length === 0 || this.createError({
          params: {
            unknown: unknownKeys.join(", ")
          }
        });
      }
    });
    next.spec.noUnknown = noAllow;
    return next;
  }
  unknown(allow = true, message = object.noUnknown) {
    return this.noUnknown(!allow, message);
  }
  transformKeys(fn) {
    return this.transform((obj) => obj && mapKeys$1(obj, (_2, key) => fn(key)));
  }
  camelCase() {
    return this.transformKeys(camelCase$1);
  }
  snakeCase() {
    return this.transformKeys(snakeCase$1);
  }
  constantCase() {
    return this.transformKeys((key) => snakeCase$1(key).toUpperCase());
  }
  describe() {
    let base = super.describe();
    base.fields = mapValues$1(this.fields, (value) => value.describe());
    return base;
  }
}
function create$2(spec) {
  return new ObjectSchema(spec);
}
create$2.prototype = ObjectSchema.prototype;
function _extends() {
  _extends = Object.assign || function(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  return _extends.apply(this, arguments);
}
function create$1(type2) {
  return new ArraySchema(type2);
}
class ArraySchema extends BaseSchema {
  constructor(type2) {
    super({
      type: "array"
    });
    this.innerType = type2;
    this.withMutation(() => {
      this.transform(function(values) {
        if (typeof values === "string") try {
          values = JSON.parse(values);
        } catch (err) {
          values = null;
        }
        return this.isType(values) ? values : null;
      });
    });
  }
  _typeCheck(v) {
    return Array.isArray(v);
  }
  get _subType() {
    return this.innerType;
  }
  _cast(_value, _opts) {
    const value = super._cast(_value, _opts);
    if (!this._typeCheck(value) || !this.innerType) return value;
    let isChanged = false;
    const castArray2 = value.map((v, idx) => {
      const castElement = this.innerType.cast(v, _extends({}, _opts, {
        path: `${_opts.path || ""}[${idx}]`
      }));
      if (castElement !== v) {
        isChanged = true;
      }
      return castElement;
    });
    return isChanged ? castArray2 : value;
  }
  _validate(_value, options = {}, callback) {
    var _options$abortEarly, _options$recursive;
    let errors2 = [];
    options.sync;
    let path2 = options.path;
    let innerType = this.innerType;
    let endEarly = (_options$abortEarly = options.abortEarly) != null ? _options$abortEarly : this.spec.abortEarly;
    let recursive = (_options$recursive = options.recursive) != null ? _options$recursive : this.spec.recursive;
    let originalValue = options.originalValue != null ? options.originalValue : _value;
    super._validate(_value, options, (err, value) => {
      if (err) {
        if (!ValidationError$1.isError(err) || endEarly) {
          return void callback(err, value);
        }
        errors2.push(err);
      }
      if (!recursive || !innerType || !this._typeCheck(value)) {
        callback(errors2[0] || null, value);
        return;
      }
      originalValue = originalValue || value;
      let tests = new Array(value.length);
      for (let idx = 0; idx < value.length; idx++) {
        let item = value[idx];
        let path3 = `${options.path || ""}[${idx}]`;
        let innerOptions = _extends({}, options, {
          path: path3,
          strict: true,
          parent: value,
          index: idx,
          originalValue: originalValue[idx]
        });
        tests[idx] = (_2, cb) => innerType.validate(item, innerOptions, cb);
      }
      runTests({
        path: path2,
        value,
        errors: errors2,
        endEarly,
        tests
      }, callback);
    });
  }
  clone(spec) {
    const next = super.clone(spec);
    next.innerType = this.innerType;
    return next;
  }
  concat(schema2) {
    let next = super.concat(schema2);
    next.innerType = this.innerType;
    if (schema2.innerType) next.innerType = next.innerType ? (
      // @ts-expect-error Lazy doesn't have concat()
      next.innerType.concat(schema2.innerType)
    ) : schema2.innerType;
    return next;
  }
  of(schema2) {
    let next = this.clone();
    if (!isSchema(schema2)) throw new TypeError("`array.of()` sub-schema must be a valid yup schema not: " + printValue$1(schema2));
    next.innerType = schema2;
    return next;
  }
  length(length, message = array.length) {
    return this.test({
      message,
      name: "length",
      exclusive: true,
      params: {
        length
      },
      test(value) {
        return isAbsent(value) || value.length === this.resolve(length);
      }
    });
  }
  min(min, message) {
    message = message || array.min;
    return this.test({
      message,
      name: "min",
      exclusive: true,
      params: {
        min
      },
      // FIXME(ts): Array<typeof T>
      test(value) {
        return isAbsent(value) || value.length >= this.resolve(min);
      }
    });
  }
  max(max, message) {
    message = message || array.max;
    return this.test({
      message,
      name: "max",
      exclusive: true,
      params: {
        max
      },
      test(value) {
        return isAbsent(value) || value.length <= this.resolve(max);
      }
    });
  }
  ensure() {
    return this.default(() => []).transform((val, original) => {
      if (this._typeCheck(val)) return val;
      return original == null ? [] : [].concat(original);
    });
  }
  compact(rejector) {
    let reject = !rejector ? (v) => !!v : (v, i, a) => !rejector(v, i, a);
    return this.transform((values) => values != null ? values.filter(reject) : values);
  }
  describe() {
    let base = super.describe();
    if (this.innerType) base.innerType = this.innerType.describe();
    return base;
  }
  nullable(isNullable = true) {
    return super.nullable(isNullable);
  }
  defined() {
    return super.defined();
  }
  required(msg) {
    return super.required(msg);
  }
}
create$1.prototype = ArraySchema.prototype;
function create(builder) {
  return new Lazy(builder);
}
class Lazy {
  constructor(builder) {
    this.type = "lazy";
    this.__isYupSchema__ = true;
    this._resolve = (value, options = {}) => {
      let schema2 = this.builder(value, options);
      if (!isSchema(schema2)) throw new TypeError("lazy() functions must return a valid schema");
      return schema2.resolve(options);
    };
    this.builder = builder;
  }
  resolve(options) {
    return this._resolve(options.value, options);
  }
  cast(value, options) {
    return this._resolve(value, options).cast(value, options);
  }
  validate(value, options, maybeCb) {
    return this._resolve(value, options).validate(value, options, maybeCb);
  }
  validateSync(value, options) {
    return this._resolve(value, options).validateSync(value, options);
  }
  validateAt(path2, value, options) {
    return this._resolve(value, options).validateAt(path2, value, options);
  }
  validateSyncAt(path2, value, options) {
    return this._resolve(value, options).validateSyncAt(path2, value, options);
  }
  describe() {
    return null;
  }
  isValid(value, options) {
    return this._resolve(value, options).isValid(value, options);
  }
  isValidSync(value, options) {
    return this._resolve(value, options).isValidSync(value, options);
  }
}
function setLocale(custom) {
  Object.keys(custom).forEach((type2) => {
    Object.keys(custom[type2]).forEach((method) => {
      locale[type2][method] = custom[type2][method];
    });
  });
}
function addMethod(schemaType, name, fn) {
  if (!schemaType || !isSchema(schemaType.prototype)) throw new TypeError("You must provide a yup schema constructor function");
  if (typeof name !== "string") throw new TypeError("A Method name must be provided");
  if (typeof fn !== "function") throw new TypeError("Method function must be provided");
  schemaType.prototype[name] = fn;
}
var httpErrors = { exports: {} };
/*!
 * depd
 * Copyright(c) 2015 Douglas Christopher Wilson
 * MIT Licensed
 */
var browser = depd;
function depd(namespace) {
  if (!namespace) {
    throw new TypeError("argument namespace is required");
  }
  function deprecate(message) {
  }
  deprecate._file = void 0;
  deprecate._ignored = true;
  deprecate._namespace = namespace;
  deprecate._traced = false;
  deprecate._warned = /* @__PURE__ */ Object.create(null);
  deprecate.function = wrapfunction;
  deprecate.property = wrapproperty;
  return deprecate;
}
function wrapfunction(fn, message) {
  if (typeof fn !== "function") {
    throw new TypeError("argument fn must be a function");
  }
  return fn;
}
function wrapproperty(obj, prop, message) {
  if (!obj || typeof obj !== "object" && typeof obj !== "function") {
    throw new TypeError("argument obj must be object");
  }
  var descriptor = Object.getOwnPropertyDescriptor(obj, prop);
  if (!descriptor) {
    throw new TypeError("must call property on owner object");
  }
  if (!descriptor.configurable) {
    throw new TypeError("property must be configurable");
  }
}
var setprototypeof = Object.setPrototypeOf || ({ __proto__: [] } instanceof Array ? setProtoOf : mixinProperties);
function setProtoOf(obj, proto) {
  obj.__proto__ = proto;
  return obj;
}
function mixinProperties(obj, proto) {
  for (var prop in proto) {
    if (!Object.prototype.hasOwnProperty.call(obj, prop)) {
      obj[prop] = proto[prop];
    }
  }
  return obj;
}
const require$$0$1 = {
  "100": "Continue",
  "101": "Switching Protocols",
  "102": "Processing",
  "103": "Early Hints",
  "200": "OK",
  "201": "Created",
  "202": "Accepted",
  "203": "Non-Authoritative Information",
  "204": "No Content",
  "205": "Reset Content",
  "206": "Partial Content",
  "207": "Multi-Status",
  "208": "Already Reported",
  "226": "IM Used",
  "300": "Multiple Choices",
  "301": "Moved Permanently",
  "302": "Found",
  "303": "See Other",
  "304": "Not Modified",
  "305": "Use Proxy",
  "307": "Temporary Redirect",
  "308": "Permanent Redirect",
  "400": "Bad Request",
  "401": "Unauthorized",
  "402": "Payment Required",
  "403": "Forbidden",
  "404": "Not Found",
  "405": "Method Not Allowed",
  "406": "Not Acceptable",
  "407": "Proxy Authentication Required",
  "408": "Request Timeout",
  "409": "Conflict",
  "410": "Gone",
  "411": "Length Required",
  "412": "Precondition Failed",
  "413": "Payload Too Large",
  "414": "URI Too Long",
  "415": "Unsupported Media Type",
  "416": "Range Not Satisfiable",
  "417": "Expectation Failed",
  "418": "I'm a Teapot",
  "421": "Misdirected Request",
  "422": "Unprocessable Entity",
  "423": "Locked",
  "424": "Failed Dependency",
  "425": "Too Early",
  "426": "Upgrade Required",
  "428": "Precondition Required",
  "429": "Too Many Requests",
  "431": "Request Header Fields Too Large",
  "451": "Unavailable For Legal Reasons",
  "500": "Internal Server Error",
  "501": "Not Implemented",
  "502": "Bad Gateway",
  "503": "Service Unavailable",
  "504": "Gateway Timeout",
  "505": "HTTP Version Not Supported",
  "506": "Variant Also Negotiates",
  "507": "Insufficient Storage",
  "508": "Loop Detected",
  "509": "Bandwidth Limit Exceeded",
  "510": "Not Extended",
  "511": "Network Authentication Required"
};
/*!
 * statuses
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2016 Douglas Christopher Wilson
 * MIT Licensed
 */
var codes = require$$0$1;
var statuses = status;
status.message = codes;
status.code = createMessageToStatusCodeMap(codes);
status.codes = createStatusCodeList(codes);
status.redirect = {
  300: true,
  301: true,
  302: true,
  303: true,
  305: true,
  307: true,
  308: true
};
status.empty = {
  204: true,
  205: true,
  304: true
};
status.retry = {
  502: true,
  503: true,
  504: true
};
function createMessageToStatusCodeMap(codes2) {
  var map2 = {};
  Object.keys(codes2).forEach(function forEachCode(code) {
    var message = codes2[code];
    var status2 = Number(code);
    map2[message.toLowerCase()] = status2;
  });
  return map2;
}
function createStatusCodeList(codes2) {
  return Object.keys(codes2).map(function mapCode(code) {
    return Number(code);
  });
}
function getStatusCode(message) {
  var msg = message.toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(status.code, msg)) {
    throw new Error('invalid status message: "' + message + '"');
  }
  return status.code[msg];
}
function getStatusMessage(code) {
  if (!Object.prototype.hasOwnProperty.call(status.message, code)) {
    throw new Error("invalid status code: " + code);
  }
  return status.message[code];
}
function status(code) {
  if (typeof code === "number") {
    return getStatusMessage(code);
  }
  if (typeof code !== "string") {
    throw new TypeError("code must be a number or string");
  }
  var n = parseInt(code, 10);
  if (!isNaN(n)) {
    return getStatusMessage(n);
  }
  return getStatusCode(code);
}
var inherits_browser = { exports: {} };
if (typeof Object.create === "function") {
  inherits_browser.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor;
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
    }
  };
} else {
  inherits_browser.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor;
      var TempCtor = function() {
      };
      TempCtor.prototype = superCtor.prototype;
      ctor.prototype = new TempCtor();
      ctor.prototype.constructor = ctor;
    }
  };
}
var inherits_browserExports = inherits_browser.exports;
/*!
 * toidentifier
 * Copyright(c) 2016 Douglas Christopher Wilson
 * MIT Licensed
 */
var toidentifier = toIdentifier;
function toIdentifier(str2) {
  return str2.split(" ").map(function(token) {
    return token.slice(0, 1).toUpperCase() + token.slice(1);
  }).join("").replace(/[^ _0-9a-z]/gi, "");
}
/*!
 * http-errors
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2016 Douglas Christopher Wilson
 * MIT Licensed
 */
(function(module) {
  browser("http-errors");
  var setPrototypeOf = setprototypeof;
  var statuses$1 = statuses;
  var inherits = inherits_browserExports;
  var toIdentifier2 = toidentifier;
  module.exports = createError;
  module.exports.HttpError = createHttpErrorConstructor();
  module.exports.isHttpError = createIsHttpErrorFunction(module.exports.HttpError);
  populateConstructorExports(module.exports, statuses$1.codes, module.exports.HttpError);
  function codeClass(status2) {
    return Number(String(status2).charAt(0) + "00");
  }
  function createError() {
    var err;
    var msg;
    var status2 = 500;
    var props = {};
    for (var i = 0; i < arguments.length; i++) {
      var arg = arguments[i];
      var type2 = typeof arg;
      if (type2 === "object" && arg instanceof Error) {
        err = arg;
        status2 = err.status || err.statusCode || status2;
      } else if (type2 === "number" && i === 0) {
        status2 = arg;
      } else if (type2 === "string") {
        msg = arg;
      } else if (type2 === "object") {
        props = arg;
      } else {
        throw new TypeError("argument #" + (i + 1) + " unsupported type " + type2);
      }
    }
    if (typeof status2 !== "number" || !statuses$1.message[status2] && (status2 < 400 || status2 >= 600)) {
      status2 = 500;
    }
    var HttpError = createError[status2] || createError[codeClass(status2)];
    if (!err) {
      err = HttpError ? new HttpError(msg) : new Error(msg || statuses$1.message[status2]);
      Error.captureStackTrace(err, createError);
    }
    if (!HttpError || !(err instanceof HttpError) || err.status !== status2) {
      err.expose = status2 < 500;
      err.status = err.statusCode = status2;
    }
    for (var key in props) {
      if (key !== "status" && key !== "statusCode") {
        err[key] = props[key];
      }
    }
    return err;
  }
  function createHttpErrorConstructor() {
    function HttpError() {
      throw new TypeError("cannot construct abstract class");
    }
    inherits(HttpError, Error);
    return HttpError;
  }
  function createClientErrorConstructor(HttpError, name, code) {
    var className = toClassName(name);
    function ClientError(message) {
      var msg = message != null ? message : statuses$1.message[code];
      var err = new Error(msg);
      Error.captureStackTrace(err, ClientError);
      setPrototypeOf(err, ClientError.prototype);
      Object.defineProperty(err, "message", {
        enumerable: true,
        configurable: true,
        value: msg,
        writable: true
      });
      Object.defineProperty(err, "name", {
        enumerable: false,
        configurable: true,
        value: className,
        writable: true
      });
      return err;
    }
    inherits(ClientError, HttpError);
    nameFunc(ClientError, className);
    ClientError.prototype.status = code;
    ClientError.prototype.statusCode = code;
    ClientError.prototype.expose = true;
    return ClientError;
  }
  function createIsHttpErrorFunction(HttpError) {
    return function isHttpError(val) {
      if (!val || typeof val !== "object") {
        return false;
      }
      if (val instanceof HttpError) {
        return true;
      }
      return val instanceof Error && typeof val.expose === "boolean" && typeof val.statusCode === "number" && val.status === val.statusCode;
    };
  }
  function createServerErrorConstructor(HttpError, name, code) {
    var className = toClassName(name);
    function ServerError(message) {
      var msg = message != null ? message : statuses$1.message[code];
      var err = new Error(msg);
      Error.captureStackTrace(err, ServerError);
      setPrototypeOf(err, ServerError.prototype);
      Object.defineProperty(err, "message", {
        enumerable: true,
        configurable: true,
        value: msg,
        writable: true
      });
      Object.defineProperty(err, "name", {
        enumerable: false,
        configurable: true,
        value: className,
        writable: true
      });
      return err;
    }
    inherits(ServerError, HttpError);
    nameFunc(ServerError, className);
    ServerError.prototype.status = code;
    ServerError.prototype.statusCode = code;
    ServerError.prototype.expose = false;
    return ServerError;
  }
  function nameFunc(func, name) {
    var desc = Object.getOwnPropertyDescriptor(func, "name");
    if (desc && desc.configurable) {
      desc.value = name;
      Object.defineProperty(func, "name", desc);
    }
  }
  function populateConstructorExports(exports$1, codes2, HttpError) {
    codes2.forEach(function forEachCode(code) {
      var CodeError;
      var name = toIdentifier2(statuses$1.message[code]);
      switch (codeClass(code)) {
        case 400:
          CodeError = createClientErrorConstructor(HttpError, name, code);
          break;
        case 500:
          CodeError = createServerErrorConstructor(HttpError, name, code);
          break;
      }
      if (CodeError) {
        exports$1[code] = CodeError;
        exports$1[name] = CodeError;
      }
    });
  }
  function toClassName(name) {
    return name.substr(-5) !== "Error" ? name + "Error" : name;
  }
})(httpErrors);
var httpErrorsExports = httpErrors.exports;
const formatYupInnerError = (yupError) => ({
  path: fp.toPath(yupError.path),
  message: yupError.message,
  name: yupError.name,
  value: yupError.value
});
const formatYupErrors = (yupError) => ({
  errors: fp.isEmpty(yupError.inner) ? [
    formatYupInnerError(yupError)
  ] : yupError.inner.map(formatYupInnerError),
  message: yupError.message
});
class ApplicationError extends Error {
  constructor(message = "An application error occurred", details = {}) {
    super();
    this.name = "ApplicationError";
    this.message = message;
    this.details = details;
  }
}
class ValidationError2 extends ApplicationError {
  constructor(message, details) {
    super(message, details);
    this.name = "ValidationError";
  }
}
class YupValidationError extends ValidationError2 {
  constructor(yupError, message) {
    super("Validation");
    const { errors: errors2, message: yupMessage } = formatYupErrors(yupError);
    this.message = message || yupMessage;
    this.details = {
      errors: errors2
    };
  }
}
class PaginationError extends ApplicationError {
  constructor(message = "Invalid pagination", details) {
    super(message, details);
    this.name = "PaginationError";
    this.message = message;
  }
}
class NotFoundError extends ApplicationError {
  constructor(message = "Entity not found", details) {
    super(message, details);
    this.name = "NotFoundError";
    this.message = message;
  }
}
let ForbiddenError$1 = class ForbiddenError extends ApplicationError {
  constructor(message = "Forbidden access", details) {
    super(message, details);
    this.name = "ForbiddenError";
    this.message = message;
  }
};
let UnauthorizedError$1 = class UnauthorizedError extends ApplicationError {
  constructor(message = "Unauthorized", details) {
    super(message, details);
    this.name = "UnauthorizedError";
    this.message = message;
  }
};
class RateLimitError extends ApplicationError {
  constructor(message = "Too many requests, please try again later.", details) {
    super(message, details);
    this.name = "RateLimitError";
    this.message = message;
    this.details = details || {};
  }
}
class PayloadTooLargeError extends ApplicationError {
  constructor(message = "Entity too large", details) {
    super(message, details);
    this.name = "PayloadTooLargeError";
    this.message = message;
  }
}
class PolicyError extends ForbiddenError$1 {
  constructor(message = "Policy Failed", details) {
    super(message, details);
    this.name = "PolicyError";
    this.message = message;
    this.details = details || {};
  }
}
class NotImplementedError extends ApplicationError {
  constructor(message = "This feature is not implemented yet", details) {
    super(message, details);
    this.name = "NotImplementedError";
    this.message = message;
  }
}
const errors = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ApplicationError,
  ForbiddenError: ForbiddenError$1,
  HttpError: httpErrorsExports.HttpError,
  NotFoundError,
  NotImplementedError,
  PaginationError,
  PayloadTooLargeError,
  PolicyError,
  RateLimitError,
  UnauthorizedError: UnauthorizedError$1,
  ValidationError: ValidationError2,
  YupValidationError
}, Symbol.toStringTag, { value: "Module" }));
const handleYupError = (error2, errorMessage) => {
  throw new YupValidationError(error2, errorMessage);
};
const defaultValidationParam = {
  strict: true,
  abortEarly: false
};
const validateYupSchema = (schema2, options = {}) => async (body, errorMessage) => {
  try {
    const optionsWithDefaults = fp.defaults(defaultValidationParam, options);
    const result = await schema2.validate(body, optionsWithDefaults);
    return result;
  } catch (e) {
    if (e instanceof ValidationError$1) {
      handleYupError(e, errorMessage);
    }
    throw e;
  }
};
const validateYupSchemaSync = (schema2, options = {}) => (body, errorMessage) => {
  try {
    const optionsWithDefaults = fp.defaults(defaultValidationParam, options);
    return schema2.validateSync(body, optionsWithDefaults);
  } catch (e) {
    if (e instanceof ValidationError$1) {
      handleYupError(e, errorMessage);
    }
    throw e;
  }
};
const GROUP_OPERATORS = [
  "$and",
  "$or"
];
const WHERE_OPERATORS = [
  "$not",
  "$in",
  "$notIn",
  "$eq",
  "$eqi",
  "$ne",
  "$nei",
  "$gt",
  "$gte",
  "$lt",
  "$lte",
  "$null",
  "$notNull",
  "$between",
  "$startsWith",
  "$endsWith",
  "$startsWithi",
  "$endsWithi",
  "$contains",
  "$notContains",
  "$containsi",
  "$notContainsi",
  // Experimental, only for internal use
  "$jsonSupersetOf"
];
const CAST_OPERATORS = [
  "$not",
  "$in",
  "$notIn",
  "$eq",
  "$ne",
  "$gt",
  "$gte",
  "$lt",
  "$lte",
  "$between"
];
const ARRAY_OPERATORS = [
  "$in",
  "$notIn",
  "$between"
];
const OPERATORS = {
  where: WHERE_OPERATORS,
  cast: CAST_OPERATORS,
  group: GROUP_OPERATORS,
  array: ARRAY_OPERATORS
};
const OPERATORS_LOWERCASE = Object.fromEntries(Object.entries(OPERATORS).map(([key, values]) => [
  key,
  values.map((value) => value.toLowerCase())
]));
const isObjKey = (key, obj) => {
  return key in obj;
};
const isOperatorOfType = (type2, key, ignoreCase = false) => {
  if (ignoreCase) {
    return OPERATORS_LOWERCASE[type2]?.includes(key.toLowerCase()) ?? false;
  }
  if (isObjKey(type2, OPERATORS)) {
    return OPERATORS[type2]?.includes(key) ?? false;
  }
  return false;
};
const isOperator = (key, ignoreCase = false) => {
  return Object.keys(OPERATORS).some((type2) => isOperatorOfType(type2, key, ignoreCase));
};
const { ID_ATTRIBUTE: ID_ATTRIBUTE$3, DOC_ID_ATTRIBUTE: DOC_ID_ATTRIBUTE$3, PUBLISHED_AT_ATTRIBUTE } = constants$6;
class InvalidOrderError extends Error {
  constructor() {
    super();
    this.message = "Invalid order. order can only be one of asc|desc|ASC|DESC";
  }
}
class InvalidSortError extends Error {
  constructor() {
    super();
    this.message = "Invalid sort parameter. Expected a string, an array of strings, a sort object or an array of sort objects";
  }
}
function validateOrder(order) {
  if (!fp.isString(order) || ![
    "asc",
    "desc"
  ].includes(order.toLocaleLowerCase())) {
    throw new InvalidOrderError();
  }
}
const convertCountQueryParams = (countQuery) => {
  return parseType({
    type: "boolean",
    value: countQuery
  });
};
const convertOrderingQueryParams = (ordering) => {
  return ordering;
};
const isPlainObject$1 = (value) => ___default.isPlainObject(value);
const isStringArray$3 = (value) => fp.isArray(value) && value.every(fp.isString);
const createTransformer = ({ getModel }) => {
  const convertSortQueryParams = (sortQuery) => {
    if (typeof sortQuery === "string") {
      return convertStringSortQueryParam(sortQuery);
    }
    if (isStringArray$3(sortQuery)) {
      return sortQuery.flatMap((sortValue) => convertStringSortQueryParam(sortValue));
    }
    if (Array.isArray(sortQuery)) {
      return sortQuery.map((sortValue) => convertNestedSortQueryParam(sortValue));
    }
    if (isPlainObject$1(sortQuery)) {
      return convertNestedSortQueryParam(sortQuery);
    }
    throw new InvalidSortError();
  };
  const convertStringSortQueryParam = (sortQuery) => {
    return sortQuery.split(",").map((value) => convertSingleSortQueryParam(value));
  };
  const convertSingleSortQueryParam = (sortQuery) => {
    if (!sortQuery) {
      return {};
    }
    if (!fp.isString(sortQuery)) {
      throw new Error("Invalid sort query");
    }
    const [field, order = "asc"] = sortQuery.split(":");
    if (field.length === 0) {
      throw new Error("Field cannot be empty");
    }
    validateOrder(order);
    return ___default.set({}, field, order);
  };
  const convertNestedSortQueryParam = (sortQuery) => {
    const transformedSort = {};
    for (const field of Object.keys(sortQuery)) {
      const order = sortQuery[field];
      if (isPlainObject$1(order)) {
        transformedSort[field] = convertNestedSortQueryParam(order);
      } else if (typeof order === "string") {
        validateOrder(order);
        transformedSort[field] = order;
      } else {
        throw Error(`Invalid sort type expected object or string got ${typeof order}`);
      }
    }
    return transformedSort;
  };
  const convertStartQueryParams = (startQuery) => {
    const startAsANumber = fp.toNumber(startQuery);
    if (!___default.isInteger(startAsANumber) || startAsANumber < 0) {
      throw new Error(`convertStartQueryParams expected a positive integer got ${startAsANumber}`);
    }
    return startAsANumber;
  };
  const convertLimitQueryParams = (limitQuery) => {
    const limitAsANumber = fp.toNumber(limitQuery);
    if (!___default.isInteger(limitAsANumber) || limitAsANumber !== -1 && limitAsANumber < 0) {
      throw new Error(`convertLimitQueryParams expected a positive integer got ${limitAsANumber}`);
    }
    if (limitAsANumber === -1) {
      return void 0;
    }
    return limitAsANumber;
  };
  const convertPageQueryParams = (page) => {
    const pageVal = fp.toNumber(page);
    if (!fp.isInteger(pageVal) || pageVal <= 0) {
      throw new PaginationError(`Invalid 'page' parameter. Expected an integer > 0, received: ${page}`);
    }
    return pageVal;
  };
  const convertPageSizeQueryParams = (pageSize, page) => {
    const pageSizeVal = fp.toNumber(pageSize);
    if (!fp.isInteger(pageSizeVal) || pageSizeVal <= 0) {
      throw new PaginationError(`Invalid 'pageSize' parameter. Expected an integer > 0, received: ${page}`);
    }
    return pageSizeVal;
  };
  const validatePaginationParams = (page, pageSize, start, limit) => {
    const isPagePagination = !fp.isNil(page) || !fp.isNil(pageSize);
    const isOffsetPagination = !fp.isNil(start) || !fp.isNil(limit);
    if (isPagePagination && isOffsetPagination) {
      throw new PaginationError("Invalid pagination attributes. The page parameters are incorrect and must be in the pagination object");
    }
  };
  class InvalidPopulateError extends Error {
    constructor() {
      super();
      this.message = "Invalid populate parameter. Expected a string, an array of strings, a populate object";
    }
  }
  const convertPopulateQueryParams = (populate2, schema2, depth2 = 0) => {
    if (depth2 === 0 && populate2 === "*") {
      return true;
    }
    if (typeof populate2 === "string") {
      return populate2.split(",").map((value) => ___default.trim(value));
    }
    if (Array.isArray(populate2)) {
      return ___default.uniq(populate2.flatMap((value) => {
        if (typeof value !== "string") {
          throw new InvalidPopulateError();
        }
        return value.split(",").map((value2) => ___default.trim(value2));
      }));
    }
    if (___default.isPlainObject(populate2)) {
      return convertPopulateObject(populate2, schema2);
    }
    throw new InvalidPopulateError();
  };
  const hasPopulateFragmentDefined = (populate2) => {
    return typeof populate2 === "object" && "on" in populate2 && !fp.isNil(populate2.on);
  };
  const hasCountDefined = (populate2) => {
    return typeof populate2 === "object" && "count" in populate2 && typeof populate2.count === "boolean";
  };
  const convertPopulateObject = (populate2, schema2) => {
    if (!schema2) {
      return {};
    }
    const { attributes } = schema2;
    return Object.entries(populate2).reduce((acc, [key, subPopulate]) => {
      if (___default.isString(subPopulate)) {
        try {
          const subPopulateAsBoolean = parseType({
            type: "boolean",
            value: subPopulate
          });
          return subPopulateAsBoolean ? {
            ...acc,
            [key]: true
          } : acc;
        } catch {
        }
      }
      if (___default.isBoolean(subPopulate)) {
        return subPopulate === true ? {
          ...acc,
          [key]: true
        } : acc;
      }
      const attribute = attributes[key];
      if (!attribute) {
        return acc;
      }
      const isMorphLikeRelationalAttribute = isDynamicZoneAttribute(attribute) || isMorphToRelationalAttribute(attribute);
      if (isMorphLikeRelationalAttribute) {
        const hasInvalidProperties = Object.keys(subPopulate).some((key2) => ![
          "populate",
          "on",
          "count"
        ].includes(key2));
        if (hasInvalidProperties) {
          throw new Error(`Invalid nested populate for ${schema2.info?.singularName}.${key} (${schema2.uid}). Expected a fragment ("on") or "count" but found ${JSON.stringify(subPopulate)}`);
        }
        if ("populate" in subPopulate && subPopulate.populate !== "*") {
          throw new Error(`Invalid nested population query detected. When using 'populate' within polymorphic structures, its value must be '*' to indicate all second level links. Specific field targeting is not supported here. Consider using the fragment API for more granular population control.`);
        }
        const newSubPopulate = {};
        if ("populate" in subPopulate) {
          Object.assign(newSubPopulate, {
            populate: true
          });
        }
        if (hasPopulateFragmentDefined(subPopulate)) {
          Object.assign(newSubPopulate, {
            on: Object.entries(subPopulate.on).reduce((acc2, [type2, typeSubPopulate]) => ({
              ...acc2,
              [type2]: convertNestedPopulate(typeSubPopulate, getModel(type2))
            }), {})
          });
        }
        if (hasCountDefined(subPopulate)) {
          Object.assign(newSubPopulate, {
            count: subPopulate.count
          });
        }
        return {
          ...acc,
          [key]: newSubPopulate
        };
      }
      if (!isMorphLikeRelationalAttribute && hasPopulateFragmentDefined(subPopulate)) {
        throw new Error(`Using fragments is not permitted to populate "${key}" in "${schema2.uid}"`);
      }
      let targetSchemaUID;
      if (attribute.type === "relation") {
        targetSchemaUID = attribute.target;
      } else if (attribute.type === "component") {
        targetSchemaUID = attribute.component;
      } else if (attribute.type === "media") {
        targetSchemaUID = "plugin::upload.file";
      } else {
        return acc;
      }
      const targetSchema = getModel(targetSchemaUID);
      if (!targetSchema) {
        return acc;
      }
      const populateObject = convertNestedPopulate(subPopulate, targetSchema);
      if (!populateObject) {
        return acc;
      }
      return {
        ...acc,
        [key]: populateObject
      };
    }, {});
  };
  const convertNestedPopulate = (subPopulate, schema2) => {
    if (___default.isString(subPopulate)) {
      return parseType({
        type: "boolean",
        value: subPopulate,
        forceCast: true
      });
    }
    if (___default.isBoolean(subPopulate)) {
      return subPopulate;
    }
    if (!isPlainObject$1(subPopulate)) {
      throw new Error(`Invalid nested populate. Expected '*' or an object`);
    }
    const { sort: sort2, filters: filters2, fields: fields2, populate: populate2, count, ordering, page, pageSize, start, limit } = subPopulate;
    const query = {};
    if (sort2) {
      query.orderBy = convertSortQueryParams(sort2);
    }
    if (filters2) {
      query.where = convertFiltersQueryParams(filters2, schema2);
    }
    if (fields2) {
      query.select = convertFieldsQueryParams(fields2, schema2);
    }
    if (populate2) {
      query.populate = convertPopulateQueryParams(populate2, schema2);
    }
    if (count) {
      query.count = convertCountQueryParams(count);
    }
    if (ordering) {
      query.ordering = convertOrderingQueryParams(ordering);
    }
    validatePaginationParams(page, pageSize, start, limit);
    if (!fp.isNil(page)) {
      query.page = convertPageQueryParams(page);
    }
    if (!fp.isNil(pageSize)) {
      query.pageSize = convertPageSizeQueryParams(pageSize, page);
    }
    if (!fp.isNil(start)) {
      query.offset = convertStartQueryParams(start);
    }
    if (!fp.isNil(limit)) {
      query.limit = convertLimitQueryParams(limit);
    }
    return query;
  };
  const convertFieldsQueryParams = (fields2, schema2, depth2 = 0) => {
    if (depth2 === 0 && fields2 === "*") {
      return void 0;
    }
    if (typeof fields2 === "string") {
      const fieldsValues = fields2.split(",").map((value) => ___default.trim(value));
      if (schema2?.modelType === "contentType") {
        return ___default.uniq([
          ID_ATTRIBUTE$3,
          DOC_ID_ATTRIBUTE$3,
          ...fieldsValues
        ]);
      }
      return ___default.uniq([
        ID_ATTRIBUTE$3,
        ...fieldsValues
      ]);
    }
    if (isStringArray$3(fields2)) {
      const fieldsValues = fields2.flatMap((value) => convertFieldsQueryParams(value, schema2, depth2 + 1)).filter((v) => !fp.isNil(v));
      if (schema2?.modelType === "contentType") {
        return ___default.uniq([
          ID_ATTRIBUTE$3,
          DOC_ID_ATTRIBUTE$3,
          ...fieldsValues
        ]);
      }
      return ___default.uniq([
        ID_ATTRIBUTE$3,
        ...fieldsValues
      ]);
    }
    throw new Error("Invalid fields parameter. Expected a string or an array of strings");
  };
  const isValidSchemaAttribute = (key, schema2) => {
    if ([
      DOC_ID_ATTRIBUTE$3,
      ID_ATTRIBUTE$3
    ].includes(key)) {
      return true;
    }
    if (!schema2) {
      return false;
    }
    return Object.keys(schema2.attributes).includes(key);
  };
  const convertFiltersQueryParams = (filters2, schema2) => {
    if (!fp.isObject(filters2)) {
      throw new Error("The filters parameter must be an object or an array");
    }
    const filtersCopy = fp.cloneDeep(filters2);
    return convertAndSanitizeFilters(filtersCopy, schema2);
  };
  const convertAndSanitizeFilters = (filters2, schema2) => {
    if (Array.isArray(filters2)) {
      return filters2.map((filter) => convertAndSanitizeFilters(filter, schema2)).filter((filter) => !isPlainObject$1(filter) || !fp.isEmpty(filter));
    }
    if (!isPlainObject$1(filters2)) {
      return filters2;
    }
    const removeOperator = (operator) => delete filters2[operator];
    for (const [key, value] of Object.entries(filters2)) {
      const attribute = fp.get(key, schema2?.attributes);
      const validKey = isOperator(key) || isValidSchemaAttribute(key, schema2);
      if (!validKey) {
        removeOperator(key);
      } else if (attribute) {
        if (attribute.type === "relation") {
          filters2[key] = convertAndSanitizeFilters(value, getModel(attribute.target));
        } else if (attribute.type === "component") {
          filters2[key] = convertAndSanitizeFilters(value, getModel(attribute.component));
        } else if (attribute.type === "media") {
          filters2[key] = convertAndSanitizeFilters(value, getModel("plugin::upload.file"));
        } else if (attribute.type === "dynamiczone") {
          removeOperator(key);
        } else if (attribute.type === "password") {
          removeOperator(key);
        } else {
          filters2[key] = convertAndSanitizeFilters(value, schema2);
        }
      } else if ([
        "$null",
        "$notNull"
      ].includes(key)) {
        filters2[key] = parseType({
          type: "boolean",
          value: filters2[key],
          forceCast: true
        });
      } else if (fp.isObject(value)) {
        filters2[key] = convertAndSanitizeFilters(value, schema2);
      }
      if (isPlainObject$1(filters2[key]) && fp.isEmpty(filters2[key])) {
        removeOperator(key);
      }
    }
    return filters2;
  };
  const convertStatusParams = (status2, query = {}) => {
    query.filters = ({ meta }) => {
      const contentType = getModel(meta.uid);
      if (!contentType || !hasDraftAndPublish(contentType)) {
        return {};
      }
      return {
        [PUBLISHED_AT_ATTRIBUTE]: {
          $null: status2 === "draft"
        }
      };
    };
  };
  const transformQueryParams = (uid, params) => {
    const schema2 = getModel(uid);
    const query = {};
    const { _q, sort: sort2, filters: filters2, fields: fields2, populate: populate2, page, pageSize, start, limit, status: status2, ...rest } = params;
    if (!fp.isNil(status2)) {
      convertStatusParams(status2, query);
    }
    if (!fp.isNil(_q)) {
      query._q = _q;
    }
    if (!fp.isNil(sort2)) {
      query.orderBy = convertSortQueryParams(sort2);
    }
    if (!fp.isNil(filters2)) {
      query.where = convertFiltersQueryParams(filters2, schema2);
    }
    if (!fp.isNil(fields2)) {
      query.select = convertFieldsQueryParams(fields2, schema2);
    }
    if (!fp.isNil(populate2)) {
      query.populate = convertPopulateQueryParams(populate2, schema2);
    }
    validatePaginationParams(page, pageSize, start, limit);
    if (!fp.isNil(page)) {
      query.page = convertPageQueryParams(page);
    }
    if (!fp.isNil(pageSize)) {
      query.pageSize = convertPageSizeQueryParams(pageSize, page);
    }
    if (!fp.isNil(start)) {
      query.offset = convertStartQueryParams(start);
    }
    if (!fp.isNil(limit)) {
      query.limit = convertLimitQueryParams(limit);
    }
    return {
      ...rest,
      ...query
    };
  };
  return {
    private_convertSortQueryParams: convertSortQueryParams,
    private_convertStartQueryParams: convertStartQueryParams,
    private_convertLimitQueryParams: convertLimitQueryParams,
    private_convertPopulateQueryParams: convertPopulateQueryParams,
    private_convertFiltersQueryParams: convertFiltersQueryParams,
    private_convertFieldsQueryParams: convertFieldsQueryParams,
    transformQueryParams
  };
};
const convertQueryParams = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  createTransformer
}, Symbol.toStringTag, { value: "Module" }));
var indentString$2 = (string2, count = 1, options) => {
  options = {
    indent: " ",
    includeEmptyLines: false,
    ...options
  };
  if (typeof string2 !== "string") {
    throw new TypeError(
      `Expected \`input\` to be a \`string\`, got \`${typeof string2}\``
    );
  }
  if (typeof count !== "number") {
    throw new TypeError(
      `Expected \`count\` to be a \`number\`, got \`${typeof count}\``
    );
  }
  if (typeof options.indent !== "string") {
    throw new TypeError(
      `Expected \`options.indent\` to be a \`string\`, got \`${typeof options.indent}\``
    );
  }
  if (count === 0) {
    return string2;
  }
  const regex = options.includeEmptyLines ? /^/gm : /^(?!\s*$)/gm;
  return string2.replace(regex, options.indent.repeat(count));
};
const os$1 = require$$0$6;
const extractPathRegex = /\s+at.*(?:\(|\s)(.*)\)?/;
const pathRegex = /^(?:(?:(?:node|(?:internal\/[\w/]*|.*node_modules\/(?:babel-polyfill|pirates)\/.*)?\w+)\.js:\d+:\d+)|native)/;
const homeDir = typeof os$1.homedir === "undefined" ? "" : os$1.homedir();
var cleanStack$1 = (stack, options) => {
  options = Object.assign({ pretty: false }, options);
  return stack.replace(/\\/g, "/").split("\n").filter((line) => {
    const pathMatches = line.match(extractPathRegex);
    if (pathMatches === null || !pathMatches[1]) {
      return true;
    }
    const match = pathMatches[1];
    if (match.includes(".app/Contents/Resources/electron.asar") || match.includes(".app/Contents/Resources/default_app.asar")) {
      return false;
    }
    return !pathRegex.test(match);
  }).filter((line) => line.trim() !== "").map((line) => {
    if (options.pretty) {
      return line.replace(extractPathRegex, (m, p1) => m.replace(p1, p1.replace(homeDir, "~")));
    }
    return line;
  }).join("\n");
};
const indentString$1 = indentString$2;
const cleanStack = cleanStack$1;
const cleanInternalStack = (stack) => stack.replace(/\s+at .*aggregate-error\/index.js:\d+:\d+\)?/g, "");
let AggregateError$1 = class AggregateError extends Error {
  constructor(errors2) {
    if (!Array.isArray(errors2)) {
      throw new TypeError(`Expected input to be an Array, got ${typeof errors2}`);
    }
    errors2 = [...errors2].map((error2) => {
      if (error2 instanceof Error) {
        return error2;
      }
      if (error2 !== null && typeof error2 === "object") {
        return Object.assign(new Error(error2.message), error2);
      }
      return new Error(error2);
    });
    let message = errors2.map((error2) => {
      return typeof error2.stack === "string" ? cleanInternalStack(cleanStack(error2.stack)) : String(error2);
    }).join("\n");
    message = "\n" + indentString$1(message, 4);
    super(message);
    this.name = "AggregateError";
    Object.defineProperty(this, "_errors", { value: errors2 });
  }
  *[Symbol.iterator]() {
    for (const error2 of this._errors) {
      yield error2;
    }
  }
};
var aggregateError = AggregateError$1;
const AggregateError2 = aggregateError;
var pMap = async (iterable, mapper, {
  concurrency = Infinity,
  stopOnError = true
} = {}) => {
  return new Promise((resolve, reject) => {
    if (typeof mapper !== "function") {
      throw new TypeError("Mapper function is required");
    }
    if (!((Number.isSafeInteger(concurrency) || concurrency === Infinity) && concurrency >= 1)) {
      throw new TypeError(`Expected \`concurrency\` to be an integer from 1 and up or \`Infinity\`, got \`${concurrency}\` (${typeof concurrency})`);
    }
    const result = [];
    const errors2 = [];
    const iterator = iterable[Symbol.iterator]();
    let isRejected = false;
    let isIterableDone = false;
    let resolvingCount = 0;
    let currentIndex = 0;
    const next = () => {
      if (isRejected) {
        return;
      }
      const nextItem = iterator.next();
      const index2 = currentIndex;
      currentIndex++;
      if (nextItem.done) {
        isIterableDone = true;
        if (resolvingCount === 0) {
          if (!stopOnError && errors2.length !== 0) {
            reject(new AggregateError2(errors2));
          } else {
            resolve(result);
          }
        }
        return;
      }
      resolvingCount++;
      (async () => {
        try {
          const element = await nextItem.value;
          result[index2] = await mapper(element, index2);
          resolvingCount--;
          next();
        } catch (error2) {
          if (stopOnError) {
            isRejected = true;
            reject(error2);
          } else {
            errors2.push(error2);
            resolvingCount--;
            next();
          }
        }
      })();
    };
    for (let i = 0; i < concurrency; i++) {
      next();
      if (isIterableDone) {
        break;
      }
    }
  });
};
const pMap$1 = /* @__PURE__ */ getDefaultExportFromCjs(pMap);
function pipe$1(...fns) {
  const [firstFn, ...fnRest] = fns;
  return async (...args) => {
    let res = await firstFn.apply(firstFn, args);
    for (let i = 0; i < fnRest.length; i += 1) {
      res = await fnRest[i](res);
    }
    return res;
  };
}
const map$1 = fp.curry(pMap$1);
const reduce = (mixedArray) => async (iteratee, initialValue) => {
  let acc = initialValue;
  for (let i = 0; i < mixedArray.length; i += 1) {
    acc = await iteratee(acc, await mixedArray[i], i);
  }
  return acc;
};
const async = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  map: map$1,
  pipe: pipe$1,
  reduce
}, Symbol.toStringTag, { value: "Module" }));
const visitor$8 = ({ key, attribute }, { remove }) => {
  if (attribute?.type === "password") {
    remove(key);
  }
};
const visitor$7 = ({ schema: schema2, key, attribute }, { remove }) => {
  if (!attribute) {
    return;
  }
  const isPrivate = attribute.private === true || isPrivateAttribute(schema2, key);
  if (isPrivate) {
    remove(key);
  }
};
const MANY_RELATIONS = [
  "oneToMany",
  "manyToMany"
];
const getRelationalFields = (contentType) => {
  return Object.keys(contentType.attributes).filter((attributeName) => {
    return contentType.attributes[attributeName].type === "relation";
  });
};
const isOneToAny = (attribute) => isRelationalAttribute(attribute) && [
  "oneToOne",
  "oneToMany"
].includes(attribute.relation);
const isManyToAny = (attribute) => isRelationalAttribute(attribute) && [
  "manyToMany",
  "manyToOne"
].includes(attribute.relation);
const isAnyToOne = (attribute) => isRelationalAttribute(attribute) && [
  "oneToOne",
  "manyToOne"
].includes(attribute.relation);
const isAnyToMany = (attribute) => isRelationalAttribute(attribute) && [
  "oneToMany",
  "manyToMany"
].includes(attribute.relation);
const isPolymorphic = (attribute) => [
  "morphOne",
  "morphMany",
  "morphToOne",
  "morphToMany"
].includes(attribute.relation);
const constants$5 = {
  MANY_RELATIONS
};
const VALID_RELATION_ORDERING_KEYS = {
  strict: fp.isBoolean
};
const relations = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  VALID_RELATION_ORDERING_KEYS,
  constants: constants$5,
  getRelationalFields,
  isAnyToMany,
  isAnyToOne,
  isManyToAny,
  isOneToAny,
  isPolymorphic
}, Symbol.toStringTag, { value: "Module" }));
const ACTIONS_TO_VERIFY$1 = [
  "find"
];
const { CREATED_BY_ATTRIBUTE: CREATED_BY_ATTRIBUTE$1, UPDATED_BY_ATTRIBUTE: UPDATED_BY_ATTRIBUTE$1 } = constants$6;
var removeRestrictedRelations = (auth) => async ({ data, key, attribute, schema: schema2 }, { remove, set: set2 }) => {
  if (!attribute) {
    return;
  }
  const isRelation = attribute.type === "relation";
  if (!isRelation) {
    return;
  }
  const handleMorphRelation = async () => {
    const elements = data[key];
    if (!elements) {
      return;
    }
    if ("connect" in elements || "set" in elements || "disconnect" in elements) {
      const newValue = {};
      const connect = await handleMorphElements(elements.connect || []);
      const relSet = await handleMorphElements(elements.set || []);
      const disconnect = await handleMorphElements(elements.disconnect || []);
      if (connect.length > 0) {
        newValue.connect = connect;
      }
      if (relSet.length > 0) {
        newValue.set = relSet;
      }
      if (disconnect.length > 0) {
        newValue.disconnect = disconnect;
      }
      if ("options" in elements && typeof elements.options === "object" && elements.options !== null) {
        const filteredOptions = {};
        Object.keys(elements.options).forEach((key2) => {
          const validator = VALID_RELATION_ORDERING_KEYS[key2];
          if (validator && validator(elements.options[key2])) {
            filteredOptions[key2] = elements.options[key2];
          }
        });
        newValue.options = filteredOptions;
      } else {
        newValue.options = {};
      }
      set2(key, newValue);
    } else {
      const newMorphValue = await handleMorphElements(elements);
      if (newMorphValue.length) {
        set2(key, newMorphValue);
      }
    }
  };
  const handleMorphElements = async (elements) => {
    const allowedElements = [];
    if (!fp.isArray(elements)) {
      return allowedElements;
    }
    for (const element of elements) {
      if (!fp.isObject(element) || !("__type" in element)) {
        continue;
      }
      const scopes = ACTIONS_TO_VERIFY$1.map((action) => `${element.__type}.${action}`);
      const isAllowed = await hasAccessToSomeScopes$1(scopes, auth);
      if (isAllowed) {
        allowedElements.push(element);
      }
    }
    return allowedElements;
  };
  const handleRegularRelation = async () => {
    const scopes = ACTIONS_TO_VERIFY$1.map((action) => `${attribute.target}.${action}`);
    const isAllowed = await hasAccessToSomeScopes$1(scopes, auth);
    if (!isAllowed) {
      remove(key);
    }
  };
  const isCreatorRelation = [
    CREATED_BY_ATTRIBUTE$1,
    UPDATED_BY_ATTRIBUTE$1
  ].includes(key);
  if (isMorphToRelationalAttribute(attribute)) {
    await handleMorphRelation();
    return;
  }
  if (isCreatorRelation && schema2.options?.populateCreatorFields) {
    return;
  }
  await handleRegularRelation();
};
const hasAccessToSomeScopes$1 = async (scopes, auth) => {
  for (const scope of scopes) {
    try {
      await strapi.auth.verify(auth, {
        scope
      });
      return true;
    } catch {
      continue;
    }
  }
  return false;
};
const visitor$6 = ({ key, attribute }, { remove }) => {
  if (isMorphToRelationalAttribute(attribute)) {
    remove(key);
  }
};
const visitor$5 = ({ key, attribute }, { remove }) => {
  if (isDynamicZoneAttribute(attribute)) {
    remove(key);
  }
};
var removeDisallowedFields = (allowedFields = null) => ({ key, path: { attribute: path2 } }, { remove }) => {
  if (allowedFields === null) {
    return;
  }
  if (!(fp.isArray(allowedFields) && allowedFields.every(fp.isString))) {
    throw new TypeError(`Expected array of strings for allowedFields but got "${typeof allowedFields}"`);
  }
  if (fp.isNil(path2)) {
    return;
  }
  const containedPaths = getContainedPaths$1(path2);
  const isPathAllowed = allowedFields.some((p) => containedPaths.includes(p) || p.startsWith(`${path2}.`));
  if (isPathAllowed) {
    return;
  }
  remove(key);
};
const getContainedPaths$1 = (path2) => {
  const parts = fp.toPath(path2);
  return parts.reduce((acc, value, index2, list) => {
    return [
      ...acc,
      list.slice(0, index2 + 1).join(".")
    ];
  }, []);
};
var removeRestrictedFields = (restrictedFields = null) => ({ key, path: { attribute: path2 } }, { remove }) => {
  if (restrictedFields === null) {
    remove(key);
    return;
  }
  if (!(fp.isArray(restrictedFields) && restrictedFields.every(fp.isString))) {
    throw new TypeError(`Expected array of strings for restrictedFields but got "${typeof restrictedFields}"`);
  }
  if (restrictedFields.includes(path2)) {
    remove(key);
    return;
  }
  const isRestrictedNested = restrictedFields.some((allowedPath) => path2?.toString().startsWith(`${allowedPath}.`));
  if (isRestrictedNested) {
    remove(key);
  }
};
const visitor$4 = ({ schema: schema2, key, value }, { set: set2 }) => {
  if (key === "" && value === "*") {
    const { attributes } = schema2;
    const newPopulateQuery = Object.entries(attributes).filter(([, attribute]) => [
      "relation",
      "component",
      "media",
      "dynamiczone"
    ].includes(attribute.type)).reduce((acc, [key2]) => ({
      ...acc,
      [key2]: true
    }), {});
    set2("", newPopulateQuery);
  }
};
const index$5 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  expandWildcardPopulate: visitor$4,
  removeDisallowedFields,
  removeDynamicZones: visitor$5,
  removeMorphToRelations: visitor$6,
  removePassword: visitor$8,
  removePrivate: visitor$7,
  removeRestrictedFields,
  removeRestrictedRelations
}, Symbol.toStringTag, { value: "Module" }));
const DEFAULT_PATH = {
  raw: null,
  attribute: null
};
var traverseFactory = () => {
  const state = {
    parsers: [],
    interceptors: [],
    ignore: [],
    handlers: {
      attributes: [],
      common: []
    }
  };
  const traverse = async (visitor2, options, data) => {
    const { path: path2 = DEFAULT_PATH, parent, schema: schema2, getModel } = options ?? {};
    for (const { predicate, handler } of state.interceptors) {
      if (predicate(data)) {
        return handler(visitor2, options, data, {
          recurse: traverse
        });
      }
    }
    const parser = state.parsers.find((parser2) => parser2.predicate(data))?.parser;
    const utils2 = parser?.(data);
    if (!utils2) {
      return data;
    }
    let out = utils2.transform(data);
    const keys2 = utils2.keys(out);
    for (const key of keys2) {
      const attribute = schema2?.attributes?.[key];
      const newPath = {
        ...path2
      };
      newPath.raw = fp.isNil(path2.raw) ? key : `${path2.raw}.${key}`;
      if (!fp.isNil(attribute)) {
        newPath.attribute = fp.isNil(path2.attribute) ? key : `${path2.attribute}.${key}`;
      }
      const visitorOptions = {
        key,
        value: utils2.get(key, out),
        attribute,
        schema: schema2,
        path: newPath,
        data: out,
        getModel,
        parent
      };
      const transformUtils = {
        remove(key2) {
          out = utils2.remove(key2, out);
        },
        set(key2, value2) {
          out = utils2.set(key2, value2, out);
        },
        recurse: traverse
      };
      await visitor2(visitorOptions, fp.pick([
        "remove",
        "set"
      ], transformUtils));
      const value = utils2.get(key, out);
      const createContext = () => ({
        key,
        value,
        attribute,
        schema: schema2,
        path: newPath,
        data: out,
        visitor: visitor2,
        getModel,
        parent
      });
      const ignoreCtx = createContext();
      const shouldIgnore = state.ignore.some((predicate) => predicate(ignoreCtx));
      if (shouldIgnore) {
        continue;
      }
      const handlers = [
        ...state.handlers.common,
        ...state.handlers.attributes
      ];
      for await (const handler of handlers) {
        const ctx = createContext();
        const pass = await handler.predicate(ctx);
        if (pass) {
          await handler.handler(ctx, fp.pick([
            "recurse",
            "set"
          ], transformUtils));
        }
      }
    }
    return out;
  };
  return {
    traverse,
    intercept(predicate, handler) {
      state.interceptors.push({
        predicate,
        handler
      });
      return this;
    },
    parse(predicate, parser) {
      state.parsers.push({
        predicate,
        parser
      });
      return this;
    },
    ignore(predicate) {
      state.ignore.push(predicate);
      return this;
    },
    on(predicate, handler) {
      state.handlers.common.push({
        predicate,
        handler
      });
      return this;
    },
    onAttribute(predicate, handler) {
      state.handlers.attributes.push({
        predicate,
        handler
      });
      return this;
    },
    onRelation(handler) {
      return this.onAttribute(({ attribute }) => attribute?.type === "relation", handler);
    },
    onMedia(handler) {
      return this.onAttribute(({ attribute }) => attribute?.type === "media", handler);
    },
    onComponent(handler) {
      return this.onAttribute(({ attribute }) => attribute?.type === "component", handler);
    },
    onDynamicZone(handler) {
      return this.onAttribute(({ attribute }) => attribute?.type === "dynamiczone", handler);
    }
  };
};
const isObj$2 = (value) => fp.isObject(value);
const filters = traverseFactory().intercept(
  // Intercept filters arrays and apply the traversal to each one individually
  fp.isArray,
  async (visitor2, options, filters2, { recurse }) => {
    return Promise.all(filters2.map((filter, i) => {
      const newPath = options.path ? {
        ...options.path,
        raw: `${options.path.raw}[${i}]`
      } : options.path;
      return recurse(visitor2, {
        ...options,
        path: newPath
      }, filter);
    })).then((res) => res.filter((val) => !(fp.isObject(val) && fp.isEmpty(val))));
  }
).intercept(
  // Ignore non object filters and return the value as-is
  (filters2) => !fp.isObject(filters2),
  (_2, __, filters2) => {
    return filters2;
  }
).parse(isObj$2, () => ({
  transform: fp.cloneDeep,
  remove(key, data) {
    return fp.omit(key, data);
  },
  set(key, value, data) {
    return {
      ...data,
      [key]: value
    };
  },
  keys(data) {
    return Object.keys(data);
  },
  get(key, data) {
    return data[key];
  }
})).ignore(({ value }) => fp.isNil(value)).on(({ attribute }) => fp.isNil(attribute), async ({ key, visitor: visitor2, path: path2, value, schema: schema2, getModel, attribute }, { set: set2, recurse }) => {
  const parent = {
    key,
    path: path2,
    schema: schema2,
    attribute
  };
  set2(key, await recurse(visitor2, {
    schema: schema2,
    path: path2,
    getModel,
    parent
  }, value));
}).onRelation(async ({ key, attribute, visitor: visitor2, path: path2, value, schema: schema2, getModel }, { set: set2, recurse }) => {
  const isMorphRelation = attribute.relation.toLowerCase().startsWith("morph");
  if (isMorphRelation) {
    return;
  }
  const parent = {
    key,
    path: path2,
    schema: schema2,
    attribute
  };
  const targetSchemaUID = attribute.target;
  const targetSchema = getModel(targetSchemaUID);
  const newValue = await recurse(visitor2, {
    schema: targetSchema,
    path: path2,
    getModel,
    parent
  }, value);
  set2(key, newValue);
}).onComponent(async ({ key, attribute, visitor: visitor2, path: path2, schema: schema2, value, getModel }, { set: set2, recurse }) => {
  const parent = {
    key,
    path: path2,
    schema: schema2,
    attribute
  };
  const targetSchema = getModel(attribute.component);
  const newValue = await recurse(visitor2, {
    schema: targetSchema,
    path: path2,
    getModel,
    parent
  }, value);
  set2(key, newValue);
}).onMedia(async ({ key, visitor: visitor2, path: path2, schema: schema2, attribute, value, getModel }, { set: set2, recurse }) => {
  const parent = {
    key,
    path: path2,
    schema: schema2,
    attribute
  };
  const targetSchemaUID = "plugin::upload.file";
  const targetSchema = getModel(targetSchemaUID);
  const newValue = await recurse(visitor2, {
    schema: targetSchema,
    path: path2,
    getModel,
    parent
  }, value);
  set2(key, newValue);
});
var traverseQueryFilters = fp.curry(filters.traverse);
const ORDERS = {
  asc: "asc",
  desc: "desc"
};
const ORDER_VALUES = Object.values(ORDERS);
const isSortOrder = (value) => ORDER_VALUES.includes(value.toLowerCase());
const isStringArray$2 = (value) => Array.isArray(value) && value.every(fp.isString);
const isObjectArray = (value) => Array.isArray(value) && value.every(fp.isObject);
const isNestedSorts = (value) => fp.isString(value) && value.split(",").length > 1;
const isObj$1 = (value) => fp.isObject(value);
const sort = traverseFactory().intercept(
  // String with chained sorts (foo,bar,foobar) => split, map(recurse), then recompose
  isNestedSorts,
  async (visitor2, options, sort2, { recurse }) => {
    return Promise.all(sort2.split(",").map(fp.trim).map((nestedSort) => recurse(visitor2, options, nestedSort))).then((res) => res.filter((part) => !fp.isEmpty(part)).join(","));
  }
).intercept(
  // Array of strings ['foo', 'foo,bar'] => map(recurse), then filter out empty items
  isStringArray$2,
  async (visitor2, options, sort2, { recurse }) => {
    return Promise.all(sort2.map((nestedSort) => recurse(visitor2, options, nestedSort))).then((res) => res.filter((nestedSort) => !fp.isEmpty(nestedSort)));
  }
).intercept(
  // Array of objects [{ foo: 'asc' }, { bar: 'desc', baz: 'asc' }] => map(recurse), then filter out empty items
  isObjectArray,
  async (visitor2, options, sort2, { recurse }) => {
    return Promise.all(sort2.map((nestedSort) => recurse(visitor2, options, nestedSort))).then((res) => res.filter((nestedSort) => !fp.isEmpty(nestedSort)));
  }
).parse(fp.isString, () => {
  const tokenize = fp.pipe(fp.split("."), fp.map(fp.split(":")), fp.flatten);
  const recompose = (parts) => {
    if (parts.length === 0) {
      return void 0;
    }
    return parts.reduce((acc, part) => {
      if (fp.isEmpty(part)) {
        return acc;
      }
      if (acc === "") {
        return part;
      }
      return isSortOrder(part) ? `${acc}:${part}` : `${acc}.${part}`;
    }, "");
  };
  return {
    transform: fp.trim,
    remove(key, data) {
      const [root2] = tokenize(data);
      return root2 === key ? void 0 : data;
    },
    set(key, value, data) {
      const [root2] = tokenize(data);
      if (root2 !== key) {
        return data;
      }
      return fp.isNil(value) ? root2 : `${root2}.${value}`;
    },
    keys(data) {
      const v = fp.first(tokenize(data));
      return v ? [
        v
      ] : [];
    },
    get(key, data) {
      const [root2, ...rest] = tokenize(data);
      return key === root2 ? recompose(rest) : void 0;
    }
  };
}).parse(isObj$1, () => ({
  transform: fp.cloneDeep,
  remove(key, data) {
    const { [key]: ignored, ...rest } = data;
    return rest;
  },
  set(key, value, data) {
    return {
      ...data,
      [key]: value
    };
  },
  keys(data) {
    return Object.keys(data);
  },
  get(key, data) {
    return data[key];
  }
})).onRelation(async ({ key, value, attribute, visitor: visitor2, path: path2, getModel, schema: schema2 }, { set: set2, recurse }) => {
  const isMorphRelation = attribute.relation.toLowerCase().startsWith("morph");
  if (isMorphRelation) {
    return;
  }
  const parent = {
    key,
    path: path2,
    schema: schema2,
    attribute
  };
  const targetSchemaUID = attribute.target;
  const targetSchema = getModel(targetSchemaUID);
  const newValue = await recurse(visitor2, {
    schema: targetSchema,
    path: path2,
    getModel,
    parent
  }, value);
  set2(key, newValue);
}).onMedia(async ({ key, path: path2, schema: schema2, attribute, visitor: visitor2, value, getModel }, { recurse, set: set2 }) => {
  const parent = {
    key,
    path: path2,
    schema: schema2,
    attribute
  };
  const targetSchemaUID = "plugin::upload.file";
  const targetSchema = getModel(targetSchemaUID);
  const newValue = await recurse(visitor2, {
    schema: targetSchema,
    path: path2,
    getModel,
    parent
  }, value);
  set2(key, newValue);
}).onComponent(async ({ key, value, visitor: visitor2, path: path2, schema: schema2, attribute, getModel }, { recurse, set: set2 }) => {
  const parent = {
    key,
    path: path2,
    schema: schema2,
    attribute
  };
  const targetSchema = getModel(attribute.component);
  const newValue = await recurse(visitor2, {
    schema: targetSchema,
    path: path2,
    getModel,
    parent
  }, value);
  set2(key, newValue);
});
var traverseQuerySort = fp.curry(sort.traverse);
const isKeyword = (keyword) => {
  return ({ key, attribute }) => {
    return !attribute && keyword === key;
  };
};
const isWildcard = (value) => value === "*";
const isPopulateString = (value) => {
  return fp.isString(value) && !isWildcard(value);
};
const isStringArray$1 = (value) => fp.isArray(value) && value.every(fp.isString);
const isObj = (value) => fp.isObject(value);
const populate = traverseFactory().intercept(isPopulateString, async (visitor2, options, populate2, { recurse }) => {
  const populateObject = pathsToObjectPopulate([
    populate2
  ]);
  const traversedPopulate = await recurse(visitor2, options, populateObject);
  const [result] = objectPopulateToPaths(traversedPopulate);
  return result;
}).intercept(isStringArray$1, async (visitor2, options, populate2, { recurse }) => {
  const paths = await Promise.all(populate2.map((subClause) => recurse(visitor2, options, subClause)));
  return paths.filter((item) => !fp.isNil(item));
}).parse(isWildcard, () => ({
  /**
  * Since value is '*', we don't need to transform it
  */
  transform: fp.identity,
  /**
  * '*' isn't a key/value structure, so regardless
  *  of the given key, it returns the data ('*')
  */
  get: (_key, data) => data,
  /**
  * '*' isn't a key/value structure, so regardless
  * of the given `key`, use `value` as the new `data`
  */
  set: (_key, value) => value,
  /**
  * '*' isn't a key/value structure, but we need to simulate at least one to enable
  * the data traversal. We're using '' since it represents a falsy string value
  */
  keys: fp.constant([
    ""
  ]),
  /**
  * Removing '*' means setting it to undefined, regardless of the given key
  */
  remove: fp.constant(void 0)
})).parse(fp.isString, () => {
  const tokenize = fp.split(".");
  const recompose = fp.join(".");
  return {
    transform: fp.trim,
    remove(key, data) {
      const [root2] = tokenize(data);
      return root2 === key ? void 0 : data;
    },
    set(key, value, data) {
      const [root2] = tokenize(data);
      if (root2 !== key) {
        return data;
      }
      return fp.isNil(value) || fp.isEmpty(value) ? root2 : `${root2}.${value}`;
    },
    keys(data) {
      const v = fp.first(tokenize(data));
      return v ? [
        v
      ] : [];
    },
    get(key, data) {
      const [root2, ...rest] = tokenize(data);
      return key === root2 ? recompose(rest) : void 0;
    }
  };
}).parse(isObj, () => ({
  transform: fp.cloneDeep,
  remove(key, data) {
    const { [key]: ignored, ...rest } = data;
    return rest;
  },
  set(key, value, data) {
    return {
      ...data,
      [key]: value
    };
  },
  keys(data) {
    return Object.keys(data);
  },
  get(key, data) {
    return data[key];
  }
})).ignore(({ key, attribute }) => {
  return [
    "sort",
    "filters",
    "fields"
  ].includes(key) && !attribute;
}).on(
  // Handle recursion on populate."populate"
  isKeyword("populate"),
  async ({ key, visitor: visitor2, path: path2, value, schema: schema2, getModel, attribute }, { set: set2, recurse }) => {
    const parent = {
      key,
      path: path2,
      schema: schema2,
      attribute
    };
    const newValue = await recurse(visitor2, {
      schema: schema2,
      path: path2,
      getModel,
      parent
    }, value);
    set2(key, newValue);
  }
).on(isKeyword("on"), async ({ key, visitor: visitor2, path: path2, value, getModel, parent }, { set: set2, recurse }) => {
  const newOn = {};
  if (!isObj(value)) {
    return;
  }
  for (const [uid, subPopulate] of Object.entries(value)) {
    const model = getModel(uid);
    const newPath = {
      ...path2,
      raw: `${path2.raw}[${uid}]`
    };
    newOn[uid] = await recurse(visitor2, {
      schema: model,
      path: newPath,
      getModel,
      parent
    }, subPopulate);
  }
  set2(key, newOn);
}).onRelation(async ({ key, value, attribute, visitor: visitor2, path: path2, schema: schema2, getModel }, { set: set2, recurse }) => {
  if (fp.isNil(value)) {
    return;
  }
  const parent = {
    key,
    path: path2,
    schema: schema2,
    attribute
  };
  if (isMorphToRelationalAttribute(attribute)) {
    if (!fp.isObject(value) || !("on" in value && fp.isObject(value?.on))) {
      return;
    }
    const newValue2 = await recurse(visitor2, {
      schema: schema2,
      path: path2,
      getModel,
      parent
    }, {
      on: value?.on
    });
    set2(key, newValue2);
    return;
  }
  const targetSchemaUID = attribute.target;
  const targetSchema = getModel(targetSchemaUID);
  const newValue = await recurse(visitor2, {
    schema: targetSchema,
    path: path2,
    getModel,
    parent
  }, value);
  set2(key, newValue);
}).onMedia(async ({ key, path: path2, schema: schema2, attribute, visitor: visitor2, value, getModel }, { recurse, set: set2 }) => {
  if (fp.isNil(value)) {
    return;
  }
  const parent = {
    key,
    path: path2,
    schema: schema2,
    attribute
  };
  const targetSchemaUID = "plugin::upload.file";
  const targetSchema = getModel(targetSchemaUID);
  const newValue = await recurse(visitor2, {
    schema: targetSchema,
    path: path2,
    getModel,
    parent
  }, value);
  set2(key, newValue);
}).onComponent(async ({ key, value, schema: schema2, visitor: visitor2, path: path2, attribute, getModel }, { recurse, set: set2 }) => {
  if (fp.isNil(value)) {
    return;
  }
  const parent = {
    key,
    path: path2,
    schema: schema2,
    attribute
  };
  const targetSchema = getModel(attribute.component);
  const newValue = await recurse(visitor2, {
    schema: targetSchema,
    path: path2,
    getModel,
    parent
  }, value);
  set2(key, newValue);
}).onDynamicZone(async ({ key, value, schema: schema2, visitor: visitor2, path: path2, attribute, getModel }, { set: set2, recurse }) => {
  if (fp.isNil(value) || !fp.isObject(value)) {
    return;
  }
  const parent = {
    key,
    path: path2,
    schema: schema2,
    attribute
  };
  if ("on" in value && value.on) {
    const newOn = await recurse(visitor2, {
      schema: schema2,
      path: path2,
      getModel,
      parent
    }, {
      on: value.on
    });
    set2(key, newOn);
  }
});
var traverseQueryPopulate = fp.curry(populate.traverse);
const objectPopulateToPaths = (input) => {
  const paths = [];
  function traverse(currentObj, parentPath) {
    for (const [key, value] of Object.entries(currentObj)) {
      const currentPath = parentPath ? `${parentPath}.${key}` : key;
      if (value === true) {
        paths.push(currentPath);
      } else {
        traverse(value.populate, currentPath);
      }
    }
  }
  traverse(input, "");
  return paths;
};
const pathsToObjectPopulate = (input) => {
  const result = {};
  function traverse(object2, keys2) {
    const [first, ...rest] = keys2;
    if (rest.length === 0) {
      object2[first] = true;
    } else {
      if (!object2[first] || typeof object2[first] === "boolean") {
        object2[first] = {
          populate: {}
        };
      }
      traverse(object2[first].populate, rest);
    }
  }
  input.forEach((clause) => traverse(result, clause.split(".")));
  return result;
};
const isStringArray = (value) => {
  return fp.isArray(value) && value.every(fp.isString);
};
const fields = traverseFactory().intercept(isStringArray, async (visitor2, options, fields2, { recurse }) => {
  return Promise.all(fields2.map((field) => recurse(visitor2, options, field)));
}).intercept((value) => fp.isString(value) && value.includes(","), (visitor2, options, fields2, { recurse }) => {
  return Promise.all(fields2.split(",").map((field) => recurse(visitor2, options, field)));
}).intercept((value) => fp.eq("*", value), fp.constant("*")).parse(fp.isString, () => ({
  transform: fp.trim,
  remove(key, data) {
    return data === key ? void 0 : data;
  },
  set(_key, _value, data) {
    return data;
  },
  keys(data) {
    return [
      data
    ];
  },
  get(key, data) {
    return key === data ? data : void 0;
  }
}));
var traverseQueryFields = fp.curry(fields.traverse);
const { ID_ATTRIBUTE: ID_ATTRIBUTE$2, DOC_ID_ATTRIBUTE: DOC_ID_ATTRIBUTE$2 } = constants$6;
const sanitizePasswords = (ctx) => async (entity) => {
  if (!ctx.schema) {
    throw new Error("Missing schema in sanitizePasswords");
  }
  return traverseEntity$1(visitor$8, ctx, entity);
};
const defaultSanitizeOutput = async (ctx, entity) => {
  if (!ctx.schema) {
    throw new Error("Missing schema in defaultSanitizeOutput");
  }
  return traverseEntity$1((...args) => {
    visitor$8(...args);
    visitor$7(...args);
  }, ctx, entity);
};
const defaultSanitizeFilters = fp.curry((ctx, filters2) => {
  if (!ctx.schema) {
    throw new Error("Missing schema in defaultSanitizeFilters");
  }
  return pipe$1(
    // Remove keys that are not attributes or valid operators
    traverseQueryFilters(({ key, attribute }, { remove }) => {
      const isAttribute = !!attribute;
      if ([
        ID_ATTRIBUTE$2,
        DOC_ID_ATTRIBUTE$2
      ].includes(key)) {
        return;
      }
      if (!isAttribute && !isOperator(key)) {
        remove(key);
      }
    }, ctx),
    // Remove dynamic zones from filters
    traverseQueryFilters(visitor$5, ctx),
    // Remove morpTo relations from filters
    traverseQueryFilters(visitor$6, ctx),
    // Remove passwords from filters
    traverseQueryFilters(visitor$8, ctx),
    // Remove private from filters
    traverseQueryFilters(visitor$7, ctx),
    // Remove empty objects
    traverseQueryFilters(({ key, value }, { remove }) => {
      if (fp.isObject(value) && fp.isEmpty(value)) {
        remove(key);
      }
    }, ctx)
  )(filters2);
});
const defaultSanitizeSort = fp.curry((ctx, sort2) => {
  if (!ctx.schema) {
    throw new Error("Missing schema in defaultSanitizeSort");
  }
  return pipe$1(
    // Remove non attribute keys
    traverseQuerySort(({ key, attribute }, { remove }) => {
      if ([
        ID_ATTRIBUTE$2,
        DOC_ID_ATTRIBUTE$2
      ].includes(key)) {
        return;
      }
      if (!attribute) {
        remove(key);
      }
    }, ctx),
    // Remove dynamic zones from sort
    traverseQuerySort(visitor$5, ctx),
    // Remove morpTo relations from sort
    traverseQuerySort(visitor$6, ctx),
    // Remove private from sort
    traverseQuerySort(visitor$7, ctx),
    // Remove passwords from filters
    traverseQuerySort(visitor$8, ctx),
    // Remove keys for empty non-scalar values
    traverseQuerySort(({ key, attribute, value }, { remove }) => {
      if ([
        ID_ATTRIBUTE$2,
        DOC_ID_ATTRIBUTE$2
      ].includes(key)) {
        return;
      }
      if (!isScalarAttribute(attribute) && fp.isEmpty(value)) {
        remove(key);
      }
    }, ctx)
  )(sort2);
});
const defaultSanitizeFields = fp.curry((ctx, fields2) => {
  if (!ctx.schema) {
    throw new Error("Missing schema in defaultSanitizeFields");
  }
  return pipe$1(
    // Only keep scalar attributes
    traverseQueryFields(({ key, attribute }, { remove }) => {
      if ([
        ID_ATTRIBUTE$2,
        DOC_ID_ATTRIBUTE$2
      ].includes(key)) {
        return;
      }
      if (fp.isNil(attribute) || !isScalarAttribute(attribute)) {
        remove(key);
      }
    }, ctx),
    // Remove private fields
    traverseQueryFields(visitor$7, ctx),
    // Remove password fields
    traverseQueryFields(visitor$8, ctx),
    // Remove nil values from fields array
    (value) => fp.isArray(value) ? value.filter((field) => !fp.isNil(field)) : value
  )(fields2);
});
const defaultSanitizePopulate = fp.curry((ctx, populate2) => {
  if (!ctx.schema) {
    throw new Error("Missing schema in defaultSanitizePopulate");
  }
  return pipe$1(
    traverseQueryPopulate(visitor$4, ctx),
    traverseQueryPopulate(async ({ key, value, schema: schema2, attribute, getModel, path: path2 }, { set: set2 }) => {
      if (attribute) {
        return;
      }
      const parent = {
        key,
        path: path2,
        schema: schema2,
        attribute
      };
      if (key === "sort") {
        set2(key, await defaultSanitizeSort({
          schema: schema2,
          getModel,
          parent
        }, value));
      }
      if (key === "filters") {
        set2(key, await defaultSanitizeFilters({
          schema: schema2,
          getModel,
          parent
        }, value));
      }
      if (key === "fields") {
        set2(key, await defaultSanitizeFields({
          schema: schema2,
          getModel,
          parent
        }, value));
      }
      if (key === "populate") {
        set2(key, await defaultSanitizePopulate({
          schema: schema2,
          getModel,
          parent
        }, value));
      }
    }, ctx),
    // Remove private fields
    traverseQueryPopulate(visitor$7, ctx)
  )(populate2);
});
const sanitizers = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  defaultSanitizeFields,
  defaultSanitizeFilters,
  defaultSanitizeOutput,
  defaultSanitizePopulate,
  defaultSanitizeSort,
  sanitizePasswords
}, Symbol.toStringTag, { value: "Module" }));
const createAPISanitizers = (opts) => {
  const { getModel } = opts;
  const sanitizeInput = (data, schema2, { auth } = {}) => {
    if (!schema2) {
      throw new Error("Missing schema in sanitizeInput");
    }
    if (fp.isArray(data)) {
      return Promise.all(data.map((entry) => sanitizeInput(entry, schema2, {
        auth
      })));
    }
    const nonWritableAttributes = getNonWritableAttributes(schema2);
    const transforms = [
      // Remove first level ID in inputs
      fp.omit(constants$6.ID_ATTRIBUTE),
      fp.omit(constants$6.DOC_ID_ATTRIBUTE),
      // Remove non-writable attributes
      traverseEntity$1(removeRestrictedFields(nonWritableAttributes), {
        schema: schema2,
        getModel
      })
    ];
    if (auth) {
      transforms.push(traverseEntity$1(removeRestrictedRelations(auth), {
        schema: schema2,
        getModel
      }));
    }
    opts?.sanitizers?.input?.forEach((sanitizer) => transforms.push(sanitizer(schema2)));
    return pipe$1(...transforms)(data);
  };
  const sanitizeOutput = async (data, schema2, { auth } = {}) => {
    if (!schema2) {
      throw new Error("Missing schema in sanitizeOutput");
    }
    if (fp.isArray(data)) {
      const res = new Array(data.length);
      for (let i = 0; i < data.length; i += 1) {
        res[i] = await sanitizeOutput(data[i], schema2, {
          auth
        });
      }
      return res;
    }
    const transforms = [
      (data2) => defaultSanitizeOutput({
        schema: schema2,
        getModel
      }, data2)
    ];
    if (auth) {
      transforms.push(traverseEntity$1(removeRestrictedRelations(auth), {
        schema: schema2,
        getModel
      }));
    }
    opts?.sanitizers?.output?.forEach((sanitizer) => transforms.push(sanitizer(schema2)));
    return pipe$1(...transforms)(data);
  };
  const sanitizeQuery = async (query, schema2, { auth } = {}) => {
    if (!schema2) {
      throw new Error("Missing schema in sanitizeQuery");
    }
    const { filters: filters2, sort: sort2, fields: fields2, populate: populate2 } = query;
    const sanitizedQuery = fp.cloneDeep(query);
    if (filters2) {
      Object.assign(sanitizedQuery, {
        filters: await sanitizeFilters(filters2, schema2, {
          auth
        })
      });
    }
    if (sort2) {
      Object.assign(sanitizedQuery, {
        sort: await sanitizeSort(sort2, schema2, {
          auth
        })
      });
    }
    if (fields2) {
      Object.assign(sanitizedQuery, {
        fields: await sanitizeFields(fields2, schema2)
      });
    }
    if (populate2) {
      Object.assign(sanitizedQuery, {
        populate: await sanitizePopulate(populate2, schema2)
      });
    }
    return sanitizedQuery;
  };
  const sanitizeFilters = (filters2, schema2, { auth } = {}) => {
    if (!schema2) {
      throw new Error("Missing schema in sanitizeFilters");
    }
    if (fp.isArray(filters2)) {
      return Promise.all(filters2.map((filter) => sanitizeFilters(filter, schema2, {
        auth
      })));
    }
    const transforms = [
      defaultSanitizeFilters({
        schema: schema2,
        getModel
      })
    ];
    if (auth) {
      transforms.push(traverseQueryFilters(removeRestrictedRelations(auth), {
        schema: schema2,
        getModel
      }));
    }
    return pipe$1(...transforms)(filters2);
  };
  const sanitizeSort = (sort2, schema2, { auth } = {}) => {
    if (!schema2) {
      throw new Error("Missing schema in sanitizeSort");
    }
    const transforms = [
      defaultSanitizeSort({
        schema: schema2,
        getModel
      })
    ];
    if (auth) {
      transforms.push(traverseQuerySort(removeRestrictedRelations(auth), {
        schema: schema2,
        getModel
      }));
    }
    return pipe$1(...transforms)(sort2);
  };
  const sanitizeFields = (fields2, schema2) => {
    if (!schema2) {
      throw new Error("Missing schema in sanitizeFields");
    }
    const transforms = [
      defaultSanitizeFields({
        schema: schema2,
        getModel
      })
    ];
    return pipe$1(...transforms)(fields2);
  };
  const sanitizePopulate = (populate2, schema2, { auth } = {}) => {
    if (!schema2) {
      throw new Error("Missing schema in sanitizePopulate");
    }
    const transforms = [
      defaultSanitizePopulate({
        schema: schema2,
        getModel
      })
    ];
    if (auth) {
      transforms.push(traverseQueryPopulate(removeRestrictedRelations(auth), {
        schema: schema2,
        getModel
      }));
    }
    return pipe$1(...transforms)(populate2);
  };
  return {
    input: sanitizeInput,
    output: sanitizeOutput,
    query: sanitizeQuery,
    filters: sanitizeFilters,
    sort: sanitizeSort,
    fields: sanitizeFields,
    populate: sanitizePopulate
  };
};
const index$4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  createAPISanitizers,
  sanitizers,
  visitors: index$5
}, Symbol.toStringTag, { value: "Module" }));
const throwInvalidKey = ({ key, path: path2 }) => {
  const msg = path2 && path2 !== key ? `Invalid key ${key} at ${path2}` : `Invalid key ${key}`;
  throw new ValidationError2(msg, {
    key,
    path: path2
  });
};
const asyncCurry = (fn) => {
  const curried = (...args) => {
    if (args.length >= fn.length) {
      return fn(...args);
    }
    return (...moreArgs) => curried(...args, ...moreArgs);
  };
  return curried;
};
const visitor$3 = ({ key, attribute, path: path2 }) => {
  if (attribute?.type === "password") {
    throwInvalidKey({
      key,
      path: path2.attribute
    });
  }
};
const visitor$2 = ({ schema: schema2, key, attribute, path: path2 }) => {
  if (!attribute) {
    return;
  }
  const isPrivate = attribute.private === true || isPrivateAttribute(schema2, key);
  if (isPrivate) {
    throwInvalidKey({
      key,
      path: path2.attribute
    });
  }
};
const ACTIONS_TO_VERIFY = [
  "find"
];
const { CREATED_BY_ATTRIBUTE, UPDATED_BY_ATTRIBUTE } = constants$6;
var throwRestrictedRelations = (auth) => async ({ data, key, attribute, schema: schema2, path: path2 }) => {
  if (!attribute) {
    return;
  }
  const isRelation = attribute.type === "relation";
  if (!isRelation) {
    return;
  }
  const handleMorphRelation = async () => {
    const elements = data[key];
    if ("connect" in elements || "set" in elements || "disconnect" in elements || "options" in elements) {
      await handleMorphElements(elements.connect || []);
      await handleMorphElements(elements.set || []);
      await handleMorphElements(elements.disconnect || []);
      if ("options" in elements) {
        if (elements.options === null || elements.options === void 0) {
          return;
        }
        if (typeof elements.options !== "object") {
          throwInvalidKey({
            key,
            path: path2.attribute
          });
        }
        const optionKeys = Object.keys(elements.options);
        for (const key2 of optionKeys) {
          if (!(key2 in VALID_RELATION_ORDERING_KEYS)) {
            throwInvalidKey({
              key: key2,
              path: path2.attribute
            });
          }
          if (!VALID_RELATION_ORDERING_KEYS[key2](elements.options[key2])) {
            throwInvalidKey({
              key: key2,
              path: path2.attribute
            });
          }
        }
      }
    } else {
      await handleMorphElements(elements);
    }
  };
  const handleMorphElements = async (elements) => {
    if (!fp.isArray(elements)) {
      throwInvalidKey({
        key,
        path: path2.attribute
      });
    }
    for (const element of elements) {
      if (!fp.isObject(element) || !("__type" in element)) {
        throwInvalidKey({
          key,
          path: path2.attribute
        });
      }
      const scopes = ACTIONS_TO_VERIFY.map((action) => `${element.__type}.${action}`);
      const isAllowed = await hasAccessToSomeScopes(scopes, auth);
      if (!isAllowed) {
        throwInvalidKey({
          key,
          path: path2.attribute
        });
      }
    }
  };
  const handleRegularRelation = async () => {
    const scopes = ACTIONS_TO_VERIFY.map((action) => `${attribute.target}.${action}`);
    const isAllowed = await hasAccessToSomeScopes(scopes, auth);
    if (!isAllowed) {
      throwInvalidKey({
        key,
        path: path2.attribute
      });
    }
  };
  const isCreatorRelation = [
    CREATED_BY_ATTRIBUTE,
    UPDATED_BY_ATTRIBUTE
  ].includes(key);
  if (isMorphToRelationalAttribute(attribute)) {
    await handleMorphRelation();
    return;
  }
  if (isCreatorRelation && schema2.options?.populateCreatorFields) {
    return;
  }
  await handleRegularRelation();
};
const hasAccessToSomeScopes = async (scopes, auth) => {
  for (const scope of scopes) {
    try {
      await strapi.auth.verify(auth, {
        scope
      });
      return true;
    } catch {
      continue;
    }
  }
  return false;
};
const visitor$1 = ({ key, attribute, path: path2 }) => {
  if (isMorphToRelationalAttribute(attribute)) {
    throwInvalidKey({
      key,
      path: path2.attribute
    });
  }
};
const visitor = ({ key, attribute, path: path2 }) => {
  if (isDynamicZoneAttribute(attribute)) {
    throwInvalidKey({
      key,
      path: path2.attribute
    });
  }
};
var throwDisallowedFields = (allowedFields = null) => ({ key, path: { attribute: path2 } }) => {
  if (allowedFields === null) {
    return;
  }
  if (!(fp.isArray(allowedFields) && allowedFields.every(fp.isString))) {
    throw new TypeError(`Expected array of strings for allowedFields but got "${typeof allowedFields}"`);
  }
  if (fp.isNil(path2)) {
    return;
  }
  const containedPaths = getContainedPaths(path2);
  const isPathAllowed = allowedFields.some((p) => containedPaths.includes(p) || p.startsWith(`${path2}.`));
  if (isPathAllowed) {
    return;
  }
  throwInvalidKey({
    key,
    path: path2
  });
};
const getContainedPaths = (path2) => {
  const parts = fp.toPath(path2);
  return parts.reduce((acc, value, index2, list) => {
    return [
      ...acc,
      list.slice(0, index2 + 1).join(".")
    ];
  }, []);
};
var throwRestrictedFields = (restrictedFields = null) => ({ key, path: { attribute: path2 } }) => {
  if (restrictedFields === null) {
    throwInvalidKey({
      key,
      path: path2
    });
  }
  if (!(fp.isArray(restrictedFields) && restrictedFields.every(fp.isString))) {
    throw new TypeError(`Expected array of strings for restrictedFields but got "${typeof restrictedFields}"`);
  }
  if (restrictedFields.includes(path2)) {
    throwInvalidKey({
      key,
      path: path2
    });
  }
  const isRestrictedNested = restrictedFields.some((allowedPath) => path2?.toString().startsWith(`${allowedPath}.`));
  if (isRestrictedNested) {
    throwInvalidKey({
      key,
      path: path2
    });
  }
};
const ID_FIELDS = [
  constants$6.DOC_ID_ATTRIBUTE,
  constants$6.DOC_ID_ATTRIBUTE
];
const ALLOWED_ROOT_LEVEL_FIELDS = [
  ...ID_FIELDS
];
const MORPH_TO_ALLOWED_FIELDS = [
  "__type"
];
const DYNAMIC_ZONE_ALLOWED_FIELDS = [
  "__component"
];
const RELATION_REORDERING_FIELDS = [
  "connect",
  "disconnect",
  "set",
  "options"
];
const throwUnrecognizedFields = ({ key, attribute, path: path2, schema: schema2, parent }) => {
  if (attribute) {
    return;
  }
  if (path2.attribute === null) {
    if (ALLOWED_ROOT_LEVEL_FIELDS.includes(key)) {
      return;
    }
    return throwInvalidKey({
      key,
      path: attribute
    });
  }
  if (isMorphToRelationalAttribute(parent?.attribute) && MORPH_TO_ALLOWED_FIELDS.includes(key)) {
    return;
  }
  if (isComponentSchema(schema2) && isDynamicZoneAttribute(parent?.attribute) && DYNAMIC_ZONE_ALLOWED_FIELDS.includes(key)) {
    return;
  }
  if (hasRelationReordering(parent?.attribute) && RELATION_REORDERING_FIELDS.includes(key)) {
    return;
  }
  const canUseID = isRelationalAttribute(parent?.attribute) || isMediaAttribute(parent?.attribute);
  if (canUseID && !ID_FIELDS.includes(key)) {
    return;
  }
  throwInvalidKey({
    key,
    path: attribute
  });
};
const index$3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  throwDisallowedFields,
  throwDynamicZones: visitor,
  throwMorphToRelations: visitor$1,
  throwPassword: visitor$3,
  throwPrivate: visitor$2,
  throwRestrictedFields,
  throwRestrictedRelations,
  throwUnrecognizedFields
}, Symbol.toStringTag, { value: "Module" }));
const { ID_ATTRIBUTE: ID_ATTRIBUTE$1, DOC_ID_ATTRIBUTE: DOC_ID_ATTRIBUTE$1 } = constants$6;
const FILTER_TRAVERSALS = [
  "nonAttributesOperators",
  "dynamicZones",
  "morphRelations",
  "passwords",
  "private"
];
const validateFilters = asyncCurry(async (ctx, filters2, include) => {
  if (!ctx.schema) {
    throw new Error("Missing schema in defaultValidateFilters");
  }
  const functionsToApply = [];
  if (include.includes("nonAttributesOperators")) {
    functionsToApply.push(traverseQueryFilters(({ key, attribute, path: path2 }) => {
      if ([
        ID_ATTRIBUTE$1,
        DOC_ID_ATTRIBUTE$1
      ].includes(key)) {
        return;
      }
      const isAttribute = !!attribute;
      if (!isAttribute && !isOperator(key)) {
        throwInvalidKey({
          key,
          path: path2.attribute
        });
      }
    }, ctx));
  }
  if (include.includes("dynamicZones")) {
    functionsToApply.push(traverseQueryFilters(visitor, ctx));
  }
  if (include.includes("morphRelations")) {
    functionsToApply.push(traverseQueryFilters(visitor$1, ctx));
  }
  if (include.includes("passwords")) {
    functionsToApply.push(traverseQueryFilters(visitor$3, ctx));
  }
  if (include.includes("private")) {
    functionsToApply.push(traverseQueryFilters(visitor$2, ctx));
  }
  if (functionsToApply.length === 0) {
    return filters2;
  }
  return pipe$1(...functionsToApply)(filters2);
});
const defaultValidateFilters = asyncCurry(async (ctx, filters2) => {
  return validateFilters(ctx, filters2, FILTER_TRAVERSALS);
});
const SORT_TRAVERSALS = [
  "nonAttributesOperators",
  "dynamicZones",
  "morphRelations",
  "passwords",
  "private",
  "nonScalarEmptyKeys"
];
const validateSort = asyncCurry(async (ctx, sort2, include) => {
  if (!ctx.schema) {
    throw new Error("Missing schema in defaultValidateSort");
  }
  const functionsToApply = [];
  if (include.includes("nonAttributesOperators")) {
    functionsToApply.push(traverseQuerySort(({ key, attribute, path: path2 }) => {
      if ([
        ID_ATTRIBUTE$1,
        DOC_ID_ATTRIBUTE$1
      ].includes(key)) {
        return;
      }
      if (!attribute) {
        throwInvalidKey({
          key,
          path: path2.attribute
        });
      }
    }, ctx));
  }
  if (include.includes("dynamicZones")) {
    functionsToApply.push(traverseQuerySort(visitor, ctx));
  }
  if (include.includes("morphRelations")) {
    functionsToApply.push(traverseQuerySort(visitor$1, ctx));
  }
  if (include.includes("passwords")) {
    functionsToApply.push(traverseQuerySort(visitor$3, ctx));
  }
  if (include.includes("private")) {
    functionsToApply.push(traverseQuerySort(visitor$2, ctx));
  }
  if (include.includes("nonScalarEmptyKeys")) {
    functionsToApply.push(traverseQuerySort(({ key, attribute, value, path: path2 }) => {
      if ([
        ID_ATTRIBUTE$1,
        DOC_ID_ATTRIBUTE$1
      ].includes(key)) {
        return;
      }
      if (!isScalarAttribute(attribute) && fp.isEmpty(value)) {
        throwInvalidKey({
          key,
          path: path2.attribute
        });
      }
    }, ctx));
  }
  if (functionsToApply.length === 0) {
    return sort2;
  }
  return pipe$1(...functionsToApply)(sort2);
});
const defaultValidateSort = asyncCurry(async (ctx, sort2) => {
  return validateSort(ctx, sort2, SORT_TRAVERSALS);
});
const FIELDS_TRAVERSALS = [
  "scalarAttributes",
  "privateFields",
  "passwordFields"
];
const validateFields = asyncCurry(async (ctx, fields2, include) => {
  if (!ctx.schema) {
    throw new Error("Missing schema in defaultValidateFields");
  }
  const functionsToApply = [];
  if (include.includes("scalarAttributes")) {
    functionsToApply.push(traverseQueryFields(({ key, attribute, path: path2 }) => {
      if ([
        ID_ATTRIBUTE$1,
        DOC_ID_ATTRIBUTE$1
      ].includes(key)) {
        return;
      }
      if (fp.isNil(attribute) || !isScalarAttribute(attribute)) {
        throwInvalidKey({
          key,
          path: path2.attribute
        });
      }
    }, ctx));
  }
  if (include.includes("privateFields")) {
    functionsToApply.push(traverseQueryFields(visitor$2, ctx));
  }
  if (include.includes("passwordFields")) {
    functionsToApply.push(traverseQueryFields(visitor$3, ctx));
  }
  if (functionsToApply.length === 0) {
    return fields2;
  }
  return pipe$1(...functionsToApply)(fields2);
});
const defaultValidateFields = asyncCurry(async (ctx, fields2) => {
  return validateFields(ctx, fields2, FIELDS_TRAVERSALS);
});
const POPULATE_TRAVERSALS = [
  "nonAttributesOperators",
  "private"
];
const validatePopulate = asyncCurry(async (ctx, populate2, includes) => {
  if (!ctx.schema) {
    throw new Error("Missing schema in defaultValidatePopulate");
  }
  const functionsToApply = [];
  functionsToApply.push(traverseQueryPopulate(async ({ key, path: path2, value, schema: schema2, attribute, getModel, parent }, { set: set2 }) => {
    if (!parent?.attribute && attribute) {
      const isPopulatableAttribute = [
        "relation",
        "dynamiczone",
        "component",
        "media"
      ].includes(attribute.type);
      if (!isPopulatableAttribute) {
        throwInvalidKey({
          key,
          path: path2.raw
        });
      }
      return;
    }
    if (key === "on") {
      if (!fp.isObject(value)) {
        return throwInvalidKey({
          key,
          path: path2.raw
        });
      }
      const targets = Object.keys(value);
      for (const target of targets) {
        const model = getModel(target);
        if (!model) {
          throwInvalidKey({
            key: target,
            path: `${path2.raw}.${target}`
          });
        }
      }
      return;
    }
    if (key === "" && value === "*") {
      return;
    }
    if (key === "count") {
      try {
        parseType({
          type: "boolean",
          value
        });
        return;
      } catch {
        throwInvalidKey({
          key,
          path: path2.attribute
        });
      }
    }
    try {
      parseType({
        type: "boolean",
        value: key
      });
      return;
    } catch {
    }
    if (key === "sort") {
      set2(key, await validateSort({
        schema: schema2,
        getModel
      }, value, includes?.sort || SORT_TRAVERSALS));
      return;
    }
    if (key === "filters") {
      set2(key, await validateFilters({
        schema: schema2,
        getModel
      }, value, includes?.filters || FILTER_TRAVERSALS));
      return;
    }
    if (key === "fields") {
      set2(key, await validateFields({
        schema: schema2,
        getModel
      }, value, includes?.fields || FIELDS_TRAVERSALS));
      return;
    }
    if (key === "populate") {
      set2(key, await validatePopulate(
        {
          schema: schema2,
          getModel,
          parent: {
            key,
            path: path2,
            schema: schema2,
            attribute
          },
          path: path2
        },
        value,
        includes
        // pass down the same includes object
      ));
      return;
    }
    if (includes?.populate?.includes("nonAttributesOperators")) {
      throwInvalidKey({
        key,
        path: path2.attribute
      });
    }
  }, ctx));
  if (includes?.populate?.includes("private")) {
    functionsToApply.push(traverseQueryPopulate(visitor$2, ctx));
  }
  if (functionsToApply.length === 0) {
    return populate2;
  }
  return pipe$1(...functionsToApply)(populate2);
});
const defaultValidatePopulate = asyncCurry(async (ctx, populate2) => {
  if (!ctx.schema) {
    throw new Error("Missing schema in defaultValidatePopulate");
  }
  return validatePopulate(ctx, populate2, {
    filters: FILTER_TRAVERSALS,
    sort: SORT_TRAVERSALS,
    fields: FIELDS_TRAVERSALS,
    populate: POPULATE_TRAVERSALS
  });
});
const validators = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  FIELDS_TRAVERSALS,
  FILTER_TRAVERSALS,
  POPULATE_TRAVERSALS,
  SORT_TRAVERSALS,
  defaultValidateFields,
  defaultValidateFilters,
  defaultValidatePopulate,
  defaultValidateSort,
  validateFields,
  validateFilters,
  validatePopulate,
  validateSort
}, Symbol.toStringTag, { value: "Module" }));
const { ID_ATTRIBUTE, DOC_ID_ATTRIBUTE } = constants$6;
const createAPIValidators = (opts) => {
  const { getModel } = opts || {};
  const validateInput = async (data, schema2, { auth } = {}) => {
    if (!schema2) {
      throw new Error("Missing schema in validateInput");
    }
    if (fp.isArray(data)) {
      await Promise.all(data.map((entry) => validateInput(entry, schema2, {
        auth
      })));
      return;
    }
    const nonWritableAttributes = getNonWritableAttributes(schema2);
    const transforms = [
      (data2) => {
        if (fp.isObject(data2)) {
          if (ID_ATTRIBUTE in data2) {
            throwInvalidKey({
              key: ID_ATTRIBUTE
            });
          }
          if (DOC_ID_ATTRIBUTE in data2) {
            throwInvalidKey({
              key: DOC_ID_ATTRIBUTE
            });
          }
        }
        return data2;
      },
      // non-writable attributes
      traverseEntity$1(throwRestrictedFields(nonWritableAttributes), {
        schema: schema2,
        getModel
      }),
      // unrecognized attributes
      traverseEntity$1(throwUnrecognizedFields, {
        schema: schema2,
        getModel
      })
    ];
    if (auth) {
      transforms.push(traverseEntity$1(throwRestrictedRelations(auth), {
        schema: schema2,
        getModel
      }));
    }
    opts?.validators?.input?.forEach((validator) => transforms.push(validator(schema2)));
    try {
      await pipe$1(...transforms)(data);
    } catch (e) {
      if (e instanceof ValidationError2) {
        e.details.source = "body";
      }
      throw e;
    }
  };
  const validateQuery = async (query, schema2, { auth } = {}) => {
    if (!schema2) {
      throw new Error("Missing schema in validateQuery");
    }
    const { filters: filters2, sort: sort2, fields: fields2, populate: populate2 } = query;
    if (filters2) {
      await validateFilters2(filters2, schema2, {
        auth
      });
    }
    if (sort2) {
      await validateSort2(sort2, schema2, {
        auth
      });
    }
    if (fields2) {
      await validateFields2(fields2, schema2);
    }
    if (populate2 && populate2 !== "*") {
      await validatePopulate2(populate2, schema2);
    }
  };
  const validateFilters2 = async (filters2, schema2, { auth } = {}) => {
    if (!schema2) {
      throw new Error("Missing schema in validateFilters");
    }
    if (fp.isArray(filters2)) {
      await Promise.all(filters2.map((filter) => validateFilters2(filter, schema2, {
        auth
      })));
      return;
    }
    const transforms = [
      defaultValidateFilters({
        schema: schema2,
        getModel
      })
    ];
    if (auth) {
      transforms.push(traverseQueryFilters(throwRestrictedRelations(auth), {
        schema: schema2,
        getModel
      }));
    }
    try {
      await pipe$1(...transforms)(filters2);
    } catch (e) {
      if (e instanceof ValidationError2) {
        e.details.source = "query";
        e.details.param = "filters";
      }
      throw e;
    }
  };
  const validateSort2 = async (sort2, schema2, { auth } = {}) => {
    if (!schema2) {
      throw new Error("Missing schema in validateSort");
    }
    const transforms = [
      defaultValidateSort({
        schema: schema2,
        getModel
      })
    ];
    if (auth) {
      transforms.push(traverseQuerySort(throwRestrictedRelations(auth), {
        schema: schema2,
        getModel
      }));
    }
    try {
      await pipe$1(...transforms)(sort2);
    } catch (e) {
      if (e instanceof ValidationError2) {
        e.details.source = "query";
        e.details.param = "sort";
      }
      throw e;
    }
  };
  const validateFields2 = async (fields2, schema2) => {
    if (!schema2) {
      throw new Error("Missing schema in validateFields");
    }
    const transforms = [
      defaultValidateFields({
        schema: schema2,
        getModel
      })
    ];
    try {
      await pipe$1(...transforms)(fields2);
    } catch (e) {
      if (e instanceof ValidationError2) {
        e.details.source = "query";
        e.details.param = "fields";
      }
      throw e;
    }
  };
  const validatePopulate2 = async (populate2, schema2, { auth } = {}) => {
    if (!schema2) {
      throw new Error("Missing schema in sanitizePopulate");
    }
    const transforms = [
      defaultValidatePopulate({
        schema: schema2,
        getModel
      })
    ];
    if (auth) {
      transforms.push(traverseQueryPopulate(throwRestrictedRelations(auth), {
        schema: schema2,
        getModel
      }));
    }
    try {
      await pipe$1(...transforms)(populate2);
    } catch (e) {
      if (e instanceof ValidationError2) {
        e.details.source = "query";
        e.details.param = "populate";
      }
      throw e;
    }
  };
  return {
    input: validateInput,
    query: validateQuery,
    filters: validateFilters2,
    sort: validateSort2,
    fields: validateFields2,
    populate: validatePopulate2
  };
};
const index$2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  createAPIValidators,
  validators,
  visitors: index$3
}, Symbol.toStringTag, { value: "Module" }));
const STRAPI_DEFAULTS = {
  offset: {
    start: 0,
    limit: 10
  },
  page: {
    page: 1,
    pageSize: 10
  }
};
const paginationAttributes = [
  "start",
  "limit",
  "page",
  "pageSize"
];
const withMaxLimit = (limit, maxLimit = -1) => {
  if (maxLimit === -1 || limit < maxLimit) {
    return limit;
  }
  return maxLimit;
};
const ensureMinValues = ({ start, limit }) => ({
  start: Math.max(start, 0),
  limit: limit === -1 ? limit : Math.max(limit, 1)
});
const ensureMaxValues = (maxLimit = -1) => ({ start, limit }) => ({
  start,
  limit: withMaxLimit(limit, maxLimit)
});
const withNoLimit = (pagination2, maxLimit = -1) => ({
  ...pagination2,
  limit: pagination2.limit === -1 ? maxLimit : pagination2.limit
});
const withDefaultPagination = (args, { defaults = {}, maxLimit = -1 } = {}) => {
  const defaultValues = fp.merge(STRAPI_DEFAULTS, defaults);
  const usePagePagination = !fp.isNil(args.page) || !fp.isNil(args.pageSize);
  const useOffsetPagination = !fp.isNil(args.start) || !fp.isNil(args.limit);
  const ensureValidValues = fp.pipe(ensureMinValues, ensureMaxValues(maxLimit));
  if (!usePagePagination && !useOffsetPagination) {
    return fp.merge(args, ensureValidValues(defaultValues.offset));
  }
  if (usePagePagination && useOffsetPagination) {
    throw new PaginationError("Cannot use both page & offset pagination in the same query");
  }
  const pagination2 = {
    start: 0,
    limit: 0
  };
  if (useOffsetPagination) {
    const { start, limit } = fp.merge(defaultValues.offset, args);
    Object.assign(pagination2, {
      start,
      limit
    });
  }
  if (usePagePagination) {
    const { page, pageSize } = fp.merge(defaultValues.page, {
      ...args,
      pageSize: Math.max(1, args.pageSize ?? 0)
    });
    Object.assign(pagination2, {
      start: (page - 1) * pageSize,
      limit: pageSize
    });
  }
  Object.assign(pagination2, withNoLimit(pagination2, maxLimit));
  const replacePaginationAttributes = fp.pipe(
    // Remove pagination attributes
    fp.omit(paginationAttributes),
    // Merge the object with the new pagination + ensure minimum & maximum values
    fp.merge(ensureValidValues(pagination2))
  );
  return replacePaginationAttributes(args);
};
const transformPagedPaginationInfo = (paginationInfo, total) => {
  if (!fp.isNil(paginationInfo.page)) {
    const page = paginationInfo.page;
    const pageSize = paginationInfo.pageSize ?? total;
    return {
      page,
      pageSize,
      pageCount: pageSize > 0 ? Math.ceil(total / pageSize) : 0,
      total
    };
  }
  if (!fp.isNil(paginationInfo.start)) {
    const start = paginationInfo.start;
    const limit = paginationInfo.limit ?? total;
    return {
      page: Math.floor(start / limit) + 1,
      pageSize: limit,
      pageCount: limit > 0 ? Math.ceil(total / limit) : 0,
      total
    };
  }
  return {
    ...paginationInfo,
    page: 1,
    pageSize: 10,
    pageCount: 1,
    total
  };
};
const transformOffsetPaginationInfo = (paginationInfo, total) => {
  if (!fp.isNil(paginationInfo.page)) {
    const limit = paginationInfo.pageSize ?? total;
    const start = (paginationInfo.page - 1) * limit;
    return {
      start,
      limit,
      total
    };
  }
  if (!fp.isNil(paginationInfo.start)) {
    const start = paginationInfo.start;
    const limit = paginationInfo.limit ?? total;
    return {
      start,
      limit,
      total
    };
  }
  return {
    ...paginationInfo,
    start: 0,
    limit: 10,
    total
  };
};
const pagination = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  transformOffsetPaginationInfo,
  transformPagedPaginationInfo,
  withDefaultPagination
}, Symbol.toStringTag, { value: "Module" }));
var execa$2 = { exports: {} };
var crossSpawn$1 = { exports: {} };
var windows;
var hasRequiredWindows;
function requireWindows() {
  if (hasRequiredWindows) return windows;
  hasRequiredWindows = 1;
  windows = isexe2;
  isexe2.sync = sync2;
  var fs2 = require$$0$7;
  function checkPathExt(path2, options) {
    var pathext = options.pathExt !== void 0 ? options.pathExt : process.env.PATHEXT;
    if (!pathext) {
      return true;
    }
    pathext = pathext.split(";");
    if (pathext.indexOf("") !== -1) {
      return true;
    }
    for (var i = 0; i < pathext.length; i++) {
      var p = pathext[i].toLowerCase();
      if (p && path2.substr(-p.length).toLowerCase() === p) {
        return true;
      }
    }
    return false;
  }
  function checkStat(stat, path2, options) {
    if (!stat.isSymbolicLink() && !stat.isFile()) {
      return false;
    }
    return checkPathExt(path2, options);
  }
  function isexe2(path2, options, cb) {
    fs2.stat(path2, function(er, stat) {
      cb(er, er ? false : checkStat(stat, path2, options));
    });
  }
  function sync2(path2, options) {
    return checkStat(fs2.statSync(path2), path2, options);
  }
  return windows;
}
var mode;
var hasRequiredMode;
function requireMode() {
  if (hasRequiredMode) return mode;
  hasRequiredMode = 1;
  mode = isexe2;
  isexe2.sync = sync2;
  var fs2 = require$$0$7;
  function isexe2(path2, options, cb) {
    fs2.stat(path2, function(er, stat) {
      cb(er, er ? false : checkStat(stat, options));
    });
  }
  function sync2(path2, options) {
    return checkStat(fs2.statSync(path2), options);
  }
  function checkStat(stat, options) {
    return stat.isFile() && checkMode(stat, options);
  }
  function checkMode(stat, options) {
    var mod = stat.mode;
    var uid = stat.uid;
    var gid = stat.gid;
    var myUid = options.uid !== void 0 ? options.uid : process.getuid && process.getuid();
    var myGid = options.gid !== void 0 ? options.gid : process.getgid && process.getgid();
    var u = parseInt("100", 8);
    var g = parseInt("010", 8);
    var o = parseInt("001", 8);
    var ug = u | g;
    var ret = mod & o || mod & g && gid === myGid || mod & u && uid === myUid || mod & ug && myUid === 0;
    return ret;
  }
  return mode;
}
var core$3;
if (process.platform === "win32" || commonjsGlobal.TESTING_WINDOWS) {
  core$3 = requireWindows();
} else {
  core$3 = requireMode();
}
var isexe_1 = isexe$1;
isexe$1.sync = sync;
function isexe$1(path2, options, cb) {
  if (typeof options === "function") {
    cb = options;
    options = {};
  }
  if (!cb) {
    if (typeof Promise !== "function") {
      throw new TypeError("callback not provided");
    }
    return new Promise(function(resolve, reject) {
      isexe$1(path2, options || {}, function(er, is) {
        if (er) {
          reject(er);
        } else {
          resolve(is);
        }
      });
    });
  }
  core$3(path2, options || {}, function(er, is) {
    if (er) {
      if (er.code === "EACCES" || options && options.ignoreErrors) {
        er = null;
        is = false;
      }
    }
    cb(er, is);
  });
}
function sync(path2, options) {
  try {
    return core$3.sync(path2, options || {});
  } catch (er) {
    if (options && options.ignoreErrors || er.code === "EACCES") {
      return false;
    } else {
      throw er;
    }
  }
}
const isWindows = process.platform === "win32" || process.env.OSTYPE === "cygwin" || process.env.OSTYPE === "msys";
const path$a = require$$0$8;
const COLON = isWindows ? ";" : ":";
const isexe = isexe_1;
const getNotFoundError = (cmd) => Object.assign(new Error(`not found: ${cmd}`), { code: "ENOENT" });
const getPathInfo = (cmd, opt) => {
  const colon = opt.colon || COLON;
  const pathEnv = cmd.match(/\//) || isWindows && cmd.match(/\\/) ? [""] : [
    // windows always checks the cwd first
    ...isWindows ? [process.cwd()] : [],
    ...(opt.path || process.env.PATH || /* istanbul ignore next: very unusual */
    "").split(colon)
  ];
  const pathExtExe = isWindows ? opt.pathExt || process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM" : "";
  const pathExt = isWindows ? pathExtExe.split(colon) : [""];
  if (isWindows) {
    if (cmd.indexOf(".") !== -1 && pathExt[0] !== "")
      pathExt.unshift("");
  }
  return {
    pathEnv,
    pathExt,
    pathExtExe
  };
};
const which$1 = (cmd, opt, cb) => {
  if (typeof opt === "function") {
    cb = opt;
    opt = {};
  }
  if (!opt)
    opt = {};
  const { pathEnv, pathExt, pathExtExe } = getPathInfo(cmd, opt);
  const found = [];
  const step = (i) => new Promise((resolve, reject) => {
    if (i === pathEnv.length)
      return opt.all && found.length ? resolve(found) : reject(getNotFoundError(cmd));
    const ppRaw = pathEnv[i];
    const pathPart = /^".*"$/.test(ppRaw) ? ppRaw.slice(1, -1) : ppRaw;
    const pCmd = path$a.join(pathPart, cmd);
    const p = !pathPart && /^\.[\\\/]/.test(cmd) ? cmd.slice(0, 2) + pCmd : pCmd;
    resolve(subStep(p, i, 0));
  });
  const subStep = (p, i, ii) => new Promise((resolve, reject) => {
    if (ii === pathExt.length)
      return resolve(step(i + 1));
    const ext = pathExt[ii];
    isexe(p + ext, { pathExt: pathExtExe }, (er, is) => {
      if (!er && is) {
        if (opt.all)
          found.push(p + ext);
        else
          return resolve(p + ext);
      }
      return resolve(subStep(p, i, ii + 1));
    });
  });
  return cb ? step(0).then((res) => cb(null, res), cb) : step(0);
};
const whichSync = (cmd, opt) => {
  opt = opt || {};
  const { pathEnv, pathExt, pathExtExe } = getPathInfo(cmd, opt);
  const found = [];
  for (let i = 0; i < pathEnv.length; i++) {
    const ppRaw = pathEnv[i];
    const pathPart = /^".*"$/.test(ppRaw) ? ppRaw.slice(1, -1) : ppRaw;
    const pCmd = path$a.join(pathPart, cmd);
    const p = !pathPart && /^\.[\\\/]/.test(cmd) ? cmd.slice(0, 2) + pCmd : pCmd;
    for (let j = 0; j < pathExt.length; j++) {
      const cur = p + pathExt[j];
      try {
        const is = isexe.sync(cur, { pathExt: pathExtExe });
        if (is) {
          if (opt.all)
            found.push(cur);
          else
            return cur;
        }
      } catch (ex) {
      }
    }
  }
  if (opt.all && found.length)
    return found;
  if (opt.nothrow)
    return null;
  throw getNotFoundError(cmd);
};
var which_1 = which$1;
which$1.sync = whichSync;
var pathKey$1 = { exports: {} };
const pathKey = (options = {}) => {
  const environment = options.env || process.env;
  const platform2 = options.platform || process.platform;
  if (platform2 !== "win32") {
    return "PATH";
  }
  return Object.keys(environment).reverse().find((key) => key.toUpperCase() === "PATH") || "Path";
};
pathKey$1.exports = pathKey;
pathKey$1.exports.default = pathKey;
var pathKeyExports = pathKey$1.exports;
const path$9 = require$$0$8;
const which = which_1;
const getPathKey = pathKeyExports;
function resolveCommandAttempt(parsed, withoutPathExt) {
  const env2 = parsed.options.env || process.env;
  const cwd2 = process.cwd();
  const hasCustomCwd = parsed.options.cwd != null;
  const shouldSwitchCwd = hasCustomCwd && process.chdir !== void 0 && !process.chdir.disabled;
  if (shouldSwitchCwd) {
    try {
      process.chdir(parsed.options.cwd);
    } catch (err) {
    }
  }
  let resolved;
  try {
    resolved = which.sync(parsed.command, {
      path: env2[getPathKey({ env: env2 })],
      pathExt: withoutPathExt ? path$9.delimiter : void 0
    });
  } catch (e) {
  } finally {
    if (shouldSwitchCwd) {
      process.chdir(cwd2);
    }
  }
  if (resolved) {
    resolved = path$9.resolve(hasCustomCwd ? parsed.options.cwd : "", resolved);
  }
  return resolved;
}
function resolveCommand$1(parsed) {
  return resolveCommandAttempt(parsed) || resolveCommandAttempt(parsed, true);
}
var resolveCommand_1 = resolveCommand$1;
var _escape = {};
const metaCharsRegExp = /([()\][%!^"`<>&|;, *?])/g;
function escapeCommand(arg) {
  arg = arg.replace(metaCharsRegExp, "^$1");
  return arg;
}
function escapeArgument(arg, doubleEscapeMetaChars) {
  arg = `${arg}`;
  arg = arg.replace(/(?=(\\+?)?)\1"/g, '$1$1\\"');
  arg = arg.replace(/(?=(\\+?)?)\1$/, "$1$1");
  arg = `"${arg}"`;
  arg = arg.replace(metaCharsRegExp, "^$1");
  if (doubleEscapeMetaChars) {
    arg = arg.replace(metaCharsRegExp, "^$1");
  }
  return arg;
}
_escape.command = escapeCommand;
_escape.argument = escapeArgument;
var shebangRegex$1 = /^#!(.*)/;
const shebangRegex = shebangRegex$1;
var shebangCommand$1 = (string2 = "") => {
  const match = string2.match(shebangRegex);
  if (!match) {
    return null;
  }
  const [path2, argument] = match[0].replace(/#! ?/, "").split(" ");
  const binary2 = path2.split("/").pop();
  if (binary2 === "env") {
    return argument;
  }
  return argument ? `${binary2} ${argument}` : binary2;
};
const fs$7 = require$$0$7;
const shebangCommand = shebangCommand$1;
function readShebang$1(command2) {
  const size = 150;
  const buffer = Buffer.alloc(size);
  let fd;
  try {
    fd = fs$7.openSync(command2, "r");
    fs$7.readSync(fd, buffer, 0, size, 0);
    fs$7.closeSync(fd);
  } catch (e) {
  }
  return shebangCommand(buffer.toString());
}
var readShebang_1 = readShebang$1;
const path$8 = require$$0$8;
const resolveCommand = resolveCommand_1;
const escape = _escape;
const readShebang = readShebang_1;
const isWin$2 = process.platform === "win32";
const isExecutableRegExp = /\.(?:com|exe)$/i;
const isCmdShimRegExp = /node_modules[\\/].bin[\\/][^\\/]+\.cmd$/i;
function detectShebang(parsed) {
  parsed.file = resolveCommand(parsed);
  const shebang = parsed.file && readShebang(parsed.file);
  if (shebang) {
    parsed.args.unshift(parsed.file);
    parsed.command = shebang;
    return resolveCommand(parsed);
  }
  return parsed.file;
}
function parseNonShell(parsed) {
  if (!isWin$2) {
    return parsed;
  }
  const commandFile = detectShebang(parsed);
  const needsShell = !isExecutableRegExp.test(commandFile);
  if (parsed.options.forceShell || needsShell) {
    const needsDoubleEscapeMetaChars = isCmdShimRegExp.test(commandFile);
    parsed.command = path$8.normalize(parsed.command);
    parsed.command = escape.command(parsed.command);
    parsed.args = parsed.args.map((arg) => escape.argument(arg, needsDoubleEscapeMetaChars));
    const shellCommand = [parsed.command].concat(parsed.args).join(" ");
    parsed.args = ["/d", "/s", "/c", `"${shellCommand}"`];
    parsed.command = process.env.comspec || "cmd.exe";
    parsed.options.windowsVerbatimArguments = true;
  }
  return parsed;
}
function parse$6(command2, args, options) {
  if (args && !Array.isArray(args)) {
    options = args;
    args = null;
  }
  args = args ? args.slice(0) : [];
  options = Object.assign({}, options);
  const parsed = {
    command: command2,
    args,
    options,
    file: void 0,
    original: {
      command: command2,
      args
    }
  };
  return options.shell ? parsed : parseNonShell(parsed);
}
var parse_1$2 = parse$6;
const isWin$1 = process.platform === "win32";
function notFoundError(original, syscall) {
  return Object.assign(new Error(`${syscall} ${original.command} ENOENT`), {
    code: "ENOENT",
    errno: "ENOENT",
    syscall: `${syscall} ${original.command}`,
    path: original.command,
    spawnargs: original.args
  });
}
function hookChildProcess(cp2, parsed) {
  if (!isWin$1) {
    return;
  }
  const originalEmit = cp2.emit;
  cp2.emit = function(name, arg1) {
    if (name === "exit") {
      const err = verifyENOENT(arg1, parsed);
      if (err) {
        return originalEmit.call(cp2, "error", err);
      }
    }
    return originalEmit.apply(cp2, arguments);
  };
}
function verifyENOENT(status2, parsed) {
  if (isWin$1 && status2 === 1 && !parsed.file) {
    return notFoundError(parsed.original, "spawn");
  }
  return null;
}
function verifyENOENTSync(status2, parsed) {
  if (isWin$1 && status2 === 1 && !parsed.file) {
    return notFoundError(parsed.original, "spawnSync");
  }
  return null;
}
var enoent$1 = {
  hookChildProcess,
  verifyENOENT,
  verifyENOENTSync,
  notFoundError
};
const cp = require$$0$5;
const parse$5 = parse_1$2;
const enoent = enoent$1;
function spawn(command2, args, options) {
  const parsed = parse$5(command2, args, options);
  const spawned = cp.spawn(parsed.command, parsed.args, parsed.options);
  enoent.hookChildProcess(spawned, parsed);
  return spawned;
}
function spawnSync(command2, args, options) {
  const parsed = parse$5(command2, args, options);
  const result = cp.spawnSync(parsed.command, parsed.args, parsed.options);
  result.error = result.error || enoent.verifyENOENTSync(result.status, parsed);
  return result;
}
crossSpawn$1.exports = spawn;
crossSpawn$1.exports.spawn = spawn;
crossSpawn$1.exports.sync = spawnSync;
crossSpawn$1.exports._parse = parse$5;
crossSpawn$1.exports._enoent = enoent;
var crossSpawnExports = crossSpawn$1.exports;
var stripFinalNewline$1 = (input) => {
  const LF = typeof input === "string" ? "\n" : "\n".charCodeAt();
  const CR = typeof input === "string" ? "\r" : "\r".charCodeAt();
  if (input[input.length - 1] === LF) {
    input = input.slice(0, input.length - 1);
  }
  if (input[input.length - 1] === CR) {
    input = input.slice(0, input.length - 1);
  }
  return input;
};
var npmRunPath$1 = { exports: {} };
npmRunPath$1.exports;
(function(module) {
  const path2 = require$$0$8;
  const pathKey2 = pathKeyExports;
  const npmRunPath2 = (options) => {
    options = {
      cwd: process.cwd(),
      path: process.env[pathKey2()],
      execPath: process.execPath,
      ...options
    };
    let previous;
    let cwdPath = path2.resolve(options.cwd);
    const result = [];
    while (previous !== cwdPath) {
      result.push(path2.join(cwdPath, "node_modules/.bin"));
      previous = cwdPath;
      cwdPath = path2.resolve(cwdPath, "..");
    }
    const execPathDir = path2.resolve(options.cwd, options.execPath, "..");
    result.push(execPathDir);
    return result.concat(options.path).join(path2.delimiter);
  };
  module.exports = npmRunPath2;
  module.exports.default = npmRunPath2;
  module.exports.env = (options) => {
    options = {
      env: process.env,
      ...options
    };
    const env2 = { ...options.env };
    const path3 = pathKey2({ env: env2 });
    options.path = env2[path3];
    env2[path3] = module.exports(options);
    return env2;
  };
})(npmRunPath$1);
var npmRunPathExports = npmRunPath$1.exports;
var onetime$2 = { exports: {} };
var mimicFn$2 = { exports: {} };
const mimicFn$1 = (to, from) => {
  for (const prop of Reflect.ownKeys(from)) {
    Object.defineProperty(to, prop, Object.getOwnPropertyDescriptor(from, prop));
  }
  return to;
};
mimicFn$2.exports = mimicFn$1;
mimicFn$2.exports.default = mimicFn$1;
var mimicFnExports = mimicFn$2.exports;
const mimicFn = mimicFnExports;
const calledFunctions = /* @__PURE__ */ new WeakMap();
const onetime$1 = (function_, options = {}) => {
  if (typeof function_ !== "function") {
    throw new TypeError("Expected a function");
  }
  let returnValue;
  let callCount = 0;
  const functionName = function_.displayName || function_.name || "<anonymous>";
  const onetime2 = function(...arguments_) {
    calledFunctions.set(onetime2, ++callCount);
    if (callCount === 1) {
      returnValue = function_.apply(this, arguments_);
      function_ = null;
    } else if (options.throw === true) {
      throw new Error(`Function \`${functionName}\` can only be called once`);
    }
    return returnValue;
  };
  mimicFn(onetime2, function_);
  calledFunctions.set(onetime2, callCount);
  return onetime2;
};
onetime$2.exports = onetime$1;
onetime$2.exports.default = onetime$1;
onetime$2.exports.callCount = (function_) => {
  if (!calledFunctions.has(function_)) {
    throw new Error(`The given function \`${function_.name}\` is not wrapped by the \`onetime\` package`);
  }
  return calledFunctions.get(function_);
};
var onetimeExports = onetime$2.exports;
var main = {};
var signals$2 = {};
var core$2 = {};
Object.defineProperty(core$2, "__esModule", { value: true });
core$2.SIGNALS = void 0;
const SIGNALS = [
  {
    name: "SIGHUP",
    number: 1,
    action: "terminate",
    description: "Terminal closed",
    standard: "posix"
  },
  {
    name: "SIGINT",
    number: 2,
    action: "terminate",
    description: "User interruption with CTRL-C",
    standard: "ansi"
  },
  {
    name: "SIGQUIT",
    number: 3,
    action: "core",
    description: "User interruption with CTRL-\\",
    standard: "posix"
  },
  {
    name: "SIGILL",
    number: 4,
    action: "core",
    description: "Invalid machine instruction",
    standard: "ansi"
  },
  {
    name: "SIGTRAP",
    number: 5,
    action: "core",
    description: "Debugger breakpoint",
    standard: "posix"
  },
  {
    name: "SIGABRT",
    number: 6,
    action: "core",
    description: "Aborted",
    standard: "ansi"
  },
  {
    name: "SIGIOT",
    number: 6,
    action: "core",
    description: "Aborted",
    standard: "bsd"
  },
  {
    name: "SIGBUS",
    number: 7,
    action: "core",
    description: "Bus error due to misaligned, non-existing address or paging error",
    standard: "bsd"
  },
  {
    name: "SIGEMT",
    number: 7,
    action: "terminate",
    description: "Command should be emulated but is not implemented",
    standard: "other"
  },
  {
    name: "SIGFPE",
    number: 8,
    action: "core",
    description: "Floating point arithmetic error",
    standard: "ansi"
  },
  {
    name: "SIGKILL",
    number: 9,
    action: "terminate",
    description: "Forced termination",
    standard: "posix",
    forced: true
  },
  {
    name: "SIGUSR1",
    number: 10,
    action: "terminate",
    description: "Application-specific signal",
    standard: "posix"
  },
  {
    name: "SIGSEGV",
    number: 11,
    action: "core",
    description: "Segmentation fault",
    standard: "ansi"
  },
  {
    name: "SIGUSR2",
    number: 12,
    action: "terminate",
    description: "Application-specific signal",
    standard: "posix"
  },
  {
    name: "SIGPIPE",
    number: 13,
    action: "terminate",
    description: "Broken pipe or socket",
    standard: "posix"
  },
  {
    name: "SIGALRM",
    number: 14,
    action: "terminate",
    description: "Timeout or timer",
    standard: "posix"
  },
  {
    name: "SIGTERM",
    number: 15,
    action: "terminate",
    description: "Termination",
    standard: "ansi"
  },
  {
    name: "SIGSTKFLT",
    number: 16,
    action: "terminate",
    description: "Stack is empty or overflowed",
    standard: "other"
  },
  {
    name: "SIGCHLD",
    number: 17,
    action: "ignore",
    description: "Child process terminated, paused or unpaused",
    standard: "posix"
  },
  {
    name: "SIGCLD",
    number: 17,
    action: "ignore",
    description: "Child process terminated, paused or unpaused",
    standard: "other"
  },
  {
    name: "SIGCONT",
    number: 18,
    action: "unpause",
    description: "Unpaused",
    standard: "posix",
    forced: true
  },
  {
    name: "SIGSTOP",
    number: 19,
    action: "pause",
    description: "Paused",
    standard: "posix",
    forced: true
  },
  {
    name: "SIGTSTP",
    number: 20,
    action: "pause",
    description: 'Paused using CTRL-Z or "suspend"',
    standard: "posix"
  },
  {
    name: "SIGTTIN",
    number: 21,
    action: "pause",
    description: "Background process cannot read terminal input",
    standard: "posix"
  },
  {
    name: "SIGBREAK",
    number: 21,
    action: "terminate",
    description: "User interruption with CTRL-BREAK",
    standard: "other"
  },
  {
    name: "SIGTTOU",
    number: 22,
    action: "pause",
    description: "Background process cannot write to terminal output",
    standard: "posix"
  },
  {
    name: "SIGURG",
    number: 23,
    action: "ignore",
    description: "Socket received out-of-band data",
    standard: "bsd"
  },
  {
    name: "SIGXCPU",
    number: 24,
    action: "core",
    description: "Process timed out",
    standard: "bsd"
  },
  {
    name: "SIGXFSZ",
    number: 25,
    action: "core",
    description: "File too big",
    standard: "bsd"
  },
  {
    name: "SIGVTALRM",
    number: 26,
    action: "terminate",
    description: "Timeout or timer",
    standard: "bsd"
  },
  {
    name: "SIGPROF",
    number: 27,
    action: "terminate",
    description: "Timeout or timer",
    standard: "bsd"
  },
  {
    name: "SIGWINCH",
    number: 28,
    action: "ignore",
    description: "Terminal window size changed",
    standard: "bsd"
  },
  {
    name: "SIGIO",
    number: 29,
    action: "terminate",
    description: "I/O is available",
    standard: "other"
  },
  {
    name: "SIGPOLL",
    number: 29,
    action: "terminate",
    description: "Watched event",
    standard: "other"
  },
  {
    name: "SIGINFO",
    number: 29,
    action: "ignore",
    description: "Request for process information",
    standard: "other"
  },
  {
    name: "SIGPWR",
    number: 30,
    action: "terminate",
    description: "Device running out of power",
    standard: "systemv"
  },
  {
    name: "SIGSYS",
    number: 31,
    action: "core",
    description: "Invalid system call",
    standard: "other"
  },
  {
    name: "SIGUNUSED",
    number: 31,
    action: "terminate",
    description: "Invalid system call",
    standard: "other"
  }
];
core$2.SIGNALS = SIGNALS;
var realtime = {};
Object.defineProperty(realtime, "__esModule", { value: true });
realtime.SIGRTMAX = realtime.getRealtimeSignals = void 0;
const getRealtimeSignals = function() {
  const length = SIGRTMAX - SIGRTMIN + 1;
  return Array.from({ length }, getRealtimeSignal);
};
realtime.getRealtimeSignals = getRealtimeSignals;
const getRealtimeSignal = function(value, index2) {
  return {
    name: `SIGRT${index2 + 1}`,
    number: SIGRTMIN + index2,
    action: "terminate",
    description: "Application-specific signal (realtime)",
    standard: "posix"
  };
};
const SIGRTMIN = 34;
const SIGRTMAX = 64;
realtime.SIGRTMAX = SIGRTMAX;
Object.defineProperty(signals$2, "__esModule", { value: true });
signals$2.getSignals = void 0;
var _os$1 = require$$0$6;
var _core = core$2;
var _realtime$1 = realtime;
const getSignals = function() {
  const realtimeSignals = (0, _realtime$1.getRealtimeSignals)();
  const signals = [..._core.SIGNALS, ...realtimeSignals].map(normalizeSignal);
  return signals;
};
signals$2.getSignals = getSignals;
const normalizeSignal = function({
  name,
  number: defaultNumber,
  description,
  action,
  forced = false,
  standard
}) {
  const {
    signals: { [name]: constantSignal }
  } = _os$1.constants;
  const supported = constantSignal !== void 0;
  const number2 = supported ? constantSignal : defaultNumber;
  return { name, number: number2, description, supported, action, forced, standard };
};
Object.defineProperty(main, "__esModule", { value: true });
main.signalsByNumber = main.signalsByName = void 0;
var _os = require$$0$6;
var _signals = signals$2;
var _realtime = realtime;
const getSignalsByName = function() {
  const signals = (0, _signals.getSignals)();
  return signals.reduce(getSignalByName, {});
};
const getSignalByName = function(signalByNameMemo, { name, number: number2, description, supported, action, forced, standard }) {
  return {
    ...signalByNameMemo,
    [name]: { name, number: number2, description, supported, action, forced, standard }
  };
};
const signalsByName$1 = getSignalsByName();
main.signalsByName = signalsByName$1;
const getSignalsByNumber = function() {
  const signals = (0, _signals.getSignals)();
  const length = _realtime.SIGRTMAX + 1;
  const signalsA = Array.from({ length }, (value, number2) => getSignalByNumber(number2, signals));
  return Object.assign({}, ...signalsA);
};
const getSignalByNumber = function(number2, signals) {
  const signal = findSignalByNumber(number2, signals);
  if (signal === void 0) {
    return {};
  }
  const { name, description, supported, action, forced, standard } = signal;
  return {
    [number2]: {
      name,
      number: number2,
      description,
      supported,
      action,
      forced,
      standard
    }
  };
};
const findSignalByNumber = function(number2, signals) {
  const signal = signals.find(({ name }) => _os.constants.signals[name] === number2);
  if (signal !== void 0) {
    return signal;
  }
  return signals.find((signalA) => signalA.number === number2);
};
const signalsByNumber = getSignalsByNumber();
main.signalsByNumber = signalsByNumber;
const { signalsByName } = main;
const getErrorPrefix = ({ timedOut, timeout, errorCode, signal, signalDescription, exitCode, isCanceled }) => {
  if (timedOut) {
    return `timed out after ${timeout} milliseconds`;
  }
  if (isCanceled) {
    return "was canceled";
  }
  if (errorCode !== void 0) {
    return `failed with ${errorCode}`;
  }
  if (signal !== void 0) {
    return `was killed with ${signal} (${signalDescription})`;
  }
  if (exitCode !== void 0) {
    return `failed with exit code ${exitCode}`;
  }
  return "failed";
};
const makeError$1 = ({
  stdout,
  stderr,
  all,
  error: error2,
  signal,
  exitCode,
  command: command2,
  escapedCommand,
  timedOut,
  isCanceled,
  killed,
  parsed: { options: { timeout } }
}) => {
  exitCode = exitCode === null ? void 0 : exitCode;
  signal = signal === null ? void 0 : signal;
  const signalDescription = signal === void 0 ? void 0 : signalsByName[signal].description;
  const errorCode = error2 && error2.code;
  const prefix = getErrorPrefix({ timedOut, timeout, errorCode, signal, signalDescription, exitCode, isCanceled });
  const execaMessage = `Command ${prefix}: ${command2}`;
  const isError = Object.prototype.toString.call(error2) === "[object Error]";
  const shortMessage = isError ? `${execaMessage}
${error2.message}` : execaMessage;
  const message = [shortMessage, stderr, stdout].filter(Boolean).join("\n");
  if (isError) {
    error2.originalMessage = error2.message;
    error2.message = message;
  } else {
    error2 = new Error(message);
  }
  error2.shortMessage = shortMessage;
  error2.command = command2;
  error2.escapedCommand = escapedCommand;
  error2.exitCode = exitCode;
  error2.signal = signal;
  error2.signalDescription = signalDescription;
  error2.stdout = stdout;
  error2.stderr = stderr;
  if (all !== void 0) {
    error2.all = all;
  }
  if ("bufferedData" in error2) {
    delete error2.bufferedData;
  }
  error2.failed = true;
  error2.timedOut = Boolean(timedOut);
  error2.isCanceled = isCanceled;
  error2.killed = killed && !timedOut;
  return error2;
};
var error = makeError$1;
var stdio = { exports: {} };
const aliases = ["stdin", "stdout", "stderr"];
const hasAlias = (options) => aliases.some((alias) => options[alias] !== void 0);
const normalizeStdio$1 = (options) => {
  if (!options) {
    return;
  }
  const { stdio: stdio2 } = options;
  if (stdio2 === void 0) {
    return aliases.map((alias) => options[alias]);
  }
  if (hasAlias(options)) {
    throw new Error(`It's not possible to provide \`stdio\` in combination with one of ${aliases.map((alias) => `\`${alias}\``).join(", ")}`);
  }
  if (typeof stdio2 === "string") {
    return stdio2;
  }
  if (!Array.isArray(stdio2)) {
    throw new TypeError(`Expected \`stdio\` to be of type \`string\` or \`Array\`, got \`${typeof stdio2}\``);
  }
  const length = Math.max(stdio2.length, aliases.length);
  return Array.from({ length }, (value, index2) => stdio2[index2]);
};
stdio.exports = normalizeStdio$1;
stdio.exports.node = (options) => {
  const stdio2 = normalizeStdio$1(options);
  if (stdio2 === "ipc") {
    return "ipc";
  }
  if (stdio2 === void 0 || typeof stdio2 === "string") {
    return [stdio2, stdio2, stdio2, "ipc"];
  }
  if (stdio2.includes("ipc")) {
    return stdio2;
  }
  return [...stdio2, "ipc"];
};
var stdioExports = stdio.exports;
var signalExit = { exports: {} };
var signals$1 = { exports: {} };
var hasRequiredSignals;
function requireSignals() {
  if (hasRequiredSignals) return signals$1.exports;
  hasRequiredSignals = 1;
  (function(module) {
    module.exports = [
      "SIGABRT",
      "SIGALRM",
      "SIGHUP",
      "SIGINT",
      "SIGTERM"
    ];
    if (process.platform !== "win32") {
      module.exports.push(
        "SIGVTALRM",
        "SIGXCPU",
        "SIGXFSZ",
        "SIGUSR2",
        "SIGTRAP",
        "SIGSYS",
        "SIGQUIT",
        "SIGIOT"
        // should detect profiler and enable/disable accordingly.
        // see #21
        // 'SIGPROF'
      );
    }
    if (process.platform === "linux") {
      module.exports.push(
        "SIGIO",
        "SIGPOLL",
        "SIGPWR",
        "SIGSTKFLT",
        "SIGUNUSED"
      );
    }
  })(signals$1);
  return signals$1.exports;
}
var process$1 = commonjsGlobal.process;
const processOk = function(process2) {
  return process2 && typeof process2 === "object" && typeof process2.removeListener === "function" && typeof process2.emit === "function" && typeof process2.reallyExit === "function" && typeof process2.listeners === "function" && typeof process2.kill === "function" && typeof process2.pid === "number" && typeof process2.on === "function";
};
if (!processOk(process$1)) {
  signalExit.exports = function() {
    return function() {
    };
  };
} else {
  var assert = require$$0$9;
  var signals = requireSignals();
  var isWin = /^win/i.test(process$1.platform);
  var EE = require$$2;
  if (typeof EE !== "function") {
    EE = EE.EventEmitter;
  }
  var emitter;
  if (process$1.__signal_exit_emitter__) {
    emitter = process$1.__signal_exit_emitter__;
  } else {
    emitter = process$1.__signal_exit_emitter__ = new EE();
    emitter.count = 0;
    emitter.emitted = {};
  }
  if (!emitter.infinite) {
    emitter.setMaxListeners(Infinity);
    emitter.infinite = true;
  }
  signalExit.exports = function(cb, opts) {
    if (!processOk(commonjsGlobal.process)) {
      return function() {
      };
    }
    assert.equal(typeof cb, "function", "a callback must be provided for exit handler");
    if (loaded === false) {
      load$1();
    }
    var ev = "exit";
    if (opts && opts.alwaysLast) {
      ev = "afterexit";
    }
    var remove = function() {
      emitter.removeListener(ev, cb);
      if (emitter.listeners("exit").length === 0 && emitter.listeners("afterexit").length === 0) {
        unload();
      }
    };
    emitter.on(ev, cb);
    return remove;
  };
  var unload = function unload2() {
    if (!loaded || !processOk(commonjsGlobal.process)) {
      return;
    }
    loaded = false;
    signals.forEach(function(sig) {
      try {
        process$1.removeListener(sig, sigListeners[sig]);
      } catch (er) {
      }
    });
    process$1.emit = originalProcessEmit;
    process$1.reallyExit = originalProcessReallyExit;
    emitter.count -= 1;
  };
  signalExit.exports.unload = unload;
  var emit = function emit2(event, code, signal) {
    if (emitter.emitted[event]) {
      return;
    }
    emitter.emitted[event] = true;
    emitter.emit(event, code, signal);
  };
  var sigListeners = {};
  signals.forEach(function(sig) {
    sigListeners[sig] = function listener() {
      if (!processOk(commonjsGlobal.process)) {
        return;
      }
      var listeners = process$1.listeners(sig);
      if (listeners.length === emitter.count) {
        unload();
        emit("exit", null, sig);
        emit("afterexit", null, sig);
        if (isWin && sig === "SIGHUP") {
          sig = "SIGINT";
        }
        process$1.kill(process$1.pid, sig);
      }
    };
  });
  signalExit.exports.signals = function() {
    return signals;
  };
  var loaded = false;
  var load$1 = function load2() {
    if (loaded || !processOk(commonjsGlobal.process)) {
      return;
    }
    loaded = true;
    emitter.count += 1;
    signals = signals.filter(function(sig) {
      try {
        process$1.on(sig, sigListeners[sig]);
        return true;
      } catch (er) {
        return false;
      }
    });
    process$1.emit = processEmit;
    process$1.reallyExit = processReallyExit;
  };
  signalExit.exports.load = load$1;
  var originalProcessReallyExit = process$1.reallyExit;
  var processReallyExit = function processReallyExit2(code) {
    if (!processOk(commonjsGlobal.process)) {
      return;
    }
    process$1.exitCode = code || /* istanbul ignore next */
    0;
    emit("exit", process$1.exitCode, null);
    emit("afterexit", process$1.exitCode, null);
    originalProcessReallyExit.call(process$1, process$1.exitCode);
  };
  var originalProcessEmit = process$1.emit;
  var processEmit = function processEmit2(ev, arg) {
    if (ev === "exit" && processOk(commonjsGlobal.process)) {
      if (arg !== void 0) {
        process$1.exitCode = arg;
      }
      var ret = originalProcessEmit.apply(this, arguments);
      emit("exit", process$1.exitCode, null);
      emit("afterexit", process$1.exitCode, null);
      return ret;
    } else {
      return originalProcessEmit.apply(this, arguments);
    }
  };
}
var signalExitExports = signalExit.exports;
const os = require$$0$6;
const onExit = signalExitExports;
const DEFAULT_FORCE_KILL_TIMEOUT = 1e3 * 5;
const spawnedKill$1 = (kill2, signal = "SIGTERM", options = {}) => {
  const killResult = kill2(signal);
  setKillTimeout(kill2, signal, options, killResult);
  return killResult;
};
const setKillTimeout = (kill2, signal, options, killResult) => {
  if (!shouldForceKill(signal, options, killResult)) {
    return;
  }
  const timeout = getForceKillAfterTimeout(options);
  const t = setTimeout(() => {
    kill2("SIGKILL");
  }, timeout);
  if (t.unref) {
    t.unref();
  }
};
const shouldForceKill = (signal, { forceKillAfterTimeout }, killResult) => {
  return isSigterm(signal) && forceKillAfterTimeout !== false && killResult;
};
const isSigterm = (signal) => {
  return signal === os.constants.signals.SIGTERM || typeof signal === "string" && signal.toUpperCase() === "SIGTERM";
};
const getForceKillAfterTimeout = ({ forceKillAfterTimeout = true }) => {
  if (forceKillAfterTimeout === true) {
    return DEFAULT_FORCE_KILL_TIMEOUT;
  }
  if (!Number.isFinite(forceKillAfterTimeout) || forceKillAfterTimeout < 0) {
    throw new TypeError(`Expected the \`forceKillAfterTimeout\` option to be a non-negative integer, got \`${forceKillAfterTimeout}\` (${typeof forceKillAfterTimeout})`);
  }
  return forceKillAfterTimeout;
};
const spawnedCancel$1 = (spawned, context) => {
  const killResult = spawned.kill();
  if (killResult) {
    context.isCanceled = true;
  }
};
const timeoutKill = (spawned, signal, reject) => {
  spawned.kill(signal);
  reject(Object.assign(new Error("Timed out"), { timedOut: true, signal }));
};
const setupTimeout$1 = (spawned, { timeout, killSignal = "SIGTERM" }, spawnedPromise) => {
  if (timeout === 0 || timeout === void 0) {
    return spawnedPromise;
  }
  let timeoutId;
  const timeoutPromise = new Promise((resolve, reject) => {
    timeoutId = setTimeout(() => {
      timeoutKill(spawned, killSignal, reject);
    }, timeout);
  });
  const safeSpawnedPromise = spawnedPromise.finally(() => {
    clearTimeout(timeoutId);
  });
  return Promise.race([timeoutPromise, safeSpawnedPromise]);
};
const validateTimeout$1 = ({ timeout }) => {
  if (timeout !== void 0 && (!Number.isFinite(timeout) || timeout < 0)) {
    throw new TypeError(`Expected the \`timeout\` option to be a non-negative integer, got \`${timeout}\` (${typeof timeout})`);
  }
};
const setExitHandler$1 = async (spawned, { cleanup, detached }, timedPromise) => {
  if (!cleanup || detached) {
    return timedPromise;
  }
  const removeExitHandler = onExit(() => {
    spawned.kill();
  });
  return timedPromise.finally(() => {
    removeExitHandler();
  });
};
var kill = {
  spawnedKill: spawnedKill$1,
  spawnedCancel: spawnedCancel$1,
  setupTimeout: setupTimeout$1,
  validateTimeout: validateTimeout$1,
  setExitHandler: setExitHandler$1
};
const isStream$1 = (stream2) => stream2 !== null && typeof stream2 === "object" && typeof stream2.pipe === "function";
isStream$1.writable = (stream2) => isStream$1(stream2) && stream2.writable !== false && typeof stream2._write === "function" && typeof stream2._writableState === "object";
isStream$1.readable = (stream2) => isStream$1(stream2) && stream2.readable !== false && typeof stream2._read === "function" && typeof stream2._readableState === "object";
isStream$1.duplex = (stream2) => isStream$1.writable(stream2) && isStream$1.readable(stream2);
isStream$1.transform = (stream2) => isStream$1.duplex(stream2) && typeof stream2._transform === "function";
var isStream_1 = isStream$1;
var getStream$2 = { exports: {} };
const { PassThrough: PassThroughStream } = require$$0$a;
var bufferStream$1 = (options) => {
  options = { ...options };
  const { array: array2 } = options;
  let { encoding } = options;
  const isBuffer2 = encoding === "buffer";
  let objectMode = false;
  if (array2) {
    objectMode = !(encoding || isBuffer2);
  } else {
    encoding = encoding || "utf8";
  }
  if (isBuffer2) {
    encoding = null;
  }
  const stream2 = new PassThroughStream({ objectMode });
  if (encoding) {
    stream2.setEncoding(encoding);
  }
  let length = 0;
  const chunks = [];
  stream2.on("data", (chunk) => {
    chunks.push(chunk);
    if (objectMode) {
      length = chunks.length;
    } else {
      length += chunk.length;
    }
  });
  stream2.getBufferedValue = () => {
    if (array2) {
      return chunks;
    }
    return isBuffer2 ? Buffer.concat(chunks, length) : chunks.join("");
  };
  stream2.getBufferedLength = () => length;
  return stream2;
};
const { constants: BufferConstants } = require$$0$b;
const stream$1 = require$$0$a;
const { promisify: promisify$5 } = require$$2$1;
const bufferStream = bufferStream$1;
const streamPipelinePromisified = promisify$5(stream$1.pipeline);
class MaxBufferError extends Error {
  constructor() {
    super("maxBuffer exceeded");
    this.name = "MaxBufferError";
  }
}
async function getStream$1(inputStream, options) {
  if (!inputStream) {
    throw new Error("Expected a stream");
  }
  options = {
    maxBuffer: Infinity,
    ...options
  };
  const { maxBuffer } = options;
  const stream2 = bufferStream(options);
  await new Promise((resolve, reject) => {
    const rejectPromise = (error2) => {
      if (error2 && stream2.getBufferedLength() <= BufferConstants.MAX_LENGTH) {
        error2.bufferedData = stream2.getBufferedValue();
      }
      reject(error2);
    };
    (async () => {
      try {
        await streamPipelinePromisified(inputStream, stream2);
        resolve();
      } catch (error2) {
        rejectPromise(error2);
      }
    })();
    stream2.on("data", () => {
      if (stream2.getBufferedLength() > maxBuffer) {
        rejectPromise(new MaxBufferError());
      }
    });
  });
  return stream2.getBufferedValue();
}
getStream$2.exports = getStream$1;
getStream$2.exports.buffer = (stream2, options) => getStream$1(stream2, { ...options, encoding: "buffer" });
getStream$2.exports.array = (stream2, options) => getStream$1(stream2, { ...options, array: true });
getStream$2.exports.MaxBufferError = MaxBufferError;
var getStreamExports = getStream$2.exports;
const { PassThrough } = require$$0$a;
var mergeStream$1 = function() {
  var sources = [];
  var output = new PassThrough({ objectMode: true });
  output.setMaxListeners(0);
  output.add = add;
  output.isEmpty = isEmpty;
  output.on("unpipe", remove);
  Array.prototype.slice.call(arguments).forEach(add);
  return output;
  function add(source) {
    if (Array.isArray(source)) {
      source.forEach(add);
      return this;
    }
    sources.push(source);
    source.once("end", remove.bind(null, source));
    source.once("error", output.emit.bind(output, "error"));
    source.pipe(output, { end: false });
    return this;
  }
  function isEmpty() {
    return sources.length == 0;
  }
  function remove(source) {
    sources = sources.filter(function(it) {
      return it !== source;
    });
    if (!sources.length && output.readable) {
      output.end();
    }
  }
};
const isStream = isStream_1;
const getStream = getStreamExports;
const mergeStream = mergeStream$1;
const handleInput$1 = (spawned, input) => {
  if (input === void 0 || spawned.stdin === void 0) {
    return;
  }
  if (isStream(input)) {
    input.pipe(spawned.stdin);
  } else {
    spawned.stdin.end(input);
  }
};
const makeAllStream$1 = (spawned, { all }) => {
  if (!all || !spawned.stdout && !spawned.stderr) {
    return;
  }
  const mixed2 = mergeStream();
  if (spawned.stdout) {
    mixed2.add(spawned.stdout);
  }
  if (spawned.stderr) {
    mixed2.add(spawned.stderr);
  }
  return mixed2;
};
const getBufferedData = async (stream2, streamPromise) => {
  if (!stream2) {
    return;
  }
  stream2.destroy();
  try {
    return await streamPromise;
  } catch (error2) {
    return error2.bufferedData;
  }
};
const getStreamPromise = (stream2, { encoding, buffer, maxBuffer }) => {
  if (!stream2 || !buffer) {
    return;
  }
  if (encoding) {
    return getStream(stream2, { encoding, maxBuffer });
  }
  return getStream.buffer(stream2, { maxBuffer });
};
const getSpawnedResult$1 = async ({ stdout, stderr, all }, { encoding, buffer, maxBuffer }, processDone) => {
  const stdoutPromise = getStreamPromise(stdout, { encoding, buffer, maxBuffer });
  const stderrPromise = getStreamPromise(stderr, { encoding, buffer, maxBuffer });
  const allPromise = getStreamPromise(all, { encoding, buffer, maxBuffer: maxBuffer * 2 });
  try {
    return await Promise.all([processDone, stdoutPromise, stderrPromise, allPromise]);
  } catch (error2) {
    return Promise.all([
      { error: error2, signal: error2.signal, timedOut: error2.timedOut },
      getBufferedData(stdout, stdoutPromise),
      getBufferedData(stderr, stderrPromise),
      getBufferedData(all, allPromise)
    ]);
  }
};
const validateInputSync$1 = ({ input }) => {
  if (isStream(input)) {
    throw new TypeError("The `input` option cannot be a stream in sync mode");
  }
};
var stream = {
  handleInput: handleInput$1,
  makeAllStream: makeAllStream$1,
  getSpawnedResult: getSpawnedResult$1,
  validateInputSync: validateInputSync$1
};
const nativePromisePrototype = (async () => {
})().constructor.prototype;
const descriptors = ["then", "catch", "finally"].map((property2) => [
  property2,
  Reflect.getOwnPropertyDescriptor(nativePromisePrototype, property2)
]);
const mergePromise$1 = (spawned, promise2) => {
  for (const [property2, descriptor] of descriptors) {
    const value = typeof promise2 === "function" ? (...args) => Reflect.apply(descriptor.value, promise2(), args) : descriptor.value.bind(promise2);
    Reflect.defineProperty(spawned, property2, { ...descriptor, value });
  }
  return spawned;
};
const getSpawnedPromise$1 = (spawned) => {
  return new Promise((resolve, reject) => {
    spawned.on("exit", (exitCode, signal) => {
      resolve({ exitCode, signal });
    });
    spawned.on("error", (error2) => {
      reject(error2);
    });
    if (spawned.stdin) {
      spawned.stdin.on("error", (error2) => {
        reject(error2);
      });
    }
  });
};
var promise = {
  mergePromise: mergePromise$1,
  getSpawnedPromise: getSpawnedPromise$1
};
const normalizeArgs = (file2, args = []) => {
  if (!Array.isArray(args)) {
    return [file2];
  }
  return [file2, ...args];
};
const NO_ESCAPE_REGEXP = /^[\w.-]+$/;
const DOUBLE_QUOTES_REGEXP = /"/g;
const escapeArg = (arg) => {
  if (typeof arg !== "string" || NO_ESCAPE_REGEXP.test(arg)) {
    return arg;
  }
  return `"${arg.replace(DOUBLE_QUOTES_REGEXP, '\\"')}"`;
};
const joinCommand$1 = (file2, args) => {
  return normalizeArgs(file2, args).join(" ");
};
const getEscapedCommand$1 = (file2, args) => {
  return normalizeArgs(file2, args).map((arg) => escapeArg(arg)).join(" ");
};
const SPACES_REGEXP = / +/g;
const parseCommand$1 = (command2) => {
  const tokens = [];
  for (const token of command2.trim().split(SPACES_REGEXP)) {
    const previousToken = tokens[tokens.length - 1];
    if (previousToken && previousToken.endsWith("\\")) {
      tokens[tokens.length - 1] = `${previousToken.slice(0, -1)} ${token}`;
    } else {
      tokens.push(token);
    }
  }
  return tokens;
};
var command = {
  joinCommand: joinCommand$1,
  getEscapedCommand: getEscapedCommand$1,
  parseCommand: parseCommand$1
};
const path$7 = require$$0$8;
const childProcess = require$$0$5;
const crossSpawn = crossSpawnExports;
const stripFinalNewline = stripFinalNewline$1;
const npmRunPath = npmRunPathExports;
const onetime = onetimeExports;
const makeError = error;
const normalizeStdio = stdioExports;
const { spawnedKill, spawnedCancel, setupTimeout, validateTimeout, setExitHandler } = kill;
const { handleInput, getSpawnedResult, makeAllStream, validateInputSync } = stream;
const { mergePromise, getSpawnedPromise } = promise;
const { joinCommand, parseCommand, getEscapedCommand } = command;
const DEFAULT_MAX_BUFFER = 1e3 * 1e3 * 100;
const getEnv = ({ env: envOption, extendEnv, preferLocal, localDir, execPath }) => {
  const env2 = extendEnv ? { ...process.env, ...envOption } : envOption;
  if (preferLocal) {
    return npmRunPath.env({ env: env2, cwd: localDir, execPath });
  }
  return env2;
};
const handleArguments = (file2, args, options = {}) => {
  const parsed = crossSpawn._parse(file2, args, options);
  file2 = parsed.command;
  args = parsed.args;
  options = parsed.options;
  options = {
    maxBuffer: DEFAULT_MAX_BUFFER,
    buffer: true,
    stripFinalNewline: true,
    extendEnv: true,
    preferLocal: false,
    localDir: options.cwd || process.cwd(),
    execPath: process.execPath,
    encoding: "utf8",
    reject: true,
    cleanup: true,
    all: false,
    windowsHide: true,
    ...options
  };
  options.env = getEnv(options);
  options.stdio = normalizeStdio(options);
  if (process.platform === "win32" && path$7.basename(file2, ".exe") === "cmd") {
    args.unshift("/q");
  }
  return { file: file2, args, options, parsed };
};
const handleOutput = (options, value, error2) => {
  if (typeof value !== "string" && !Buffer.isBuffer(value)) {
    return error2 === void 0 ? void 0 : "";
  }
  if (options.stripFinalNewline) {
    return stripFinalNewline(value);
  }
  return value;
};
const execa = (file2, args, options) => {
  const parsed = handleArguments(file2, args, options);
  const command2 = joinCommand(file2, args);
  const escapedCommand = getEscapedCommand(file2, args);
  validateTimeout(parsed.options);
  let spawned;
  try {
    spawned = childProcess.spawn(parsed.file, parsed.args, parsed.options);
  } catch (error2) {
    const dummySpawned = new childProcess.ChildProcess();
    const errorPromise = Promise.reject(makeError({
      error: error2,
      stdout: "",
      stderr: "",
      all: "",
      command: command2,
      escapedCommand,
      parsed,
      timedOut: false,
      isCanceled: false,
      killed: false
    }));
    return mergePromise(dummySpawned, errorPromise);
  }
  const spawnedPromise = getSpawnedPromise(spawned);
  const timedPromise = setupTimeout(spawned, parsed.options, spawnedPromise);
  const processDone = setExitHandler(spawned, parsed.options, timedPromise);
  const context = { isCanceled: false };
  spawned.kill = spawnedKill.bind(null, spawned.kill.bind(spawned));
  spawned.cancel = spawnedCancel.bind(null, spawned, context);
  const handlePromise = async () => {
    const [{ error: error2, exitCode, signal, timedOut }, stdoutResult, stderrResult, allResult] = await getSpawnedResult(spawned, parsed.options, processDone);
    const stdout = handleOutput(parsed.options, stdoutResult);
    const stderr = handleOutput(parsed.options, stderrResult);
    const all = handleOutput(parsed.options, allResult);
    if (error2 || exitCode !== 0 || signal !== null) {
      const returnedError = makeError({
        error: error2,
        exitCode,
        signal,
        stdout,
        stderr,
        all,
        command: command2,
        escapedCommand,
        parsed,
        timedOut,
        isCanceled: context.isCanceled,
        killed: spawned.killed
      });
      if (!parsed.options.reject) {
        return returnedError;
      }
      throw returnedError;
    }
    return {
      command: command2,
      escapedCommand,
      exitCode: 0,
      stdout,
      stderr,
      all,
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false
    };
  };
  const handlePromiseOnce = onetime(handlePromise);
  handleInput(spawned, parsed.options.input);
  spawned.all = makeAllStream(spawned, parsed.options);
  return mergePromise(spawned, handlePromiseOnce);
};
execa$2.exports = execa;
execa$2.exports.sync = (file2, args, options) => {
  const parsed = handleArguments(file2, args, options);
  const command2 = joinCommand(file2, args);
  const escapedCommand = getEscapedCommand(file2, args);
  validateInputSync(parsed.options);
  let result;
  try {
    result = childProcess.spawnSync(parsed.file, parsed.args, parsed.options);
  } catch (error2) {
    throw makeError({
      error: error2,
      stdout: "",
      stderr: "",
      all: "",
      command: command2,
      escapedCommand,
      parsed,
      timedOut: false,
      isCanceled: false,
      killed: false
    });
  }
  const stdout = handleOutput(parsed.options, result.stdout, result.error);
  const stderr = handleOutput(parsed.options, result.stderr, result.error);
  if (result.error || result.status !== 0 || result.signal !== null) {
    const error2 = makeError({
      stdout,
      stderr,
      error: result.error,
      signal: result.signal,
      exitCode: result.status,
      command: command2,
      escapedCommand,
      parsed,
      timedOut: result.error && result.error.code === "ETIMEDOUT",
      isCanceled: false,
      killed: result.signal !== null
    });
    if (!parsed.options.reject) {
      return error2;
    }
    throw error2;
  }
  return {
    command: command2,
    escapedCommand,
    exitCode: 0,
    stdout,
    stderr,
    failed: false,
    timedOut: false,
    isCanceled: false,
    killed: false
  };
};
execa$2.exports.command = (command2, options) => {
  const [file2, ...args] = parseCommand(command2);
  return execa(file2, args, options);
};
execa$2.exports.commandSync = (command2, options) => {
  const [file2, ...args] = parseCommand(command2);
  return execa.sync(file2, args, options);
};
execa$2.exports.node = (scriptPath, args, options = {}) => {
  if (args && !Array.isArray(args) && typeof args === "object") {
    options = args;
    args = [];
  }
  const stdio2 = normalizeStdio.node(options);
  const defaultExecArgv = process.execArgv.filter((arg) => !arg.startsWith("--inspect"));
  const {
    nodePath = process.execPath,
    nodeOptions = defaultExecArgv
  } = options;
  return execa(
    nodePath,
    [
      ...nodeOptions,
      scriptPath,
      ...Array.isArray(args) ? args : []
    ],
    {
      ...options,
      stdin: void 0,
      stdout: void 0,
      stderr: void 0,
      stdio: stdio2,
      shell: false
    }
  );
};
var execaExports = execa$2.exports;
const execa$1 = /* @__PURE__ */ getDefaultExportFromCjs(execaExports);
var core$1 = {};
var pkgDir$1 = { exports: {} };
var findUp$3 = { exports: {} };
var locatePath$1 = { exports: {} };
var pLocate$4 = { exports: {} };
var pLimit$4 = { exports: {} };
var pTry$2 = { exports: {} };
const pTry$1 = (fn, ...arguments_) => new Promise((resolve) => {
  resolve(fn(...arguments_));
});
pTry$2.exports = pTry$1;
pTry$2.exports.default = pTry$1;
var pTryExports = pTry$2.exports;
const pTry = pTryExports;
const pLimit$3 = (concurrency) => {
  if (!((Number.isInteger(concurrency) || concurrency === Infinity) && concurrency > 0)) {
    return Promise.reject(new TypeError("Expected `concurrency` to be a number from 1 and up"));
  }
  const queue = [];
  let activeCount = 0;
  const next = () => {
    activeCount--;
    if (queue.length > 0) {
      queue.shift()();
    }
  };
  const run = (fn, resolve, ...args) => {
    activeCount++;
    const result = pTry(fn, ...args);
    resolve(result);
    result.then(next, next);
  };
  const enqueue2 = (fn, resolve, ...args) => {
    if (activeCount < concurrency) {
      run(fn, resolve, ...args);
    } else {
      queue.push(run.bind(null, fn, resolve, ...args));
    }
  };
  const generator = (fn, ...args) => new Promise((resolve) => enqueue2(fn, resolve, ...args));
  Object.defineProperties(generator, {
    activeCount: {
      get: () => activeCount
    },
    pendingCount: {
      get: () => queue.length
    },
    clearQueue: {
      value: () => {
        queue.length = 0;
      }
    }
  });
  return generator;
};
pLimit$4.exports = pLimit$3;
pLimit$4.exports.default = pLimit$3;
var pLimitExports = pLimit$4.exports;
const pLimit$2 = pLimitExports;
let EndError$1 = class EndError extends Error {
  constructor(value) {
    super();
    this.value = value;
  }
};
const testElement$1 = async (element, tester) => tester(await element);
const finder$1 = async (element) => {
  const values = await Promise.all(element);
  if (values[1] === true) {
    throw new EndError$1(values[0]);
  }
  return false;
};
const pLocate$3 = async (iterable, tester, options) => {
  options = {
    concurrency: Infinity,
    preserveOrder: true,
    ...options
  };
  const limit = pLimit$2(options.concurrency);
  const items = [...iterable].map((element) => [element, limit(testElement$1, element, tester)]);
  const checkLimit = pLimit$2(options.preserveOrder ? 1 : Infinity);
  try {
    await Promise.all(items.map((element) => checkLimit(finder$1, element)));
  } catch (error2) {
    if (error2 instanceof EndError$1) {
      return error2.value;
    }
    throw error2;
  }
};
pLocate$4.exports = pLocate$3;
pLocate$4.exports.default = pLocate$3;
var pLocateExports = pLocate$4.exports;
const path$6 = require$$0$8;
const fs$6 = require$$0$7;
const { promisify: promisify$4 } = require$$2$1;
const pLocate$2 = pLocateExports;
const fsStat$1 = promisify$4(fs$6.stat);
const fsLStat$1 = promisify$4(fs$6.lstat);
const typeMappings$1 = {
  directory: "isDirectory",
  file: "isFile"
};
function checkType$1({ type: type2 }) {
  if (type2 in typeMappings$1) {
    return;
  }
  throw new Error(`Invalid type specified: ${type2}`);
}
const matchType$1 = (type2, stat) => type2 === void 0 || stat[typeMappings$1[type2]]();
locatePath$1.exports = async (paths, options) => {
  options = {
    cwd: process.cwd(),
    type: "file",
    allowSymlinks: true,
    ...options
  };
  checkType$1(options);
  const statFn = options.allowSymlinks ? fsStat$1 : fsLStat$1;
  return pLocate$2(paths, async (path_) => {
    try {
      const stat = await statFn(path$6.resolve(options.cwd, path_));
      return matchType$1(options.type, stat);
    } catch (_2) {
      return false;
    }
  }, options);
};
locatePath$1.exports.sync = (paths, options) => {
  options = {
    cwd: process.cwd(),
    allowSymlinks: true,
    type: "file",
    ...options
  };
  checkType$1(options);
  const statFn = options.allowSymlinks ? fs$6.statSync : fs$6.lstatSync;
  for (const path_ of paths) {
    try {
      const stat = statFn(path$6.resolve(options.cwd, path_));
      if (matchType$1(options.type, stat)) {
        return path_;
      }
    } catch (_2) {
    }
  }
};
var locatePathExports$1 = locatePath$1.exports;
var pathExists$4 = { exports: {} };
const fs$5 = require$$0$7;
const { promisify: promisify$3 } = require$$2$1;
const pAccess$2 = promisify$3(fs$5.access);
pathExists$4.exports = async (path2) => {
  try {
    await pAccess$2(path2);
    return true;
  } catch (_2) {
    return false;
  }
};
pathExists$4.exports.sync = (path2) => {
  try {
    fs$5.accessSync(path2);
    return true;
  } catch (_2) {
    return false;
  }
};
var pathExistsExports$2 = pathExists$4.exports;
(function(module) {
  const path2 = require$$0$8;
  const locatePath2 = locatePathExports$1;
  const pathExists2 = pathExistsExports$2;
  const stop = Symbol("findUp.stop");
  module.exports = async (name, options = {}) => {
    let directory = path2.resolve(options.cwd || "");
    const { root: root2 } = path2.parse(directory);
    const paths = [].concat(name);
    const runMatcher = async (locateOptions) => {
      if (typeof name !== "function") {
        return locatePath2(paths, locateOptions);
      }
      const foundPath = await name(locateOptions.cwd);
      if (typeof foundPath === "string") {
        return locatePath2([foundPath], locateOptions);
      }
      return foundPath;
    };
    while (true) {
      const foundPath = await runMatcher({ ...options, cwd: directory });
      if (foundPath === stop) {
        return;
      }
      if (foundPath) {
        return path2.resolve(directory, foundPath);
      }
      if (directory === root2) {
        return;
      }
      directory = path2.dirname(directory);
    }
  };
  module.exports.sync = (name, options = {}) => {
    let directory = path2.resolve(options.cwd || "");
    const { root: root2 } = path2.parse(directory);
    const paths = [].concat(name);
    const runMatcher = (locateOptions) => {
      if (typeof name !== "function") {
        return locatePath2.sync(paths, locateOptions);
      }
      const foundPath = name(locateOptions.cwd);
      if (typeof foundPath === "string") {
        return locatePath2.sync([foundPath], locateOptions);
      }
      return foundPath;
    };
    while (true) {
      const foundPath = runMatcher({ ...options, cwd: directory });
      if (foundPath === stop) {
        return;
      }
      if (foundPath) {
        return path2.resolve(directory, foundPath);
      }
      if (directory === root2) {
        return;
      }
      directory = path2.dirname(directory);
    }
  };
  module.exports.exists = pathExists2;
  module.exports.sync.exists = pathExists2.sync;
  module.exports.stop = stop;
})(findUp$3);
var findUpExports$1 = findUp$3.exports;
const path$5 = require$$0$8;
const findUp$2 = findUpExports$1;
const pkgDir = async (cwd2) => {
  const filePath = await findUp$2("package.json", { cwd: cwd2 });
  return filePath && path$5.dirname(filePath);
};
pkgDir$1.exports = pkgDir;
pkgDir$1.exports.default = pkgDir;
pkgDir$1.exports.sync = (cwd2) => {
  const filePath = findUp$2.sync("package.json", { cwd: cwd2 });
  return filePath && path$5.dirname(filePath);
};
var pkgDirExports = pkgDir$1.exports;
var utils$8 = {};
(function(exports$1) {
  exports$1.isInteger = (num) => {
    if (typeof num === "number") {
      return Number.isInteger(num);
    }
    if (typeof num === "string" && num.trim() !== "") {
      return Number.isInteger(Number(num));
    }
    return false;
  };
  exports$1.find = (node, type2) => node.nodes.find((node2) => node2.type === type2);
  exports$1.exceedsLimit = (min, max, step = 1, limit) => {
    if (limit === false) return false;
    if (!exports$1.isInteger(min) || !exports$1.isInteger(max)) return false;
    return (Number(max) - Number(min)) / Number(step) >= limit;
  };
  exports$1.escapeNode = (block, n = 0, type2) => {
    const node = block.nodes[n];
    if (!node) return;
    if (type2 && node.type === type2 || node.type === "open" || node.type === "close") {
      if (node.escaped !== true) {
        node.value = "\\" + node.value;
        node.escaped = true;
      }
    }
  };
  exports$1.encloseBrace = (node) => {
    if (node.type !== "brace") return false;
    if (node.commas >> 0 + node.ranges >> 0 === 0) {
      node.invalid = true;
      return true;
    }
    return false;
  };
  exports$1.isInvalidBrace = (block) => {
    if (block.type !== "brace") return false;
    if (block.invalid === true || block.dollar) return true;
    if (block.commas >> 0 + block.ranges >> 0 === 0) {
      block.invalid = true;
      return true;
    }
    if (block.open !== true || block.close !== true) {
      block.invalid = true;
      return true;
    }
    return false;
  };
  exports$1.isOpenOrClose = (node) => {
    if (node.type === "open" || node.type === "close") {
      return true;
    }
    return node.open === true || node.close === true;
  };
  exports$1.reduce = (nodes) => nodes.reduce((acc, node) => {
    if (node.type === "text") acc.push(node.value);
    if (node.type === "range") node.type = "text";
    return acc;
  }, []);
  exports$1.flatten = (...args) => {
    const result = [];
    const flat = (arr) => {
      for (let i = 0; i < arr.length; i++) {
        const ele = arr[i];
        if (Array.isArray(ele)) {
          flat(ele);
          continue;
        }
        if (ele !== void 0) {
          result.push(ele);
        }
      }
      return result;
    };
    flat(args);
    return result;
  };
})(utils$8);
const utils$7 = utils$8;
var stringify$4 = (ast, options = {}) => {
  const stringify2 = (node, parent = {}) => {
    const invalidBlock = options.escapeInvalid && utils$7.isInvalidBrace(parent);
    const invalidNode = node.invalid === true && options.escapeInvalid === true;
    let output = "";
    if (node.value) {
      if ((invalidBlock || invalidNode) && utils$7.isOpenOrClose(node)) {
        return "\\" + node.value;
      }
      return node.value;
    }
    if (node.value) {
      return node.value;
    }
    if (node.nodes) {
      for (const child of node.nodes) {
        output += stringify2(child);
      }
    }
    return output;
  };
  return stringify2(ast);
};
/*!
 * is-number <https://github.com/jonschlinkert/is-number>
 *
 * Copyright (c) 2014-present, Jon Schlinkert.
 * Released under the MIT License.
 */
var isNumber$2 = function(num) {
  if (typeof num === "number") {
    return num - num === 0;
  }
  if (typeof num === "string" && num.trim() !== "") {
    return Number.isFinite ? Number.isFinite(+num) : isFinite(+num);
  }
  return false;
};
/*!
 * to-regex-range <https://github.com/micromatch/to-regex-range>
 *
 * Copyright (c) 2015-present, Jon Schlinkert.
 * Released under the MIT License.
 */
const isNumber$1 = isNumber$2;
const toRegexRange$1 = (min, max, options) => {
  if (isNumber$1(min) === false) {
    throw new TypeError("toRegexRange: expected the first argument to be a number");
  }
  if (max === void 0 || min === max) {
    return String(min);
  }
  if (isNumber$1(max) === false) {
    throw new TypeError("toRegexRange: expected the second argument to be a number.");
  }
  let opts = { relaxZeros: true, ...options };
  if (typeof opts.strictZeros === "boolean") {
    opts.relaxZeros = opts.strictZeros === false;
  }
  let relax = String(opts.relaxZeros);
  let shorthand = String(opts.shorthand);
  let capture = String(opts.capture);
  let wrap = String(opts.wrap);
  let cacheKey = min + ":" + max + "=" + relax + shorthand + capture + wrap;
  if (toRegexRange$1.cache.hasOwnProperty(cacheKey)) {
    return toRegexRange$1.cache[cacheKey].result;
  }
  let a = Math.min(min, max);
  let b = Math.max(min, max);
  if (Math.abs(a - b) === 1) {
    let result = min + "|" + max;
    if (opts.capture) {
      return `(${result})`;
    }
    if (opts.wrap === false) {
      return result;
    }
    return `(?:${result})`;
  }
  let isPadded = hasPadding(min) || hasPadding(max);
  let state = { min, max, a, b };
  let positives = [];
  let negatives = [];
  if (isPadded) {
    state.isPadded = isPadded;
    state.maxLen = String(state.max).length;
  }
  if (a < 0) {
    let newMin = b < 0 ? Math.abs(b) : 1;
    negatives = splitToPatterns(newMin, Math.abs(a), state, opts);
    a = state.a = 0;
  }
  if (b >= 0) {
    positives = splitToPatterns(a, b, state, opts);
  }
  state.negatives = negatives;
  state.positives = positives;
  state.result = collatePatterns(negatives, positives);
  if (opts.capture === true) {
    state.result = `(${state.result})`;
  } else if (opts.wrap !== false && positives.length + negatives.length > 1) {
    state.result = `(?:${state.result})`;
  }
  toRegexRange$1.cache[cacheKey] = state;
  return state.result;
};
function collatePatterns(neg, pos, options) {
  let onlyNegative = filterPatterns(neg, pos, "-", false) || [];
  let onlyPositive = filterPatterns(pos, neg, "", false) || [];
  let intersected = filterPatterns(neg, pos, "-?", true) || [];
  let subpatterns = onlyNegative.concat(intersected).concat(onlyPositive);
  return subpatterns.join("|");
}
function splitToRanges(min, max) {
  let nines = 1;
  let zeros2 = 1;
  let stop = countNines(min, nines);
  let stops = /* @__PURE__ */ new Set([max]);
  while (min <= stop && stop <= max) {
    stops.add(stop);
    nines += 1;
    stop = countNines(min, nines);
  }
  stop = countZeros(max + 1, zeros2) - 1;
  while (min < stop && stop <= max) {
    stops.add(stop);
    zeros2 += 1;
    stop = countZeros(max + 1, zeros2) - 1;
  }
  stops = [...stops];
  stops.sort(compare);
  return stops;
}
function rangeToPattern(start, stop, options) {
  if (start === stop) {
    return { pattern: start, count: [], digits: 0 };
  }
  let zipped = zip(start, stop);
  let digits = zipped.length;
  let pattern = "";
  let count = 0;
  for (let i = 0; i < digits; i++) {
    let [startDigit, stopDigit] = zipped[i];
    if (startDigit === stopDigit) {
      pattern += startDigit;
    } else if (startDigit !== "0" || stopDigit !== "9") {
      pattern += toCharacterClass(startDigit, stopDigit);
    } else {
      count++;
    }
  }
  if (count) {
    pattern += options.shorthand === true ? "\\d" : "[0-9]";
  }
  return { pattern, count: [count], digits };
}
function splitToPatterns(min, max, tok, options) {
  let ranges = splitToRanges(min, max);
  let tokens = [];
  let start = min;
  let prev;
  for (let i = 0; i < ranges.length; i++) {
    let max2 = ranges[i];
    let obj = rangeToPattern(String(start), String(max2), options);
    let zeros2 = "";
    if (!tok.isPadded && prev && prev.pattern === obj.pattern) {
      if (prev.count.length > 1) {
        prev.count.pop();
      }
      prev.count.push(obj.count[0]);
      prev.string = prev.pattern + toQuantifier(prev.count);
      start = max2 + 1;
      continue;
    }
    if (tok.isPadded) {
      zeros2 = padZeros(max2, tok, options);
    }
    obj.string = zeros2 + obj.pattern + toQuantifier(obj.count);
    tokens.push(obj);
    start = max2 + 1;
    prev = obj;
  }
  return tokens;
}
function filterPatterns(arr, comparison, prefix, intersection, options) {
  let result = [];
  for (let ele of arr) {
    let { string: string2 } = ele;
    if (!intersection && !contains(comparison, "string", string2)) {
      result.push(prefix + string2);
    }
    if (intersection && contains(comparison, "string", string2)) {
      result.push(prefix + string2);
    }
  }
  return result;
}
function zip(a, b) {
  let arr = [];
  for (let i = 0; i < a.length; i++) arr.push([a[i], b[i]]);
  return arr;
}
function compare(a, b) {
  return a > b ? 1 : b > a ? -1 : 0;
}
function contains(arr, key, val) {
  return arr.some((ele) => ele[key] === val);
}
function countNines(min, len) {
  return Number(String(min).slice(0, -len) + "9".repeat(len));
}
function countZeros(integer, zeros2) {
  return integer - integer % Math.pow(10, zeros2);
}
function toQuantifier(digits) {
  let [start = 0, stop = ""] = digits;
  if (stop || start > 1) {
    return `{${start + (stop ? "," + stop : "")}}`;
  }
  return "";
}
function toCharacterClass(a, b, options) {
  return `[${a}${b - a === 1 ? "" : "-"}${b}]`;
}
function hasPadding(str2) {
  return /^-?(0+)\d/.test(str2);
}
function padZeros(value, tok, options) {
  if (!tok.isPadded) {
    return value;
  }
  let diff = Math.abs(tok.maxLen - String(value).length);
  let relax = options.relaxZeros !== false;
  switch (diff) {
    case 0:
      return "";
    case 1:
      return relax ? "0?" : "0";
    case 2:
      return relax ? "0{0,2}" : "00";
    default: {
      return relax ? `0{0,${diff}}` : `0{${diff}}`;
    }
  }
}
toRegexRange$1.cache = {};
toRegexRange$1.clearCache = () => toRegexRange$1.cache = {};
var toRegexRange_1 = toRegexRange$1;
/*!
 * fill-range <https://github.com/jonschlinkert/fill-range>
 *
 * Copyright (c) 2014-present, Jon Schlinkert.
 * Licensed under the MIT License.
 */
const util$2 = require$$2$1;
const toRegexRange = toRegexRange_1;
const isObject$2 = (val) => val !== null && typeof val === "object" && !Array.isArray(val);
const transform$2 = (toNumber) => {
  return (value) => toNumber === true ? Number(value) : String(value);
};
const isValidValue = (value) => {
  return typeof value === "number" || typeof value === "string" && value !== "";
};
const isNumber = (num) => Number.isInteger(+num);
const zeros = (input) => {
  let value = `${input}`;
  let index2 = -1;
  if (value[0] === "-") value = value.slice(1);
  if (value === "0") return false;
  while (value[++index2] === "0") ;
  return index2 > 0;
};
const stringify$3 = (start, end, options) => {
  if (typeof start === "string" || typeof end === "string") {
    return true;
  }
  return options.stringify === true;
};
const pad = (input, maxLength, toNumber) => {
  if (maxLength > 0) {
    let dash = input[0] === "-" ? "-" : "";
    if (dash) input = input.slice(1);
    input = dash + input.padStart(dash ? maxLength - 1 : maxLength, "0");
  }
  if (toNumber === false) {
    return String(input);
  }
  return input;
};
const toMaxLen = (input, maxLength) => {
  let negative = input[0] === "-" ? "-" : "";
  if (negative) {
    input = input.slice(1);
    maxLength--;
  }
  while (input.length < maxLength) input = "0" + input;
  return negative ? "-" + input : input;
};
const toSequence = (parts, options, maxLen) => {
  parts.negatives.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  parts.positives.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  let prefix = options.capture ? "" : "?:";
  let positives = "";
  let negatives = "";
  let result;
  if (parts.positives.length) {
    positives = parts.positives.map((v) => toMaxLen(String(v), maxLen)).join("|");
  }
  if (parts.negatives.length) {
    negatives = `-(${prefix}${parts.negatives.map((v) => toMaxLen(String(v), maxLen)).join("|")})`;
  }
  if (positives && negatives) {
    result = `${positives}|${negatives}`;
  } else {
    result = positives || negatives;
  }
  if (options.wrap) {
    return `(${prefix}${result})`;
  }
  return result;
};
const toRange = (a, b, isNumbers, options) => {
  if (isNumbers) {
    return toRegexRange(a, b, { wrap: false, ...options });
  }
  let start = String.fromCharCode(a);
  if (a === b) return start;
  let stop = String.fromCharCode(b);
  return `[${start}-${stop}]`;
};
const toRegex = (start, end, options) => {
  if (Array.isArray(start)) {
    let wrap = options.wrap === true;
    let prefix = options.capture ? "" : "?:";
    return wrap ? `(${prefix}${start.join("|")})` : start.join("|");
  }
  return toRegexRange(start, end, options);
};
const rangeError = (...args) => {
  return new RangeError("Invalid range arguments: " + util$2.inspect(...args));
};
const invalidRange = (start, end, options) => {
  if (options.strictRanges === true) throw rangeError([start, end]);
  return [];
};
const invalidStep = (step, options) => {
  if (options.strictRanges === true) {
    throw new TypeError(`Expected step "${step}" to be a number`);
  }
  return [];
};
const fillNumbers = (start, end, step = 1, options = {}) => {
  let a = Number(start);
  let b = Number(end);
  if (!Number.isInteger(a) || !Number.isInteger(b)) {
    if (options.strictRanges === true) throw rangeError([start, end]);
    return [];
  }
  if (a === 0) a = 0;
  if (b === 0) b = 0;
  let descending = a > b;
  let startString = String(start);
  let endString = String(end);
  let stepString = String(step);
  step = Math.max(Math.abs(step), 1);
  let padded = zeros(startString) || zeros(endString) || zeros(stepString);
  let maxLen = padded ? Math.max(startString.length, endString.length, stepString.length) : 0;
  let toNumber = padded === false && stringify$3(start, end, options) === false;
  let format = options.transform || transform$2(toNumber);
  if (options.toRegex && step === 1) {
    return toRange(toMaxLen(start, maxLen), toMaxLen(end, maxLen), true, options);
  }
  let parts = { negatives: [], positives: [] };
  let push2 = (num) => parts[num < 0 ? "negatives" : "positives"].push(Math.abs(num));
  let range = [];
  let index2 = 0;
  while (descending ? a >= b : a <= b) {
    if (options.toRegex === true && step > 1) {
      push2(a);
    } else {
      range.push(pad(format(a, index2), maxLen, toNumber));
    }
    a = descending ? a - step : a + step;
    index2++;
  }
  if (options.toRegex === true) {
    return step > 1 ? toSequence(parts, options, maxLen) : toRegex(range, null, { wrap: false, ...options });
  }
  return range;
};
const fillLetters = (start, end, step = 1, options = {}) => {
  if (!isNumber(start) && start.length > 1 || !isNumber(end) && end.length > 1) {
    return invalidRange(start, end, options);
  }
  let format = options.transform || ((val) => String.fromCharCode(val));
  let a = `${start}`.charCodeAt(0);
  let b = `${end}`.charCodeAt(0);
  let descending = a > b;
  let min = Math.min(a, b);
  let max = Math.max(a, b);
  if (options.toRegex && step === 1) {
    return toRange(min, max, false, options);
  }
  let range = [];
  let index2 = 0;
  while (descending ? a >= b : a <= b) {
    range.push(format(a, index2));
    a = descending ? a - step : a + step;
    index2++;
  }
  if (options.toRegex === true) {
    return toRegex(range, null, { wrap: false, options });
  }
  return range;
};
const fill$2 = (start, end, step, options = {}) => {
  if (end == null && isValidValue(start)) {
    return [start];
  }
  if (!isValidValue(start) || !isValidValue(end)) {
    return invalidRange(start, end, options);
  }
  if (typeof step === "function") {
    return fill$2(start, end, 1, { transform: step });
  }
  if (isObject$2(step)) {
    return fill$2(start, end, 0, step);
  }
  let opts = { ...options };
  if (opts.capture === true) opts.wrap = true;
  step = step || opts.step || 1;
  if (!isNumber(step)) {
    if (step != null && !isObject$2(step)) return invalidStep(step, opts);
    return fill$2(start, end, 1, step);
  }
  if (isNumber(start) && isNumber(end)) {
    return fillNumbers(start, end, step, opts);
  }
  return fillLetters(start, end, Math.max(Math.abs(step), 1), opts);
};
var fillRange = fill$2;
const fill$1 = fillRange;
const utils$6 = utils$8;
const compile$1 = (ast, options = {}) => {
  const walk = (node, parent = {}) => {
    const invalidBlock = utils$6.isInvalidBrace(parent);
    const invalidNode = node.invalid === true && options.escapeInvalid === true;
    const invalid = invalidBlock === true || invalidNode === true;
    const prefix = options.escapeInvalid === true ? "\\" : "";
    let output = "";
    if (node.isOpen === true) {
      return prefix + node.value;
    }
    if (node.isClose === true) {
      console.log("node.isClose", prefix, node.value);
      return prefix + node.value;
    }
    if (node.type === "open") {
      return invalid ? prefix + node.value : "(";
    }
    if (node.type === "close") {
      return invalid ? prefix + node.value : ")";
    }
    if (node.type === "comma") {
      return node.prev.type === "comma" ? "" : invalid ? node.value : "|";
    }
    if (node.value) {
      return node.value;
    }
    if (node.nodes && node.ranges > 0) {
      const args = utils$6.reduce(node.nodes);
      const range = fill$1(...args, { ...options, wrap: false, toRegex: true, strictZeros: true });
      if (range.length !== 0) {
        return args.length > 1 && range.length > 1 ? `(${range})` : range;
      }
    }
    if (node.nodes) {
      for (const child of node.nodes) {
        output += walk(child, node);
      }
    }
    return output;
  };
  return walk(ast);
};
var compile_1 = compile$1;
const fill = fillRange;
const stringify$2 = stringify$4;
const utils$5 = utils$8;
const append = (queue = "", stash = "", enclose = false) => {
  const result = [];
  queue = [].concat(queue);
  stash = [].concat(stash);
  if (!stash.length) return queue;
  if (!queue.length) {
    return enclose ? utils$5.flatten(stash).map((ele) => `{${ele}}`) : stash;
  }
  for (const item of queue) {
    if (Array.isArray(item)) {
      for (const value of item) {
        result.push(append(value, stash, enclose));
      }
    } else {
      for (let ele of stash) {
        if (enclose === true && typeof ele === "string") ele = `{${ele}}`;
        result.push(Array.isArray(ele) ? append(item, ele, enclose) : item + ele);
      }
    }
  }
  return utils$5.flatten(result);
};
const expand$1 = (ast, options = {}) => {
  const rangeLimit = options.rangeLimit === void 0 ? 1e3 : options.rangeLimit;
  const walk = (node, parent = {}) => {
    node.queue = [];
    let p = parent;
    let q = parent.queue;
    while (p.type !== "brace" && p.type !== "root" && p.parent) {
      p = p.parent;
      q = p.queue;
    }
    if (node.invalid || node.dollar) {
      q.push(append(q.pop(), stringify$2(node, options)));
      return;
    }
    if (node.type === "brace" && node.invalid !== true && node.nodes.length === 2) {
      q.push(append(q.pop(), ["{}"]));
      return;
    }
    if (node.nodes && node.ranges > 0) {
      const args = utils$5.reduce(node.nodes);
      if (utils$5.exceedsLimit(...args, options.step, rangeLimit)) {
        throw new RangeError("expanded array length exceeds range limit. Use options.rangeLimit to increase or disable the limit.");
      }
      let range = fill(...args, options);
      if (range.length === 0) {
        range = stringify$2(node, options);
      }
      q.push(append(q.pop(), range));
      node.nodes = [];
      return;
    }
    const enclose = utils$5.encloseBrace(node);
    let queue = node.queue;
    let block = node;
    while (block.type !== "brace" && block.type !== "root" && block.parent) {
      block = block.parent;
      queue = block.queue;
    }
    for (let i = 0; i < node.nodes.length; i++) {
      const child = node.nodes[i];
      if (child.type === "comma" && node.type === "brace") {
        if (i === 1) queue.push("");
        queue.push("");
        continue;
      }
      if (child.type === "close") {
        q.push(append(q.pop(), queue, enclose));
        continue;
      }
      if (child.value && child.type !== "open") {
        queue.push(append(queue.pop(), child.value));
        continue;
      }
      if (child.nodes) {
        walk(child, node);
      }
    }
    return queue;
  };
  return utils$5.flatten(walk(ast));
};
var expand_1 = expand$1;
var constants$4 = {
  MAX_LENGTH: 1e4,
  CHAR_LEFT_PARENTHESES: "(",
  /* ( */
  CHAR_RIGHT_PARENTHESES: ")",
  /* ) */
  CHAR_BACKSLASH: "\\",
  /* \ */
  CHAR_BACKTICK: "`",
  /* ` */
  CHAR_COMMA: ",",
  /* , */
  CHAR_DOT: ".",
  /* . */
  CHAR_DOUBLE_QUOTE: '"',
  /* " */
  CHAR_LEFT_CURLY_BRACE: "{",
  /* { */
  CHAR_LEFT_SQUARE_BRACKET: "[",
  /* [ */
  CHAR_NO_BREAK_SPACE: " ",
  /* \u00A0 */
  CHAR_RIGHT_CURLY_BRACE: "}",
  /* } */
  CHAR_RIGHT_SQUARE_BRACKET: "]",
  /* ] */
  CHAR_SINGLE_QUOTE: "'",
  /* ' */
  CHAR_ZERO_WIDTH_NOBREAK_SPACE: "\uFEFF"
  /* \uFEFF */
};
const stringify$1 = stringify$4;
const {
  MAX_LENGTH: MAX_LENGTH$1,
  CHAR_BACKSLASH,
  /* \ */
  CHAR_BACKTICK,
  /* ` */
  CHAR_COMMA: CHAR_COMMA$2,
  /* , */
  CHAR_DOT: CHAR_DOT$1,
  /* . */
  CHAR_LEFT_PARENTHESES: CHAR_LEFT_PARENTHESES$1,
  /* ( */
  CHAR_RIGHT_PARENTHESES: CHAR_RIGHT_PARENTHESES$1,
  /* ) */
  CHAR_LEFT_CURLY_BRACE: CHAR_LEFT_CURLY_BRACE$1,
  /* { */
  CHAR_RIGHT_CURLY_BRACE: CHAR_RIGHT_CURLY_BRACE$1,
  /* } */
  CHAR_LEFT_SQUARE_BRACKET: CHAR_LEFT_SQUARE_BRACKET$2,
  /* [ */
  CHAR_RIGHT_SQUARE_BRACKET: CHAR_RIGHT_SQUARE_BRACKET$2,
  /* ] */
  CHAR_DOUBLE_QUOTE: CHAR_DOUBLE_QUOTE$1,
  /* " */
  CHAR_SINGLE_QUOTE: CHAR_SINGLE_QUOTE$1,
  /* ' */
  CHAR_NO_BREAK_SPACE,
  CHAR_ZERO_WIDTH_NOBREAK_SPACE
} = constants$4;
const parse$4 = (input, options = {}) => {
  if (typeof input !== "string") {
    throw new TypeError("Expected a string");
  }
  const opts = options || {};
  const max = typeof opts.maxLength === "number" ? Math.min(MAX_LENGTH$1, opts.maxLength) : MAX_LENGTH$1;
  if (input.length > max) {
    throw new SyntaxError(`Input length (${input.length}), exceeds max characters (${max})`);
  }
  const ast = { type: "root", input, nodes: [] };
  const stack = [ast];
  let block = ast;
  let prev = ast;
  let brackets = 0;
  const length = input.length;
  let index2 = 0;
  let depth2 = 0;
  let value;
  const advance = () => input[index2++];
  const push2 = (node) => {
    if (node.type === "text" && prev.type === "dot") {
      prev.type = "text";
    }
    if (prev && prev.type === "text" && node.type === "text") {
      prev.value += node.value;
      return;
    }
    block.nodes.push(node);
    node.parent = block;
    node.prev = prev;
    prev = node;
    return node;
  };
  push2({ type: "bos" });
  while (index2 < length) {
    block = stack[stack.length - 1];
    value = advance();
    if (value === CHAR_ZERO_WIDTH_NOBREAK_SPACE || value === CHAR_NO_BREAK_SPACE) {
      continue;
    }
    if (value === CHAR_BACKSLASH) {
      push2({ type: "text", value: (options.keepEscaping ? value : "") + advance() });
      continue;
    }
    if (value === CHAR_RIGHT_SQUARE_BRACKET$2) {
      push2({ type: "text", value: "\\" + value });
      continue;
    }
    if (value === CHAR_LEFT_SQUARE_BRACKET$2) {
      brackets++;
      let next;
      while (index2 < length && (next = advance())) {
        value += next;
        if (next === CHAR_LEFT_SQUARE_BRACKET$2) {
          brackets++;
          continue;
        }
        if (next === CHAR_BACKSLASH) {
          value += advance();
          continue;
        }
        if (next === CHAR_RIGHT_SQUARE_BRACKET$2) {
          brackets--;
          if (brackets === 0) {
            break;
          }
        }
      }
      push2({ type: "text", value });
      continue;
    }
    if (value === CHAR_LEFT_PARENTHESES$1) {
      block = push2({ type: "paren", nodes: [] });
      stack.push(block);
      push2({ type: "text", value });
      continue;
    }
    if (value === CHAR_RIGHT_PARENTHESES$1) {
      if (block.type !== "paren") {
        push2({ type: "text", value });
        continue;
      }
      block = stack.pop();
      push2({ type: "text", value });
      block = stack[stack.length - 1];
      continue;
    }
    if (value === CHAR_DOUBLE_QUOTE$1 || value === CHAR_SINGLE_QUOTE$1 || value === CHAR_BACKTICK) {
      const open = value;
      let next;
      if (options.keepQuotes !== true) {
        value = "";
      }
      while (index2 < length && (next = advance())) {
        if (next === CHAR_BACKSLASH) {
          value += next + advance();
          continue;
        }
        if (next === open) {
          if (options.keepQuotes === true) value += next;
          break;
        }
        value += next;
      }
      push2({ type: "text", value });
      continue;
    }
    if (value === CHAR_LEFT_CURLY_BRACE$1) {
      depth2++;
      const dollar = prev.value && prev.value.slice(-1) === "$" || block.dollar === true;
      const brace = {
        type: "brace",
        open: true,
        close: false,
        dollar,
        depth: depth2,
        commas: 0,
        ranges: 0,
        nodes: []
      };
      block = push2(brace);
      stack.push(block);
      push2({ type: "open", value });
      continue;
    }
    if (value === CHAR_RIGHT_CURLY_BRACE$1) {
      if (block.type !== "brace") {
        push2({ type: "text", value });
        continue;
      }
      const type2 = "close";
      block = stack.pop();
      block.close = true;
      push2({ type: type2, value });
      depth2--;
      block = stack[stack.length - 1];
      continue;
    }
    if (value === CHAR_COMMA$2 && depth2 > 0) {
      if (block.ranges > 0) {
        block.ranges = 0;
        const open = block.nodes.shift();
        block.nodes = [open, { type: "text", value: stringify$1(block) }];
      }
      push2({ type: "comma", value });
      block.commas++;
      continue;
    }
    if (value === CHAR_DOT$1 && depth2 > 0 && block.commas === 0) {
      const siblings = block.nodes;
      if (depth2 === 0 || siblings.length === 0) {
        push2({ type: "text", value });
        continue;
      }
      if (prev.type === "dot") {
        block.range = [];
        prev.value += value;
        prev.type = "range";
        if (block.nodes.length !== 3 && block.nodes.length !== 5) {
          block.invalid = true;
          block.ranges = 0;
          prev.type = "text";
          continue;
        }
        block.ranges++;
        block.args = [];
        continue;
      }
      if (prev.type === "range") {
        siblings.pop();
        const before = siblings[siblings.length - 1];
        before.value += prev.value + value;
        prev = before;
        block.ranges--;
        continue;
      }
      push2({ type: "dot", value });
      continue;
    }
    push2({ type: "text", value });
  }
  do {
    block = stack.pop();
    if (block.type !== "root") {
      block.nodes.forEach((node) => {
        if (!node.nodes) {
          if (node.type === "open") node.isOpen = true;
          if (node.type === "close") node.isClose = true;
          if (!node.nodes) node.type = "text";
          node.invalid = true;
        }
      });
      const parent = stack[stack.length - 1];
      const index3 = parent.nodes.indexOf(block);
      parent.nodes.splice(index3, 1, ...block.nodes);
    }
  } while (stack.length > 0);
  push2({ type: "eos" });
  return ast;
};
var parse_1$1 = parse$4;
const stringify = stringify$4;
const compile = compile_1;
const expand = expand_1;
const parse$3 = parse_1$1;
const braces$1 = (input, options = {}) => {
  let output = [];
  if (Array.isArray(input)) {
    for (const pattern of input) {
      const result = braces$1.create(pattern, options);
      if (Array.isArray(result)) {
        output.push(...result);
      } else {
        output.push(result);
      }
    }
  } else {
    output = [].concat(braces$1.create(input, options));
  }
  if (options && options.expand === true && options.nodupes === true) {
    output = [...new Set(output)];
  }
  return output;
};
braces$1.parse = (input, options = {}) => parse$3(input, options);
braces$1.stringify = (input, options = {}) => {
  if (typeof input === "string") {
    return stringify(braces$1.parse(input, options), options);
  }
  return stringify(input, options);
};
braces$1.compile = (input, options = {}) => {
  if (typeof input === "string") {
    input = braces$1.parse(input, options);
  }
  return compile(input, options);
};
braces$1.expand = (input, options = {}) => {
  if (typeof input === "string") {
    input = braces$1.parse(input, options);
  }
  let result = expand(input, options);
  if (options.noempty === true) {
    result = result.filter(Boolean);
  }
  if (options.nodupes === true) {
    result = [...new Set(result)];
  }
  return result;
};
braces$1.create = (input, options = {}) => {
  if (input === "" || input.length < 3) {
    return [input];
  }
  return options.expand !== true ? braces$1.compile(input, options) : braces$1.expand(input, options);
};
var braces_1 = braces$1;
var utils$4 = {};
const path$4 = require$$0$8;
const WIN_SLASH = "\\\\/";
const WIN_NO_SLASH = `[^${WIN_SLASH}]`;
const DOT_LITERAL = "\\.";
const PLUS_LITERAL = "\\+";
const QMARK_LITERAL = "\\?";
const SLASH_LITERAL = "\\/";
const ONE_CHAR = "(?=.)";
const QMARK = "[^/]";
const END_ANCHOR = `(?:${SLASH_LITERAL}|$)`;
const START_ANCHOR = `(?:^|${SLASH_LITERAL})`;
const DOTS_SLASH = `${DOT_LITERAL}{1,2}${END_ANCHOR}`;
const NO_DOT = `(?!${DOT_LITERAL})`;
const NO_DOTS = `(?!${START_ANCHOR}${DOTS_SLASH})`;
const NO_DOT_SLASH = `(?!${DOT_LITERAL}{0,1}${END_ANCHOR})`;
const NO_DOTS_SLASH = `(?!${DOTS_SLASH})`;
const QMARK_NO_DOT = `[^.${SLASH_LITERAL}]`;
const STAR = `${QMARK}*?`;
const POSIX_CHARS = {
  DOT_LITERAL,
  PLUS_LITERAL,
  QMARK_LITERAL,
  SLASH_LITERAL,
  ONE_CHAR,
  QMARK,
  END_ANCHOR,
  DOTS_SLASH,
  NO_DOT,
  NO_DOTS,
  NO_DOT_SLASH,
  NO_DOTS_SLASH,
  QMARK_NO_DOT,
  STAR,
  START_ANCHOR
};
const WINDOWS_CHARS = {
  ...POSIX_CHARS,
  SLASH_LITERAL: `[${WIN_SLASH}]`,
  QMARK: WIN_NO_SLASH,
  STAR: `${WIN_NO_SLASH}*?`,
  DOTS_SLASH: `${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$)`,
  NO_DOT: `(?!${DOT_LITERAL})`,
  NO_DOTS: `(?!(?:^|[${WIN_SLASH}])${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$))`,
  NO_DOT_SLASH: `(?!${DOT_LITERAL}{0,1}(?:[${WIN_SLASH}]|$))`,
  NO_DOTS_SLASH: `(?!${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$))`,
  QMARK_NO_DOT: `[^.${WIN_SLASH}]`,
  START_ANCHOR: `(?:^|[${WIN_SLASH}])`,
  END_ANCHOR: `(?:[${WIN_SLASH}]|$)`
};
const POSIX_REGEX_SOURCE$1 = {
  alnum: "a-zA-Z0-9",
  alpha: "a-zA-Z",
  ascii: "\\x00-\\x7F",
  blank: " \\t",
  cntrl: "\\x00-\\x1F\\x7F",
  digit: "0-9",
  graph: "\\x21-\\x7E",
  lower: "a-z",
  print: "\\x20-\\x7E ",
  punct: "\\-!\"#$%&'()\\*+,./:;<=>?@[\\]^_`{|}~",
  space: " \\t\\r\\n\\v\\f",
  upper: "A-Z",
  word: "A-Za-z0-9_",
  xdigit: "A-Fa-f0-9"
};
var constants$3 = {
  MAX_LENGTH: 1024 * 64,
  POSIX_REGEX_SOURCE: POSIX_REGEX_SOURCE$1,
  // regular expressions
  REGEX_BACKSLASH: /\\(?![*+?^${}(|)[\]])/g,
  REGEX_NON_SPECIAL_CHARS: /^[^@![\].,$*+?^{}()|\\/]+/,
  REGEX_SPECIAL_CHARS: /[-*+?.^${}(|)[\]]/,
  REGEX_SPECIAL_CHARS_BACKREF: /(\\?)((\W)(\3*))/g,
  REGEX_SPECIAL_CHARS_GLOBAL: /([-*+?.^${}(|)[\]])/g,
  REGEX_REMOVE_BACKSLASH: /(?:\[.*?[^\\]\]|\\(?=.))/g,
  // Replace globs with equivalent patterns to reduce parsing time.
  REPLACEMENTS: {
    "***": "*",
    "**/**": "**",
    "**/**/**": "**"
  },
  // Digits
  CHAR_0: 48,
  /* 0 */
  CHAR_9: 57,
  /* 9 */
  // Alphabet chars.
  CHAR_UPPERCASE_A: 65,
  /* A */
  CHAR_LOWERCASE_A: 97,
  /* a */
  CHAR_UPPERCASE_Z: 90,
  /* Z */
  CHAR_LOWERCASE_Z: 122,
  /* z */
  CHAR_LEFT_PARENTHESES: 40,
  /* ( */
  CHAR_RIGHT_PARENTHESES: 41,
  /* ) */
  CHAR_ASTERISK: 42,
  /* * */
  // Non-alphabetic chars.
  CHAR_AMPERSAND: 38,
  /* & */
  CHAR_AT: 64,
  /* @ */
  CHAR_BACKWARD_SLASH: 92,
  /* \ */
  CHAR_CARRIAGE_RETURN: 13,
  /* \r */
  CHAR_CIRCUMFLEX_ACCENT: 94,
  /* ^ */
  CHAR_COLON: 58,
  /* : */
  CHAR_COMMA: 44,
  /* , */
  CHAR_DOT: 46,
  /* . */
  CHAR_DOUBLE_QUOTE: 34,
  /* " */
  CHAR_EQUAL: 61,
  /* = */
  CHAR_EXCLAMATION_MARK: 33,
  /* ! */
  CHAR_FORM_FEED: 12,
  /* \f */
  CHAR_FORWARD_SLASH: 47,
  /* / */
  CHAR_GRAVE_ACCENT: 96,
  /* ` */
  CHAR_HASH: 35,
  /* # */
  CHAR_HYPHEN_MINUS: 45,
  /* - */
  CHAR_LEFT_ANGLE_BRACKET: 60,
  /* < */
  CHAR_LEFT_CURLY_BRACE: 123,
  /* { */
  CHAR_LEFT_SQUARE_BRACKET: 91,
  /* [ */
  CHAR_LINE_FEED: 10,
  /* \n */
  CHAR_NO_BREAK_SPACE: 160,
  /* \u00A0 */
  CHAR_PERCENT: 37,
  /* % */
  CHAR_PLUS: 43,
  /* + */
  CHAR_QUESTION_MARK: 63,
  /* ? */
  CHAR_RIGHT_ANGLE_BRACKET: 62,
  /* > */
  CHAR_RIGHT_CURLY_BRACE: 125,
  /* } */
  CHAR_RIGHT_SQUARE_BRACKET: 93,
  /* ] */
  CHAR_SEMICOLON: 59,
  /* ; */
  CHAR_SINGLE_QUOTE: 39,
  /* ' */
  CHAR_SPACE: 32,
  /*   */
  CHAR_TAB: 9,
  /* \t */
  CHAR_UNDERSCORE: 95,
  /* _ */
  CHAR_VERTICAL_LINE: 124,
  /* | */
  CHAR_ZERO_WIDTH_NOBREAK_SPACE: 65279,
  /* \uFEFF */
  SEP: path$4.sep,
  /**
   * Create EXTGLOB_CHARS
   */
  extglobChars(chars) {
    return {
      "!": { type: "negate", open: "(?:(?!(?:", close: `))${chars.STAR})` },
      "?": { type: "qmark", open: "(?:", close: ")?" },
      "+": { type: "plus", open: "(?:", close: ")+" },
      "*": { type: "star", open: "(?:", close: ")*" },
      "@": { type: "at", open: "(?:", close: ")" }
    };
  },
  /**
   * Create GLOB_CHARS
   */
  globChars(win32) {
    return win32 === true ? WINDOWS_CHARS : POSIX_CHARS;
  }
};
(function(exports$1) {
  const path2 = require$$0$8;
  const win32 = process.platform === "win32";
  const {
    REGEX_BACKSLASH,
    REGEX_REMOVE_BACKSLASH,
    REGEX_SPECIAL_CHARS,
    REGEX_SPECIAL_CHARS_GLOBAL
  } = constants$3;
  exports$1.isObject = (val) => val !== null && typeof val === "object" && !Array.isArray(val);
  exports$1.hasRegexChars = (str2) => REGEX_SPECIAL_CHARS.test(str2);
  exports$1.isRegexChar = (str2) => str2.length === 1 && exports$1.hasRegexChars(str2);
  exports$1.escapeRegex = (str2) => str2.replace(REGEX_SPECIAL_CHARS_GLOBAL, "\\$1");
  exports$1.toPosixSlashes = (str2) => str2.replace(REGEX_BACKSLASH, "/");
  exports$1.removeBackslashes = (str2) => {
    return str2.replace(REGEX_REMOVE_BACKSLASH, (match) => {
      return match === "\\" ? "" : match;
    });
  };
  exports$1.supportsLookbehinds = () => {
    const segs = process.version.slice(1).split(".").map(Number);
    if (segs.length === 3 && segs[0] >= 9 || segs[0] === 8 && segs[1] >= 10) {
      return true;
    }
    return false;
  };
  exports$1.isWindows = (options) => {
    if (options && typeof options.windows === "boolean") {
      return options.windows;
    }
    return win32 === true || path2.sep === "\\";
  };
  exports$1.escapeLast = (input, char, lastIdx) => {
    const idx = input.lastIndexOf(char, lastIdx);
    if (idx === -1) return input;
    if (input[idx - 1] === "\\") return exports$1.escapeLast(input, char, idx - 1);
    return `${input.slice(0, idx)}\\${input.slice(idx)}`;
  };
  exports$1.removePrefix = (input, state = {}) => {
    let output = input;
    if (output.startsWith("./")) {
      output = output.slice(2);
      state.prefix = "./";
    }
    return output;
  };
  exports$1.wrapOutput = (input, state = {}, options = {}) => {
    const prepend = options.contains ? "" : "^";
    const append2 = options.contains ? "" : "$";
    let output = `${prepend}(?:${input})${append2}`;
    if (state.negated === true) {
      output = `(?:^(?!${output}).*$)`;
    }
    return output;
  };
})(utils$4);
const utils$3 = utils$4;
const {
  CHAR_ASTERISK: CHAR_ASTERISK$1,
  /* * */
  CHAR_AT,
  /* @ */
  CHAR_BACKWARD_SLASH,
  /* \ */
  CHAR_COMMA: CHAR_COMMA$1,
  /* , */
  CHAR_DOT,
  /* . */
  CHAR_EXCLAMATION_MARK,
  /* ! */
  CHAR_FORWARD_SLASH,
  /* / */
  CHAR_LEFT_CURLY_BRACE,
  /* { */
  CHAR_LEFT_PARENTHESES,
  /* ( */
  CHAR_LEFT_SQUARE_BRACKET: CHAR_LEFT_SQUARE_BRACKET$1,
  /* [ */
  CHAR_PLUS,
  /* + */
  CHAR_QUESTION_MARK,
  /* ? */
  CHAR_RIGHT_CURLY_BRACE,
  /* } */
  CHAR_RIGHT_PARENTHESES,
  /* ) */
  CHAR_RIGHT_SQUARE_BRACKET: CHAR_RIGHT_SQUARE_BRACKET$1
  /* ] */
} = constants$3;
const isPathSeparator = (code) => {
  return code === CHAR_FORWARD_SLASH || code === CHAR_BACKWARD_SLASH;
};
const depth = (token) => {
  if (token.isPrefix !== true) {
    token.depth = token.isGlobstar ? Infinity : 1;
  }
};
const scan$1 = (input, options) => {
  const opts = options || {};
  const length = input.length - 1;
  const scanToEnd = opts.parts === true || opts.scanToEnd === true;
  const slashes = [];
  const tokens = [];
  const parts = [];
  let str2 = input;
  let index2 = -1;
  let start = 0;
  let lastIndex = 0;
  let isBrace = false;
  let isBracket = false;
  let isGlob = false;
  let isExtglob = false;
  let isGlobstar = false;
  let braceEscaped = false;
  let backslashes = false;
  let negated = false;
  let negatedExtglob = false;
  let finished = false;
  let braces2 = 0;
  let prev;
  let code;
  let token = { value: "", depth: 0, isGlob: false };
  const eos = () => index2 >= length;
  const peek = () => str2.charCodeAt(index2 + 1);
  const advance = () => {
    prev = code;
    return str2.charCodeAt(++index2);
  };
  while (index2 < length) {
    code = advance();
    let next;
    if (code === CHAR_BACKWARD_SLASH) {
      backslashes = token.backslashes = true;
      code = advance();
      if (code === CHAR_LEFT_CURLY_BRACE) {
        braceEscaped = true;
      }
      continue;
    }
    if (braceEscaped === true || code === CHAR_LEFT_CURLY_BRACE) {
      braces2++;
      while (eos() !== true && (code = advance())) {
        if (code === CHAR_BACKWARD_SLASH) {
          backslashes = token.backslashes = true;
          advance();
          continue;
        }
        if (code === CHAR_LEFT_CURLY_BRACE) {
          braces2++;
          continue;
        }
        if (braceEscaped !== true && code === CHAR_DOT && (code = advance()) === CHAR_DOT) {
          isBrace = token.isBrace = true;
          isGlob = token.isGlob = true;
          finished = true;
          if (scanToEnd === true) {
            continue;
          }
          break;
        }
        if (braceEscaped !== true && code === CHAR_COMMA$1) {
          isBrace = token.isBrace = true;
          isGlob = token.isGlob = true;
          finished = true;
          if (scanToEnd === true) {
            continue;
          }
          break;
        }
        if (code === CHAR_RIGHT_CURLY_BRACE) {
          braces2--;
          if (braces2 === 0) {
            braceEscaped = false;
            isBrace = token.isBrace = true;
            finished = true;
            break;
          }
        }
      }
      if (scanToEnd === true) {
        continue;
      }
      break;
    }
    if (code === CHAR_FORWARD_SLASH) {
      slashes.push(index2);
      tokens.push(token);
      token = { value: "", depth: 0, isGlob: false };
      if (finished === true) continue;
      if (prev === CHAR_DOT && index2 === start + 1) {
        start += 2;
        continue;
      }
      lastIndex = index2 + 1;
      continue;
    }
    if (opts.noext !== true) {
      const isExtglobChar = code === CHAR_PLUS || code === CHAR_AT || code === CHAR_ASTERISK$1 || code === CHAR_QUESTION_MARK || code === CHAR_EXCLAMATION_MARK;
      if (isExtglobChar === true && peek() === CHAR_LEFT_PARENTHESES) {
        isGlob = token.isGlob = true;
        isExtglob = token.isExtglob = true;
        finished = true;
        if (code === CHAR_EXCLAMATION_MARK && index2 === start) {
          negatedExtglob = true;
        }
        if (scanToEnd === true) {
          while (eos() !== true && (code = advance())) {
            if (code === CHAR_BACKWARD_SLASH) {
              backslashes = token.backslashes = true;
              code = advance();
              continue;
            }
            if (code === CHAR_RIGHT_PARENTHESES) {
              isGlob = token.isGlob = true;
              finished = true;
              break;
            }
          }
          continue;
        }
        break;
      }
    }
    if (code === CHAR_ASTERISK$1) {
      if (prev === CHAR_ASTERISK$1) isGlobstar = token.isGlobstar = true;
      isGlob = token.isGlob = true;
      finished = true;
      if (scanToEnd === true) {
        continue;
      }
      break;
    }
    if (code === CHAR_QUESTION_MARK) {
      isGlob = token.isGlob = true;
      finished = true;
      if (scanToEnd === true) {
        continue;
      }
      break;
    }
    if (code === CHAR_LEFT_SQUARE_BRACKET$1) {
      while (eos() !== true && (next = advance())) {
        if (next === CHAR_BACKWARD_SLASH) {
          backslashes = token.backslashes = true;
          advance();
          continue;
        }
        if (next === CHAR_RIGHT_SQUARE_BRACKET$1) {
          isBracket = token.isBracket = true;
          isGlob = token.isGlob = true;
          finished = true;
          break;
        }
      }
      if (scanToEnd === true) {
        continue;
      }
      break;
    }
    if (opts.nonegate !== true && code === CHAR_EXCLAMATION_MARK && index2 === start) {
      negated = token.negated = true;
      start++;
      continue;
    }
    if (opts.noparen !== true && code === CHAR_LEFT_PARENTHESES) {
      isGlob = token.isGlob = true;
      if (scanToEnd === true) {
        while (eos() !== true && (code = advance())) {
          if (code === CHAR_LEFT_PARENTHESES) {
            backslashes = token.backslashes = true;
            code = advance();
            continue;
          }
          if (code === CHAR_RIGHT_PARENTHESES) {
            finished = true;
            break;
          }
        }
        continue;
      }
      break;
    }
    if (isGlob === true) {
      finished = true;
      if (scanToEnd === true) {
        continue;
      }
      break;
    }
  }
  if (opts.noext === true) {
    isExtglob = false;
    isGlob = false;
  }
  let base = str2;
  let prefix = "";
  let glob = "";
  if (start > 0) {
    prefix = str2.slice(0, start);
    str2 = str2.slice(start);
    lastIndex -= start;
  }
  if (base && isGlob === true && lastIndex > 0) {
    base = str2.slice(0, lastIndex);
    glob = str2.slice(lastIndex);
  } else if (isGlob === true) {
    base = "";
    glob = str2;
  } else {
    base = str2;
  }
  if (base && base !== "" && base !== "/" && base !== str2) {
    if (isPathSeparator(base.charCodeAt(base.length - 1))) {
      base = base.slice(0, -1);
    }
  }
  if (opts.unescape === true) {
    if (glob) glob = utils$3.removeBackslashes(glob);
    if (base && backslashes === true) {
      base = utils$3.removeBackslashes(base);
    }
  }
  const state = {
    prefix,
    input,
    start,
    base,
    glob,
    isBrace,
    isBracket,
    isGlob,
    isExtglob,
    isGlobstar,
    negated,
    negatedExtglob
  };
  if (opts.tokens === true) {
    state.maxDepth = 0;
    if (!isPathSeparator(code)) {
      tokens.push(token);
    }
    state.tokens = tokens;
  }
  if (opts.parts === true || opts.tokens === true) {
    let prevIndex;
    for (let idx = 0; idx < slashes.length; idx++) {
      const n = prevIndex ? prevIndex + 1 : start;
      const i = slashes[idx];
      const value = input.slice(n, i);
      if (opts.tokens) {
        if (idx === 0 && start !== 0) {
          tokens[idx].isPrefix = true;
          tokens[idx].value = prefix;
        } else {
          tokens[idx].value = value;
        }
        depth(tokens[idx]);
        state.maxDepth += tokens[idx].depth;
      }
      if (idx !== 0 || value !== "") {
        parts.push(value);
      }
      prevIndex = i;
    }
    if (prevIndex && prevIndex + 1 < input.length) {
      const value = input.slice(prevIndex + 1);
      parts.push(value);
      if (opts.tokens) {
        tokens[tokens.length - 1].value = value;
        depth(tokens[tokens.length - 1]);
        state.maxDepth += tokens[tokens.length - 1].depth;
      }
    }
    state.slashes = slashes;
    state.parts = parts;
  }
  return state;
};
var scan_1 = scan$1;
const constants$2 = constants$3;
const utils$2 = utils$4;
const {
  MAX_LENGTH,
  POSIX_REGEX_SOURCE,
  REGEX_NON_SPECIAL_CHARS,
  REGEX_SPECIAL_CHARS_BACKREF,
  REPLACEMENTS
} = constants$2;
const expandRange = (args, options) => {
  if (typeof options.expandRange === "function") {
    return options.expandRange(...args, options);
  }
  args.sort();
  const value = `[${args.join("-")}]`;
  try {
    new RegExp(value);
  } catch (ex) {
    return args.map((v) => utils$2.escapeRegex(v)).join("..");
  }
  return value;
};
const syntaxError = (type2, char) => {
  return `Missing ${type2}: "${char}" - use "\\\\${char}" to match literal characters`;
};
const parse$2 = (input, options) => {
  if (typeof input !== "string") {
    throw new TypeError("Expected a string");
  }
  input = REPLACEMENTS[input] || input;
  const opts = { ...options };
  const max = typeof opts.maxLength === "number" ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
  let len = input.length;
  if (len > max) {
    throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
  }
  const bos = { type: "bos", value: "", output: opts.prepend || "" };
  const tokens = [bos];
  const capture = opts.capture ? "" : "?:";
  const win32 = utils$2.isWindows(options);
  const PLATFORM_CHARS = constants$2.globChars(win32);
  const EXTGLOB_CHARS = constants$2.extglobChars(PLATFORM_CHARS);
  const {
    DOT_LITERAL: DOT_LITERAL2,
    PLUS_LITERAL: PLUS_LITERAL2,
    SLASH_LITERAL: SLASH_LITERAL2,
    ONE_CHAR: ONE_CHAR2,
    DOTS_SLASH: DOTS_SLASH2,
    NO_DOT: NO_DOT2,
    NO_DOT_SLASH: NO_DOT_SLASH2,
    NO_DOTS_SLASH: NO_DOTS_SLASH2,
    QMARK: QMARK2,
    QMARK_NO_DOT: QMARK_NO_DOT2,
    STAR: STAR2,
    START_ANCHOR: START_ANCHOR2
  } = PLATFORM_CHARS;
  const globstar = (opts2) => {
    return `(${capture}(?:(?!${START_ANCHOR2}${opts2.dot ? DOTS_SLASH2 : DOT_LITERAL2}).)*?)`;
  };
  const nodot = opts.dot ? "" : NO_DOT2;
  const qmarkNoDot = opts.dot ? QMARK2 : QMARK_NO_DOT2;
  let star = opts.bash === true ? globstar(opts) : STAR2;
  if (opts.capture) {
    star = `(${star})`;
  }
  if (typeof opts.noext === "boolean") {
    opts.noextglob = opts.noext;
  }
  const state = {
    input,
    index: -1,
    start: 0,
    dot: opts.dot === true,
    consumed: "",
    output: "",
    prefix: "",
    backtrack: false,
    negated: false,
    brackets: 0,
    braces: 0,
    parens: 0,
    quotes: 0,
    globstar: false,
    tokens
  };
  input = utils$2.removePrefix(input, state);
  len = input.length;
  const extglobs = [];
  const braces2 = [];
  const stack = [];
  let prev = bos;
  let value;
  const eos = () => state.index === len - 1;
  const peek = state.peek = (n = 1) => input[state.index + n];
  const advance = state.advance = () => input[++state.index] || "";
  const remaining = () => input.slice(state.index + 1);
  const consume = (value2 = "", num = 0) => {
    state.consumed += value2;
    state.index += num;
  };
  const append2 = (token) => {
    state.output += token.output != null ? token.output : token.value;
    consume(token.value);
  };
  const negate = () => {
    let count = 1;
    while (peek() === "!" && (peek(2) !== "(" || peek(3) === "?")) {
      advance();
      state.start++;
      count++;
    }
    if (count % 2 === 0) {
      return false;
    }
    state.negated = true;
    state.start++;
    return true;
  };
  const increment = (type2) => {
    state[type2]++;
    stack.push(type2);
  };
  const decrement = (type2) => {
    state[type2]--;
    stack.pop();
  };
  const push2 = (tok) => {
    if (prev.type === "globstar") {
      const isBrace = state.braces > 0 && (tok.type === "comma" || tok.type === "brace");
      const isExtglob = tok.extglob === true || extglobs.length && (tok.type === "pipe" || tok.type === "paren");
      if (tok.type !== "slash" && tok.type !== "paren" && !isBrace && !isExtglob) {
        state.output = state.output.slice(0, -prev.output.length);
        prev.type = "star";
        prev.value = "*";
        prev.output = star;
        state.output += prev.output;
      }
    }
    if (extglobs.length && tok.type !== "paren") {
      extglobs[extglobs.length - 1].inner += tok.value;
    }
    if (tok.value || tok.output) append2(tok);
    if (prev && prev.type === "text" && tok.type === "text") {
      prev.value += tok.value;
      prev.output = (prev.output || "") + tok.value;
      return;
    }
    tok.prev = prev;
    tokens.push(tok);
    prev = tok;
  };
  const extglobOpen = (type2, value2) => {
    const token = { ...EXTGLOB_CHARS[value2], conditions: 1, inner: "" };
    token.prev = prev;
    token.parens = state.parens;
    token.output = state.output;
    const output = (opts.capture ? "(" : "") + token.open;
    increment("parens");
    push2({ type: type2, value: value2, output: state.output ? "" : ONE_CHAR2 });
    push2({ type: "paren", extglob: true, value: advance(), output });
    extglobs.push(token);
  };
  const extglobClose = (token) => {
    let output = token.close + (opts.capture ? ")" : "");
    let rest;
    if (token.type === "negate") {
      let extglobStar = star;
      if (token.inner && token.inner.length > 1 && token.inner.includes("/")) {
        extglobStar = globstar(opts);
      }
      if (extglobStar !== star || eos() || /^\)+$/.test(remaining())) {
        output = token.close = `)$))${extglobStar}`;
      }
      if (token.inner.includes("*") && (rest = remaining()) && /^\.[^\\/.]+$/.test(rest)) {
        const expression = parse$2(rest, { ...options, fastpaths: false }).output;
        output = token.close = `)${expression})${extglobStar})`;
      }
      if (token.prev.type === "bos") {
        state.negatedExtglob = true;
      }
    }
    push2({ type: "paren", extglob: true, value, output });
    decrement("parens");
  };
  if (opts.fastpaths !== false && !/(^[*!]|[/()[\]{}"])/.test(input)) {
    let backslashes = false;
    let output = input.replace(REGEX_SPECIAL_CHARS_BACKREF, (m, esc, chars, first, rest, index2) => {
      if (first === "\\") {
        backslashes = true;
        return m;
      }
      if (first === "?") {
        if (esc) {
          return esc + first + (rest ? QMARK2.repeat(rest.length) : "");
        }
        if (index2 === 0) {
          return qmarkNoDot + (rest ? QMARK2.repeat(rest.length) : "");
        }
        return QMARK2.repeat(chars.length);
      }
      if (first === ".") {
        return DOT_LITERAL2.repeat(chars.length);
      }
      if (first === "*") {
        if (esc) {
          return esc + first + (rest ? star : "");
        }
        return star;
      }
      return esc ? m : `\\${m}`;
    });
    if (backslashes === true) {
      if (opts.unescape === true) {
        output = output.replace(/\\/g, "");
      } else {
        output = output.replace(/\\+/g, (m) => {
          return m.length % 2 === 0 ? "\\\\" : m ? "\\" : "";
        });
      }
    }
    if (output === input && opts.contains === true) {
      state.output = input;
      return state;
    }
    state.output = utils$2.wrapOutput(output, state, options);
    return state;
  }
  while (!eos()) {
    value = advance();
    if (value === "\0") {
      continue;
    }
    if (value === "\\") {
      const next = peek();
      if (next === "/" && opts.bash !== true) {
        continue;
      }
      if (next === "." || next === ";") {
        continue;
      }
      if (!next) {
        value += "\\";
        push2({ type: "text", value });
        continue;
      }
      const match = /^\\+/.exec(remaining());
      let slashes = 0;
      if (match && match[0].length > 2) {
        slashes = match[0].length;
        state.index += slashes;
        if (slashes % 2 !== 0) {
          value += "\\";
        }
      }
      if (opts.unescape === true) {
        value = advance();
      } else {
        value += advance();
      }
      if (state.brackets === 0) {
        push2({ type: "text", value });
        continue;
      }
    }
    if (state.brackets > 0 && (value !== "]" || prev.value === "[" || prev.value === "[^")) {
      if (opts.posix !== false && value === ":") {
        const inner = prev.value.slice(1);
        if (inner.includes("[")) {
          prev.posix = true;
          if (inner.includes(":")) {
            const idx = prev.value.lastIndexOf("[");
            const pre = prev.value.slice(0, idx);
            const rest2 = prev.value.slice(idx + 2);
            const posix = POSIX_REGEX_SOURCE[rest2];
            if (posix) {
              prev.value = pre + posix;
              state.backtrack = true;
              advance();
              if (!bos.output && tokens.indexOf(prev) === 1) {
                bos.output = ONE_CHAR2;
              }
              continue;
            }
          }
        }
      }
      if (value === "[" && peek() !== ":" || value === "-" && peek() === "]") {
        value = `\\${value}`;
      }
      if (value === "]" && (prev.value === "[" || prev.value === "[^")) {
        value = `\\${value}`;
      }
      if (opts.posix === true && value === "!" && prev.value === "[") {
        value = "^";
      }
      prev.value += value;
      append2({ value });
      continue;
    }
    if (state.quotes === 1 && value !== '"') {
      value = utils$2.escapeRegex(value);
      prev.value += value;
      append2({ value });
      continue;
    }
    if (value === '"') {
      state.quotes = state.quotes === 1 ? 0 : 1;
      if (opts.keepQuotes === true) {
        push2({ type: "text", value });
      }
      continue;
    }
    if (value === "(") {
      increment("parens");
      push2({ type: "paren", value });
      continue;
    }
    if (value === ")") {
      if (state.parens === 0 && opts.strictBrackets === true) {
        throw new SyntaxError(syntaxError("opening", "("));
      }
      const extglob = extglobs[extglobs.length - 1];
      if (extglob && state.parens === extglob.parens + 1) {
        extglobClose(extglobs.pop());
        continue;
      }
      push2({ type: "paren", value, output: state.parens ? ")" : "\\)" });
      decrement("parens");
      continue;
    }
    if (value === "[") {
      if (opts.nobracket === true || !remaining().includes("]")) {
        if (opts.nobracket !== true && opts.strictBrackets === true) {
          throw new SyntaxError(syntaxError("closing", "]"));
        }
        value = `\\${value}`;
      } else {
        increment("brackets");
      }
      push2({ type: "bracket", value });
      continue;
    }
    if (value === "]") {
      if (opts.nobracket === true || prev && prev.type === "bracket" && prev.value.length === 1) {
        push2({ type: "text", value, output: `\\${value}` });
        continue;
      }
      if (state.brackets === 0) {
        if (opts.strictBrackets === true) {
          throw new SyntaxError(syntaxError("opening", "["));
        }
        push2({ type: "text", value, output: `\\${value}` });
        continue;
      }
      decrement("brackets");
      const prevValue = prev.value.slice(1);
      if (prev.posix !== true && prevValue[0] === "^" && !prevValue.includes("/")) {
        value = `/${value}`;
      }
      prev.value += value;
      append2({ value });
      if (opts.literalBrackets === false || utils$2.hasRegexChars(prevValue)) {
        continue;
      }
      const escaped = utils$2.escapeRegex(prev.value);
      state.output = state.output.slice(0, -prev.value.length);
      if (opts.literalBrackets === true) {
        state.output += escaped;
        prev.value = escaped;
        continue;
      }
      prev.value = `(${capture}${escaped}|${prev.value})`;
      state.output += prev.value;
      continue;
    }
    if (value === "{" && opts.nobrace !== true) {
      increment("braces");
      const open = {
        type: "brace",
        value,
        output: "(",
        outputIndex: state.output.length,
        tokensIndex: state.tokens.length
      };
      braces2.push(open);
      push2(open);
      continue;
    }
    if (value === "}") {
      const brace = braces2[braces2.length - 1];
      if (opts.nobrace === true || !brace) {
        push2({ type: "text", value, output: value });
        continue;
      }
      let output = ")";
      if (brace.dots === true) {
        const arr = tokens.slice();
        const range = [];
        for (let i = arr.length - 1; i >= 0; i--) {
          tokens.pop();
          if (arr[i].type === "brace") {
            break;
          }
          if (arr[i].type !== "dots") {
            range.unshift(arr[i].value);
          }
        }
        output = expandRange(range, opts);
        state.backtrack = true;
      }
      if (brace.comma !== true && brace.dots !== true) {
        const out = state.output.slice(0, brace.outputIndex);
        const toks = state.tokens.slice(brace.tokensIndex);
        brace.value = brace.output = "\\{";
        value = output = "\\}";
        state.output = out;
        for (const t of toks) {
          state.output += t.output || t.value;
        }
      }
      push2({ type: "brace", value, output });
      decrement("braces");
      braces2.pop();
      continue;
    }
    if (value === "|") {
      if (extglobs.length > 0) {
        extglobs[extglobs.length - 1].conditions++;
      }
      push2({ type: "text", value });
      continue;
    }
    if (value === ",") {
      let output = value;
      const brace = braces2[braces2.length - 1];
      if (brace && stack[stack.length - 1] === "braces") {
        brace.comma = true;
        output = "|";
      }
      push2({ type: "comma", value, output });
      continue;
    }
    if (value === "/") {
      if (prev.type === "dot" && state.index === state.start + 1) {
        state.start = state.index + 1;
        state.consumed = "";
        state.output = "";
        tokens.pop();
        prev = bos;
        continue;
      }
      push2({ type: "slash", value, output: SLASH_LITERAL2 });
      continue;
    }
    if (value === ".") {
      if (state.braces > 0 && prev.type === "dot") {
        if (prev.value === ".") prev.output = DOT_LITERAL2;
        const brace = braces2[braces2.length - 1];
        prev.type = "dots";
        prev.output += value;
        prev.value += value;
        brace.dots = true;
        continue;
      }
      if (state.braces + state.parens === 0 && prev.type !== "bos" && prev.type !== "slash") {
        push2({ type: "text", value, output: DOT_LITERAL2 });
        continue;
      }
      push2({ type: "dot", value, output: DOT_LITERAL2 });
      continue;
    }
    if (value === "?") {
      const isGroup = prev && prev.value === "(";
      if (!isGroup && opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
        extglobOpen("qmark", value);
        continue;
      }
      if (prev && prev.type === "paren") {
        const next = peek();
        let output = value;
        if (next === "<" && !utils$2.supportsLookbehinds()) {
          throw new Error("Node.js v10 or higher is required for regex lookbehinds");
        }
        if (prev.value === "(" && !/[!=<:]/.test(next) || next === "<" && !/<([!=]|\w+>)/.test(remaining())) {
          output = `\\${value}`;
        }
        push2({ type: "text", value, output });
        continue;
      }
      if (opts.dot !== true && (prev.type === "slash" || prev.type === "bos")) {
        push2({ type: "qmark", value, output: QMARK_NO_DOT2 });
        continue;
      }
      push2({ type: "qmark", value, output: QMARK2 });
      continue;
    }
    if (value === "!") {
      if (opts.noextglob !== true && peek() === "(") {
        if (peek(2) !== "?" || !/[!=<:]/.test(peek(3))) {
          extglobOpen("negate", value);
          continue;
        }
      }
      if (opts.nonegate !== true && state.index === 0) {
        negate();
        continue;
      }
    }
    if (value === "+") {
      if (opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
        extglobOpen("plus", value);
        continue;
      }
      if (prev && prev.value === "(" || opts.regex === false) {
        push2({ type: "plus", value, output: PLUS_LITERAL2 });
        continue;
      }
      if (prev && (prev.type === "bracket" || prev.type === "paren" || prev.type === "brace") || state.parens > 0) {
        push2({ type: "plus", value });
        continue;
      }
      push2({ type: "plus", value: PLUS_LITERAL2 });
      continue;
    }
    if (value === "@") {
      if (opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
        push2({ type: "at", extglob: true, value, output: "" });
        continue;
      }
      push2({ type: "text", value });
      continue;
    }
    if (value !== "*") {
      if (value === "$" || value === "^") {
        value = `\\${value}`;
      }
      const match = REGEX_NON_SPECIAL_CHARS.exec(remaining());
      if (match) {
        value += match[0];
        state.index += match[0].length;
      }
      push2({ type: "text", value });
      continue;
    }
    if (prev && (prev.type === "globstar" || prev.star === true)) {
      prev.type = "star";
      prev.star = true;
      prev.value += value;
      prev.output = star;
      state.backtrack = true;
      state.globstar = true;
      consume(value);
      continue;
    }
    let rest = remaining();
    if (opts.noextglob !== true && /^\([^?]/.test(rest)) {
      extglobOpen("star", value);
      continue;
    }
    if (prev.type === "star") {
      if (opts.noglobstar === true) {
        consume(value);
        continue;
      }
      const prior = prev.prev;
      const before = prior.prev;
      const isStart = prior.type === "slash" || prior.type === "bos";
      const afterStar = before && (before.type === "star" || before.type === "globstar");
      if (opts.bash === true && (!isStart || rest[0] && rest[0] !== "/")) {
        push2({ type: "star", value, output: "" });
        continue;
      }
      const isBrace = state.braces > 0 && (prior.type === "comma" || prior.type === "brace");
      const isExtglob = extglobs.length && (prior.type === "pipe" || prior.type === "paren");
      if (!isStart && prior.type !== "paren" && !isBrace && !isExtglob) {
        push2({ type: "star", value, output: "" });
        continue;
      }
      while (rest.slice(0, 3) === "/**") {
        const after = input[state.index + 4];
        if (after && after !== "/") {
          break;
        }
        rest = rest.slice(3);
        consume("/**", 3);
      }
      if (prior.type === "bos" && eos()) {
        prev.type = "globstar";
        prev.value += value;
        prev.output = globstar(opts);
        state.output = prev.output;
        state.globstar = true;
        consume(value);
        continue;
      }
      if (prior.type === "slash" && prior.prev.type !== "bos" && !afterStar && eos()) {
        state.output = state.output.slice(0, -(prior.output + prev.output).length);
        prior.output = `(?:${prior.output}`;
        prev.type = "globstar";
        prev.output = globstar(opts) + (opts.strictSlashes ? ")" : "|$)");
        prev.value += value;
        state.globstar = true;
        state.output += prior.output + prev.output;
        consume(value);
        continue;
      }
      if (prior.type === "slash" && prior.prev.type !== "bos" && rest[0] === "/") {
        const end = rest[1] !== void 0 ? "|$" : "";
        state.output = state.output.slice(0, -(prior.output + prev.output).length);
        prior.output = `(?:${prior.output}`;
        prev.type = "globstar";
        prev.output = `${globstar(opts)}${SLASH_LITERAL2}|${SLASH_LITERAL2}${end})`;
        prev.value += value;
        state.output += prior.output + prev.output;
        state.globstar = true;
        consume(value + advance());
        push2({ type: "slash", value: "/", output: "" });
        continue;
      }
      if (prior.type === "bos" && rest[0] === "/") {
        prev.type = "globstar";
        prev.value += value;
        prev.output = `(?:^|${SLASH_LITERAL2}|${globstar(opts)}${SLASH_LITERAL2})`;
        state.output = prev.output;
        state.globstar = true;
        consume(value + advance());
        push2({ type: "slash", value: "/", output: "" });
        continue;
      }
      state.output = state.output.slice(0, -prev.output.length);
      prev.type = "globstar";
      prev.output = globstar(opts);
      prev.value += value;
      state.output += prev.output;
      state.globstar = true;
      consume(value);
      continue;
    }
    const token = { type: "star", value, output: star };
    if (opts.bash === true) {
      token.output = ".*?";
      if (prev.type === "bos" || prev.type === "slash") {
        token.output = nodot + token.output;
      }
      push2(token);
      continue;
    }
    if (prev && (prev.type === "bracket" || prev.type === "paren") && opts.regex === true) {
      token.output = value;
      push2(token);
      continue;
    }
    if (state.index === state.start || prev.type === "slash" || prev.type === "dot") {
      if (prev.type === "dot") {
        state.output += NO_DOT_SLASH2;
        prev.output += NO_DOT_SLASH2;
      } else if (opts.dot === true) {
        state.output += NO_DOTS_SLASH2;
        prev.output += NO_DOTS_SLASH2;
      } else {
        state.output += nodot;
        prev.output += nodot;
      }
      if (peek() !== "*") {
        state.output += ONE_CHAR2;
        prev.output += ONE_CHAR2;
      }
    }
    push2(token);
  }
  while (state.brackets > 0) {
    if (opts.strictBrackets === true) throw new SyntaxError(syntaxError("closing", "]"));
    state.output = utils$2.escapeLast(state.output, "[");
    decrement("brackets");
  }
  while (state.parens > 0) {
    if (opts.strictBrackets === true) throw new SyntaxError(syntaxError("closing", ")"));
    state.output = utils$2.escapeLast(state.output, "(");
    decrement("parens");
  }
  while (state.braces > 0) {
    if (opts.strictBrackets === true) throw new SyntaxError(syntaxError("closing", "}"));
    state.output = utils$2.escapeLast(state.output, "{");
    decrement("braces");
  }
  if (opts.strictSlashes !== true && (prev.type === "star" || prev.type === "bracket")) {
    push2({ type: "maybe_slash", value: "", output: `${SLASH_LITERAL2}?` });
  }
  if (state.backtrack === true) {
    state.output = "";
    for (const token of state.tokens) {
      state.output += token.output != null ? token.output : token.value;
      if (token.suffix) {
        state.output += token.suffix;
      }
    }
  }
  return state;
};
parse$2.fastpaths = (input, options) => {
  const opts = { ...options };
  const max = typeof opts.maxLength === "number" ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
  const len = input.length;
  if (len > max) {
    throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
  }
  input = REPLACEMENTS[input] || input;
  const win32 = utils$2.isWindows(options);
  const {
    DOT_LITERAL: DOT_LITERAL2,
    SLASH_LITERAL: SLASH_LITERAL2,
    ONE_CHAR: ONE_CHAR2,
    DOTS_SLASH: DOTS_SLASH2,
    NO_DOT: NO_DOT2,
    NO_DOTS: NO_DOTS2,
    NO_DOTS_SLASH: NO_DOTS_SLASH2,
    STAR: STAR2,
    START_ANCHOR: START_ANCHOR2
  } = constants$2.globChars(win32);
  const nodot = opts.dot ? NO_DOTS2 : NO_DOT2;
  const slashDot = opts.dot ? NO_DOTS_SLASH2 : NO_DOT2;
  const capture = opts.capture ? "" : "?:";
  const state = { negated: false, prefix: "" };
  let star = opts.bash === true ? ".*?" : STAR2;
  if (opts.capture) {
    star = `(${star})`;
  }
  const globstar = (opts2) => {
    if (opts2.noglobstar === true) return star;
    return `(${capture}(?:(?!${START_ANCHOR2}${opts2.dot ? DOTS_SLASH2 : DOT_LITERAL2}).)*?)`;
  };
  const create2 = (str2) => {
    switch (str2) {
      case "*":
        return `${nodot}${ONE_CHAR2}${star}`;
      case ".*":
        return `${DOT_LITERAL2}${ONE_CHAR2}${star}`;
      case "*.*":
        return `${nodot}${star}${DOT_LITERAL2}${ONE_CHAR2}${star}`;
      case "*/*":
        return `${nodot}${star}${SLASH_LITERAL2}${ONE_CHAR2}${slashDot}${star}`;
      case "**":
        return nodot + globstar(opts);
      case "**/*":
        return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL2})?${slashDot}${ONE_CHAR2}${star}`;
      case "**/*.*":
        return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL2})?${slashDot}${star}${DOT_LITERAL2}${ONE_CHAR2}${star}`;
      case "**/.*":
        return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL2})?${DOT_LITERAL2}${ONE_CHAR2}${star}`;
      default: {
        const match = /^(.*?)\.(\w+)$/.exec(str2);
        if (!match) return;
        const source2 = create2(match[1]);
        if (!source2) return;
        return source2 + DOT_LITERAL2 + match[2];
      }
    }
  };
  const output = utils$2.removePrefix(input, state);
  let source = create2(output);
  if (source && opts.strictSlashes !== true) {
    source += `${SLASH_LITERAL2}?`;
  }
  return source;
};
var parse_1 = parse$2;
const path$3 = require$$0$8;
const scan = scan_1;
const parse$1 = parse_1;
const utils$1 = utils$4;
const constants$1 = constants$3;
const isObject$1 = (val) => val && typeof val === "object" && !Array.isArray(val);
const picomatch$2 = (glob, options, returnState = false) => {
  if (Array.isArray(glob)) {
    const fns = glob.map((input) => picomatch$2(input, options, returnState));
    const arrayMatcher = (str2) => {
      for (const isMatch of fns) {
        const state2 = isMatch(str2);
        if (state2) return state2;
      }
      return false;
    };
    return arrayMatcher;
  }
  const isState = isObject$1(glob) && glob.tokens && glob.input;
  if (glob === "" || typeof glob !== "string" && !isState) {
    throw new TypeError("Expected pattern to be a non-empty string");
  }
  const opts = options || {};
  const posix = utils$1.isWindows(options);
  const regex = isState ? picomatch$2.compileRe(glob, options) : picomatch$2.makeRe(glob, options, false, true);
  const state = regex.state;
  delete regex.state;
  let isIgnored = () => false;
  if (opts.ignore) {
    const ignoreOpts = { ...options, ignore: null, onMatch: null, onResult: null };
    isIgnored = picomatch$2(opts.ignore, ignoreOpts, returnState);
  }
  const matcher = (input, returnObject = false) => {
    const { isMatch, match, output } = picomatch$2.test(input, regex, options, { glob, posix });
    const result = { glob, state, regex, posix, input, output, match, isMatch };
    if (typeof opts.onResult === "function") {
      opts.onResult(result);
    }
    if (isMatch === false) {
      result.isMatch = false;
      return returnObject ? result : false;
    }
    if (isIgnored(input)) {
      if (typeof opts.onIgnore === "function") {
        opts.onIgnore(result);
      }
      result.isMatch = false;
      return returnObject ? result : false;
    }
    if (typeof opts.onMatch === "function") {
      opts.onMatch(result);
    }
    return returnObject ? result : true;
  };
  if (returnState) {
    matcher.state = state;
  }
  return matcher;
};
picomatch$2.test = (input, regex, options, { glob, posix } = {}) => {
  if (typeof input !== "string") {
    throw new TypeError("Expected input to be a string");
  }
  if (input === "") {
    return { isMatch: false, output: "" };
  }
  const opts = options || {};
  const format = opts.format || (posix ? utils$1.toPosixSlashes : null);
  let match = input === glob;
  let output = match && format ? format(input) : input;
  if (match === false) {
    output = format ? format(input) : input;
    match = output === glob;
  }
  if (match === false || opts.capture === true) {
    if (opts.matchBase === true || opts.basename === true) {
      match = picomatch$2.matchBase(input, regex, options, posix);
    } else {
      match = regex.exec(output);
    }
  }
  return { isMatch: Boolean(match), match, output };
};
picomatch$2.matchBase = (input, glob, options, posix = utils$1.isWindows(options)) => {
  const regex = glob instanceof RegExp ? glob : picomatch$2.makeRe(glob, options);
  return regex.test(path$3.basename(input));
};
picomatch$2.isMatch = (str2, patterns, options) => picomatch$2(patterns, options)(str2);
picomatch$2.parse = (pattern, options) => {
  if (Array.isArray(pattern)) return pattern.map((p) => picomatch$2.parse(p, options));
  return parse$1(pattern, { ...options, fastpaths: false });
};
picomatch$2.scan = (input, options) => scan(input, options);
picomatch$2.compileRe = (state, options, returnOutput = false, returnState = false) => {
  if (returnOutput === true) {
    return state.output;
  }
  const opts = options || {};
  const prepend = opts.contains ? "" : "^";
  const append2 = opts.contains ? "" : "$";
  let source = `${prepend}(?:${state.output})${append2}`;
  if (state && state.negated === true) {
    source = `^(?!${source}).*$`;
  }
  const regex = picomatch$2.toRegex(source, options);
  if (returnState === true) {
    regex.state = state;
  }
  return regex;
};
picomatch$2.makeRe = (input, options = {}, returnOutput = false, returnState = false) => {
  if (!input || typeof input !== "string") {
    throw new TypeError("Expected a non-empty string");
  }
  let parsed = { negated: false, fastpaths: true };
  if (options.fastpaths !== false && (input[0] === "." || input[0] === "*")) {
    parsed.output = parse$1.fastpaths(input, options);
  }
  if (!parsed.output) {
    parsed = parse$1(input, options);
  }
  return picomatch$2.compileRe(parsed, options, returnOutput, returnState);
};
picomatch$2.toRegex = (source, options) => {
  try {
    const opts = options || {};
    return new RegExp(source, opts.flags || (opts.nocase ? "i" : ""));
  } catch (err) {
    if (options && options.debug === true) throw err;
    return /$^/;
  }
};
picomatch$2.constants = constants$1;
var picomatch_1 = picomatch$2;
var picomatch$1 = picomatch_1;
const util$1 = require$$2$1;
const braces = braces_1;
const picomatch = picomatch$1;
const utils = utils$4;
const isEmptyString = (v) => v === "" || v === "./";
const hasBraces = (v) => {
  const index2 = v.indexOf("{");
  return index2 > -1 && v.indexOf("}", index2) > -1;
};
const micromatch = (list, patterns, options) => {
  patterns = [].concat(patterns);
  list = [].concat(list);
  let omit = /* @__PURE__ */ new Set();
  let keep = /* @__PURE__ */ new Set();
  let items = /* @__PURE__ */ new Set();
  let negatives = 0;
  let onResult = (state) => {
    items.add(state.output);
    if (options && options.onResult) {
      options.onResult(state);
    }
  };
  for (let i = 0; i < patterns.length; i++) {
    let isMatch = picomatch(String(patterns[i]), { ...options, onResult }, true);
    let negated = isMatch.state.negated || isMatch.state.negatedExtglob;
    if (negated) negatives++;
    for (let item of list) {
      let matched = isMatch(item, true);
      let match = negated ? !matched.isMatch : matched.isMatch;
      if (!match) continue;
      if (negated) {
        omit.add(matched.output);
      } else {
        omit.delete(matched.output);
        keep.add(matched.output);
      }
    }
  }
  let result = negatives === patterns.length ? [...items] : [...keep];
  let matches = result.filter((item) => !omit.has(item));
  if (options && matches.length === 0) {
    if (options.failglob === true) {
      throw new Error(`No matches found for "${patterns.join(", ")}"`);
    }
    if (options.nonull === true || options.nullglob === true) {
      return options.unescape ? patterns.map((p) => p.replace(/\\/g, "")) : patterns;
    }
  }
  return matches;
};
micromatch.match = micromatch;
micromatch.matcher = (pattern, options) => picomatch(pattern, options);
micromatch.isMatch = (str2, patterns, options) => picomatch(patterns, options)(str2);
micromatch.any = micromatch.isMatch;
micromatch.not = (list, patterns, options = {}) => {
  patterns = [].concat(patterns).map(String);
  let result = /* @__PURE__ */ new Set();
  let items = [];
  let onResult = (state) => {
    if (options.onResult) options.onResult(state);
    items.push(state.output);
  };
  let matches = new Set(micromatch(list, patterns, { ...options, onResult }));
  for (let item of items) {
    if (!matches.has(item)) {
      result.add(item);
    }
  }
  return [...result];
};
micromatch.contains = (str2, pattern, options) => {
  if (typeof str2 !== "string") {
    throw new TypeError(`Expected a string: "${util$1.inspect(str2)}"`);
  }
  if (Array.isArray(pattern)) {
    return pattern.some((p) => micromatch.contains(str2, p, options));
  }
  if (typeof pattern === "string") {
    if (isEmptyString(str2) || isEmptyString(pattern)) {
      return false;
    }
    if (str2.includes(pattern) || str2.startsWith("./") && str2.slice(2).includes(pattern)) {
      return true;
    }
  }
  return micromatch.isMatch(str2, pattern, { ...options, contains: true });
};
micromatch.matchKeys = (obj, patterns, options) => {
  if (!utils.isObject(obj)) {
    throw new TypeError("Expected the first argument to be an object");
  }
  let keys2 = micromatch(Object.keys(obj), patterns, options);
  let res = {};
  for (let key of keys2) res[key] = obj[key];
  return res;
};
micromatch.some = (list, patterns, options) => {
  let items = [].concat(list);
  for (let pattern of [].concat(patterns)) {
    let isMatch = picomatch(String(pattern), options);
    if (items.some((item) => isMatch(item))) {
      return true;
    }
  }
  return false;
};
micromatch.every = (list, patterns, options) => {
  let items = [].concat(list);
  for (let pattern of [].concat(patterns)) {
    let isMatch = picomatch(String(pattern), options);
    if (!items.every((item) => isMatch(item))) {
      return false;
    }
  }
  return true;
};
micromatch.all = (str2, patterns, options) => {
  if (typeof str2 !== "string") {
    throw new TypeError(`Expected a string: "${util$1.inspect(str2)}"`);
  }
  return [].concat(patterns).every((p) => picomatch(p, options)(str2));
};
micromatch.capture = (glob, input, options) => {
  let posix = utils.isWindows(options);
  let regex = picomatch.makeRe(String(glob), { ...options, capture: true });
  let match = regex.exec(posix ? utils.toPosixSlashes(input) : input);
  if (match) {
    return match.slice(1).map((v) => v === void 0 ? "" : v);
  }
};
micromatch.makeRe = (...args) => picomatch.makeRe(...args);
micromatch.scan = (...args) => picomatch.scan(...args);
micromatch.parse = (patterns, options) => {
  let res = [];
  for (let pattern of [].concat(patterns || [])) {
    for (let str2 of braces(String(pattern), options)) {
      res.push(picomatch.parse(str2, options));
    }
  }
  return res;
};
micromatch.braces = (pattern, options) => {
  if (typeof pattern !== "string") throw new TypeError("Expected a string");
  if (options && options.nobrace === true || !hasBraces(pattern)) {
    return [pattern];
  }
  return braces(pattern, options);
};
micromatch.braceExpand = (pattern, options) => {
  if (typeof pattern !== "string") throw new TypeError("Expected a string");
  return micromatch.braces(pattern, { ...options, expand: true });
};
micromatch.hasBraces = hasBraces;
var micromatch_1$1 = micromatch;
var __importDefault = commonjsGlobal && commonjsGlobal.__importDefault || function(mod) {
  return mod && mod.__esModule ? mod : { "default": mod };
};
Object.defineProperty(core$1, "__esModule", { value: true });
core$1.readPackageJSON = core$1.extractWorkspaces = core$1.isMatchWorkspaces = core$1.checkWorkspaces = core$1.findWorkspaceRoot = void 0;
const path_1 = __importDefault(require$$0$8);
const pkg_dir_1 = __importDefault(pkgDirExports);
const fs_1 = require$$0$7;
const micromatch_1 = __importDefault(micromatch_1$1);
function findWorkspaceRoot(initial) {
  if (!initial) {
    initial = process.cwd();
  }
  let _pkg = pkg_dir_1.default.sync(initial);
  if (!_pkg) {
    return null;
  }
  initial = path_1.default.normalize(_pkg);
  let previous = null;
  let current = initial;
  do {
    const manifest = readPackageJSON(current);
    extractWorkspaces(manifest);
    let { done, found } = checkWorkspaces(current, initial);
    if (done) {
      return found;
    }
    previous = current;
    current = path_1.default.dirname(current);
  } while (current !== previous);
  return null;
}
core$1.findWorkspaceRoot = findWorkspaceRoot;
function checkWorkspaces(current, initial) {
  const manifest = readPackageJSON(current);
  const workspaces = extractWorkspaces(manifest);
  let done = false;
  let found;
  let relativePath;
  if (workspaces) {
    done = true;
    relativePath = path_1.default.relative(current, initial);
    if (relativePath === "" || isMatchWorkspaces(relativePath, workspaces)) {
      found = current;
    } else {
      found = null;
    }
  }
  return {
    done,
    found,
    relativePath
  };
}
core$1.checkWorkspaces = checkWorkspaces;
function isMatchWorkspaces(relativePath, workspaces) {
  let ls = micromatch_1.default([relativePath], workspaces);
  return ls.length > 0;
}
core$1.isMatchWorkspaces = isMatchWorkspaces;
function extractWorkspaces(manifest) {
  const workspaces = (manifest || {}).workspaces;
  return workspaces && workspaces.packages || (Array.isArray(workspaces) ? workspaces : null);
}
core$1.extractWorkspaces = extractWorkspaces;
function readPackageJSON(dir) {
  const file2 = path_1.default.join(dir, "package.json");
  if (fs_1.existsSync(file2)) {
    return JSON.parse(fs_1.readFileSync(file2, "utf8"));
  }
  return null;
}
core$1.readPackageJSON = readPackageJSON;
findWorkspaceRoot.findWorkspaceRoot = findWorkspaceRoot;
findWorkspaceRoot.readPackageJSON = readPackageJSON;
findWorkspaceRoot.extractWorkspaces = extractWorkspaces;
findWorkspaceRoot.isMatchWorkspaces = isMatchWorkspaces;
findWorkspaceRoot.default = findWorkspaceRoot;
core$1.default = findWorkspaceRoot;
const core_1 = core$1;
var findYarnWorkspaceRoot2 = core_1.findWorkspaceRoot;
var findUp$1 = { exports: {} };
var locatePath = { exports: {} };
class Node {
  /// value;
  /// next;
  constructor(value) {
    this.value = value;
    this.next = void 0;
  }
}
let Queue$1 = class Queue {
  // TODO: Use private class fields when targeting Node.js 12.
  // #_head;
  // #_tail;
  // #_size;
  constructor() {
    this.clear();
  }
  enqueue(value) {
    const node = new Node(value);
    if (this._head) {
      this._tail.next = node;
      this._tail = node;
    } else {
      this._head = node;
      this._tail = node;
    }
    this._size++;
  }
  dequeue() {
    const current = this._head;
    if (!current) {
      return;
    }
    this._head = this._head.next;
    this._size--;
    return current.value;
  }
  clear() {
    this._head = void 0;
    this._tail = void 0;
    this._size = 0;
  }
  get size() {
    return this._size;
  }
  *[Symbol.iterator]() {
    let current = this._head;
    while (current) {
      yield current.value;
      current = current.next;
    }
  }
};
var yoctoQueue = Queue$1;
const Queue2 = yoctoQueue;
const pLimit$1 = (concurrency) => {
  if (!((Number.isInteger(concurrency) || concurrency === Infinity) && concurrency > 0)) {
    throw new TypeError("Expected `concurrency` to be a number from 1 and up");
  }
  const queue = new Queue2();
  let activeCount = 0;
  const next = () => {
    activeCount--;
    if (queue.size > 0) {
      queue.dequeue()();
    }
  };
  const run = async (fn, resolve, ...args) => {
    activeCount++;
    const result = (async () => fn(...args))();
    resolve(result);
    try {
      await result;
    } catch {
    }
    next();
  };
  const enqueue2 = (fn, resolve, ...args) => {
    queue.enqueue(run.bind(null, fn, resolve, ...args));
    (async () => {
      await Promise.resolve();
      if (activeCount < concurrency && queue.size > 0) {
        queue.dequeue()();
      }
    })();
  };
  const generator = (fn, ...args) => new Promise((resolve) => {
    enqueue2(fn, resolve, ...args);
  });
  Object.defineProperties(generator, {
    activeCount: {
      get: () => activeCount
    },
    pendingCount: {
      get: () => queue.size
    },
    clearQueue: {
      value: () => {
        queue.clear();
      }
    }
  });
  return generator;
};
var pLimit_1 = pLimit$1;
const pLimit = pLimit_1;
class EndError2 extends Error {
  constructor(value) {
    super();
    this.value = value;
  }
}
const testElement = async (element, tester) => tester(await element);
const finder = async (element) => {
  const values = await Promise.all(element);
  if (values[1] === true) {
    throw new EndError2(values[0]);
  }
  return false;
};
const pLocate$1 = async (iterable, tester, options) => {
  options = {
    concurrency: Infinity,
    preserveOrder: true,
    ...options
  };
  const limit = pLimit(options.concurrency);
  const items = [...iterable].map((element) => [element, limit(testElement, element, tester)]);
  const checkLimit = pLimit(options.preserveOrder ? 1 : Infinity);
  try {
    await Promise.all(items.map((element) => checkLimit(finder, element)));
  } catch (error2) {
    if (error2 instanceof EndError2) {
      return error2.value;
    }
    throw error2;
  }
};
var pLocate_1 = pLocate$1;
const path$2 = require$$0$8;
const fs$4 = require$$0$7;
const { promisify: promisify$2 } = require$$2$1;
const pLocate = pLocate_1;
const fsStat = promisify$2(fs$4.stat);
const fsLStat = promisify$2(fs$4.lstat);
const typeMappings = {
  directory: "isDirectory",
  file: "isFile"
};
function checkType({ type: type2 }) {
  if (type2 in typeMappings) {
    return;
  }
  throw new Error(`Invalid type specified: ${type2}`);
}
const matchType = (type2, stat) => type2 === void 0 || stat[typeMappings[type2]]();
locatePath.exports = async (paths, options) => {
  options = {
    cwd: process.cwd(),
    type: "file",
    allowSymlinks: true,
    ...options
  };
  checkType(options);
  const statFn = options.allowSymlinks ? fsStat : fsLStat;
  return pLocate(paths, async (path_) => {
    try {
      const stat = await statFn(path$2.resolve(options.cwd, path_));
      return matchType(options.type, stat);
    } catch {
      return false;
    }
  }, options);
};
locatePath.exports.sync = (paths, options) => {
  options = {
    cwd: process.cwd(),
    allowSymlinks: true,
    type: "file",
    ...options
  };
  checkType(options);
  const statFn = options.allowSymlinks ? fs$4.statSync : fs$4.lstatSync;
  for (const path_ of paths) {
    try {
      const stat = statFn(path$2.resolve(options.cwd, path_));
      if (matchType(options.type, stat)) {
        return path_;
      }
    } catch {
    }
  }
};
var locatePathExports = locatePath.exports;
var pathExists$3 = { exports: {} };
const fs$3 = require$$0$7;
const { promisify: promisify$1 } = require$$2$1;
const pAccess$1 = promisify$1(fs$3.access);
pathExists$3.exports = async (path2) => {
  try {
    await pAccess$1(path2);
    return true;
  } catch (_2) {
    return false;
  }
};
pathExists$3.exports.sync = (path2) => {
  try {
    fs$3.accessSync(path2);
    return true;
  } catch (_2) {
    return false;
  }
};
var pathExistsExports$1 = pathExists$3.exports;
(function(module) {
  const path2 = require$$0$8;
  const locatePath2 = locatePathExports;
  const pathExists2 = pathExistsExports$1;
  const stop = Symbol("findUp.stop");
  module.exports = async (name, options = {}) => {
    let directory = path2.resolve(options.cwd || "");
    const { root: root2 } = path2.parse(directory);
    const paths = [].concat(name);
    const runMatcher = async (locateOptions) => {
      if (typeof name !== "function") {
        return locatePath2(paths, locateOptions);
      }
      const foundPath = await name(locateOptions.cwd);
      if (typeof foundPath === "string") {
        return locatePath2([foundPath], locateOptions);
      }
      return foundPath;
    };
    while (true) {
      const foundPath = await runMatcher({ ...options, cwd: directory });
      if (foundPath === stop) {
        return;
      }
      if (foundPath) {
        return path2.resolve(directory, foundPath);
      }
      if (directory === root2) {
        return;
      }
      directory = path2.dirname(directory);
    }
  };
  module.exports.sync = (name, options = {}) => {
    let directory = path2.resolve(options.cwd || "");
    const { root: root2 } = path2.parse(directory);
    const paths = [].concat(name);
    const runMatcher = (locateOptions) => {
      if (typeof name !== "function") {
        return locatePath2.sync(paths, locateOptions);
      }
      const foundPath = name(locateOptions.cwd);
      if (typeof foundPath === "string") {
        return locatePath2.sync([foundPath], locateOptions);
      }
      return foundPath;
    };
    while (true) {
      const foundPath = runMatcher({ ...options, cwd: directory });
      if (foundPath === stop) {
        return;
      }
      if (foundPath) {
        return path2.resolve(directory, foundPath);
      }
      if (directory === root2) {
        return;
      }
      directory = path2.dirname(directory);
    }
  };
  module.exports.exists = pathExists2;
  module.exports.sync.exists = pathExists2.sync;
  module.exports.stop = stop;
})(findUp$1);
var findUpExports = findUp$1.exports;
var pathExists$2 = { exports: {} };
const fs$2 = require$$0$7;
const { promisify } = require$$2$1;
const pAccess = promisify(fs$2.access);
pathExists$2.exports = async (path2) => {
  try {
    await pAccess(path2);
    return true;
  } catch (_2) {
    return false;
  }
};
pathExists$2.exports.sync = (path2) => {
  try {
    fs$2.accessSync(path2);
    return true;
  } catch (_2) {
    return false;
  }
};
var pathExistsExports = pathExists$2.exports;
var loadYamlFile$1 = { exports: {} };
var constants = require$$0$c;
var origCwd = process.cwd;
var cwd = null;
var platform = process.env.GRACEFUL_FS_PLATFORM || process.platform;
process.cwd = function() {
  if (!cwd)
    cwd = origCwd.call(process);
  return cwd;
};
try {
  process.cwd();
} catch (er) {
}
if (typeof process.chdir === "function") {
  var chdir = process.chdir;
  process.chdir = function(d) {
    cwd = null;
    chdir.call(process, d);
  };
  if (Object.setPrototypeOf) Object.setPrototypeOf(process.chdir, chdir);
}
var polyfills$1 = patch$1;
function patch$1(fs2) {
  if (constants.hasOwnProperty("O_SYMLINK") && process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
    patchLchmod(fs2);
  }
  if (!fs2.lutimes) {
    patchLutimes(fs2);
  }
  fs2.chown = chownFix(fs2.chown);
  fs2.fchown = chownFix(fs2.fchown);
  fs2.lchown = chownFix(fs2.lchown);
  fs2.chmod = chmodFix(fs2.chmod);
  fs2.fchmod = chmodFix(fs2.fchmod);
  fs2.lchmod = chmodFix(fs2.lchmod);
  fs2.chownSync = chownFixSync(fs2.chownSync);
  fs2.fchownSync = chownFixSync(fs2.fchownSync);
  fs2.lchownSync = chownFixSync(fs2.lchownSync);
  fs2.chmodSync = chmodFixSync(fs2.chmodSync);
  fs2.fchmodSync = chmodFixSync(fs2.fchmodSync);
  fs2.lchmodSync = chmodFixSync(fs2.lchmodSync);
  fs2.stat = statFix(fs2.stat);
  fs2.fstat = statFix(fs2.fstat);
  fs2.lstat = statFix(fs2.lstat);
  fs2.statSync = statFixSync(fs2.statSync);
  fs2.fstatSync = statFixSync(fs2.fstatSync);
  fs2.lstatSync = statFixSync(fs2.lstatSync);
  if (fs2.chmod && !fs2.lchmod) {
    fs2.lchmod = function(path2, mode2, cb) {
      if (cb) process.nextTick(cb);
    };
    fs2.lchmodSync = function() {
    };
  }
  if (fs2.chown && !fs2.lchown) {
    fs2.lchown = function(path2, uid, gid, cb) {
      if (cb) process.nextTick(cb);
    };
    fs2.lchownSync = function() {
    };
  }
  if (platform === "win32") {
    fs2.rename = typeof fs2.rename !== "function" ? fs2.rename : function(fs$rename) {
      function rename(from, to, cb) {
        var start = Date.now();
        var backoff = 0;
        fs$rename(from, to, function CB(er) {
          if (er && (er.code === "EACCES" || er.code === "EPERM" || er.code === "EBUSY") && Date.now() - start < 6e4) {
            setTimeout(function() {
              fs2.stat(to, function(stater, st) {
                if (stater && stater.code === "ENOENT")
                  fs$rename(from, to, CB);
                else
                  cb(er);
              });
            }, backoff);
            if (backoff < 100)
              backoff += 10;
            return;
          }
          if (cb) cb(er);
        });
      }
      if (Object.setPrototypeOf) Object.setPrototypeOf(rename, fs$rename);
      return rename;
    }(fs2.rename);
  }
  fs2.read = typeof fs2.read !== "function" ? fs2.read : function(fs$read) {
    function read(fd, buffer, offset, length, position, callback_) {
      var callback;
      if (callback_ && typeof callback_ === "function") {
        var eagCounter = 0;
        callback = function(er, _2, __) {
          if (er && er.code === "EAGAIN" && eagCounter < 10) {
            eagCounter++;
            return fs$read.call(fs2, fd, buffer, offset, length, position, callback);
          }
          callback_.apply(this, arguments);
        };
      }
      return fs$read.call(fs2, fd, buffer, offset, length, position, callback);
    }
    if (Object.setPrototypeOf) Object.setPrototypeOf(read, fs$read);
    return read;
  }(fs2.read);
  fs2.readSync = typeof fs2.readSync !== "function" ? fs2.readSync : /* @__PURE__ */ function(fs$readSync) {
    return function(fd, buffer, offset, length, position) {
      var eagCounter = 0;
      while (true) {
        try {
          return fs$readSync.call(fs2, fd, buffer, offset, length, position);
        } catch (er) {
          if (er.code === "EAGAIN" && eagCounter < 10) {
            eagCounter++;
            continue;
          }
          throw er;
        }
      }
    };
  }(fs2.readSync);
  function patchLchmod(fs3) {
    fs3.lchmod = function(path2, mode2, callback) {
      fs3.open(
        path2,
        constants.O_WRONLY | constants.O_SYMLINK,
        mode2,
        function(err, fd) {
          if (err) {
            if (callback) callback(err);
            return;
          }
          fs3.fchmod(fd, mode2, function(err2) {
            fs3.close(fd, function(err22) {
              if (callback) callback(err2 || err22);
            });
          });
        }
      );
    };
    fs3.lchmodSync = function(path2, mode2) {
      var fd = fs3.openSync(path2, constants.O_WRONLY | constants.O_SYMLINK, mode2);
      var threw = true;
      var ret;
      try {
        ret = fs3.fchmodSync(fd, mode2);
        threw = false;
      } finally {
        if (threw) {
          try {
            fs3.closeSync(fd);
          } catch (er) {
          }
        } else {
          fs3.closeSync(fd);
        }
      }
      return ret;
    };
  }
  function patchLutimes(fs3) {
    if (constants.hasOwnProperty("O_SYMLINK") && fs3.futimes) {
      fs3.lutimes = function(path2, at, mt, cb) {
        fs3.open(path2, constants.O_SYMLINK, function(er, fd) {
          if (er) {
            if (cb) cb(er);
            return;
          }
          fs3.futimes(fd, at, mt, function(er2) {
            fs3.close(fd, function(er22) {
              if (cb) cb(er2 || er22);
            });
          });
        });
      };
      fs3.lutimesSync = function(path2, at, mt) {
        var fd = fs3.openSync(path2, constants.O_SYMLINK);
        var ret;
        var threw = true;
        try {
          ret = fs3.futimesSync(fd, at, mt);
          threw = false;
        } finally {
          if (threw) {
            try {
              fs3.closeSync(fd);
            } catch (er) {
            }
          } else {
            fs3.closeSync(fd);
          }
        }
        return ret;
      };
    } else if (fs3.futimes) {
      fs3.lutimes = function(_a, _b, _c, cb) {
        if (cb) process.nextTick(cb);
      };
      fs3.lutimesSync = function() {
      };
    }
  }
  function chmodFix(orig) {
    if (!orig) return orig;
    return function(target, mode2, cb) {
      return orig.call(fs2, target, mode2, function(er) {
        if (chownErOk(er)) er = null;
        if (cb) cb.apply(this, arguments);
      });
    };
  }
  function chmodFixSync(orig) {
    if (!orig) return orig;
    return function(target, mode2) {
      try {
        return orig.call(fs2, target, mode2);
      } catch (er) {
        if (!chownErOk(er)) throw er;
      }
    };
  }
  function chownFix(orig) {
    if (!orig) return orig;
    return function(target, uid, gid, cb) {
      return orig.call(fs2, target, uid, gid, function(er) {
        if (chownErOk(er)) er = null;
        if (cb) cb.apply(this, arguments);
      });
    };
  }
  function chownFixSync(orig) {
    if (!orig) return orig;
    return function(target, uid, gid) {
      try {
        return orig.call(fs2, target, uid, gid);
      } catch (er) {
        if (!chownErOk(er)) throw er;
      }
    };
  }
  function statFix(orig) {
    if (!orig) return orig;
    return function(target, options, cb) {
      if (typeof options === "function") {
        cb = options;
        options = null;
      }
      function callback(er, stats) {
        if (stats) {
          if (stats.uid < 0) stats.uid += 4294967296;
          if (stats.gid < 0) stats.gid += 4294967296;
        }
        if (cb) cb.apply(this, arguments);
      }
      return options ? orig.call(fs2, target, options, callback) : orig.call(fs2, target, callback);
    };
  }
  function statFixSync(orig) {
    if (!orig) return orig;
    return function(target, options) {
      var stats = options ? orig.call(fs2, target, options) : orig.call(fs2, target);
      if (stats) {
        if (stats.uid < 0) stats.uid += 4294967296;
        if (stats.gid < 0) stats.gid += 4294967296;
      }
      return stats;
    };
  }
  function chownErOk(er) {
    if (!er)
      return true;
    if (er.code === "ENOSYS")
      return true;
    var nonroot = !process.getuid || process.getuid() !== 0;
    if (nonroot) {
      if (er.code === "EINVAL" || er.code === "EPERM")
        return true;
    }
    return false;
  }
}
var Stream = require$$0$a.Stream;
var legacyStreams = legacy$1;
function legacy$1(fs2) {
  return {
    ReadStream,
    WriteStream
  };
  function ReadStream(path2, options) {
    if (!(this instanceof ReadStream)) return new ReadStream(path2, options);
    Stream.call(this);
    var self2 = this;
    this.path = path2;
    this.fd = null;
    this.readable = true;
    this.paused = false;
    this.flags = "r";
    this.mode = 438;
    this.bufferSize = 64 * 1024;
    options = options || {};
    var keys2 = Object.keys(options);
    for (var index2 = 0, length = keys2.length; index2 < length; index2++) {
      var key = keys2[index2];
      this[key] = options[key];
    }
    if (this.encoding) this.setEncoding(this.encoding);
    if (this.start !== void 0) {
      if ("number" !== typeof this.start) {
        throw TypeError("start must be a Number");
      }
      if (this.end === void 0) {
        this.end = Infinity;
      } else if ("number" !== typeof this.end) {
        throw TypeError("end must be a Number");
      }
      if (this.start > this.end) {
        throw new Error("start must be <= end");
      }
      this.pos = this.start;
    }
    if (this.fd !== null) {
      process.nextTick(function() {
        self2._read();
      });
      return;
    }
    fs2.open(this.path, this.flags, this.mode, function(err, fd) {
      if (err) {
        self2.emit("error", err);
        self2.readable = false;
        return;
      }
      self2.fd = fd;
      self2.emit("open", fd);
      self2._read();
    });
  }
  function WriteStream(path2, options) {
    if (!(this instanceof WriteStream)) return new WriteStream(path2, options);
    Stream.call(this);
    this.path = path2;
    this.fd = null;
    this.writable = true;
    this.flags = "w";
    this.encoding = "binary";
    this.mode = 438;
    this.bytesWritten = 0;
    options = options || {};
    var keys2 = Object.keys(options);
    for (var index2 = 0, length = keys2.length; index2 < length; index2++) {
      var key = keys2[index2];
      this[key] = options[key];
    }
    if (this.start !== void 0) {
      if ("number" !== typeof this.start) {
        throw TypeError("start must be a Number");
      }
      if (this.start < 0) {
        throw new Error("start must be >= zero");
      }
      this.pos = this.start;
    }
    this.busy = false;
    this._queue = [];
    if (this.fd === null) {
      this._open = fs2.open;
      this._queue.push([this._open, this.path, this.flags, this.mode, void 0]);
      this.flush();
    }
  }
}
var clone_1 = clone$1;
var getPrototypeOf = Object.getPrototypeOf || function(obj) {
  return obj.__proto__;
};
function clone$1(obj) {
  if (obj === null || typeof obj !== "object")
    return obj;
  if (obj instanceof Object)
    var copy = { __proto__: getPrototypeOf(obj) };
  else
    var copy = /* @__PURE__ */ Object.create(null);
  Object.getOwnPropertyNames(obj).forEach(function(key) {
    Object.defineProperty(copy, key, Object.getOwnPropertyDescriptor(obj, key));
  });
  return copy;
}
var fs$1 = require$$0$7;
var polyfills = polyfills$1;
var legacy = legacyStreams;
var clone = clone_1;
var util = require$$2$1;
var gracefulQueue;
var previousSymbol;
if (typeof Symbol === "function" && typeof Symbol.for === "function") {
  gracefulQueue = Symbol.for("graceful-fs.queue");
  previousSymbol = Symbol.for("graceful-fs.previous");
} else {
  gracefulQueue = "___graceful-fs.queue";
  previousSymbol = "___graceful-fs.previous";
}
function noop() {
}
function publishQueue(context, queue) {
  Object.defineProperty(context, gracefulQueue, {
    get: function() {
      return queue;
    }
  });
}
var debug = noop;
if (util.debuglog)
  debug = util.debuglog("gfs4");
else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || ""))
  debug = function() {
    var m = util.format.apply(util, arguments);
    m = "GFS4: " + m.split(/\n/).join("\nGFS4: ");
    console.error(m);
  };
if (!fs$1[gracefulQueue]) {
  var queue = commonjsGlobal[gracefulQueue] || [];
  publishQueue(fs$1, queue);
  fs$1.close = function(fs$close) {
    function close(fd, cb) {
      return fs$close.call(fs$1, fd, function(err) {
        if (!err) {
          resetQueue();
        }
        if (typeof cb === "function")
          cb.apply(this, arguments);
      });
    }
    Object.defineProperty(close, previousSymbol, {
      value: fs$close
    });
    return close;
  }(fs$1.close);
  fs$1.closeSync = function(fs$closeSync) {
    function closeSync(fd) {
      fs$closeSync.apply(fs$1, arguments);
      resetQueue();
    }
    Object.defineProperty(closeSync, previousSymbol, {
      value: fs$closeSync
    });
    return closeSync;
  }(fs$1.closeSync);
  if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || "")) {
    process.on("exit", function() {
      debug(fs$1[gracefulQueue]);
      require$$0$9.equal(fs$1[gracefulQueue].length, 0);
    });
  }
}
if (!commonjsGlobal[gracefulQueue]) {
  publishQueue(commonjsGlobal, fs$1[gracefulQueue]);
}
var gracefulFs = patch(clone(fs$1));
if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !fs$1.__patched) {
  gracefulFs = patch(fs$1);
  fs$1.__patched = true;
}
function patch(fs2) {
  polyfills(fs2);
  fs2.gracefulify = patch;
  fs2.createReadStream = createReadStream;
  fs2.createWriteStream = createWriteStream;
  var fs$readFile = fs2.readFile;
  fs2.readFile = readFile;
  function readFile(path2, options, cb) {
    if (typeof options === "function")
      cb = options, options = null;
    return go$readFile(path2, options, cb);
    function go$readFile(path3, options2, cb2, startTime) {
      return fs$readFile(path3, options2, function(err) {
        if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
          enqueue([go$readFile, [path3, options2, cb2], err, startTime || Date.now(), Date.now()]);
        else {
          if (typeof cb2 === "function")
            cb2.apply(this, arguments);
        }
      });
    }
  }
  var fs$writeFile = fs2.writeFile;
  fs2.writeFile = writeFile;
  function writeFile(path2, data, options, cb) {
    if (typeof options === "function")
      cb = options, options = null;
    return go$writeFile(path2, data, options, cb);
    function go$writeFile(path3, data2, options2, cb2, startTime) {
      return fs$writeFile(path3, data2, options2, function(err) {
        if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
          enqueue([go$writeFile, [path3, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
        else {
          if (typeof cb2 === "function")
            cb2.apply(this, arguments);
        }
      });
    }
  }
  var fs$appendFile = fs2.appendFile;
  if (fs$appendFile)
    fs2.appendFile = appendFile;
  function appendFile(path2, data, options, cb) {
    if (typeof options === "function")
      cb = options, options = null;
    return go$appendFile(path2, data, options, cb);
    function go$appendFile(path3, data2, options2, cb2, startTime) {
      return fs$appendFile(path3, data2, options2, function(err) {
        if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
          enqueue([go$appendFile, [path3, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
        else {
          if (typeof cb2 === "function")
            cb2.apply(this, arguments);
        }
      });
    }
  }
  var fs$copyFile = fs2.copyFile;
  if (fs$copyFile)
    fs2.copyFile = copyFile;
  function copyFile(src, dest, flags, cb) {
    if (typeof flags === "function") {
      cb = flags;
      flags = 0;
    }
    return go$copyFile(src, dest, flags, cb);
    function go$copyFile(src2, dest2, flags2, cb2, startTime) {
      return fs$copyFile(src2, dest2, flags2, function(err) {
        if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
          enqueue([go$copyFile, [src2, dest2, flags2, cb2], err, startTime || Date.now(), Date.now()]);
        else {
          if (typeof cb2 === "function")
            cb2.apply(this, arguments);
        }
      });
    }
  }
  var fs$readdir = fs2.readdir;
  fs2.readdir = readdir;
  var noReaddirOptionVersions = /^v[0-5]\./;
  function readdir(path2, options, cb) {
    if (typeof options === "function")
      cb = options, options = null;
    var go$readdir = noReaddirOptionVersions.test(process.version) ? function go$readdir2(path3, options2, cb2, startTime) {
      return fs$readdir(path3, fs$readdirCallback(
        path3,
        options2,
        cb2,
        startTime
      ));
    } : function go$readdir2(path3, options2, cb2, startTime) {
      return fs$readdir(path3, options2, fs$readdirCallback(
        path3,
        options2,
        cb2,
        startTime
      ));
    };
    return go$readdir(path2, options, cb);
    function fs$readdirCallback(path3, options2, cb2, startTime) {
      return function(err, files) {
        if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
          enqueue([
            go$readdir,
            [path3, options2, cb2],
            err,
            startTime || Date.now(),
            Date.now()
          ]);
        else {
          if (files && files.sort)
            files.sort();
          if (typeof cb2 === "function")
            cb2.call(this, err, files);
        }
      };
    }
  }
  if (process.version.substr(0, 4) === "v0.8") {
    var legStreams = legacy(fs2);
    ReadStream = legStreams.ReadStream;
    WriteStream = legStreams.WriteStream;
  }
  var fs$ReadStream = fs2.ReadStream;
  if (fs$ReadStream) {
    ReadStream.prototype = Object.create(fs$ReadStream.prototype);
    ReadStream.prototype.open = ReadStream$open;
  }
  var fs$WriteStream = fs2.WriteStream;
  if (fs$WriteStream) {
    WriteStream.prototype = Object.create(fs$WriteStream.prototype);
    WriteStream.prototype.open = WriteStream$open;
  }
  Object.defineProperty(fs2, "ReadStream", {
    get: function() {
      return ReadStream;
    },
    set: function(val) {
      ReadStream = val;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(fs2, "WriteStream", {
    get: function() {
      return WriteStream;
    },
    set: function(val) {
      WriteStream = val;
    },
    enumerable: true,
    configurable: true
  });
  var FileReadStream = ReadStream;
  Object.defineProperty(fs2, "FileReadStream", {
    get: function() {
      return FileReadStream;
    },
    set: function(val) {
      FileReadStream = val;
    },
    enumerable: true,
    configurable: true
  });
  var FileWriteStream = WriteStream;
  Object.defineProperty(fs2, "FileWriteStream", {
    get: function() {
      return FileWriteStream;
    },
    set: function(val) {
      FileWriteStream = val;
    },
    enumerable: true,
    configurable: true
  });
  function ReadStream(path2, options) {
    if (this instanceof ReadStream)
      return fs$ReadStream.apply(this, arguments), this;
    else
      return ReadStream.apply(Object.create(ReadStream.prototype), arguments);
  }
  function ReadStream$open() {
    var that = this;
    open(that.path, that.flags, that.mode, function(err, fd) {
      if (err) {
        if (that.autoClose)
          that.destroy();
        that.emit("error", err);
      } else {
        that.fd = fd;
        that.emit("open", fd);
        that.read();
      }
    });
  }
  function WriteStream(path2, options) {
    if (this instanceof WriteStream)
      return fs$WriteStream.apply(this, arguments), this;
    else
      return WriteStream.apply(Object.create(WriteStream.prototype), arguments);
  }
  function WriteStream$open() {
    var that = this;
    open(that.path, that.flags, that.mode, function(err, fd) {
      if (err) {
        that.destroy();
        that.emit("error", err);
      } else {
        that.fd = fd;
        that.emit("open", fd);
      }
    });
  }
  function createReadStream(path2, options) {
    return new fs2.ReadStream(path2, options);
  }
  function createWriteStream(path2, options) {
    return new fs2.WriteStream(path2, options);
  }
  var fs$open = fs2.open;
  fs2.open = open;
  function open(path2, flags, mode2, cb) {
    if (typeof mode2 === "function")
      cb = mode2, mode2 = null;
    return go$open(path2, flags, mode2, cb);
    function go$open(path3, flags2, mode3, cb2, startTime) {
      return fs$open(path3, flags2, mode3, function(err, fd) {
        if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
          enqueue([go$open, [path3, flags2, mode3, cb2], err, startTime || Date.now(), Date.now()]);
        else {
          if (typeof cb2 === "function")
            cb2.apply(this, arguments);
        }
      });
    }
  }
  return fs2;
}
function enqueue(elem) {
  debug("ENQUEUE", elem[0].name, elem[1]);
  fs$1[gracefulQueue].push(elem);
  retry();
}
var retryTimer;
function resetQueue() {
  var now = Date.now();
  for (var i = 0; i < fs$1[gracefulQueue].length; ++i) {
    if (fs$1[gracefulQueue][i].length > 2) {
      fs$1[gracefulQueue][i][3] = now;
      fs$1[gracefulQueue][i][4] = now;
    }
  }
  retry();
}
function retry() {
  clearTimeout(retryTimer);
  retryTimer = void 0;
  if (fs$1[gracefulQueue].length === 0)
    return;
  var elem = fs$1[gracefulQueue].shift();
  var fn = elem[0];
  var args = elem[1];
  var err = elem[2];
  var startTime = elem[3];
  var lastTime = elem[4];
  if (startTime === void 0) {
    debug("RETRY", fn.name, args);
    fn.apply(null, args);
  } else if (Date.now() - startTime >= 6e4) {
    debug("TIMEOUT", fn.name, args);
    var cb = args.pop();
    if (typeof cb === "function")
      cb.call(null, err);
  } else {
    var sinceAttempt = Date.now() - lastTime;
    var sinceStart = Math.max(lastTime - startTime, 1);
    var desiredDelay = Math.min(sinceStart * 1.2, 100);
    if (sinceAttempt >= desiredDelay) {
      debug("RETRY", fn.name, args);
      fn.apply(null, args.concat([startTime]));
    } else {
      fs$1[gracefulQueue].push(elem);
    }
  }
  if (retryTimer === void 0) {
    retryTimer = setTimeout(retry, 0);
  }
}
const processFn = (fn, options) => function(...args) {
  const P = options.promiseModule;
  return new P((resolve, reject) => {
    if (options.multiArgs) {
      args.push((...result) => {
        if (options.errorFirst) {
          if (result[0]) {
            reject(result);
          } else {
            result.shift();
            resolve(result);
          }
        } else {
          resolve(result);
        }
      });
    } else if (options.errorFirst) {
      args.push((error2, result) => {
        if (error2) {
          reject(error2);
        } else {
          resolve(result);
        }
      });
    } else {
      args.push(resolve);
    }
    fn.apply(this, args);
  });
};
var pify$1 = (input, options) => {
  options = Object.assign({
    exclude: [/.+(Sync|Stream)$/],
    errorFirst: true,
    promiseModule: Promise
  }, options);
  const objType = typeof input;
  if (!(input !== null && (objType === "object" || objType === "function"))) {
    throw new TypeError(`Expected \`input\` to be a \`Function\` or \`Object\`, got \`${input === null ? "null" : objType}\``);
  }
  const filter = (key) => {
    const match = (pattern) => typeof pattern === "string" ? key === pattern : pattern.test(key);
    return options.include ? options.include.some(match) : !options.exclude.some(match);
  };
  let ret;
  if (objType === "function") {
    ret = function(...args) {
      return options.excludeMain ? input(...args) : processFn(input, options).apply(this, args);
    };
  } else {
    ret = Object.create(Object.getPrototypeOf(input));
  }
  for (const key in input) {
    const property2 = input[key];
    ret[key] = typeof property2 === "function" && filter(key) ? processFn(property2, options) : property2;
  }
  return ret;
};
var stripBom$1 = (x) => {
  if (typeof x !== "string") {
    throw new TypeError("Expected a string, got " + typeof x);
  }
  if (x.charCodeAt(0) === 65279) {
    return x.slice(1);
  }
  return x;
};
var jsYaml$1 = {};
var loader$1 = {};
var common$6 = {};
function isNothing(subject) {
  return typeof subject === "undefined" || subject === null;
}
function isObject(subject) {
  return typeof subject === "object" && subject !== null;
}
function toArray(sequence) {
  if (Array.isArray(sequence)) return sequence;
  else if (isNothing(sequence)) return [];
  return [sequence];
}
function extend(target, source) {
  var index2, length, key, sourceKeys;
  if (source) {
    sourceKeys = Object.keys(source);
    for (index2 = 0, length = sourceKeys.length; index2 < length; index2 += 1) {
      key = sourceKeys[index2];
      target[key] = source[key];
    }
  }
  return target;
}
function repeat(string2, count) {
  var result = "", cycle;
  for (cycle = 0; cycle < count; cycle += 1) {
    result += string2;
  }
  return result;
}
function isNegativeZero(number2) {
  return number2 === 0 && Number.NEGATIVE_INFINITY === 1 / number2;
}
common$6.isNothing = isNothing;
common$6.isObject = isObject;
common$6.toArray = toArray;
common$6.repeat = repeat;
common$6.isNegativeZero = isNegativeZero;
common$6.extend = extend;
function YAMLException$4(reason, mark2) {
  Error.call(this);
  this.name = "YAMLException";
  this.reason = reason;
  this.mark = mark2;
  this.message = (this.reason || "(unknown reason)") + (this.mark ? " " + this.mark.toString() : "");
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, this.constructor);
  } else {
    this.stack = new Error().stack || "";
  }
}
YAMLException$4.prototype = Object.create(Error.prototype);
YAMLException$4.prototype.constructor = YAMLException$4;
YAMLException$4.prototype.toString = function toString(compact) {
  var result = this.name + ": ";
  result += this.reason || "(unknown reason)";
  if (!compact && this.mark) {
    result += " " + this.mark.toString();
  }
  return result;
};
var exception = YAMLException$4;
var common$5 = common$6;
function Mark$1(name, buffer, position, line, column) {
  this.name = name;
  this.buffer = buffer;
  this.position = position;
  this.line = line;
  this.column = column;
}
Mark$1.prototype.getSnippet = function getSnippet(indent, maxLength) {
  var head, start, tail, end, snippet;
  if (!this.buffer) return null;
  indent = indent || 4;
  maxLength = maxLength || 75;
  head = "";
  start = this.position;
  while (start > 0 && "\0\r\n\u2028\u2029".indexOf(this.buffer.charAt(start - 1)) === -1) {
    start -= 1;
    if (this.position - start > maxLength / 2 - 1) {
      head = " ... ";
      start += 5;
      break;
    }
  }
  tail = "";
  end = this.position;
  while (end < this.buffer.length && "\0\r\n\u2028\u2029".indexOf(this.buffer.charAt(end)) === -1) {
    end += 1;
    if (end - this.position > maxLength / 2 - 1) {
      tail = " ... ";
      end -= 5;
      break;
    }
  }
  snippet = this.buffer.slice(start, end);
  return common$5.repeat(" ", indent) + head + snippet + tail + "\n" + common$5.repeat(" ", indent + this.position - start + head.length) + "^";
};
Mark$1.prototype.toString = function toString2(compact) {
  var snippet, where = "";
  if (this.name) {
    where += 'in "' + this.name + '" ';
  }
  where += "at line " + (this.line + 1) + ", column " + (this.column + 1);
  if (!compact) {
    snippet = this.getSnippet();
    if (snippet) {
      where += ":\n" + snippet;
    }
  }
  return where;
};
var mark = Mark$1;
var YAMLException$3 = exception;
var TYPE_CONSTRUCTOR_OPTIONS = [
  "kind",
  "resolve",
  "construct",
  "instanceOf",
  "predicate",
  "represent",
  "defaultStyle",
  "styleAliases"
];
var YAML_NODE_KINDS = [
  "scalar",
  "sequence",
  "mapping"
];
function compileStyleAliases(map2) {
  var result = {};
  if (map2 !== null) {
    Object.keys(map2).forEach(function(style) {
      map2[style].forEach(function(alias) {
        result[String(alias)] = style;
      });
    });
  }
  return result;
}
function Type$h(tag, options) {
  options = options || {};
  Object.keys(options).forEach(function(name) {
    if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name) === -1) {
      throw new YAMLException$3('Unknown option "' + name + '" is met in definition of "' + tag + '" YAML type.');
    }
  });
  this.tag = tag;
  this.kind = options["kind"] || null;
  this.resolve = options["resolve"] || function() {
    return true;
  };
  this.construct = options["construct"] || function(data) {
    return data;
  };
  this.instanceOf = options["instanceOf"] || null;
  this.predicate = options["predicate"] || null;
  this.represent = options["represent"] || null;
  this.defaultStyle = options["defaultStyle"] || null;
  this.styleAliases = compileStyleAliases(options["styleAliases"] || null);
  if (YAML_NODE_KINDS.indexOf(this.kind) === -1) {
    throw new YAMLException$3('Unknown kind "' + this.kind + '" is specified for "' + tag + '" YAML type.');
  }
}
var type = Type$h;
var common$4 = common$6;
var YAMLException$2 = exception;
var Type$g = type;
function compileList(schema2, name, result) {
  var exclude = [];
  schema2.include.forEach(function(includedSchema) {
    result = compileList(includedSchema, name, result);
  });
  schema2[name].forEach(function(currentType) {
    result.forEach(function(previousType, previousIndex) {
      if (previousType.tag === currentType.tag && previousType.kind === currentType.kind) {
        exclude.push(previousIndex);
      }
    });
    result.push(currentType);
  });
  return result.filter(function(type2, index2) {
    return exclude.indexOf(index2) === -1;
  });
}
function compileMap() {
  var result = {
    scalar: {},
    sequence: {},
    mapping: {},
    fallback: {}
  }, index2, length;
  function collectType(type2) {
    result[type2.kind][type2.tag] = result["fallback"][type2.tag] = type2;
  }
  for (index2 = 0, length = arguments.length; index2 < length; index2 += 1) {
    arguments[index2].forEach(collectType);
  }
  return result;
}
function Schema$5(definition) {
  this.include = definition.include || [];
  this.implicit = definition.implicit || [];
  this.explicit = definition.explicit || [];
  this.implicit.forEach(function(type2) {
    if (type2.loadKind && type2.loadKind !== "scalar") {
      throw new YAMLException$2("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
    }
  });
  this.compiledImplicit = compileList(this, "implicit", []);
  this.compiledExplicit = compileList(this, "explicit", []);
  this.compiledTypeMap = compileMap(this.compiledImplicit, this.compiledExplicit);
}
Schema$5.DEFAULT = null;
Schema$5.create = function createSchema() {
  var schemas, types;
  switch (arguments.length) {
    case 1:
      schemas = Schema$5.DEFAULT;
      types = arguments[0];
      break;
    case 2:
      schemas = arguments[0];
      types = arguments[1];
      break;
    default:
      throw new YAMLException$2("Wrong number of arguments for Schema.create function");
  }
  schemas = common$4.toArray(schemas);
  types = common$4.toArray(types);
  if (!schemas.every(function(schema2) {
    return schema2 instanceof Schema$5;
  })) {
    throw new YAMLException$2("Specified list of super schemas (or a single Schema object) contains a non-Schema object.");
  }
  if (!types.every(function(type2) {
    return type2 instanceof Type$g;
  })) {
    throw new YAMLException$2("Specified list of YAML types (or a single Type object) contains a non-Type object.");
  }
  return new Schema$5({
    include: schemas,
    explicit: types
  });
};
var schema = Schema$5;
var Type$f = type;
var str = new Type$f("tag:yaml.org,2002:str", {
  kind: "scalar",
  construct: function(data) {
    return data !== null ? data : "";
  }
});
var Type$e = type;
var seq = new Type$e("tag:yaml.org,2002:seq", {
  kind: "sequence",
  construct: function(data) {
    return data !== null ? data : [];
  }
});
var Type$d = type;
var map = new Type$d("tag:yaml.org,2002:map", {
  kind: "mapping",
  construct: function(data) {
    return data !== null ? data : {};
  }
});
var Schema$4 = schema;
var failsafe = new Schema$4({
  explicit: [
    str,
    seq,
    map
  ]
});
var Type$c = type;
function resolveYamlNull(data) {
  if (data === null) return true;
  var max = data.length;
  return max === 1 && data === "~" || max === 4 && (data === "null" || data === "Null" || data === "NULL");
}
function constructYamlNull() {
  return null;
}
function isNull(object2) {
  return object2 === null;
}
var _null = new Type$c("tag:yaml.org,2002:null", {
  kind: "scalar",
  resolve: resolveYamlNull,
  construct: constructYamlNull,
  predicate: isNull,
  represent: {
    canonical: function() {
      return "~";
    },
    lowercase: function() {
      return "null";
    },
    uppercase: function() {
      return "NULL";
    },
    camelcase: function() {
      return "Null";
    }
  },
  defaultStyle: "lowercase"
});
var Type$b = type;
function resolveYamlBoolean(data) {
  if (data === null) return false;
  var max = data.length;
  return max === 4 && (data === "true" || data === "True" || data === "TRUE") || max === 5 && (data === "false" || data === "False" || data === "FALSE");
}
function constructYamlBoolean(data) {
  return data === "true" || data === "True" || data === "TRUE";
}
function isBoolean(object2) {
  return Object.prototype.toString.call(object2) === "[object Boolean]";
}
var bool = new Type$b("tag:yaml.org,2002:bool", {
  kind: "scalar",
  resolve: resolveYamlBoolean,
  construct: constructYamlBoolean,
  predicate: isBoolean,
  represent: {
    lowercase: function(object2) {
      return object2 ? "true" : "false";
    },
    uppercase: function(object2) {
      return object2 ? "TRUE" : "FALSE";
    },
    camelcase: function(object2) {
      return object2 ? "True" : "False";
    }
  },
  defaultStyle: "lowercase"
});
var common$3 = common$6;
var Type$a = type;
function isHexCode(c) {
  return 48 <= c && c <= 57 || 65 <= c && c <= 70 || 97 <= c && c <= 102;
}
function isOctCode(c) {
  return 48 <= c && c <= 55;
}
function isDecCode(c) {
  return 48 <= c && c <= 57;
}
function resolveYamlInteger(data) {
  if (data === null) return false;
  var max = data.length, index2 = 0, hasDigits = false, ch;
  if (!max) return false;
  ch = data[index2];
  if (ch === "-" || ch === "+") {
    ch = data[++index2];
  }
  if (ch === "0") {
    if (index2 + 1 === max) return true;
    ch = data[++index2];
    if (ch === "b") {
      index2++;
      for (; index2 < max; index2++) {
        ch = data[index2];
        if (ch === "_") continue;
        if (ch !== "0" && ch !== "1") return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
    if (ch === "x") {
      index2++;
      for (; index2 < max; index2++) {
        ch = data[index2];
        if (ch === "_") continue;
        if (!isHexCode(data.charCodeAt(index2))) return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
    for (; index2 < max; index2++) {
      ch = data[index2];
      if (ch === "_") continue;
      if (!isOctCode(data.charCodeAt(index2))) return false;
      hasDigits = true;
    }
    return hasDigits && ch !== "_";
  }
  if (ch === "_") return false;
  for (; index2 < max; index2++) {
    ch = data[index2];
    if (ch === "_") continue;
    if (ch === ":") break;
    if (!isDecCode(data.charCodeAt(index2))) {
      return false;
    }
    hasDigits = true;
  }
  if (!hasDigits || ch === "_") return false;
  if (ch !== ":") return true;
  return /^(:[0-5]?[0-9])+$/.test(data.slice(index2));
}
function constructYamlInteger(data) {
  var value = data, sign = 1, ch, base, digits = [];
  if (value.indexOf("_") !== -1) {
    value = value.replace(/_/g, "");
  }
  ch = value[0];
  if (ch === "-" || ch === "+") {
    if (ch === "-") sign = -1;
    value = value.slice(1);
    ch = value[0];
  }
  if (value === "0") return 0;
  if (ch === "0") {
    if (value[1] === "b") return sign * parseInt(value.slice(2), 2);
    if (value[1] === "x") return sign * parseInt(value, 16);
    return sign * parseInt(value, 8);
  }
  if (value.indexOf(":") !== -1) {
    value.split(":").forEach(function(v) {
      digits.unshift(parseInt(v, 10));
    });
    value = 0;
    base = 1;
    digits.forEach(function(d) {
      value += d * base;
      base *= 60;
    });
    return sign * value;
  }
  return sign * parseInt(value, 10);
}
function isInteger(object2) {
  return Object.prototype.toString.call(object2) === "[object Number]" && (object2 % 1 === 0 && !common$3.isNegativeZero(object2));
}
var int = new Type$a("tag:yaml.org,2002:int", {
  kind: "scalar",
  resolve: resolveYamlInteger,
  construct: constructYamlInteger,
  predicate: isInteger,
  represent: {
    binary: function(obj) {
      return obj >= 0 ? "0b" + obj.toString(2) : "-0b" + obj.toString(2).slice(1);
    },
    octal: function(obj) {
      return obj >= 0 ? "0" + obj.toString(8) : "-0" + obj.toString(8).slice(1);
    },
    decimal: function(obj) {
      return obj.toString(10);
    },
    /* eslint-disable max-len */
    hexadecimal: function(obj) {
      return obj >= 0 ? "0x" + obj.toString(16).toUpperCase() : "-0x" + obj.toString(16).toUpperCase().slice(1);
    }
  },
  defaultStyle: "decimal",
  styleAliases: {
    binary: [2, "bin"],
    octal: [8, "oct"],
    decimal: [10, "dec"],
    hexadecimal: [16, "hex"]
  }
});
var common$2 = common$6;
var Type$9 = type;
var YAML_FLOAT_PATTERN = new RegExp(
  // 2.5e4, 2.5 and integers
  "^(?:[-+]?(?:0|[1-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\\.[0-9_]*|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$"
);
function resolveYamlFloat(data) {
  if (data === null) return false;
  if (!YAML_FLOAT_PATTERN.test(data) || // Quick hack to not allow integers end with `_`
  // Probably should update regexp & check speed
  data[data.length - 1] === "_") {
    return false;
  }
  return true;
}
function constructYamlFloat(data) {
  var value, sign, base, digits;
  value = data.replace(/_/g, "").toLowerCase();
  sign = value[0] === "-" ? -1 : 1;
  digits = [];
  if ("+-".indexOf(value[0]) >= 0) {
    value = value.slice(1);
  }
  if (value === ".inf") {
    return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  } else if (value === ".nan") {
    return NaN;
  } else if (value.indexOf(":") >= 0) {
    value.split(":").forEach(function(v) {
      digits.unshift(parseFloat(v, 10));
    });
    value = 0;
    base = 1;
    digits.forEach(function(d) {
      value += d * base;
      base *= 60;
    });
    return sign * value;
  }
  return sign * parseFloat(value, 10);
}
var SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;
function representYamlFloat(object2, style) {
  var res;
  if (isNaN(object2)) {
    switch (style) {
      case "lowercase":
        return ".nan";
      case "uppercase":
        return ".NAN";
      case "camelcase":
        return ".NaN";
    }
  } else if (Number.POSITIVE_INFINITY === object2) {
    switch (style) {
      case "lowercase":
        return ".inf";
      case "uppercase":
        return ".INF";
      case "camelcase":
        return ".Inf";
    }
  } else if (Number.NEGATIVE_INFINITY === object2) {
    switch (style) {
      case "lowercase":
        return "-.inf";
      case "uppercase":
        return "-.INF";
      case "camelcase":
        return "-.Inf";
    }
  } else if (common$2.isNegativeZero(object2)) {
    return "-0.0";
  }
  res = object2.toString(10);
  return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
}
function isFloat(object2) {
  return Object.prototype.toString.call(object2) === "[object Number]" && (object2 % 1 !== 0 || common$2.isNegativeZero(object2));
}
var float = new Type$9("tag:yaml.org,2002:float", {
  kind: "scalar",
  resolve: resolveYamlFloat,
  construct: constructYamlFloat,
  predicate: isFloat,
  represent: representYamlFloat,
  defaultStyle: "lowercase"
});
var Schema$3 = schema;
var json = new Schema$3({
  include: [
    failsafe
  ],
  implicit: [
    _null,
    bool,
    int,
    float
  ]
});
var Schema$2 = schema;
var core = new Schema$2({
  include: [
    json
  ]
});
var Type$8 = type;
var YAML_DATE_REGEXP = new RegExp(
  "^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"
);
var YAML_TIMESTAMP_REGEXP = new RegExp(
  "^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$"
);
function resolveYamlTimestamp(data) {
  if (data === null) return false;
  if (YAML_DATE_REGEXP.exec(data) !== null) return true;
  if (YAML_TIMESTAMP_REGEXP.exec(data) !== null) return true;
  return false;
}
function constructYamlTimestamp(data) {
  var match, year, month, day, hour, minute, second, fraction = 0, delta = null, tz_hour, tz_minute, date2;
  match = YAML_DATE_REGEXP.exec(data);
  if (match === null) match = YAML_TIMESTAMP_REGEXP.exec(data);
  if (match === null) throw new Error("Date resolve error");
  year = +match[1];
  month = +match[2] - 1;
  day = +match[3];
  if (!match[4]) {
    return new Date(Date.UTC(year, month, day));
  }
  hour = +match[4];
  minute = +match[5];
  second = +match[6];
  if (match[7]) {
    fraction = match[7].slice(0, 3);
    while (fraction.length < 3) {
      fraction += "0";
    }
    fraction = +fraction;
  }
  if (match[9]) {
    tz_hour = +match[10];
    tz_minute = +(match[11] || 0);
    delta = (tz_hour * 60 + tz_minute) * 6e4;
    if (match[9] === "-") delta = -delta;
  }
  date2 = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
  if (delta) date2.setTime(date2.getTime() - delta);
  return date2;
}
function representYamlTimestamp(object2) {
  return object2.toISOString();
}
var timestamp = new Type$8("tag:yaml.org,2002:timestamp", {
  kind: "scalar",
  resolve: resolveYamlTimestamp,
  construct: constructYamlTimestamp,
  instanceOf: Date,
  represent: representYamlTimestamp
});
var Type$7 = type;
function resolveYamlMerge(data) {
  return data === "<<" || data === null;
}
var merge = new Type$7("tag:yaml.org,2002:merge", {
  kind: "scalar",
  resolve: resolveYamlMerge
});
function commonjsRequire(path2) {
  throw new Error('Could not dynamically require "' + path2 + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}
var NodeBuffer;
try {
  var _require$1 = commonjsRequire;
  NodeBuffer = _require$1("buffer").Buffer;
} catch (__) {
}
var Type$6 = type;
var BASE64_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r";
function resolveYamlBinary(data) {
  if (data === null) return false;
  var code, idx, bitlen = 0, max = data.length, map2 = BASE64_MAP;
  for (idx = 0; idx < max; idx++) {
    code = map2.indexOf(data.charAt(idx));
    if (code > 64) continue;
    if (code < 0) return false;
    bitlen += 6;
  }
  return bitlen % 8 === 0;
}
function constructYamlBinary(data) {
  var idx, tailbits, input = data.replace(/[\r\n=]/g, ""), max = input.length, map2 = BASE64_MAP, bits = 0, result = [];
  for (idx = 0; idx < max; idx++) {
    if (idx % 4 === 0 && idx) {
      result.push(bits >> 16 & 255);
      result.push(bits >> 8 & 255);
      result.push(bits & 255);
    }
    bits = bits << 6 | map2.indexOf(input.charAt(idx));
  }
  tailbits = max % 4 * 6;
  if (tailbits === 0) {
    result.push(bits >> 16 & 255);
    result.push(bits >> 8 & 255);
    result.push(bits & 255);
  } else if (tailbits === 18) {
    result.push(bits >> 10 & 255);
    result.push(bits >> 2 & 255);
  } else if (tailbits === 12) {
    result.push(bits >> 4 & 255);
  }
  if (NodeBuffer) {
    return NodeBuffer.from ? NodeBuffer.from(result) : new NodeBuffer(result);
  }
  return result;
}
function representYamlBinary(object2) {
  var result = "", bits = 0, idx, tail, max = object2.length, map2 = BASE64_MAP;
  for (idx = 0; idx < max; idx++) {
    if (idx % 3 === 0 && idx) {
      result += map2[bits >> 18 & 63];
      result += map2[bits >> 12 & 63];
      result += map2[bits >> 6 & 63];
      result += map2[bits & 63];
    }
    bits = (bits << 8) + object2[idx];
  }
  tail = max % 3;
  if (tail === 0) {
    result += map2[bits >> 18 & 63];
    result += map2[bits >> 12 & 63];
    result += map2[bits >> 6 & 63];
    result += map2[bits & 63];
  } else if (tail === 2) {
    result += map2[bits >> 10 & 63];
    result += map2[bits >> 4 & 63];
    result += map2[bits << 2 & 63];
    result += map2[64];
  } else if (tail === 1) {
    result += map2[bits >> 2 & 63];
    result += map2[bits << 4 & 63];
    result += map2[64];
    result += map2[64];
  }
  return result;
}
function isBinary(object2) {
  return NodeBuffer && NodeBuffer.isBuffer(object2);
}
var binary = new Type$6("tag:yaml.org,2002:binary", {
  kind: "scalar",
  resolve: resolveYamlBinary,
  construct: constructYamlBinary,
  predicate: isBinary,
  represent: representYamlBinary
});
var Type$5 = type;
var _hasOwnProperty$3 = Object.prototype.hasOwnProperty;
var _toString$2 = Object.prototype.toString;
function resolveYamlOmap(data) {
  if (data === null) return true;
  var objectKeys = [], index2, length, pair, pairKey, pairHasKey, object2 = data;
  for (index2 = 0, length = object2.length; index2 < length; index2 += 1) {
    pair = object2[index2];
    pairHasKey = false;
    if (_toString$2.call(pair) !== "[object Object]") return false;
    for (pairKey in pair) {
      if (_hasOwnProperty$3.call(pair, pairKey)) {
        if (!pairHasKey) pairHasKey = true;
        else return false;
      }
    }
    if (!pairHasKey) return false;
    if (objectKeys.indexOf(pairKey) === -1) objectKeys.push(pairKey);
    else return false;
  }
  return true;
}
function constructYamlOmap(data) {
  return data !== null ? data : [];
}
var omap = new Type$5("tag:yaml.org,2002:omap", {
  kind: "sequence",
  resolve: resolveYamlOmap,
  construct: constructYamlOmap
});
var Type$4 = type;
var _toString$1 = Object.prototype.toString;
function resolveYamlPairs(data) {
  if (data === null) return true;
  var index2, length, pair, keys2, result, object2 = data;
  result = new Array(object2.length);
  for (index2 = 0, length = object2.length; index2 < length; index2 += 1) {
    pair = object2[index2];
    if (_toString$1.call(pair) !== "[object Object]") return false;
    keys2 = Object.keys(pair);
    if (keys2.length !== 1) return false;
    result[index2] = [keys2[0], pair[keys2[0]]];
  }
  return true;
}
function constructYamlPairs(data) {
  if (data === null) return [];
  var index2, length, pair, keys2, result, object2 = data;
  result = new Array(object2.length);
  for (index2 = 0, length = object2.length; index2 < length; index2 += 1) {
    pair = object2[index2];
    keys2 = Object.keys(pair);
    result[index2] = [keys2[0], pair[keys2[0]]];
  }
  return result;
}
var pairs = new Type$4("tag:yaml.org,2002:pairs", {
  kind: "sequence",
  resolve: resolveYamlPairs,
  construct: constructYamlPairs
});
var Type$3 = type;
var _hasOwnProperty$2 = Object.prototype.hasOwnProperty;
function resolveYamlSet(data) {
  if (data === null) return true;
  var key, object2 = data;
  for (key in object2) {
    if (_hasOwnProperty$2.call(object2, key)) {
      if (object2[key] !== null) return false;
    }
  }
  return true;
}
function constructYamlSet(data) {
  return data !== null ? data : {};
}
var set = new Type$3("tag:yaml.org,2002:set", {
  kind: "mapping",
  resolve: resolveYamlSet,
  construct: constructYamlSet
});
var Schema$1 = schema;
var default_safe = new Schema$1({
  include: [
    core
  ],
  implicit: [
    timestamp,
    merge
  ],
  explicit: [
    binary,
    omap,
    pairs,
    set
  ]
});
var Type$2 = type;
function resolveJavascriptUndefined() {
  return true;
}
function constructJavascriptUndefined() {
  return void 0;
}
function representJavascriptUndefined() {
  return "";
}
function isUndefined(object2) {
  return typeof object2 === "undefined";
}
var _undefined = new Type$2("tag:yaml.org,2002:js/undefined", {
  kind: "scalar",
  resolve: resolveJavascriptUndefined,
  construct: constructJavascriptUndefined,
  predicate: isUndefined,
  represent: representJavascriptUndefined
});
var Type$1 = type;
function resolveJavascriptRegExp(data) {
  if (data === null) return false;
  if (data.length === 0) return false;
  var regexp2 = data, tail = /\/([gim]*)$/.exec(data), modifiers = "";
  if (regexp2[0] === "/") {
    if (tail) modifiers = tail[1];
    if (modifiers.length > 3) return false;
    if (regexp2[regexp2.length - modifiers.length - 1] !== "/") return false;
  }
  return true;
}
function constructJavascriptRegExp(data) {
  var regexp2 = data, tail = /\/([gim]*)$/.exec(data), modifiers = "";
  if (regexp2[0] === "/") {
    if (tail) modifiers = tail[1];
    regexp2 = regexp2.slice(1, regexp2.length - modifiers.length - 1);
  }
  return new RegExp(regexp2, modifiers);
}
function representJavascriptRegExp(object2) {
  var result = "/" + object2.source + "/";
  if (object2.global) result += "g";
  if (object2.multiline) result += "m";
  if (object2.ignoreCase) result += "i";
  return result;
}
function isRegExp(object2) {
  return Object.prototype.toString.call(object2) === "[object RegExp]";
}
var regexp = new Type$1("tag:yaml.org,2002:js/regexp", {
  kind: "scalar",
  resolve: resolveJavascriptRegExp,
  construct: constructJavascriptRegExp,
  predicate: isRegExp,
  represent: representJavascriptRegExp
});
var esprima;
try {
  var _require = commonjsRequire;
  esprima = _require("esprima");
} catch (_2) {
  if (typeof window !== "undefined") esprima = window.esprima;
}
var Type = type;
function resolveJavascriptFunction(data) {
  if (data === null) return false;
  try {
    var source = "(" + data + ")", ast = esprima.parse(source, { range: true });
    if (ast.type !== "Program" || ast.body.length !== 1 || ast.body[0].type !== "ExpressionStatement" || ast.body[0].expression.type !== "ArrowFunctionExpression" && ast.body[0].expression.type !== "FunctionExpression") {
      return false;
    }
    return true;
  } catch (err) {
    return false;
  }
}
function constructJavascriptFunction(data) {
  var source = "(" + data + ")", ast = esprima.parse(source, { range: true }), params = [], body;
  if (ast.type !== "Program" || ast.body.length !== 1 || ast.body[0].type !== "ExpressionStatement" || ast.body[0].expression.type !== "ArrowFunctionExpression" && ast.body[0].expression.type !== "FunctionExpression") {
    throw new Error("Failed to resolve function");
  }
  ast.body[0].expression.params.forEach(function(param) {
    params.push(param.name);
  });
  body = ast.body[0].expression.body.range;
  if (ast.body[0].expression.body.type === "BlockStatement") {
    return new Function(params, source.slice(body[0] + 1, body[1] - 1));
  }
  return new Function(params, "return " + source.slice(body[0], body[1]));
}
function representJavascriptFunction(object2) {
  return object2.toString();
}
function isFunction(object2) {
  return Object.prototype.toString.call(object2) === "[object Function]";
}
var _function = new Type("tag:yaml.org,2002:js/function", {
  kind: "scalar",
  resolve: resolveJavascriptFunction,
  construct: constructJavascriptFunction,
  predicate: isFunction,
  represent: representJavascriptFunction
});
var Schema = schema;
var default_full = Schema.DEFAULT = new Schema({
  include: [
    default_safe
  ],
  explicit: [
    _undefined,
    regexp,
    _function
  ]
});
var common$1 = common$6;
var YAMLException$1 = exception;
var Mark = mark;
var DEFAULT_SAFE_SCHEMA$1 = default_safe;
var DEFAULT_FULL_SCHEMA$1 = default_full;
var _hasOwnProperty$1 = Object.prototype.hasOwnProperty;
var CONTEXT_FLOW_IN = 1;
var CONTEXT_FLOW_OUT = 2;
var CONTEXT_BLOCK_IN = 3;
var CONTEXT_BLOCK_OUT = 4;
var CHOMPING_CLIP = 1;
var CHOMPING_STRIP = 2;
var CHOMPING_KEEP = 3;
var PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
var PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
var PATTERN_FLOW_INDICATORS = /[,\[\]\{\}]/;
var PATTERN_TAG_HANDLE = /^(?:!|!!|![a-z\-]+!)$/i;
var PATTERN_TAG_URI = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
function _class(obj) {
  return Object.prototype.toString.call(obj);
}
function is_EOL(c) {
  return c === 10 || c === 13;
}
function is_WHITE_SPACE(c) {
  return c === 9 || c === 32;
}
function is_WS_OR_EOL(c) {
  return c === 9 || c === 32 || c === 10 || c === 13;
}
function is_FLOW_INDICATOR(c) {
  return c === 44 || c === 91 || c === 93 || c === 123 || c === 125;
}
function fromHexCode(c) {
  var lc;
  if (48 <= c && c <= 57) {
    return c - 48;
  }
  lc = c | 32;
  if (97 <= lc && lc <= 102) {
    return lc - 97 + 10;
  }
  return -1;
}
function escapedHexLen(c) {
  if (c === 120) {
    return 2;
  }
  if (c === 117) {
    return 4;
  }
  if (c === 85) {
    return 8;
  }
  return 0;
}
function fromDecimalCode(c) {
  if (48 <= c && c <= 57) {
    return c - 48;
  }
  return -1;
}
function simpleEscapeSequence(c) {
  return c === 48 ? "\0" : c === 97 ? "\x07" : c === 98 ? "\b" : c === 116 ? "	" : c === 9 ? "	" : c === 110 ? "\n" : c === 118 ? "\v" : c === 102 ? "\f" : c === 114 ? "\r" : c === 101 ? "\x1B" : c === 32 ? " " : c === 34 ? '"' : c === 47 ? "/" : c === 92 ? "\\" : c === 78 ? "" : c === 95 ? " " : c === 76 ? "\u2028" : c === 80 ? "\u2029" : "";
}
function charFromCodepoint(c) {
  if (c <= 65535) {
    return String.fromCharCode(c);
  }
  return String.fromCharCode(
    (c - 65536 >> 10) + 55296,
    (c - 65536 & 1023) + 56320
  );
}
function setProperty(object2, key, value) {
  if (key === "__proto__") {
    Object.defineProperty(object2, key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value
    });
  } else {
    object2[key] = value;
  }
}
var simpleEscapeCheck = new Array(256);
var simpleEscapeMap = new Array(256);
for (var i = 0; i < 256; i++) {
  simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
  simpleEscapeMap[i] = simpleEscapeSequence(i);
}
function State$1(input, options) {
  this.input = input;
  this.filename = options["filename"] || null;
  this.schema = options["schema"] || DEFAULT_FULL_SCHEMA$1;
  this.onWarning = options["onWarning"] || null;
  this.legacy = options["legacy"] || false;
  this.json = options["json"] || false;
  this.listener = options["listener"] || null;
  this.implicitTypes = this.schema.compiledImplicit;
  this.typeMap = this.schema.compiledTypeMap;
  this.length = input.length;
  this.position = 0;
  this.line = 0;
  this.lineStart = 0;
  this.lineIndent = 0;
  this.documents = [];
}
function generateError(state, message) {
  return new YAMLException$1(
    message,
    new Mark(state.filename, state.input, state.position, state.line, state.position - state.lineStart)
  );
}
function throwError(state, message) {
  throw generateError(state, message);
}
function throwWarning(state, message) {
  if (state.onWarning) {
    state.onWarning.call(null, generateError(state, message));
  }
}
var directiveHandlers = {
  YAML: function handleYamlDirective(state, name, args) {
    var match, major, minor;
    if (state.version !== null) {
      throwError(state, "duplication of %YAML directive");
    }
    if (args.length !== 1) {
      throwError(state, "YAML directive accepts exactly one argument");
    }
    match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
    if (match === null) {
      throwError(state, "ill-formed argument of the YAML directive");
    }
    major = parseInt(match[1], 10);
    minor = parseInt(match[2], 10);
    if (major !== 1) {
      throwError(state, "unacceptable YAML version of the document");
    }
    state.version = args[0];
    state.checkLineBreaks = minor < 2;
    if (minor !== 1 && minor !== 2) {
      throwWarning(state, "unsupported YAML version of the document");
    }
  },
  TAG: function handleTagDirective(state, name, args) {
    var handle, prefix;
    if (args.length !== 2) {
      throwError(state, "TAG directive accepts exactly two arguments");
    }
    handle = args[0];
    prefix = args[1];
    if (!PATTERN_TAG_HANDLE.test(handle)) {
      throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
    }
    if (_hasOwnProperty$1.call(state.tagMap, handle)) {
      throwError(state, 'there is a previously declared suffix for "' + handle + '" tag handle');
    }
    if (!PATTERN_TAG_URI.test(prefix)) {
      throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
    }
    state.tagMap[handle] = prefix;
  }
};
function captureSegment(state, start, end, checkJson) {
  var _position, _length, _character, _result;
  if (start < end) {
    _result = state.input.slice(start, end);
    if (checkJson) {
      for (_position = 0, _length = _result.length; _position < _length; _position += 1) {
        _character = _result.charCodeAt(_position);
        if (!(_character === 9 || 32 <= _character && _character <= 1114111)) {
          throwError(state, "expected valid JSON character");
        }
      }
    } else if (PATTERN_NON_PRINTABLE.test(_result)) {
      throwError(state, "the stream contains non-printable characters");
    }
    state.result += _result;
  }
}
function mergeMappings(state, destination, source, overridableKeys) {
  var sourceKeys, key, index2, quantity;
  if (!common$1.isObject(source)) {
    throwError(state, "cannot merge mappings; the provided source object is unacceptable");
  }
  sourceKeys = Object.keys(source);
  for (index2 = 0, quantity = sourceKeys.length; index2 < quantity; index2 += 1) {
    key = sourceKeys[index2];
    if (!_hasOwnProperty$1.call(destination, key)) {
      setProperty(destination, key, source[key]);
      overridableKeys[key] = true;
    }
  }
}
function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startPos) {
  var index2, quantity;
  if (Array.isArray(keyNode)) {
    keyNode = Array.prototype.slice.call(keyNode);
    for (index2 = 0, quantity = keyNode.length; index2 < quantity; index2 += 1) {
      if (Array.isArray(keyNode[index2])) {
        throwError(state, "nested arrays are not supported inside keys");
      }
      if (typeof keyNode === "object" && _class(keyNode[index2]) === "[object Object]") {
        keyNode[index2] = "[object Object]";
      }
    }
  }
  if (typeof keyNode === "object" && _class(keyNode) === "[object Object]") {
    keyNode = "[object Object]";
  }
  keyNode = String(keyNode);
  if (_result === null) {
    _result = {};
  }
  if (keyTag === "tag:yaml.org,2002:merge") {
    if (Array.isArray(valueNode)) {
      for (index2 = 0, quantity = valueNode.length; index2 < quantity; index2 += 1) {
        mergeMappings(state, _result, valueNode[index2], overridableKeys);
      }
    } else {
      mergeMappings(state, _result, valueNode, overridableKeys);
    }
  } else {
    if (!state.json && !_hasOwnProperty$1.call(overridableKeys, keyNode) && _hasOwnProperty$1.call(_result, keyNode)) {
      state.line = startLine || state.line;
      state.position = startPos || state.position;
      throwError(state, "duplicated mapping key");
    }
    setProperty(_result, keyNode, valueNode);
    delete overridableKeys[keyNode];
  }
  return _result;
}
function readLineBreak(state) {
  var ch;
  ch = state.input.charCodeAt(state.position);
  if (ch === 10) {
    state.position++;
  } else if (ch === 13) {
    state.position++;
    if (state.input.charCodeAt(state.position) === 10) {
      state.position++;
    }
  } else {
    throwError(state, "a line break is expected");
  }
  state.line += 1;
  state.lineStart = state.position;
}
function skipSeparationSpace(state, allowComments, checkIndent) {
  var lineBreaks = 0, ch = state.input.charCodeAt(state.position);
  while (ch !== 0) {
    while (is_WHITE_SPACE(ch)) {
      ch = state.input.charCodeAt(++state.position);
    }
    if (allowComments && ch === 35) {
      do {
        ch = state.input.charCodeAt(++state.position);
      } while (ch !== 10 && ch !== 13 && ch !== 0);
    }
    if (is_EOL(ch)) {
      readLineBreak(state);
      ch = state.input.charCodeAt(state.position);
      lineBreaks++;
      state.lineIndent = 0;
      while (ch === 32) {
        state.lineIndent++;
        ch = state.input.charCodeAt(++state.position);
      }
    } else {
      break;
    }
  }
  if (checkIndent !== -1 && lineBreaks !== 0 && state.lineIndent < checkIndent) {
    throwWarning(state, "deficient indentation");
  }
  return lineBreaks;
}
function testDocumentSeparator(state) {
  var _position = state.position, ch;
  ch = state.input.charCodeAt(_position);
  if ((ch === 45 || ch === 46) && ch === state.input.charCodeAt(_position + 1) && ch === state.input.charCodeAt(_position + 2)) {
    _position += 3;
    ch = state.input.charCodeAt(_position);
    if (ch === 0 || is_WS_OR_EOL(ch)) {
      return true;
    }
  }
  return false;
}
function writeFoldedLines(state, count) {
  if (count === 1) {
    state.result += " ";
  } else if (count > 1) {
    state.result += common$1.repeat("\n", count - 1);
  }
}
function readPlainScalar(state, nodeIndent, withinFlowCollection) {
  var preceding, following, captureStart, captureEnd, hasPendingContent, _line, _lineStart, _lineIndent, _kind = state.kind, _result = state.result, ch;
  ch = state.input.charCodeAt(state.position);
  if (is_WS_OR_EOL(ch) || is_FLOW_INDICATOR(ch) || ch === 35 || ch === 38 || ch === 42 || ch === 33 || ch === 124 || ch === 62 || ch === 39 || ch === 34 || ch === 37 || ch === 64 || ch === 96) {
    return false;
  }
  if (ch === 63 || ch === 45) {
    following = state.input.charCodeAt(state.position + 1);
    if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
      return false;
    }
  }
  state.kind = "scalar";
  state.result = "";
  captureStart = captureEnd = state.position;
  hasPendingContent = false;
  while (ch !== 0) {
    if (ch === 58) {
      following = state.input.charCodeAt(state.position + 1);
      if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
        break;
      }
    } else if (ch === 35) {
      preceding = state.input.charCodeAt(state.position - 1);
      if (is_WS_OR_EOL(preceding)) {
        break;
      }
    } else if (state.position === state.lineStart && testDocumentSeparator(state) || withinFlowCollection && is_FLOW_INDICATOR(ch)) {
      break;
    } else if (is_EOL(ch)) {
      _line = state.line;
      _lineStart = state.lineStart;
      _lineIndent = state.lineIndent;
      skipSeparationSpace(state, false, -1);
      if (state.lineIndent >= nodeIndent) {
        hasPendingContent = true;
        ch = state.input.charCodeAt(state.position);
        continue;
      } else {
        state.position = captureEnd;
        state.line = _line;
        state.lineStart = _lineStart;
        state.lineIndent = _lineIndent;
        break;
      }
    }
    if (hasPendingContent) {
      captureSegment(state, captureStart, captureEnd, false);
      writeFoldedLines(state, state.line - _line);
      captureStart = captureEnd = state.position;
      hasPendingContent = false;
    }
    if (!is_WHITE_SPACE(ch)) {
      captureEnd = state.position + 1;
    }
    ch = state.input.charCodeAt(++state.position);
  }
  captureSegment(state, captureStart, captureEnd, false);
  if (state.result) {
    return true;
  }
  state.kind = _kind;
  state.result = _result;
  return false;
}
function readSingleQuotedScalar(state, nodeIndent) {
  var ch, captureStart, captureEnd;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 39) {
    return false;
  }
  state.kind = "scalar";
  state.result = "";
  state.position++;
  captureStart = captureEnd = state.position;
  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    if (ch === 39) {
      captureSegment(state, captureStart, state.position, true);
      ch = state.input.charCodeAt(++state.position);
      if (ch === 39) {
        captureStart = state.position;
        state.position++;
        captureEnd = state.position;
      } else {
        return true;
      }
    } else if (is_EOL(ch)) {
      captureSegment(state, captureStart, captureEnd, true);
      writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
      captureStart = captureEnd = state.position;
    } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
      throwError(state, "unexpected end of the document within a single quoted scalar");
    } else {
      state.position++;
      captureEnd = state.position;
    }
  }
  throwError(state, "unexpected end of the stream within a single quoted scalar");
}
function readDoubleQuotedScalar(state, nodeIndent) {
  var captureStart, captureEnd, hexLength, hexResult, tmp, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 34) {
    return false;
  }
  state.kind = "scalar";
  state.result = "";
  state.position++;
  captureStart = captureEnd = state.position;
  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    if (ch === 34) {
      captureSegment(state, captureStart, state.position, true);
      state.position++;
      return true;
    } else if (ch === 92) {
      captureSegment(state, captureStart, state.position, true);
      ch = state.input.charCodeAt(++state.position);
      if (is_EOL(ch)) {
        skipSeparationSpace(state, false, nodeIndent);
      } else if (ch < 256 && simpleEscapeCheck[ch]) {
        state.result += simpleEscapeMap[ch];
        state.position++;
      } else if ((tmp = escapedHexLen(ch)) > 0) {
        hexLength = tmp;
        hexResult = 0;
        for (; hexLength > 0; hexLength--) {
          ch = state.input.charCodeAt(++state.position);
          if ((tmp = fromHexCode(ch)) >= 0) {
            hexResult = (hexResult << 4) + tmp;
          } else {
            throwError(state, "expected hexadecimal character");
          }
        }
        state.result += charFromCodepoint(hexResult);
        state.position++;
      } else {
        throwError(state, "unknown escape sequence");
      }
      captureStart = captureEnd = state.position;
    } else if (is_EOL(ch)) {
      captureSegment(state, captureStart, captureEnd, true);
      writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
      captureStart = captureEnd = state.position;
    } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
      throwError(state, "unexpected end of the document within a double quoted scalar");
    } else {
      state.position++;
      captureEnd = state.position;
    }
  }
  throwError(state, "unexpected end of the stream within a double quoted scalar");
}
function readFlowCollection(state, nodeIndent) {
  var readNext = true, _line, _tag = state.tag, _result, _anchor = state.anchor, following, terminator, isPair, isExplicitPair, isMapping, overridableKeys = {}, keyNode, keyTag, valueNode, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch === 91) {
    terminator = 93;
    isMapping = false;
    _result = [];
  } else if (ch === 123) {
    terminator = 125;
    isMapping = true;
    _result = {};
  } else {
    return false;
  }
  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }
  ch = state.input.charCodeAt(++state.position);
  while (ch !== 0) {
    skipSeparationSpace(state, true, nodeIndent);
    ch = state.input.charCodeAt(state.position);
    if (ch === terminator) {
      state.position++;
      state.tag = _tag;
      state.anchor = _anchor;
      state.kind = isMapping ? "mapping" : "sequence";
      state.result = _result;
      return true;
    } else if (!readNext) {
      throwError(state, "missed comma between flow collection entries");
    }
    keyTag = keyNode = valueNode = null;
    isPair = isExplicitPair = false;
    if (ch === 63) {
      following = state.input.charCodeAt(state.position + 1);
      if (is_WS_OR_EOL(following)) {
        isPair = isExplicitPair = true;
        state.position++;
        skipSeparationSpace(state, true, nodeIndent);
      }
    }
    _line = state.line;
    composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
    keyTag = state.tag;
    keyNode = state.result;
    skipSeparationSpace(state, true, nodeIndent);
    ch = state.input.charCodeAt(state.position);
    if ((isExplicitPair || state.line === _line) && ch === 58) {
      isPair = true;
      ch = state.input.charCodeAt(++state.position);
      skipSeparationSpace(state, true, nodeIndent);
      composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
      valueNode = state.result;
    }
    if (isMapping) {
      storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode);
    } else if (isPair) {
      _result.push(storeMappingPair(state, null, overridableKeys, keyTag, keyNode, valueNode));
    } else {
      _result.push(keyNode);
    }
    skipSeparationSpace(state, true, nodeIndent);
    ch = state.input.charCodeAt(state.position);
    if (ch === 44) {
      readNext = true;
      ch = state.input.charCodeAt(++state.position);
    } else {
      readNext = false;
    }
  }
  throwError(state, "unexpected end of the stream within a flow collection");
}
function readBlockScalar(state, nodeIndent) {
  var captureStart, folding, chomping = CHOMPING_CLIP, didReadContent = false, detectedIndent = false, textIndent = nodeIndent, emptyLines = 0, atMoreIndented = false, tmp, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch === 124) {
    folding = false;
  } else if (ch === 62) {
    folding = true;
  } else {
    return false;
  }
  state.kind = "scalar";
  state.result = "";
  while (ch !== 0) {
    ch = state.input.charCodeAt(++state.position);
    if (ch === 43 || ch === 45) {
      if (CHOMPING_CLIP === chomping) {
        chomping = ch === 43 ? CHOMPING_KEEP : CHOMPING_STRIP;
      } else {
        throwError(state, "repeat of a chomping mode identifier");
      }
    } else if ((tmp = fromDecimalCode(ch)) >= 0) {
      if (tmp === 0) {
        throwError(state, "bad explicit indentation width of a block scalar; it cannot be less than one");
      } else if (!detectedIndent) {
        textIndent = nodeIndent + tmp - 1;
        detectedIndent = true;
      } else {
        throwError(state, "repeat of an indentation width identifier");
      }
    } else {
      break;
    }
  }
  if (is_WHITE_SPACE(ch)) {
    do {
      ch = state.input.charCodeAt(++state.position);
    } while (is_WHITE_SPACE(ch));
    if (ch === 35) {
      do {
        ch = state.input.charCodeAt(++state.position);
      } while (!is_EOL(ch) && ch !== 0);
    }
  }
  while (ch !== 0) {
    readLineBreak(state);
    state.lineIndent = 0;
    ch = state.input.charCodeAt(state.position);
    while ((!detectedIndent || state.lineIndent < textIndent) && ch === 32) {
      state.lineIndent++;
      ch = state.input.charCodeAt(++state.position);
    }
    if (!detectedIndent && state.lineIndent > textIndent) {
      textIndent = state.lineIndent;
    }
    if (is_EOL(ch)) {
      emptyLines++;
      continue;
    }
    if (state.lineIndent < textIndent) {
      if (chomping === CHOMPING_KEEP) {
        state.result += common$1.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
      } else if (chomping === CHOMPING_CLIP) {
        if (didReadContent) {
          state.result += "\n";
        }
      }
      break;
    }
    if (folding) {
      if (is_WHITE_SPACE(ch)) {
        atMoreIndented = true;
        state.result += common$1.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
      } else if (atMoreIndented) {
        atMoreIndented = false;
        state.result += common$1.repeat("\n", emptyLines + 1);
      } else if (emptyLines === 0) {
        if (didReadContent) {
          state.result += " ";
        }
      } else {
        state.result += common$1.repeat("\n", emptyLines);
      }
    } else {
      state.result += common$1.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
    }
    didReadContent = true;
    detectedIndent = true;
    emptyLines = 0;
    captureStart = state.position;
    while (!is_EOL(ch) && ch !== 0) {
      ch = state.input.charCodeAt(++state.position);
    }
    captureSegment(state, captureStart, state.position, false);
  }
  return true;
}
function readBlockSequence(state, nodeIndent) {
  var _line, _tag = state.tag, _anchor = state.anchor, _result = [], following, detected = false, ch;
  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }
  ch = state.input.charCodeAt(state.position);
  while (ch !== 0) {
    if (ch !== 45) {
      break;
    }
    following = state.input.charCodeAt(state.position + 1);
    if (!is_WS_OR_EOL(following)) {
      break;
    }
    detected = true;
    state.position++;
    if (skipSeparationSpace(state, true, -1)) {
      if (state.lineIndent <= nodeIndent) {
        _result.push(null);
        ch = state.input.charCodeAt(state.position);
        continue;
      }
    }
    _line = state.line;
    composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
    _result.push(state.result);
    skipSeparationSpace(state, true, -1);
    ch = state.input.charCodeAt(state.position);
    if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
      throwError(state, "bad indentation of a sequence entry");
    } else if (state.lineIndent < nodeIndent) {
      break;
    }
  }
  if (detected) {
    state.tag = _tag;
    state.anchor = _anchor;
    state.kind = "sequence";
    state.result = _result;
    return true;
  }
  return false;
}
function readBlockMapping(state, nodeIndent, flowIndent) {
  var following, allowCompact, _line, _pos, _tag = state.tag, _anchor = state.anchor, _result = {}, overridableKeys = {}, keyTag = null, keyNode = null, valueNode = null, atExplicitKey = false, detected = false, ch;
  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }
  ch = state.input.charCodeAt(state.position);
  while (ch !== 0) {
    following = state.input.charCodeAt(state.position + 1);
    _line = state.line;
    _pos = state.position;
    if ((ch === 63 || ch === 58) && is_WS_OR_EOL(following)) {
      if (ch === 63) {
        if (atExplicitKey) {
          storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null);
          keyTag = keyNode = valueNode = null;
        }
        detected = true;
        atExplicitKey = true;
        allowCompact = true;
      } else if (atExplicitKey) {
        atExplicitKey = false;
        allowCompact = true;
      } else {
        throwError(state, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line");
      }
      state.position += 1;
      ch = following;
    } else if (composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) {
      if (state.line === _line) {
        ch = state.input.charCodeAt(state.position);
        while (is_WHITE_SPACE(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }
        if (ch === 58) {
          ch = state.input.charCodeAt(++state.position);
          if (!is_WS_OR_EOL(ch)) {
            throwError(state, "a whitespace character is expected after the key-value separator within a block mapping");
          }
          if (atExplicitKey) {
            storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null);
            keyTag = keyNode = valueNode = null;
          }
          detected = true;
          atExplicitKey = false;
          allowCompact = false;
          keyTag = state.tag;
          keyNode = state.result;
        } else if (detected) {
          throwError(state, "can not read an implicit mapping pair; a colon is missed");
        } else {
          state.tag = _tag;
          state.anchor = _anchor;
          return true;
        }
      } else if (detected) {
        throwError(state, "can not read a block mapping entry; a multiline key may not be an implicit key");
      } else {
        state.tag = _tag;
        state.anchor = _anchor;
        return true;
      }
    } else {
      break;
    }
    if (state.line === _line || state.lineIndent > nodeIndent) {
      if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) {
        if (atExplicitKey) {
          keyNode = state.result;
        } else {
          valueNode = state.result;
        }
      }
      if (!atExplicitKey) {
        storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _line, _pos);
        keyTag = keyNode = valueNode = null;
      }
      skipSeparationSpace(state, true, -1);
      ch = state.input.charCodeAt(state.position);
    }
    if (state.lineIndent > nodeIndent && ch !== 0) {
      throwError(state, "bad indentation of a mapping entry");
    } else if (state.lineIndent < nodeIndent) {
      break;
    }
  }
  if (atExplicitKey) {
    storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null);
  }
  if (detected) {
    state.tag = _tag;
    state.anchor = _anchor;
    state.kind = "mapping";
    state.result = _result;
  }
  return detected;
}
function readTagProperty(state) {
  var _position, isVerbatim = false, isNamed = false, tagHandle, tagName, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 33) return false;
  if (state.tag !== null) {
    throwError(state, "duplication of a tag property");
  }
  ch = state.input.charCodeAt(++state.position);
  if (ch === 60) {
    isVerbatim = true;
    ch = state.input.charCodeAt(++state.position);
  } else if (ch === 33) {
    isNamed = true;
    tagHandle = "!!";
    ch = state.input.charCodeAt(++state.position);
  } else {
    tagHandle = "!";
  }
  _position = state.position;
  if (isVerbatim) {
    do {
      ch = state.input.charCodeAt(++state.position);
    } while (ch !== 0 && ch !== 62);
    if (state.position < state.length) {
      tagName = state.input.slice(_position, state.position);
      ch = state.input.charCodeAt(++state.position);
    } else {
      throwError(state, "unexpected end of the stream within a verbatim tag");
    }
  } else {
    while (ch !== 0 && !is_WS_OR_EOL(ch)) {
      if (ch === 33) {
        if (!isNamed) {
          tagHandle = state.input.slice(_position - 1, state.position + 1);
          if (!PATTERN_TAG_HANDLE.test(tagHandle)) {
            throwError(state, "named tag handle cannot contain such characters");
          }
          isNamed = true;
          _position = state.position + 1;
        } else {
          throwError(state, "tag suffix cannot contain exclamation marks");
        }
      }
      ch = state.input.charCodeAt(++state.position);
    }
    tagName = state.input.slice(_position, state.position);
    if (PATTERN_FLOW_INDICATORS.test(tagName)) {
      throwError(state, "tag suffix cannot contain flow indicator characters");
    }
  }
  if (tagName && !PATTERN_TAG_URI.test(tagName)) {
    throwError(state, "tag name cannot contain such characters: " + tagName);
  }
  if (isVerbatim) {
    state.tag = tagName;
  } else if (_hasOwnProperty$1.call(state.tagMap, tagHandle)) {
    state.tag = state.tagMap[tagHandle] + tagName;
  } else if (tagHandle === "!") {
    state.tag = "!" + tagName;
  } else if (tagHandle === "!!") {
    state.tag = "tag:yaml.org,2002:" + tagName;
  } else {
    throwError(state, 'undeclared tag handle "' + tagHandle + '"');
  }
  return true;
}
function readAnchorProperty(state) {
  var _position, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 38) return false;
  if (state.anchor !== null) {
    throwError(state, "duplication of an anchor property");
  }
  ch = state.input.charCodeAt(++state.position);
  _position = state.position;
  while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
    ch = state.input.charCodeAt(++state.position);
  }
  if (state.position === _position) {
    throwError(state, "name of an anchor node must contain at least one character");
  }
  state.anchor = state.input.slice(_position, state.position);
  return true;
}
function readAlias(state) {
  var _position, alias, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 42) return false;
  ch = state.input.charCodeAt(++state.position);
  _position = state.position;
  while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
    ch = state.input.charCodeAt(++state.position);
  }
  if (state.position === _position) {
    throwError(state, "name of an alias node must contain at least one character");
  }
  alias = state.input.slice(_position, state.position);
  if (!_hasOwnProperty$1.call(state.anchorMap, alias)) {
    throwError(state, 'unidentified alias "' + alias + '"');
  }
  state.result = state.anchorMap[alias];
  skipSeparationSpace(state, true, -1);
  return true;
}
function composeNode(state, parentIndent, nodeContext, allowToSeek, allowCompact) {
  var allowBlockStyles, allowBlockScalars, allowBlockCollections, indentStatus = 1, atNewLine = false, hasContent = false, typeIndex, typeQuantity, type2, flowIndent, blockIndent;
  if (state.listener !== null) {
    state.listener("open", state);
  }
  state.tag = null;
  state.anchor = null;
  state.kind = null;
  state.result = null;
  allowBlockStyles = allowBlockScalars = allowBlockCollections = CONTEXT_BLOCK_OUT === nodeContext || CONTEXT_BLOCK_IN === nodeContext;
  if (allowToSeek) {
    if (skipSeparationSpace(state, true, -1)) {
      atNewLine = true;
      if (state.lineIndent > parentIndent) {
        indentStatus = 1;
      } else if (state.lineIndent === parentIndent) {
        indentStatus = 0;
      } else if (state.lineIndent < parentIndent) {
        indentStatus = -1;
      }
    }
  }
  if (indentStatus === 1) {
    while (readTagProperty(state) || readAnchorProperty(state)) {
      if (skipSeparationSpace(state, true, -1)) {
        atNewLine = true;
        allowBlockCollections = allowBlockStyles;
        if (state.lineIndent > parentIndent) {
          indentStatus = 1;
        } else if (state.lineIndent === parentIndent) {
          indentStatus = 0;
        } else if (state.lineIndent < parentIndent) {
          indentStatus = -1;
        }
      } else {
        allowBlockCollections = false;
      }
    }
  }
  if (allowBlockCollections) {
    allowBlockCollections = atNewLine || allowCompact;
  }
  if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
    if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) {
      flowIndent = parentIndent;
    } else {
      flowIndent = parentIndent + 1;
    }
    blockIndent = state.position - state.lineStart;
    if (indentStatus === 1) {
      if (allowBlockCollections && (readBlockSequence(state, blockIndent) || readBlockMapping(state, blockIndent, flowIndent)) || readFlowCollection(state, flowIndent)) {
        hasContent = true;
      } else {
        if (allowBlockScalars && readBlockScalar(state, flowIndent) || readSingleQuotedScalar(state, flowIndent) || readDoubleQuotedScalar(state, flowIndent)) {
          hasContent = true;
        } else if (readAlias(state)) {
          hasContent = true;
          if (state.tag !== null || state.anchor !== null) {
            throwError(state, "alias node should not have any properties");
          }
        } else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
          hasContent = true;
          if (state.tag === null) {
            state.tag = "?";
          }
        }
        if (state.anchor !== null) {
          state.anchorMap[state.anchor] = state.result;
        }
      }
    } else if (indentStatus === 0) {
      hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
    }
  }
  if (state.tag !== null && state.tag !== "!") {
    if (state.tag === "?") {
      if (state.result !== null && state.kind !== "scalar") {
        throwError(state, 'unacceptable node kind for !<?> tag; it should be "scalar", not "' + state.kind + '"');
      }
      for (typeIndex = 0, typeQuantity = state.implicitTypes.length; typeIndex < typeQuantity; typeIndex += 1) {
        type2 = state.implicitTypes[typeIndex];
        if (type2.resolve(state.result)) {
          state.result = type2.construct(state.result);
          state.tag = type2.tag;
          if (state.anchor !== null) {
            state.anchorMap[state.anchor] = state.result;
          }
          break;
        }
      }
    } else if (_hasOwnProperty$1.call(state.typeMap[state.kind || "fallback"], state.tag)) {
      type2 = state.typeMap[state.kind || "fallback"][state.tag];
      if (state.result !== null && type2.kind !== state.kind) {
        throwError(state, "unacceptable node kind for !<" + state.tag + '> tag; it should be "' + type2.kind + '", not "' + state.kind + '"');
      }
      if (!type2.resolve(state.result)) {
        throwError(state, "cannot resolve a node with !<" + state.tag + "> explicit tag");
      } else {
        state.result = type2.construct(state.result);
        if (state.anchor !== null) {
          state.anchorMap[state.anchor] = state.result;
        }
      }
    } else {
      throwError(state, "unknown tag !<" + state.tag + ">");
    }
  }
  if (state.listener !== null) {
    state.listener("close", state);
  }
  return state.tag !== null || state.anchor !== null || hasContent;
}
function readDocument(state) {
  var documentStart = state.position, _position, directiveName, directiveArgs, hasDirectives = false, ch;
  state.version = null;
  state.checkLineBreaks = state.legacy;
  state.tagMap = {};
  state.anchorMap = {};
  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    skipSeparationSpace(state, true, -1);
    ch = state.input.charCodeAt(state.position);
    if (state.lineIndent > 0 || ch !== 37) {
      break;
    }
    hasDirectives = true;
    ch = state.input.charCodeAt(++state.position);
    _position = state.position;
    while (ch !== 0 && !is_WS_OR_EOL(ch)) {
      ch = state.input.charCodeAt(++state.position);
    }
    directiveName = state.input.slice(_position, state.position);
    directiveArgs = [];
    if (directiveName.length < 1) {
      throwError(state, "directive name must not be less than one character in length");
    }
    while (ch !== 0) {
      while (is_WHITE_SPACE(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      if (ch === 35) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (ch !== 0 && !is_EOL(ch));
        break;
      }
      if (is_EOL(ch)) break;
      _position = state.position;
      while (ch !== 0 && !is_WS_OR_EOL(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      directiveArgs.push(state.input.slice(_position, state.position));
    }
    if (ch !== 0) readLineBreak(state);
    if (_hasOwnProperty$1.call(directiveHandlers, directiveName)) {
      directiveHandlers[directiveName](state, directiveName, directiveArgs);
    } else {
      throwWarning(state, 'unknown document directive "' + directiveName + '"');
    }
  }
  skipSeparationSpace(state, true, -1);
  if (state.lineIndent === 0 && state.input.charCodeAt(state.position) === 45 && state.input.charCodeAt(state.position + 1) === 45 && state.input.charCodeAt(state.position + 2) === 45) {
    state.position += 3;
    skipSeparationSpace(state, true, -1);
  } else if (hasDirectives) {
    throwError(state, "directives end mark is expected");
  }
  composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
  skipSeparationSpace(state, true, -1);
  if (state.checkLineBreaks && PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position))) {
    throwWarning(state, "non-ASCII line breaks are interpreted as content");
  }
  state.documents.push(state.result);
  if (state.position === state.lineStart && testDocumentSeparator(state)) {
    if (state.input.charCodeAt(state.position) === 46) {
      state.position += 3;
      skipSeparationSpace(state, true, -1);
    }
    return;
  }
  if (state.position < state.length - 1) {
    throwError(state, "end of the stream or a document separator is expected");
  } else {
    return;
  }
}
function loadDocuments(input, options) {
  input = String(input);
  options = options || {};
  if (input.length !== 0) {
    if (input.charCodeAt(input.length - 1) !== 10 && input.charCodeAt(input.length - 1) !== 13) {
      input += "\n";
    }
    if (input.charCodeAt(0) === 65279) {
      input = input.slice(1);
    }
  }
  var state = new State$1(input, options);
  var nullpos = input.indexOf("\0");
  if (nullpos !== -1) {
    state.position = nullpos;
    throwError(state, "null byte is not allowed in input");
  }
  state.input += "\0";
  while (state.input.charCodeAt(state.position) === 32) {
    state.lineIndent += 1;
    state.position += 1;
  }
  while (state.position < state.length - 1) {
    readDocument(state);
  }
  return state.documents;
}
function loadAll(input, iterator, options) {
  if (iterator !== null && typeof iterator === "object" && typeof options === "undefined") {
    options = iterator;
    iterator = null;
  }
  var documents = loadDocuments(input, options);
  if (typeof iterator !== "function") {
    return documents;
  }
  for (var index2 = 0, length = documents.length; index2 < length; index2 += 1) {
    iterator(documents[index2]);
  }
}
function load(input, options) {
  var documents = loadDocuments(input, options);
  if (documents.length === 0) {
    return void 0;
  } else if (documents.length === 1) {
    return documents[0];
  }
  throw new YAMLException$1("expected a single document in the stream, but found more");
}
function safeLoadAll(input, iterator, options) {
  if (typeof iterator === "object" && iterator !== null && typeof options === "undefined") {
    options = iterator;
    iterator = null;
  }
  return loadAll(input, iterator, common$1.extend({ schema: DEFAULT_SAFE_SCHEMA$1 }, options));
}
function safeLoad(input, options) {
  return load(input, common$1.extend({ schema: DEFAULT_SAFE_SCHEMA$1 }, options));
}
loader$1.loadAll = loadAll;
loader$1.load = load;
loader$1.safeLoadAll = safeLoadAll;
loader$1.safeLoad = safeLoad;
var dumper$1 = {};
var common = common$6;
var YAMLException = exception;
var DEFAULT_FULL_SCHEMA = default_full;
var DEFAULT_SAFE_SCHEMA = default_safe;
var _toString = Object.prototype.toString;
var _hasOwnProperty = Object.prototype.hasOwnProperty;
var CHAR_TAB = 9;
var CHAR_LINE_FEED = 10;
var CHAR_CARRIAGE_RETURN = 13;
var CHAR_SPACE = 32;
var CHAR_EXCLAMATION = 33;
var CHAR_DOUBLE_QUOTE = 34;
var CHAR_SHARP = 35;
var CHAR_PERCENT = 37;
var CHAR_AMPERSAND = 38;
var CHAR_SINGLE_QUOTE = 39;
var CHAR_ASTERISK = 42;
var CHAR_COMMA = 44;
var CHAR_MINUS = 45;
var CHAR_COLON = 58;
var CHAR_EQUALS = 61;
var CHAR_GREATER_THAN = 62;
var CHAR_QUESTION = 63;
var CHAR_COMMERCIAL_AT = 64;
var CHAR_LEFT_SQUARE_BRACKET = 91;
var CHAR_RIGHT_SQUARE_BRACKET = 93;
var CHAR_GRAVE_ACCENT = 96;
var CHAR_LEFT_CURLY_BRACKET = 123;
var CHAR_VERTICAL_LINE = 124;
var CHAR_RIGHT_CURLY_BRACKET = 125;
var ESCAPE_SEQUENCES = {};
ESCAPE_SEQUENCES[0] = "\\0";
ESCAPE_SEQUENCES[7] = "\\a";
ESCAPE_SEQUENCES[8] = "\\b";
ESCAPE_SEQUENCES[9] = "\\t";
ESCAPE_SEQUENCES[10] = "\\n";
ESCAPE_SEQUENCES[11] = "\\v";
ESCAPE_SEQUENCES[12] = "\\f";
ESCAPE_SEQUENCES[13] = "\\r";
ESCAPE_SEQUENCES[27] = "\\e";
ESCAPE_SEQUENCES[34] = '\\"';
ESCAPE_SEQUENCES[92] = "\\\\";
ESCAPE_SEQUENCES[133] = "\\N";
ESCAPE_SEQUENCES[160] = "\\_";
ESCAPE_SEQUENCES[8232] = "\\L";
ESCAPE_SEQUENCES[8233] = "\\P";
var DEPRECATED_BOOLEANS_SYNTAX = [
  "y",
  "Y",
  "yes",
  "Yes",
  "YES",
  "on",
  "On",
  "ON",
  "n",
  "N",
  "no",
  "No",
  "NO",
  "off",
  "Off",
  "OFF"
];
function compileStyleMap(schema2, map2) {
  var result, keys2, index2, length, tag, style, type2;
  if (map2 === null) return {};
  result = {};
  keys2 = Object.keys(map2);
  for (index2 = 0, length = keys2.length; index2 < length; index2 += 1) {
    tag = keys2[index2];
    style = String(map2[tag]);
    if (tag.slice(0, 2) === "!!") {
      tag = "tag:yaml.org,2002:" + tag.slice(2);
    }
    type2 = schema2.compiledTypeMap["fallback"][tag];
    if (type2 && _hasOwnProperty.call(type2.styleAliases, style)) {
      style = type2.styleAliases[style];
    }
    result[tag] = style;
  }
  return result;
}
function encodeHex(character) {
  var string2, handle, length;
  string2 = character.toString(16).toUpperCase();
  if (character <= 255) {
    handle = "x";
    length = 2;
  } else if (character <= 65535) {
    handle = "u";
    length = 4;
  } else if (character <= 4294967295) {
    handle = "U";
    length = 8;
  } else {
    throw new YAMLException("code point within a string may not be greater than 0xFFFFFFFF");
  }
  return "\\" + handle + common.repeat("0", length - string2.length) + string2;
}
function State(options) {
  this.schema = options["schema"] || DEFAULT_FULL_SCHEMA;
  this.indent = Math.max(1, options["indent"] || 2);
  this.noArrayIndent = options["noArrayIndent"] || false;
  this.skipInvalid = options["skipInvalid"] || false;
  this.flowLevel = common.isNothing(options["flowLevel"]) ? -1 : options["flowLevel"];
  this.styleMap = compileStyleMap(this.schema, options["styles"] || null);
  this.sortKeys = options["sortKeys"] || false;
  this.lineWidth = options["lineWidth"] || 80;
  this.noRefs = options["noRefs"] || false;
  this.noCompatMode = options["noCompatMode"] || false;
  this.condenseFlow = options["condenseFlow"] || false;
  this.implicitTypes = this.schema.compiledImplicit;
  this.explicitTypes = this.schema.compiledExplicit;
  this.tag = null;
  this.result = "";
  this.duplicates = [];
  this.usedDuplicates = null;
}
function indentString(string2, spaces) {
  var ind = common.repeat(" ", spaces), position = 0, next = -1, result = "", line, length = string2.length;
  while (position < length) {
    next = string2.indexOf("\n", position);
    if (next === -1) {
      line = string2.slice(position);
      position = length;
    } else {
      line = string2.slice(position, next + 1);
      position = next + 1;
    }
    if (line.length && line !== "\n") result += ind;
    result += line;
  }
  return result;
}
function generateNextLine(state, level) {
  return "\n" + common.repeat(" ", state.indent * level);
}
function testImplicitResolving(state, str2) {
  var index2, length, type2;
  for (index2 = 0, length = state.implicitTypes.length; index2 < length; index2 += 1) {
    type2 = state.implicitTypes[index2];
    if (type2.resolve(str2)) {
      return true;
    }
  }
  return false;
}
function isWhitespace(c) {
  return c === CHAR_SPACE || c === CHAR_TAB;
}
function isPrintable(c) {
  return 32 <= c && c <= 126 || 161 <= c && c <= 55295 && c !== 8232 && c !== 8233 || 57344 <= c && c <= 65533 && c !== 65279 || 65536 <= c && c <= 1114111;
}
function isNsChar(c) {
  return isPrintable(c) && !isWhitespace(c) && c !== 65279 && c !== CHAR_CARRIAGE_RETURN && c !== CHAR_LINE_FEED;
}
function isPlainSafe(c, prev) {
  return isPrintable(c) && c !== 65279 && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET && c !== CHAR_COLON && (c !== CHAR_SHARP || prev && isNsChar(prev));
}
function isPlainSafeFirst(c) {
  return isPrintable(c) && c !== 65279 && !isWhitespace(c) && c !== CHAR_MINUS && c !== CHAR_QUESTION && c !== CHAR_COLON && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET && c !== CHAR_SHARP && c !== CHAR_AMPERSAND && c !== CHAR_ASTERISK && c !== CHAR_EXCLAMATION && c !== CHAR_VERTICAL_LINE && c !== CHAR_EQUALS && c !== CHAR_GREATER_THAN && c !== CHAR_SINGLE_QUOTE && c !== CHAR_DOUBLE_QUOTE && c !== CHAR_PERCENT && c !== CHAR_COMMERCIAL_AT && c !== CHAR_GRAVE_ACCENT;
}
function needIndentIndicator(string2) {
  var leadingSpaceRe = /^\n* /;
  return leadingSpaceRe.test(string2);
}
var STYLE_PLAIN = 1, STYLE_SINGLE = 2, STYLE_LITERAL = 3, STYLE_FOLDED = 4, STYLE_DOUBLE = 5;
function chooseScalarStyle(string2, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType) {
  var i;
  var char, prev_char;
  var hasLineBreak = false;
  var hasFoldableLine = false;
  var shouldTrackWidth = lineWidth !== -1;
  var previousLineBreak = -1;
  var plain = isPlainSafeFirst(string2.charCodeAt(0)) && !isWhitespace(string2.charCodeAt(string2.length - 1));
  if (singleLineOnly) {
    for (i = 0; i < string2.length; i++) {
      char = string2.charCodeAt(i);
      if (!isPrintable(char)) {
        return STYLE_DOUBLE;
      }
      prev_char = i > 0 ? string2.charCodeAt(i - 1) : null;
      plain = plain && isPlainSafe(char, prev_char);
    }
  } else {
    for (i = 0; i < string2.length; i++) {
      char = string2.charCodeAt(i);
      if (char === CHAR_LINE_FEED) {
        hasLineBreak = true;
        if (shouldTrackWidth) {
          hasFoldableLine = hasFoldableLine || // Foldable line = too long, and not more-indented.
          i - previousLineBreak - 1 > lineWidth && string2[previousLineBreak + 1] !== " ";
          previousLineBreak = i;
        }
      } else if (!isPrintable(char)) {
        return STYLE_DOUBLE;
      }
      prev_char = i > 0 ? string2.charCodeAt(i - 1) : null;
      plain = plain && isPlainSafe(char, prev_char);
    }
    hasFoldableLine = hasFoldableLine || shouldTrackWidth && (i - previousLineBreak - 1 > lineWidth && string2[previousLineBreak + 1] !== " ");
  }
  if (!hasLineBreak && !hasFoldableLine) {
    return plain && !testAmbiguousType(string2) ? STYLE_PLAIN : STYLE_SINGLE;
  }
  if (indentPerLevel > 9 && needIndentIndicator(string2)) {
    return STYLE_DOUBLE;
  }
  return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
}
function writeScalar(state, string2, level, iskey) {
  state.dump = function() {
    if (string2.length === 0) {
      return "''";
    }
    if (!state.noCompatMode && DEPRECATED_BOOLEANS_SYNTAX.indexOf(string2) !== -1) {
      return "'" + string2 + "'";
    }
    var indent = state.indent * Math.max(1, level);
    var lineWidth = state.lineWidth === -1 ? -1 : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);
    var singleLineOnly = iskey || state.flowLevel > -1 && level >= state.flowLevel;
    function testAmbiguity(string3) {
      return testImplicitResolving(state, string3);
    }
    switch (chooseScalarStyle(string2, singleLineOnly, state.indent, lineWidth, testAmbiguity)) {
      case STYLE_PLAIN:
        return string2;
      case STYLE_SINGLE:
        return "'" + string2.replace(/'/g, "''") + "'";
      case STYLE_LITERAL:
        return "|" + blockHeader(string2, state.indent) + dropEndingNewline(indentString(string2, indent));
      case STYLE_FOLDED:
        return ">" + blockHeader(string2, state.indent) + dropEndingNewline(indentString(foldString(string2, lineWidth), indent));
      case STYLE_DOUBLE:
        return '"' + escapeString(string2) + '"';
      default:
        throw new YAMLException("impossible error: invalid scalar style");
    }
  }();
}
function blockHeader(string2, indentPerLevel) {
  var indentIndicator = needIndentIndicator(string2) ? String(indentPerLevel) : "";
  var clip = string2[string2.length - 1] === "\n";
  var keep = clip && (string2[string2.length - 2] === "\n" || string2 === "\n");
  var chomp = keep ? "+" : clip ? "" : "-";
  return indentIndicator + chomp + "\n";
}
function dropEndingNewline(string2) {
  return string2[string2.length - 1] === "\n" ? string2.slice(0, -1) : string2;
}
function foldString(string2, width) {
  var lineRe = /(\n+)([^\n]*)/g;
  var result = function() {
    var nextLF = string2.indexOf("\n");
    nextLF = nextLF !== -1 ? nextLF : string2.length;
    lineRe.lastIndex = nextLF;
    return foldLine(string2.slice(0, nextLF), width);
  }();
  var prevMoreIndented = string2[0] === "\n" || string2[0] === " ";
  var moreIndented;
  var match;
  while (match = lineRe.exec(string2)) {
    var prefix = match[1], line = match[2];
    moreIndented = line[0] === " ";
    result += prefix + (!prevMoreIndented && !moreIndented && line !== "" ? "\n" : "") + foldLine(line, width);
    prevMoreIndented = moreIndented;
  }
  return result;
}
function foldLine(line, width) {
  if (line === "" || line[0] === " ") return line;
  var breakRe = / [^ ]/g;
  var match;
  var start = 0, end, curr = 0, next = 0;
  var result = "";
  while (match = breakRe.exec(line)) {
    next = match.index;
    if (next - start > width) {
      end = curr > start ? curr : next;
      result += "\n" + line.slice(start, end);
      start = end + 1;
    }
    curr = next;
  }
  result += "\n";
  if (line.length - start > width && curr > start) {
    result += line.slice(start, curr) + "\n" + line.slice(curr + 1);
  } else {
    result += line.slice(start);
  }
  return result.slice(1);
}
function escapeString(string2) {
  var result = "";
  var char, nextChar;
  var escapeSeq;
  for (var i = 0; i < string2.length; i++) {
    char = string2.charCodeAt(i);
    if (char >= 55296 && char <= 56319) {
      nextChar = string2.charCodeAt(i + 1);
      if (nextChar >= 56320 && nextChar <= 57343) {
        result += encodeHex((char - 55296) * 1024 + nextChar - 56320 + 65536);
        i++;
        continue;
      }
    }
    escapeSeq = ESCAPE_SEQUENCES[char];
    result += !escapeSeq && isPrintable(char) ? string2[i] : escapeSeq || encodeHex(char);
  }
  return result;
}
function writeFlowSequence(state, level, object2) {
  var _result = "", _tag = state.tag, index2, length;
  for (index2 = 0, length = object2.length; index2 < length; index2 += 1) {
    if (writeNode(state, level, object2[index2], false, false)) {
      if (index2 !== 0) _result += "," + (!state.condenseFlow ? " " : "");
      _result += state.dump;
    }
  }
  state.tag = _tag;
  state.dump = "[" + _result + "]";
}
function writeBlockSequence(state, level, object2, compact) {
  var _result = "", _tag = state.tag, index2, length;
  for (index2 = 0, length = object2.length; index2 < length; index2 += 1) {
    if (writeNode(state, level + 1, object2[index2], true, true)) {
      if (!compact || index2 !== 0) {
        _result += generateNextLine(state, level);
      }
      if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
        _result += "-";
      } else {
        _result += "- ";
      }
      _result += state.dump;
    }
  }
  state.tag = _tag;
  state.dump = _result || "[]";
}
function writeFlowMapping(state, level, object2) {
  var _result = "", _tag = state.tag, objectKeyList = Object.keys(object2), index2, length, objectKey, objectValue, pairBuffer;
  for (index2 = 0, length = objectKeyList.length; index2 < length; index2 += 1) {
    pairBuffer = "";
    if (index2 !== 0) pairBuffer += ", ";
    if (state.condenseFlow) pairBuffer += '"';
    objectKey = objectKeyList[index2];
    objectValue = object2[objectKey];
    if (!writeNode(state, level, objectKey, false, false)) {
      continue;
    }
    if (state.dump.length > 1024) pairBuffer += "? ";
    pairBuffer += state.dump + (state.condenseFlow ? '"' : "") + ":" + (state.condenseFlow ? "" : " ");
    if (!writeNode(state, level, objectValue, false, false)) {
      continue;
    }
    pairBuffer += state.dump;
    _result += pairBuffer;
  }
  state.tag = _tag;
  state.dump = "{" + _result + "}";
}
function writeBlockMapping(state, level, object2, compact) {
  var _result = "", _tag = state.tag, objectKeyList = Object.keys(object2), index2, length, objectKey, objectValue, explicitPair, pairBuffer;
  if (state.sortKeys === true) {
    objectKeyList.sort();
  } else if (typeof state.sortKeys === "function") {
    objectKeyList.sort(state.sortKeys);
  } else if (state.sortKeys) {
    throw new YAMLException("sortKeys must be a boolean or a function");
  }
  for (index2 = 0, length = objectKeyList.length; index2 < length; index2 += 1) {
    pairBuffer = "";
    if (!compact || index2 !== 0) {
      pairBuffer += generateNextLine(state, level);
    }
    objectKey = objectKeyList[index2];
    objectValue = object2[objectKey];
    if (!writeNode(state, level + 1, objectKey, true, true, true)) {
      continue;
    }
    explicitPair = state.tag !== null && state.tag !== "?" || state.dump && state.dump.length > 1024;
    if (explicitPair) {
      if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
        pairBuffer += "?";
      } else {
        pairBuffer += "? ";
      }
    }
    pairBuffer += state.dump;
    if (explicitPair) {
      pairBuffer += generateNextLine(state, level);
    }
    if (!writeNode(state, level + 1, objectValue, true, explicitPair)) {
      continue;
    }
    if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
      pairBuffer += ":";
    } else {
      pairBuffer += ": ";
    }
    pairBuffer += state.dump;
    _result += pairBuffer;
  }
  state.tag = _tag;
  state.dump = _result || "{}";
}
function detectType(state, object2, explicit) {
  var _result, typeList, index2, length, type2, style;
  typeList = explicit ? state.explicitTypes : state.implicitTypes;
  for (index2 = 0, length = typeList.length; index2 < length; index2 += 1) {
    type2 = typeList[index2];
    if ((type2.instanceOf || type2.predicate) && (!type2.instanceOf || typeof object2 === "object" && object2 instanceof type2.instanceOf) && (!type2.predicate || type2.predicate(object2))) {
      state.tag = explicit ? type2.tag : "?";
      if (type2.represent) {
        style = state.styleMap[type2.tag] || type2.defaultStyle;
        if (_toString.call(type2.represent) === "[object Function]") {
          _result = type2.represent(object2, style);
        } else if (_hasOwnProperty.call(type2.represent, style)) {
          _result = type2.represent[style](object2, style);
        } else {
          throw new YAMLException("!<" + type2.tag + '> tag resolver accepts not "' + style + '" style');
        }
        state.dump = _result;
      }
      return true;
    }
  }
  return false;
}
function writeNode(state, level, object2, block, compact, iskey) {
  state.tag = null;
  state.dump = object2;
  if (!detectType(state, object2, false)) {
    detectType(state, object2, true);
  }
  var type2 = _toString.call(state.dump);
  if (block) {
    block = state.flowLevel < 0 || state.flowLevel > level;
  }
  var objectOrArray = type2 === "[object Object]" || type2 === "[object Array]", duplicateIndex, duplicate;
  if (objectOrArray) {
    duplicateIndex = state.duplicates.indexOf(object2);
    duplicate = duplicateIndex !== -1;
  }
  if (state.tag !== null && state.tag !== "?" || duplicate || state.indent !== 2 && level > 0) {
    compact = false;
  }
  if (duplicate && state.usedDuplicates[duplicateIndex]) {
    state.dump = "*ref_" + duplicateIndex;
  } else {
    if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]) {
      state.usedDuplicates[duplicateIndex] = true;
    }
    if (type2 === "[object Object]") {
      if (block && Object.keys(state.dump).length !== 0) {
        writeBlockMapping(state, level, state.dump, compact);
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + state.dump;
        }
      } else {
        writeFlowMapping(state, level, state.dump);
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + " " + state.dump;
        }
      }
    } else if (type2 === "[object Array]") {
      var arrayLevel = state.noArrayIndent && level > 0 ? level - 1 : level;
      if (block && state.dump.length !== 0) {
        writeBlockSequence(state, arrayLevel, state.dump, compact);
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + state.dump;
        }
      } else {
        writeFlowSequence(state, arrayLevel, state.dump);
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + " " + state.dump;
        }
      }
    } else if (type2 === "[object String]") {
      if (state.tag !== "?") {
        writeScalar(state, state.dump, level, iskey);
      }
    } else {
      if (state.skipInvalid) return false;
      throw new YAMLException("unacceptable kind of an object to dump " + type2);
    }
    if (state.tag !== null && state.tag !== "?") {
      state.dump = "!<" + state.tag + "> " + state.dump;
    }
  }
  return true;
}
function getDuplicateReferences(object2, state) {
  var objects2 = [], duplicatesIndexes = [], index2, length;
  inspectNode(object2, objects2, duplicatesIndexes);
  for (index2 = 0, length = duplicatesIndexes.length; index2 < length; index2 += 1) {
    state.duplicates.push(objects2[duplicatesIndexes[index2]]);
  }
  state.usedDuplicates = new Array(length);
}
function inspectNode(object2, objects2, duplicatesIndexes) {
  var objectKeyList, index2, length;
  if (object2 !== null && typeof object2 === "object") {
    index2 = objects2.indexOf(object2);
    if (index2 !== -1) {
      if (duplicatesIndexes.indexOf(index2) === -1) {
        duplicatesIndexes.push(index2);
      }
    } else {
      objects2.push(object2);
      if (Array.isArray(object2)) {
        for (index2 = 0, length = object2.length; index2 < length; index2 += 1) {
          inspectNode(object2[index2], objects2, duplicatesIndexes);
        }
      } else {
        objectKeyList = Object.keys(object2);
        for (index2 = 0, length = objectKeyList.length; index2 < length; index2 += 1) {
          inspectNode(object2[objectKeyList[index2]], objects2, duplicatesIndexes);
        }
      }
    }
  }
}
function dump(input, options) {
  options = options || {};
  var state = new State(options);
  if (!state.noRefs) getDuplicateReferences(input, state);
  if (writeNode(state, 0, input, true, true)) return state.dump + "\n";
  return "";
}
function safeDump(input, options) {
  return dump(input, common.extend({ schema: DEFAULT_SAFE_SCHEMA }, options));
}
dumper$1.dump = dump;
dumper$1.safeDump = safeDump;
var loader = loader$1;
var dumper = dumper$1;
function deprecated(name) {
  return function() {
    throw new Error("Function " + name + " is deprecated and cannot be used.");
  };
}
jsYaml$1.Type = type;
jsYaml$1.Schema = schema;
jsYaml$1.FAILSAFE_SCHEMA = failsafe;
jsYaml$1.JSON_SCHEMA = json;
jsYaml$1.CORE_SCHEMA = core;
jsYaml$1.DEFAULT_SAFE_SCHEMA = default_safe;
jsYaml$1.DEFAULT_FULL_SCHEMA = default_full;
jsYaml$1.load = loader.load;
jsYaml$1.loadAll = loader.loadAll;
jsYaml$1.safeLoad = loader.safeLoad;
jsYaml$1.safeLoadAll = loader.safeLoadAll;
jsYaml$1.dump = dumper.dump;
jsYaml$1.safeDump = dumper.safeDump;
jsYaml$1.YAMLException = exception;
jsYaml$1.MINIMAL_SCHEMA = failsafe;
jsYaml$1.SAFE_SCHEMA = default_safe;
jsYaml$1.DEFAULT_SCHEMA = default_full;
jsYaml$1.scan = deprecated("scan");
jsYaml$1.parse = deprecated("parse");
jsYaml$1.compose = deprecated("compose");
jsYaml$1.addConstructor = deprecated("addConstructor");
var yaml$1 = jsYaml$1;
var jsYaml = yaml$1;
const fs = gracefulFs;
const pify = pify$1;
const stripBom = stripBom$1;
const yaml = jsYaml;
const parse = (data) => yaml.safeLoad(stripBom(data));
loadYamlFile$1.exports = (fp2) => pify(fs.readFile)(fp2, "utf8").then((data) => parse(data));
loadYamlFile$1.exports.sync = (fp2) => parse(fs.readFileSync(fp2, "utf8"));
var loadYamlFileExports = loadYamlFile$1.exports;
const path$1 = require$$0$8;
const pathExists$1 = pathExistsExports;
const loadYamlFile = loadYamlFileExports;
var whichPm = async function(pkgPath) {
  const modulesPath = path$1.join(pkgPath, "node_modules");
  const exists = await pathExists$1(path$1.join(modulesPath, ".yarn-integrity"));
  if (exists) return { name: "yarn" };
  try {
    const modules = await loadYamlFile(path$1.join(modulesPath, ".modules.yaml"));
    return toNameAndVersion(modules.packageManager);
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
  const modulesExists = await pathExists$1(modulesPath);
  return modulesExists ? { name: "npm" } : null;
};
function toNameAndVersion(pkgSpec) {
  if (pkgSpec[0] === "@") {
    const woPrefix = pkgSpec.substr(1);
    const parts2 = woPrefix.split("@");
    return {
      name: `@${parts2[0]}`,
      version: parts2[1]
    };
  }
  const parts = pkgSpec.split("@");
  return {
    name: parts[0],
    version: parts[1]
  };
}
const findYarnWorkspaceRoot = findYarnWorkspaceRoot2;
const findUp = findUpExports;
const path = require$$0$8;
const pathExists = pathExistsExports$1;
const whichPM = whichPm;
var preferredPm = async function preferredPM(pkgPath) {
  if (typeof pkgPath !== "string") {
    throw new TypeError(`pkgPath should be a string, got ${typeof pkgPath}`);
  }
  if (await pathExists(path.join(pkgPath, "package-lock.json"))) {
    return {
      name: "npm",
      version: ">=5"
    };
  }
  if (await pathExists(path.join(pkgPath, "yarn.lock"))) {
    return {
      name: "yarn",
      version: "*"
    };
  }
  if (await pathExists(path.join(pkgPath, "pnpm-lock.yaml"))) {
    return {
      name: "pnpm",
      version: ">=3"
    };
  }
  if (await pathExists(path.join(pkgPath, "shrinkwrap.yaml"))) {
    return {
      name: "pnpm",
      version: "1 || 2"
    };
  }
  if (await pathExists(path.join(pkgPath, "bun.lockb"))) {
    return {
      name: "bun",
      version: "*"
    };
  }
  if (await findUp("pnpm-lock.yaml", { cwd: pkgPath })) {
    return {
      name: "pnpm",
      version: ">=3"
    };
  }
  try {
    if (typeof findYarnWorkspaceRoot(pkgPath) === "string") {
      return {
        name: "yarn",
        version: "*"
      };
    }
  } catch (err) {
  }
  const pm = await whichPM(pkgPath);
  return pm && { name: pm.name, version: pm.version || "*" };
};
const preferredPM2 = /* @__PURE__ */ getDefaultExportFromCjs(preferredPm);
const SUPPORTED_PACKAGE_MANAGERS = [
  "npm",
  "yarn"
];
const DEFAULT_PACKAGE_MANAGER = "npm";
const getPreferred = async (pkgPath) => {
  const pm = await preferredPM2(pkgPath);
  const hasPackageManager = pm !== void 0;
  if (!hasPackageManager) {
    throw new Error(`Couldn't find a package manager in your project.`);
  }
  const isPackageManagerSupported = SUPPORTED_PACKAGE_MANAGERS.includes(pm.name);
  if (!isPackageManagerSupported) {
    process.emitWarning(`We detected your package manager (${pm.name} v${pm.version}), but it's not officially supported by Strapi yet. Defaulting to npm instead.`);
    return DEFAULT_PACKAGE_MANAGER;
  }
  return pm.name;
};
const installDependencies = (path2, packageManager2, options = {}) => {
  return execa$1(packageManager2, [
    "install"
  ], {
    ...options,
    cwd: path2,
    stdin: "ignore"
  });
};
const packageManager = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getPreferred,
  installDependencies
}, Symbol.toStringTag, { value: "Module" }));
const index$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  traverseQueryFields,
  traverseQueryFilters,
  traverseQueryPopulate,
  traverseQuerySort
}, Symbol.toStringTag, { value: "Module" }));
const createStrictInterpolationRegExp = (allowedVariableNames, flags) => {
  const oneOfVariables = allowedVariableNames.join("|");
  return new RegExp(`<%=\\s*(${oneOfVariables})\\s*%>`, flags);
};
const createLooseInterpolationRegExp = (flags) => new RegExp(/<%=([\s\S]+?)%>/, flags);
const template = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  createLooseInterpolationRegExp,
  createStrictInterpolationRegExp
}, Symbol.toStringTag, { value: "Module" }));
const kbytesToBytes = (kbytes) => kbytes * 1e3;
const bytesToKbytes = (bytes) => Math.round(bytes / 1e3 * 100) / 100;
const bytesToHumanReadable = (bytes) => {
  const sizes = [
    "Bytes",
    "KB",
    "MB",
    "GB",
    "TB",
    "PB"
  ];
  if (bytes === 0) return "0 Bytes";
  const i = parseInt(`${Math.floor(Math.log(bytes) / Math.log(1e3))}`, 10);
  return `${Math.round(bytes / 1e3 ** i)} ${sizes[i]}`;
};
const streamToBuffer = (stream2) => new Promise((resolve, reject) => {
  const chunks = [];
  stream2.on("data", (chunk) => {
    chunks.push(chunk);
  });
  stream2.on("end", () => {
    resolve(Buffer.concat(chunks));
  });
  stream2.on("error", reject);
});
const getStreamSize = (stream2) => new Promise((resolve, reject) => {
  let size = 0;
  stream2.on("data", (chunk) => {
    size += Buffer.byteLength(chunk);
  });
  stream2.on("close", () => resolve(size));
  stream2.on("error", reject);
  stream2.resume();
});
function writableDiscardStream(options) {
  return new Writable({
    ...options,
    write(chunk, encding, callback) {
      setImmediate(callback);
    }
  });
}
const file = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  bytesToHumanReadable,
  bytesToKbytes,
  getStreamSize,
  kbytesToBytes,
  streamToBuffer,
  writableDiscardStream
}, Symbol.toStringTag, { value: "Module" }));
const createPolicy = (options) => {
  const { name = "unnamed", validator, handler } = options;
  const wrappedValidator = (config2) => {
    if (validator) {
      try {
        validator(config2);
      } catch (e) {
        throw new Error(`Invalid config passed to "${name}" policy.`);
      }
    }
  };
  return {
    name,
    validator: wrappedValidator,
    handler
  };
};
const createPolicyContext = (type2, ctx) => {
  return Object.assign({
    is: fp.eq(type2),
    get type() {
      return type2;
    }
  }, ctx);
};
const policy = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  createPolicy,
  createPolicyContext
}, Symbol.toStringTag, { value: "Module" }));
var slugify$2 = { exports: {} };
var escapeStringRegexp$3 = (string2) => {
  if (typeof string2 !== "string") {
    throw new TypeError("Expected a string");
  }
  return string2.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&").replace(/-/g, "\\x2d");
};
var symbolTag = "[object Symbol]";
var reLatin = /[\xc0-\xd6\xd8-\xf6\xf8-\xff\u0100-\u017f]/g;
var rsComboMarksRange = "\\u0300-\\u036f\\ufe20-\\ufe23", rsComboSymbolsRange = "\\u20d0-\\u20f0";
var rsCombo = "[" + rsComboMarksRange + rsComboSymbolsRange + "]";
var reComboMark = RegExp(rsCombo, "g");
var deburredLetters = {
  // Latin-1 Supplement block.
  "À": "A",
  "Á": "A",
  "Â": "A",
  "Ã": "A",
  "Ä": "A",
  "Å": "A",
  "à": "a",
  "á": "a",
  "â": "a",
  "ã": "a",
  "ä": "a",
  "å": "a",
  "Ç": "C",
  "ç": "c",
  "Ð": "D",
  "ð": "d",
  "È": "E",
  "É": "E",
  "Ê": "E",
  "Ë": "E",
  "è": "e",
  "é": "e",
  "ê": "e",
  "ë": "e",
  "Ì": "I",
  "Í": "I",
  "Î": "I",
  "Ï": "I",
  "ì": "i",
  "í": "i",
  "î": "i",
  "ï": "i",
  "Ñ": "N",
  "ñ": "n",
  "Ò": "O",
  "Ó": "O",
  "Ô": "O",
  "Õ": "O",
  "Ö": "O",
  "Ø": "O",
  "ò": "o",
  "ó": "o",
  "ô": "o",
  "õ": "o",
  "ö": "o",
  "ø": "o",
  "Ù": "U",
  "Ú": "U",
  "Û": "U",
  "Ü": "U",
  "ù": "u",
  "ú": "u",
  "û": "u",
  "ü": "u",
  "Ý": "Y",
  "ý": "y",
  "ÿ": "y",
  "Æ": "Ae",
  "æ": "ae",
  "Þ": "Th",
  "þ": "th",
  "ß": "ss",
  // Latin Extended-A block.
  "Ā": "A",
  "Ă": "A",
  "Ą": "A",
  "ā": "a",
  "ă": "a",
  "ą": "a",
  "Ć": "C",
  "Ĉ": "C",
  "Ċ": "C",
  "Č": "C",
  "ć": "c",
  "ĉ": "c",
  "ċ": "c",
  "č": "c",
  "Ď": "D",
  "Đ": "D",
  "ď": "d",
  "đ": "d",
  "Ē": "E",
  "Ĕ": "E",
  "Ė": "E",
  "Ę": "E",
  "Ě": "E",
  "ē": "e",
  "ĕ": "e",
  "ė": "e",
  "ę": "e",
  "ě": "e",
  "Ĝ": "G",
  "Ğ": "G",
  "Ġ": "G",
  "Ģ": "G",
  "ĝ": "g",
  "ğ": "g",
  "ġ": "g",
  "ģ": "g",
  "Ĥ": "H",
  "Ħ": "H",
  "ĥ": "h",
  "ħ": "h",
  "Ĩ": "I",
  "Ī": "I",
  "Ĭ": "I",
  "Į": "I",
  "İ": "I",
  "ĩ": "i",
  "ī": "i",
  "ĭ": "i",
  "į": "i",
  "ı": "i",
  "Ĵ": "J",
  "ĵ": "j",
  "Ķ": "K",
  "ķ": "k",
  "ĸ": "k",
  "Ĺ": "L",
  "Ļ": "L",
  "Ľ": "L",
  "Ŀ": "L",
  "Ł": "L",
  "ĺ": "l",
  "ļ": "l",
  "ľ": "l",
  "ŀ": "l",
  "ł": "l",
  "Ń": "N",
  "Ņ": "N",
  "Ň": "N",
  "Ŋ": "N",
  "ń": "n",
  "ņ": "n",
  "ň": "n",
  "ŋ": "n",
  "Ō": "O",
  "Ŏ": "O",
  "Ő": "O",
  "ō": "o",
  "ŏ": "o",
  "ő": "o",
  "Ŕ": "R",
  "Ŗ": "R",
  "Ř": "R",
  "ŕ": "r",
  "ŗ": "r",
  "ř": "r",
  "Ś": "S",
  "Ŝ": "S",
  "Ş": "S",
  "Š": "S",
  "ś": "s",
  "ŝ": "s",
  "ş": "s",
  "š": "s",
  "Ţ": "T",
  "Ť": "T",
  "Ŧ": "T",
  "ţ": "t",
  "ť": "t",
  "ŧ": "t",
  "Ũ": "U",
  "Ū": "U",
  "Ŭ": "U",
  "Ů": "U",
  "Ű": "U",
  "Ų": "U",
  "ũ": "u",
  "ū": "u",
  "ŭ": "u",
  "ů": "u",
  "ű": "u",
  "ų": "u",
  "Ŵ": "W",
  "ŵ": "w",
  "Ŷ": "Y",
  "ŷ": "y",
  "Ÿ": "Y",
  "Ź": "Z",
  "Ż": "Z",
  "Ž": "Z",
  "ź": "z",
  "ż": "z",
  "ž": "z",
  "Ĳ": "IJ",
  "ĳ": "ij",
  "Œ": "Oe",
  "œ": "oe",
  "ŉ": "'n",
  "ſ": "ss"
};
var freeGlobal = typeof commonjsGlobal == "object" && commonjsGlobal && commonjsGlobal.Object === Object && commonjsGlobal;
var freeSelf = typeof self == "object" && self && self.Object === Object && self;
var root = freeGlobal || freeSelf || Function("return this")();
function basePropertyOf(object2) {
  return function(key) {
    return object2 == null ? void 0 : object2[key];
  };
}
var deburrLetter = basePropertyOf(deburredLetters);
var objectProto = Object.prototype;
var objectToString = objectProto.toString;
var Symbol$1 = root.Symbol;
var symbolProto = Symbol$1 ? Symbol$1.prototype : void 0, symbolToString$1 = symbolProto ? symbolProto.toString : void 0;
function baseToString(value) {
  if (typeof value == "string") {
    return value;
  }
  if (isSymbol(value)) {
    return symbolToString$1 ? symbolToString$1.call(value) : "";
  }
  var result = value + "";
  return result == "0" && 1 / value == -Infinity ? "-0" : result;
}
function isObjectLike(value) {
  return !!value && typeof value == "object";
}
function isSymbol(value) {
  return typeof value == "symbol" || isObjectLike(value) && objectToString.call(value) == symbolTag;
}
function toString$1(value) {
  return value == null ? "" : baseToString(value);
}
function deburr$1(string2) {
  string2 = toString$1(string2);
  return string2 && string2.replace(reLatin, deburrLetter).replace(reComboMark, "");
}
var lodash_deburr = deburr$1;
const matchOperatorsRegex = /[|\\{}()[\]^$+*?.-]/g;
var escapeStringRegexp$2 = (string2) => {
  if (typeof string2 !== "string") {
    throw new TypeError("Expected a string");
  }
  return string2.replace(matchOperatorsRegex, "\\$&");
};
var replacements = [
  // German umlauts
  ["ß", "ss"],
  ["ä", "ae"],
  ["Ä", "Ae"],
  ["ö", "oe"],
  ["Ö", "Oe"],
  ["ü", "ue"],
  ["Ü", "Ue"],
  // Latin
  ["À", "A"],
  ["Á", "A"],
  ["Â", "A"],
  ["Ã", "A"],
  ["Ä", "Ae"],
  ["Å", "A"],
  ["Æ", "AE"],
  ["Ç", "C"],
  ["È", "E"],
  ["É", "E"],
  ["Ê", "E"],
  ["Ë", "E"],
  ["Ì", "I"],
  ["Í", "I"],
  ["Î", "I"],
  ["Ï", "I"],
  ["Ð", "D"],
  ["Ñ", "N"],
  ["Ò", "O"],
  ["Ó", "O"],
  ["Ô", "O"],
  ["Õ", "O"],
  ["Ö", "Oe"],
  ["Ő", "O"],
  ["Ø", "O"],
  ["Ù", "U"],
  ["Ú", "U"],
  ["Û", "U"],
  ["Ü", "Ue"],
  ["Ű", "U"],
  ["Ý", "Y"],
  ["Þ", "TH"],
  ["ß", "ss"],
  ["à", "a"],
  ["á", "a"],
  ["â", "a"],
  ["ã", "a"],
  ["ä", "ae"],
  ["å", "a"],
  ["æ", "ae"],
  ["ç", "c"],
  ["è", "e"],
  ["é", "e"],
  ["ê", "e"],
  ["ë", "e"],
  ["ì", "i"],
  ["í", "i"],
  ["î", "i"],
  ["ï", "i"],
  ["ð", "d"],
  ["ñ", "n"],
  ["ò", "o"],
  ["ó", "o"],
  ["ô", "o"],
  ["õ", "o"],
  ["ö", "oe"],
  ["ő", "o"],
  ["ø", "o"],
  ["ù", "u"],
  ["ú", "u"],
  ["û", "u"],
  ["ü", "ue"],
  ["ű", "u"],
  ["ý", "y"],
  ["þ", "th"],
  ["ÿ", "y"],
  ["ẞ", "SS"],
  // Vietnamese
  ["à", "a"],
  ["À", "A"],
  ["á", "a"],
  ["Á", "A"],
  ["â", "a"],
  ["Â", "A"],
  ["ã", "a"],
  ["Ã", "A"],
  ["è", "e"],
  ["È", "E"],
  ["é", "e"],
  ["É", "E"],
  ["ê", "e"],
  ["Ê", "E"],
  ["ì", "i"],
  ["Ì", "I"],
  ["í", "i"],
  ["Í", "I"],
  ["ò", "o"],
  ["Ò", "O"],
  ["ó", "o"],
  ["Ó", "O"],
  ["ô", "o"],
  ["Ô", "O"],
  ["õ", "o"],
  ["Õ", "O"],
  ["ù", "u"],
  ["Ù", "U"],
  ["ú", "u"],
  ["Ú", "U"],
  ["ý", "y"],
  ["Ý", "Y"],
  ["ă", "a"],
  ["Ă", "A"],
  ["Đ", "D"],
  ["đ", "d"],
  ["ĩ", "i"],
  ["Ĩ", "I"],
  ["ũ", "u"],
  ["Ũ", "U"],
  ["ơ", "o"],
  ["Ơ", "O"],
  ["ư", "u"],
  ["Ư", "U"],
  ["ạ", "a"],
  ["Ạ", "A"],
  ["ả", "a"],
  ["Ả", "A"],
  ["ấ", "a"],
  ["Ấ", "A"],
  ["ầ", "a"],
  ["Ầ", "A"],
  ["ẩ", "a"],
  ["Ẩ", "A"],
  ["ẫ", "a"],
  ["Ẫ", "A"],
  ["ậ", "a"],
  ["Ậ", "A"],
  ["ắ", "a"],
  ["Ắ", "A"],
  ["ằ", "a"],
  ["Ằ", "A"],
  ["ẳ", "a"],
  ["Ẳ", "A"],
  ["ẵ", "a"],
  ["Ẵ", "A"],
  ["ặ", "a"],
  ["Ặ", "A"],
  ["ẹ", "e"],
  ["Ẹ", "E"],
  ["ẻ", "e"],
  ["Ẻ", "E"],
  ["ẽ", "e"],
  ["Ẽ", "E"],
  ["ế", "e"],
  ["Ế", "E"],
  ["ề", "e"],
  ["Ề", "E"],
  ["ể", "e"],
  ["Ể", "E"],
  ["ễ", "e"],
  ["Ễ", "E"],
  ["ệ", "e"],
  ["Ệ", "E"],
  ["ỉ", "i"],
  ["Ỉ", "I"],
  ["ị", "i"],
  ["Ị", "I"],
  ["ọ", "o"],
  ["Ọ", "O"],
  ["ỏ", "o"],
  ["Ỏ", "O"],
  ["ố", "o"],
  ["Ố", "O"],
  ["ồ", "o"],
  ["Ồ", "O"],
  ["ổ", "o"],
  ["Ổ", "O"],
  ["ỗ", "o"],
  ["Ỗ", "O"],
  ["ộ", "o"],
  ["Ộ", "O"],
  ["ớ", "o"],
  ["Ớ", "O"],
  ["ờ", "o"],
  ["Ờ", "O"],
  ["ở", "o"],
  ["Ở", "O"],
  ["ỡ", "o"],
  ["Ỡ", "O"],
  ["ợ", "o"],
  ["Ợ", "O"],
  ["ụ", "u"],
  ["Ụ", "U"],
  ["ủ", "u"],
  ["Ủ", "U"],
  ["ứ", "u"],
  ["Ứ", "U"],
  ["ừ", "u"],
  ["Ừ", "U"],
  ["ử", "u"],
  ["Ử", "U"],
  ["ữ", "u"],
  ["Ữ", "U"],
  ["ự", "u"],
  ["Ự", "U"],
  ["ỳ", "y"],
  ["Ỳ", "Y"],
  ["ỵ", "y"],
  ["Ỵ", "Y"],
  ["ỷ", "y"],
  ["Ỷ", "Y"],
  ["ỹ", "y"],
  ["Ỹ", "Y"],
  // Arabic
  ["ء", "e"],
  ["آ", "a"],
  ["أ", "a"],
  ["ؤ", "w"],
  ["إ", "i"],
  ["ئ", "y"],
  ["ا", "a"],
  ["ب", "b"],
  ["ة", "t"],
  ["ت", "t"],
  ["ث", "th"],
  ["ج", "j"],
  ["ح", "h"],
  ["خ", "kh"],
  ["د", "d"],
  ["ذ", "dh"],
  ["ر", "r"],
  ["ز", "z"],
  ["س", "s"],
  ["ش", "sh"],
  ["ص", "s"],
  ["ض", "d"],
  ["ط", "t"],
  ["ظ", "z"],
  ["ع", "e"],
  ["غ", "gh"],
  ["ـ", "_"],
  ["ف", "f"],
  ["ق", "q"],
  ["ك", "k"],
  ["ل", "l"],
  ["م", "m"],
  ["ن", "n"],
  ["ه", "h"],
  ["و", "w"],
  ["ى", "a"],
  ["ي", "y"],
  ["َ‎", "a"],
  ["ُ", "u"],
  ["ِ‎", "i"],
  ["٠", "0"],
  ["١", "1"],
  ["٢", "2"],
  ["٣", "3"],
  ["٤", "4"],
  ["٥", "5"],
  ["٦", "6"],
  ["٧", "7"],
  ["٨", "8"],
  ["٩", "9"],
  // Persian / Farsi
  ["چ", "ch"],
  ["ک", "k"],
  ["گ", "g"],
  ["پ", "p"],
  ["ژ", "zh"],
  ["ی", "y"],
  ["۰", "0"],
  ["۱", "1"],
  ["۲", "2"],
  ["۳", "3"],
  ["۴", "4"],
  ["۵", "5"],
  ["۶", "6"],
  ["۷", "7"],
  ["۸", "8"],
  ["۹", "9"],
  // Pashto
  ["ټ", "p"],
  ["ځ", "z"],
  ["څ", "c"],
  ["ډ", "d"],
  ["ﺫ", "d"],
  ["ﺭ", "r"],
  ["ړ", "r"],
  ["ﺯ", "z"],
  ["ږ", "g"],
  ["ښ", "x"],
  ["ګ", "g"],
  ["ڼ", "n"],
  ["ۀ", "e"],
  ["ې", "e"],
  ["ۍ", "ai"],
  // Urdu
  ["ٹ", "t"],
  ["ڈ", "d"],
  ["ڑ", "r"],
  ["ں", "n"],
  ["ہ", "h"],
  ["ھ", "h"],
  ["ے", "e"],
  // Russian
  ["А", "A"],
  ["а", "a"],
  ["Б", "B"],
  ["б", "b"],
  ["В", "V"],
  ["в", "v"],
  ["Г", "G"],
  ["г", "g"],
  ["Д", "D"],
  ["д", "d"],
  ["Е", "E"],
  ["е", "e"],
  ["Ж", "Zh"],
  ["ж", "zh"],
  ["З", "Z"],
  ["з", "z"],
  ["И", "I"],
  ["и", "i"],
  ["Й", "J"],
  ["й", "j"],
  ["К", "K"],
  ["к", "k"],
  ["Л", "L"],
  ["л", "l"],
  ["М", "M"],
  ["м", "m"],
  ["Н", "N"],
  ["н", "n"],
  ["О", "O"],
  ["о", "o"],
  ["П", "P"],
  ["п", "p"],
  ["Р", "R"],
  ["р", "r"],
  ["С", "S"],
  ["с", "s"],
  ["Т", "T"],
  ["т", "t"],
  ["У", "U"],
  ["у", "u"],
  ["Ф", "F"],
  ["ф", "f"],
  ["Х", "H"],
  ["х", "h"],
  ["Ц", "Cz"],
  ["ц", "cz"],
  ["Ч", "Ch"],
  ["ч", "ch"],
  ["Ш", "Sh"],
  ["ш", "sh"],
  ["Щ", "Shh"],
  ["щ", "shh"],
  ["Ъ", ""],
  ["ъ", ""],
  ["Ы", "Y"],
  ["ы", "y"],
  ["Ь", ""],
  ["ь", ""],
  ["Э", "E"],
  ["э", "e"],
  ["Ю", "Yu"],
  ["ю", "yu"],
  ["Я", "Ya"],
  ["я", "ya"],
  ["Ё", "Yo"],
  ["ё", "yo"],
  // Romanian
  ["ă", "a"],
  ["Ă", "A"],
  ["ș", "s"],
  ["Ș", "S"],
  ["ț", "t"],
  ["Ț", "T"],
  ["ţ", "t"],
  ["Ţ", "T"],
  // Turkish
  ["ş", "s"],
  ["Ş", "S"],
  ["ç", "c"],
  ["Ç", "C"],
  ["ğ", "g"],
  ["Ğ", "G"],
  ["ı", "i"],
  ["İ", "I"],
  // Armenian
  ["ա", "a"],
  ["Ա", "A"],
  ["բ", "b"],
  ["Բ", "B"],
  ["գ", "g"],
  ["Գ", "G"],
  ["դ", "d"],
  ["Դ", "D"],
  ["ե", "ye"],
  ["Ե", "Ye"],
  ["զ", "z"],
  ["Զ", "Z"],
  ["է", "e"],
  ["Է", "E"],
  ["ը", "y"],
  ["Ը", "Y"],
  ["թ", "t"],
  ["Թ", "T"],
  ["ժ", "zh"],
  ["Ժ", "Zh"],
  ["ի", "i"],
  ["Ի", "I"],
  ["լ", "l"],
  ["Լ", "L"],
  ["խ", "kh"],
  ["Խ", "Kh"],
  ["ծ", "ts"],
  ["Ծ", "Ts"],
  ["կ", "k"],
  ["Կ", "K"],
  ["հ", "h"],
  ["Հ", "H"],
  ["ձ", "dz"],
  ["Ձ", "Dz"],
  ["ղ", "gh"],
  ["Ղ", "Gh"],
  ["ճ", "tch"],
  ["Ճ", "Tch"],
  ["մ", "m"],
  ["Մ", "M"],
  ["յ", "y"],
  ["Յ", "Y"],
  ["ն", "n"],
  ["Ն", "N"],
  ["շ", "sh"],
  ["Շ", "Sh"],
  ["ո", "vo"],
  ["Ո", "Vo"],
  ["չ", "ch"],
  ["Չ", "Ch"],
  ["պ", "p"],
  ["Պ", "P"],
  ["ջ", "j"],
  ["Ջ", "J"],
  ["ռ", "r"],
  ["Ռ", "R"],
  ["ս", "s"],
  ["Ս", "S"],
  ["վ", "v"],
  ["Վ", "V"],
  ["տ", "t"],
  ["Տ", "T"],
  ["ր", "r"],
  ["Ր", "R"],
  ["ց", "c"],
  ["Ց", "C"],
  ["ու", "u"],
  ["ՈՒ", "U"],
  ["Ու", "U"],
  ["փ", "p"],
  ["Փ", "P"],
  ["ք", "q"],
  ["Ք", "Q"],
  ["օ", "o"],
  ["Օ", "O"],
  ["ֆ", "f"],
  ["Ֆ", "F"],
  ["և", "yev"],
  // Georgian
  ["ა", "a"],
  ["ბ", "b"],
  ["გ", "g"],
  ["დ", "d"],
  ["ე", "e"],
  ["ვ", "v"],
  ["ზ", "z"],
  ["თ", "t"],
  ["ი", "i"],
  ["კ", "k"],
  ["ლ", "l"],
  ["მ", "m"],
  ["ნ", "n"],
  ["ო", "o"],
  ["პ", "p"],
  ["ჟ", "zh"],
  ["რ", "r"],
  ["ს", "s"],
  ["ტ", "t"],
  ["უ", "u"],
  ["ფ", "ph"],
  ["ქ", "q"],
  ["ღ", "gh"],
  ["ყ", "k"],
  ["შ", "sh"],
  ["ჩ", "ch"],
  ["ც", "ts"],
  ["ძ", "dz"],
  ["წ", "ts"],
  ["ჭ", "tch"],
  ["ხ", "kh"],
  ["ჯ", "j"],
  ["ჰ", "h"],
  // Czech
  ["č", "c"],
  ["ď", "d"],
  ["ě", "e"],
  ["ň", "n"],
  ["ř", "r"],
  ["š", "s"],
  ["ť", "t"],
  ["ů", "u"],
  ["ž", "z"],
  ["Č", "C"],
  ["Ď", "D"],
  ["Ě", "E"],
  ["Ň", "N"],
  ["Ř", "R"],
  ["Š", "S"],
  ["Ť", "T"],
  ["Ů", "U"],
  ["Ž", "Z"],
  // Dhivehi
  ["ހ", "h"],
  ["ށ", "sh"],
  ["ނ", "n"],
  ["ރ", "r"],
  ["ބ", "b"],
  ["ޅ", "lh"],
  ["ކ", "k"],
  ["އ", "a"],
  ["ވ", "v"],
  ["މ", "m"],
  ["ފ", "f"],
  ["ދ", "dh"],
  ["ތ", "th"],
  ["ލ", "l"],
  ["ގ", "g"],
  ["ޏ", "gn"],
  ["ސ", "s"],
  ["ޑ", "d"],
  ["ޒ", "z"],
  ["ޓ", "t"],
  ["ޔ", "y"],
  ["ޕ", "p"],
  ["ޖ", "j"],
  ["ޗ", "ch"],
  ["ޘ", "tt"],
  ["ޙ", "hh"],
  ["ޚ", "kh"],
  ["ޛ", "th"],
  ["ޜ", "z"],
  ["ޝ", "sh"],
  ["ޞ", "s"],
  ["ޟ", "d"],
  ["ޠ", "t"],
  ["ޡ", "z"],
  ["ޢ", "a"],
  ["ޣ", "gh"],
  ["ޤ", "q"],
  ["ޥ", "w"],
  ["ަ", "a"],
  ["ާ", "aa"],
  ["ި", "i"],
  ["ީ", "ee"],
  ["ު", "u"],
  ["ޫ", "oo"],
  ["ެ", "e"],
  ["ޭ", "ey"],
  ["ޮ", "o"],
  ["ޯ", "oa"],
  ["ް", ""],
  // Greek
  ["α", "a"],
  ["β", "v"],
  ["γ", "g"],
  ["δ", "d"],
  ["ε", "e"],
  ["ζ", "z"],
  ["η", "i"],
  ["θ", "th"],
  ["ι", "i"],
  ["κ", "k"],
  ["λ", "l"],
  ["μ", "m"],
  ["ν", "n"],
  ["ξ", "ks"],
  ["ο", "o"],
  ["π", "p"],
  ["ρ", "r"],
  ["σ", "s"],
  ["τ", "t"],
  ["υ", "y"],
  ["φ", "f"],
  ["χ", "x"],
  ["ψ", "ps"],
  ["ω", "o"],
  ["ά", "a"],
  ["έ", "e"],
  ["ί", "i"],
  ["ό", "o"],
  ["ύ", "y"],
  ["ή", "i"],
  ["ώ", "o"],
  ["ς", "s"],
  ["ϊ", "i"],
  ["ΰ", "y"],
  ["ϋ", "y"],
  ["ΐ", "i"],
  ["Α", "A"],
  ["Β", "B"],
  ["Γ", "G"],
  ["Δ", "D"],
  ["Ε", "E"],
  ["Ζ", "Z"],
  ["Η", "I"],
  ["Θ", "TH"],
  ["Ι", "I"],
  ["Κ", "K"],
  ["Λ", "L"],
  ["Μ", "M"],
  ["Ν", "N"],
  ["Ξ", "KS"],
  ["Ο", "O"],
  ["Π", "P"],
  ["Ρ", "R"],
  ["Σ", "S"],
  ["Τ", "T"],
  ["Υ", "Y"],
  ["Φ", "F"],
  ["Χ", "X"],
  ["Ψ", "PS"],
  ["Ω", "O"],
  ["Ά", "A"],
  ["Έ", "E"],
  ["Ί", "I"],
  ["Ό", "O"],
  ["Ύ", "Y"],
  ["Ή", "I"],
  ["Ώ", "O"],
  ["Ϊ", "I"],
  ["Ϋ", "Y"],
  // Disabled as it conflicts with German and Latin.
  // Hungarian
  // ['ä', 'a'],
  // ['Ä', 'A'],
  // ['ö', 'o'],
  // ['Ö', 'O'],
  // ['ü', 'u'],
  // ['Ü', 'U'],
  // ['ű', 'u'],
  // ['Ű', 'U'],
  // Latvian
  ["ā", "a"],
  ["ē", "e"],
  ["ģ", "g"],
  ["ī", "i"],
  ["ķ", "k"],
  ["ļ", "l"],
  ["ņ", "n"],
  ["ū", "u"],
  ["Ā", "A"],
  ["Ē", "E"],
  ["Ģ", "G"],
  ["Ī", "I"],
  ["Ķ", "K"],
  ["Ļ", "L"],
  ["Ņ", "N"],
  ["Ū", "U"],
  ["č", "c"],
  ["š", "s"],
  ["ž", "z"],
  ["Č", "C"],
  ["Š", "S"],
  ["Ž", "Z"],
  // Lithuanian
  ["ą", "a"],
  ["č", "c"],
  ["ę", "e"],
  ["ė", "e"],
  ["į", "i"],
  ["š", "s"],
  ["ų", "u"],
  ["ū", "u"],
  ["ž", "z"],
  ["Ą", "A"],
  ["Č", "C"],
  ["Ę", "E"],
  ["Ė", "E"],
  ["Į", "I"],
  ["Š", "S"],
  ["Ų", "U"],
  ["Ū", "U"],
  // Macedonian
  ["Ќ", "Kj"],
  ["ќ", "kj"],
  ["Љ", "Lj"],
  ["љ", "lj"],
  ["Њ", "Nj"],
  ["њ", "nj"],
  ["Тс", "Ts"],
  ["тс", "ts"],
  // Polish
  ["ą", "a"],
  ["ć", "c"],
  ["ę", "e"],
  ["ł", "l"],
  ["ń", "n"],
  ["ś", "s"],
  ["ź", "z"],
  ["ż", "z"],
  ["Ą", "A"],
  ["Ć", "C"],
  ["Ę", "E"],
  ["Ł", "L"],
  ["Ń", "N"],
  ["Ś", "S"],
  ["Ź", "Z"],
  ["Ż", "Z"],
  // Disabled as it conflicts with Vietnamese.
  // Serbian
  // ['љ', 'lj'],
  // ['њ', 'nj'],
  // ['Љ', 'Lj'],
  // ['Њ', 'Nj'],
  // ['đ', 'dj'],
  // ['Đ', 'Dj'],
  // ['ђ', 'dj'],
  // ['ј', 'j'],
  // ['ћ', 'c'],
  // ['џ', 'dz'],
  // ['Ђ', 'Dj'],
  // ['Ј', 'j'],
  // ['Ћ', 'C'],
  // ['Џ', 'Dz'],
  // Disabled as it conflicts with German and Latin.
  // Slovak
  // ['ä', 'a'],
  // ['Ä', 'A'],
  // ['ľ', 'l'],
  // ['ĺ', 'l'],
  // ['ŕ', 'r'],
  // ['Ľ', 'L'],
  // ['Ĺ', 'L'],
  // ['Ŕ', 'R'],
  // Disabled as it conflicts with German and Latin.
  // Swedish
  // ['å', 'o'],
  // ['Å', 'o'],
  // ['ä', 'a'],
  // ['Ä', 'A'],
  // ['ë', 'e'],
  // ['Ë', 'E'],
  // ['ö', 'o'],
  // ['Ö', 'O'],
  // Ukrainian
  ["Є", "Ye"],
  ["І", "I"],
  ["Ї", "Yi"],
  ["Ґ", "G"],
  ["є", "ye"],
  ["і", "i"],
  ["ї", "yi"],
  ["ґ", "g"]
  // Danish
  // ['Æ', 'Ae'],
  // ['Ø', 'Oe'],
  // ['Å', 'Aa'],
  // ['æ', 'ae'],
  // ['ø', 'oe'],
  // ['å', 'aa']
];
const deburr = lodash_deburr;
const escapeStringRegexp$1 = escapeStringRegexp$2;
const builtinReplacements = replacements;
const doCustomReplacements = (string2, replacements2) => {
  for (const [key, value] of replacements2) {
    string2 = string2.replace(new RegExp(escapeStringRegexp$1(key), "g"), value);
  }
  return string2;
};
var transliterate$1 = (string2, options) => {
  if (typeof string2 !== "string") {
    throw new TypeError(`Expected a string, got \`${typeof string2}\``);
  }
  options = {
    customReplacements: [],
    ...options
  };
  const customReplacements = new Map([
    ...builtinReplacements,
    ...options.customReplacements
  ]);
  string2 = string2.normalize();
  string2 = doCustomReplacements(string2, customReplacements);
  string2 = deburr(string2);
  return string2;
};
var overridableReplacements = [
  ["&", " and "],
  ["🦄", " unicorn "],
  ["♥", " love "]
];
const escapeStringRegexp = escapeStringRegexp$3;
const transliterate = transliterate$1;
const builtinOverridableReplacements = overridableReplacements;
const decamelize = (string2) => {
  return string2.replace(/([A-Z]{2,})(\d+)/g, "$1 $2").replace(/([a-z\d]+)([A-Z]{2,})/g, "$1 $2").replace(/([a-z\d])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z\d]+)/g, "$1 $2");
};
const removeMootSeparators = (string2, separator) => {
  const escapedSeparator = escapeStringRegexp(separator);
  return string2.replace(new RegExp(`${escapedSeparator}{2,}`, "g"), separator).replace(new RegExp(`^${escapedSeparator}|${escapedSeparator}$`, "g"), "");
};
const slugify = (string2, options) => {
  if (typeof string2 !== "string") {
    throw new TypeError(`Expected a string, got \`${typeof string2}\``);
  }
  options = {
    separator: "-",
    lowercase: true,
    decamelize: true,
    customReplacements: [],
    preserveLeadingUnderscore: false,
    ...options
  };
  const shouldPrependUnderscore = options.preserveLeadingUnderscore && string2.startsWith("_");
  const customReplacements = new Map([
    ...builtinOverridableReplacements,
    ...options.customReplacements
  ]);
  string2 = transliterate(string2, { customReplacements });
  if (options.decamelize) {
    string2 = decamelize(string2);
  }
  let patternSlug = /[^a-zA-Z\d]+/g;
  if (options.lowercase) {
    string2 = string2.toLowerCase();
    patternSlug = /[^a-z\d]+/g;
  }
  string2 = string2.replace(patternSlug, options.separator);
  string2 = string2.replace(/\\/g, "");
  if (options.separator) {
    string2 = removeMootSeparators(string2, options.separator);
  }
  if (shouldPrependUnderscore) {
    string2 = `_${string2}`;
  }
  return string2;
};
const counter = () => {
  const occurrences = /* @__PURE__ */ new Map();
  const countable = (string2, options) => {
    string2 = slugify(string2, options);
    if (!string2) {
      return "";
    }
    const stringLower = string2.toLowerCase();
    const numberless = occurrences.get(stringLower.replace(/(?:-\d+?)+?$/, "")) || 0;
    const counter2 = occurrences.get(stringLower);
    occurrences.set(stringLower, typeof counter2 === "number" ? counter2 + 1 : 1);
    const newCounter = occurrences.get(stringLower) || 2;
    if (newCounter >= 2 || numberless > 2) {
      string2 = `${string2}-${newCounter}`;
    }
    return string2;
  };
  countable.reset = () => {
    occurrences.clear();
  };
  return countable;
};
slugify$2.exports = slugify;
slugify$2.exports.counter = counter;
var slugifyExports = slugify$2.exports;
const slugify$1 = /* @__PURE__ */ getDefaultExportFromCjs(slugifyExports);
const nameToSlug = (name, options = {
  separator: "-"
}) => slugify$1(name, options);
const nameToCollectionName = (name) => slugify$1(name, {
  separator: "_"
});
const toRegressedEnumValue = (value) => slugify$1(value, {
  decamelize: false,
  lowercase: false,
  separator: "_"
});
const getCommonPath = (...paths) => {
  const [segments, ...otherSegments] = paths.map((it) => ___default.split(it, "/"));
  return ___default.join(___default.takeWhile(segments, (str2, index2) => otherSegments.every((it) => it[index2] === str2)), "/");
};
const isEqual = (a, b) => String(a) === String(b);
const isCamelCase = (value) => /^[a-z][a-zA-Z0-9]+$/.test(value);
const isKebabCase = (value) => /^([a-z][a-z0-9]*)(-[a-z0-9]+)*$/.test(value);
const startsWithANumber = (value) => /^[0-9]/.test(value);
const joinBy = (joint, ...args) => {
  const trim2 = fp.trimChars(joint);
  const trimEnd = fp.trimCharsEnd(joint);
  const trimStart = fp.trimCharsStart(joint);
  return args.reduce((url, path2, index2) => {
    if (args.length === 1) return path2;
    if (index2 === 0) return trimEnd(path2);
    if (index2 === args.length - 1) return url + joint + trimStart(path2);
    return url + joint + trim2(path2);
  }, "");
};
const toKebabCase = (value) => lodashExports.kebabCase(value);
const strings = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getCommonPath,
  isCamelCase,
  isEqual,
  isKebabCase,
  joinBy,
  nameToCollectionName,
  nameToSlug,
  startsWithANumber,
  toKebabCase,
  toRegressedEnumValue
}, Symbol.toStringTag, { value: "Module" }));
const { toString: toString3 } = Object.prototype;
const errorToString = Error.prototype.toString;
const regExpToString = RegExp.prototype.toString;
const symbolToString = typeof Symbol !== "undefined" ? Symbol.prototype.toString : () => "";
const SYMBOL_REGEXP = /^Symbol\((.*)\)(.*)$/;
function printNumber(val) {
  if (val != +val) return "NaN";
  const isNegativeZero2 = val === 0 && 1 / val < 0;
  return isNegativeZero2 ? "-0" : `${val}`;
}
function printSimpleValue(val, quoteStrings = false) {
  if (val == null || val === true || val === false) return `${val}`;
  if (typeof val === "number") return printNumber(val);
  if (typeof val === "string") return quoteStrings ? `"${val}"` : val;
  if (typeof val === "function") return `[Function ${val.name || "anonymous"}]`;
  if (typeof val === "symbol") return symbolToString.call(val).replace(SYMBOL_REGEXP, "Symbol($1)");
  const tag = toString3.call(val).slice(8, -1);
  if (tag === "Date") {
    const v = val;
    return Number.isNaN(v.getTime()) ? `${v}` : v.toISOString();
  }
  if (tag === "Error" || val instanceof Error) return `[${errorToString.call(val)}]`;
  if (tag === "RegExp") return regExpToString.call(val);
  return null;
}
function printValue(value, quoteStrings) {
  const result = printSimpleValue(value, quoteStrings);
  if (result !== null) return result;
  return JSON.stringify(value, function replacer(key, value2) {
    const result2 = printSimpleValue(this[key], quoteStrings);
    if (result2 !== null) return result2;
    return value2;
  }, 2);
}
const strapiID = () => new StrapiIDSchema();
const isNotNilTest = (value) => !___default.isNil(value);
const isNotNullTest = (value) => !___default.isNull(value);
addMethod(create$7, "notNil", function isNotNill(msg = "${path} must be defined.") {
  return this.test("defined", msg, isNotNilTest);
});
addMethod(create$7, "notNull", function isNotNull(msg = "${path} cannot be null.") {
  return this.test("defined", msg, isNotNullTest);
});
addMethod(create$7, "isFunction", function isFunction2(message = "${path} is not a function") {
  return this.test("is a function", message, (value) => ___default.isUndefined(value) || ___default.isFunction(value));
});
addMethod(create$5, "isCamelCase", function isCamelCase$1(message = "${path} is not in camel case (anExampleOfCamelCase)") {
  return this.test("is in camelCase", message, (value) => value ? isCamelCase(value) : true);
});
addMethod(create$5, "isKebabCase", function isKebabCase$1(message = "${path} is not in kebab case (an-example-of-kebab-case)") {
  return this.test("is in kebab-case", message, (value) => value ? isKebabCase(value) : true);
});
addMethod(create$2, "onlyContainsFunctions", function onlyContainsFunctions(message = "${path} contains values that are not functions") {
  return this.test("only contains functions", message, (value) => ___default.isUndefined(value) || value && Object.values(value).every(___default.isFunction));
});
addMethod(create$1, "uniqueProperty", function uniqueProperty(propertyName, message) {
  return this.test("unique", message, function unique(list) {
    const errors2 = [];
    list?.forEach((element, index2) => {
      const sameElements = list.filter((e) => fp.get(propertyName, e) === fp.get(propertyName, element));
      if (sameElements.length > 1) {
        errors2.push(this.createError({
          path: `${this.path}[${index2}].${propertyName}`,
          message
        }));
      }
    });
    if (errors2.length) {
      throw new ValidationError$1(errors2);
    }
    return true;
  });
});
class StrapiIDSchema extends Mixed {
  _typeCheck(value) {
    return typeof value === "string" || fp.isNumber(value) && fp.isInteger(value) && value >= 0;
  }
  constructor() {
    super({
      type: "strapiID"
    });
  }
}
setLocale({
  mixed: {
    notType(options) {
      const { path: path2, type: type2, value, originalValue } = options;
      const isCast = originalValue != null && originalValue !== value;
      const msg = `${path2} must be a \`${type2}\` type, but the final value was: \`${printValue(value, true)}\`${isCast ? ` (cast from the value \`${printValue(originalValue, true)}\`).` : "."}`;
      return msg;
    }
  }
});
const yup = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ArraySchema,
  BaseSchema,
  BooleanSchema,
  DateSchema,
  MixedSchema: Mixed,
  NumberSchema,
  ObjectSchema,
  StrapiIDSchema,
  StringSchema,
  ValidationError: ValidationError$1,
  addMethod,
  array: create$1,
  bool: create$6,
  boolean: create$6,
  date: create$3,
  isSchema,
  lazy: create,
  mixed: create$7,
  number: create$4,
  object: create$2,
  reach,
  ref: create$8,
  setLocale,
  strapiID,
  string: create$5
}, Symbol.toStringTag, { value: "Module" }));
const validateZod = (schema2) => (data) => {
  try {
    return schema2.parse(data);
  } catch (error2) {
    if (error2 instanceof z$1.ZodError) {
      const { message, errors: errors2 } = formatZodErrors(error2);
      throw new ValidationError2(message, {
        errors: errors2
      });
    }
    throw error2;
  }
};
const formatZodErrors = (zodError) => ({
  errors: zodError.issues.map((issue) => {
    return {
      path: issue.path,
      message: issue.message,
      name: "ValidationError"
    };
  }),
  message: "Validation error"
});
const queryFieldsSchema = z.union([
  z.string(),
  z.array(z.string())
]).describe("Select specific fields to return in the response");
const queryPopulateSchema = z.union([
  z.literal("*"),
  z.string(),
  z.array(z.string()),
  z.record(z.string(), z.any())
]).describe("Specify which relations to populate in the response");
const querySortSchema = z.union([
  z.string(),
  z.array(z.string()),
  z.record(z.string(), z.enum([
    "asc",
    "desc"
  ])),
  z.array(z.record(z.string(), z.enum([
    "asc",
    "desc"
  ])))
]).describe("Sort the results by specified fields");
const paginationSchema = z.intersection(z.object({
  withCount: z.boolean().optional().describe("Include total count in response")
}), z.union([
  z.object({
    page: z.number().int().positive().describe("Page number (1-based)"),
    pageSize: z.number().int().positive().describe("Number of entries per page")
  }).describe("Page-based pagination"),
  z.object({
    start: z.number().int().min(0).describe("Number of entries to skip"),
    limit: z.number().int().positive().describe("Maximum number of entries to return")
  }).describe("Offset-based pagination")
])).describe("Pagination parameters");
const filtersSchema = z.record(z.string(), z.any()).describe("Apply filters to the query");
const localeSchema = z.string().describe("Specify the locale for localized content");
const statusSchema = z.enum([
  "draft",
  "published"
]).describe("Filter by publication status");
const searchQuerySchema = z.string().describe("Search query string");
const queryParameterSchemas = {
  fields: queryFieldsSchema,
  populate: queryPopulateSchema,
  sort: querySortSchema,
  pagination: paginationSchema,
  filters: filtersSchema,
  locale: localeSchema,
  status: statusSchema,
  _q: searchQuerySchema
};
class AbstractRouteValidator {
  /**
  * Creates a fields query parameter validator
  * Validates field selection for API responses
  */
  get queryFields() {
    return queryParameterSchemas.fields;
  }
  /**
  * Creates a populate query parameter validator
  * Validates which relations to populate in the response
  */
  get queryPopulate() {
    return queryParameterSchemas.populate;
  }
  /**
  * Creates a sort query parameter validator
  * Validates sorting options for list endpoints
  */
  get querySort() {
    return queryParameterSchemas.sort;
  }
  /**
  * Creates a pagination query parameter validator
  * Supports both page-based and offset-based pagination
  */
  get pagination() {
    return queryParameterSchemas.pagination;
  }
  /**
  * Creates a filters query parameter validator
  * Validates filtering options for list endpoints
  */
  get filters() {
    return queryParameterSchemas.filters;
  }
  /**
  * Creates a locale query parameter validator
  * Used for internationalization
  */
  get locale() {
    return queryParameterSchemas.locale;
  }
  /**
  * Creates a status query parameter validator
  * Used for draft & publish functionality
  */
  get status() {
    return queryParameterSchemas.status;
  }
  /**
  * Creates a search query parameter validator
  * Used for text search functionality
  */
  get query() {
    return queryParameterSchemas._q;
  }
  /**
  * Provides access to all base query parameter validators
  */
  get baseQueryValidators() {
    return {
      fields: () => this.queryFields.optional(),
      populate: () => this.queryPopulate.optional(),
      sort: () => this.querySort.optional(),
      filters: () => this.filters.optional(),
      pagination: () => this.pagination.optional(),
      locale: () => this.locale.optional(),
      status: () => this.status.optional(),
      _q: () => this.query.optional()
    };
  }
  /**
  * Helper method to create a query parameters object with specified validators
  *
  * @param params - Array of query parameter names to include
  * @returns Object containing Zod schemas for the requested query parameters
  */
  queryParams(params) {
    const validators2 = this.baseQueryValidators;
    return params.reduce((acc, param) => {
      if (param in validators2) {
        acc[param] = validators2[param]();
      }
      return acc;
    }, {});
  }
}
const transformUidToValidOpenApiName = (uid) => {
  const capitalize2 = (str2) => {
    return str2.charAt(0).toUpperCase() + str2.slice(1);
  };
  const toPascalCase = (str2) => {
    return str2.split(/[-_]/).map(capitalize2).join("");
  };
  if (uid.includes("::")) {
    const [namespace, ...rest] = uid.split("::");
    const namespacePart = toPascalCase(namespace);
    const restParts = rest.join(".").split(".").map(toPascalCase).map(capitalize2);
    return `${capitalize2(namespacePart)}${restParts.join("")}Document`;
  }
  if (uid.includes(".")) {
    const parts = uid.split(".");
    const transformedParts = parts.map(toPascalCase).map(capitalize2);
    return `${transformedParts.join("")}Entry`;
  }
  return `${toPascalCase(capitalize2(uid))}Schema`;
};
const maybeRequired = (required) => {
  return (schema2) => {
    return required !== true ? schema2.optional() : schema2.nonoptional();
  };
};
const maybeReadonly = (writable) => {
  return (schema2) => writable !== false ? schema2 : schema2.readonly();
};
const maybeWithDefault = (defaultValue) => {
  return (schema2) => {
    if (defaultValue === void 0) {
      return schema2;
    }
    const value = typeof defaultValue === "function" ? defaultValue() : defaultValue;
    return schema2.default(value);
  };
};
const maybeWithMinMax = (min, max) => {
  return (schema2) => {
    return min !== void 0 && max !== void 0 ? schema2.min(min).max(max) : schema2;
  };
};
const augmentSchema = (schema2, modifiers) => {
  return modifiers.reduce((acc, modifier) => modifier(acc), schema2);
};
const sanitizeRouteForSerialization = ({ request, response, ...rest }) => rest;
const sanitizeRoutesArrayForSerialization = (routes2) => routes2.filter((route) => !!route && typeof route === "object").map(sanitizeRouteForSerialization);
const sanitizeRoutesMapForSerialization = (map2) => Object.entries(map2).reduce((acc, [key, value]) => ({
  ...acc,
  [key]: Array.isArray(value) ? sanitizeRoutesArrayForSerialization(value) : value
}), {});
const castIncludes = (arr, val, cast) => arr.map((val2) => cast(val2)).includes(cast(val));
const includesString = (arr, val) => castIncludes(arr, val, String);
const arrays = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  includesString
}, Symbol.toStringTag, { value: "Module" }));
const keysDeep = (obj, path2 = []) => !___default.isObject(obj) ? [
  path2.join(".")
] : ___default.reduce(obj, (acc, next, key) => ___default.concat(acc, keysDeep(next, [
  ...path2,
  key
])), []);
const objects = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  keysDeep
}, Symbol.toStringTag, { value: "Module" }));
const timestampCode = (date2) => {
  const referDate = date2 ?? /* @__PURE__ */ new Date();
  return referDate.getTime().toString(36);
};
const dates = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  timestampCode
}, Symbol.toStringTag, { value: "Module" }));
const createContentApiRoutesFactory = (buildRoutes) => {
  let sharedRoutes;
  const ensureSharedRoutes = () => {
    if (!sharedRoutes) {
      sharedRoutes = buildRoutes();
    }
    return sharedRoutes;
  };
  const createContentApiRoutes = () => {
    return {
      type: "content-api",
      routes: ensureSharedRoutes()
    };
  };
  Object.defineProperty(createContentApiRoutes, "routes", {
    get: ensureSharedRoutes,
    set(next) {
      sharedRoutes = next;
    },
    enumerable: true
  });
  return createContentApiRoutes;
};
const CSP_DEFAULTS = {
  "connect-src": [
    "'self'",
    "https:"
  ],
  "img-src": [
    "'self'",
    "data:",
    "blob:",
    "https://market-assets.strapi.io"
  ],
  "media-src": [
    "'self'",
    "data:",
    "blob:"
  ]
};
const extendMiddlewareConfiguration = (middlewares2, middleware2) => {
  return middlewares2.map((currentMiddleware) => {
    if (typeof currentMiddleware === "string" && currentMiddleware === middleware2.name) {
      return middleware2;
    }
    if (typeof currentMiddleware === "object" && currentMiddleware.name === middleware2.name) {
      return fp.mergeWith((objValue, srcValue) => {
        if (Array.isArray(objValue)) {
          return Array.from(new Set(objValue.concat(srcValue)));
        }
        return void 0;
      }, currentMiddleware, middleware2);
    }
    return currentMiddleware;
  });
};
const dist = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  AbstractRouteValidator,
  CSP_DEFAULTS,
  arrays,
  async,
  augmentSchema,
  contentTypes: contentTypes$1,
  createContentApiRoutesFactory,
  dates,
  env,
  errors,
  extendMiddlewareConfiguration,
  file,
  filtersSchema,
  generateInstallId,
  hooks,
  importDefault,
  isOperator,
  isOperatorOfType,
  localeSchema,
  maybeReadonly,
  maybeRequired,
  maybeWithDefault,
  maybeWithMinMax,
  objects,
  packageManager,
  pagination,
  paginationSchema,
  parseType,
  policy,
  providerFactory,
  queryFieldsSchema,
  queryParameterSchemas,
  queryParams: convertQueryParams,
  queryPopulateSchema,
  querySortSchema,
  relations,
  sanitize: index$4,
  sanitizeRouteForSerialization,
  sanitizeRoutesArrayForSerialization,
  sanitizeRoutesMapForSerialization,
  searchQuerySchema,
  setCreatorFields,
  statusSchema,
  strings,
  template,
  transformUidToValidOpenApiName,
  traverse: index$1,
  traverseEntity: traverseEntity$1,
  validate: index$2,
  validateYupSchema,
  validateYupSchemaSync,
  validateZod,
  yup
}, Symbol.toStringTag, { value: "Module" }));
const require$$0 = /* @__PURE__ */ getAugmentedNamespace(dist);
const { castArray, isNil: isNil$1, pipe, every } = fp;
const { differenceInHours, parseISO } = dates__default;
const { getService } = getService_1;
const { API_TOKEN_TYPE } = constants$7;
const { UnauthorizedError: UnauthorizedError2, ForbiddenError: ForbiddenError2 } = require$$0.errors;
var strategies = ({ strapi: strapi2 }) => {
  const apiTokenService = getService({ type: "admin", plugin: "api-token" });
  const jwtService = getService({ name: "jwt", plugin: "users-permissions" });
  const userService = getService({ name: "user", plugin: "users-permissions" });
  const role = {
    name: "io-role",
    credentials: function(role2) {
      return `${this.name}-${role2.id}`;
    },
    authenticate: async function(auth) {
      const token2 = await jwtService.verify(auth.token);
      if (!token2) {
        throw new UnauthorizedError2("Invalid credentials");
      }
      const { id } = token2;
      if (id === void 0) {
        throw new UnauthorizedError2("Invalid credentials");
      }
      const user = await userService.fetchAuthenticatedUser(id);
      if (!user) {
        throw new UnauthorizedError2("Invalid credentials");
      }
      const advancedSettings = await strapi2.store({ type: "plugin", name: "users-permissions" }).get({ key: "advanced" });
      if (advancedSettings.email_confirmation && !user.confirmed) {
        throw new UnauthorizedError2("Invalid credentials");
      }
      if (user.blocked) {
        throw new UnauthorizedError2("Invalid credentials");
      }
      const roles = await strapi2.documents("plugin::users-permissions.role").findMany({
        filters: { id: user.role.id },
        fields: ["id", "name"],
        limit: 1
      });
      return roles.length > 0 ? roles[0] : null;
    },
    verify: function(auth, config2) {
      const { ability } = auth;
      if (!ability) {
        throw new UnauthorizedError2();
      }
      const isAllowed = pipe(
        castArray,
        every((scope) => ability.can(scope))
      )(config2.scope);
      if (!isAllowed) {
        throw new ForbiddenError2();
      }
    },
    getRoomName: function(role2) {
      return `${this.name}-${role2.name.toLowerCase()}`;
    },
    getRooms: function() {
      return strapi2.documents("plugin::users-permissions.role").findMany({
        fields: ["id", "name"],
        populate: { permissions: true }
      });
    }
  };
  const token = {
    name: "io-token",
    credentials: function(token2) {
      return token2;
    },
    authenticate: async function(auth) {
      const token2 = auth.token;
      if (!token2) {
        throw new UnauthorizedError2("Invalid credentials");
      }
      const apiToken = await strapi2.db.query("admin::api-token").findOne({
        where: { accessKey: apiTokenService.hash(token2) },
        select: ["id", "name", "type", "lastUsedAt", "expiresAt"],
        populate: ["permissions"]
      });
      if (!apiToken) {
        throw new UnauthorizedError2("Invalid credentials");
      }
      const currentDate = /* @__PURE__ */ new Date();
      if (!isNil$1(apiToken.expiresAt)) {
        const expirationDate = new Date(apiToken.expiresAt);
        if (expirationDate < currentDate) {
          throw new UnauthorizedError2("Token expired");
        }
      }
      if (!apiToken.lastUsedAt || differenceInHours(currentDate, parseISO(apiToken.lastUsedAt)) >= 1) {
        await strapi2.db.query("admin::api-token").update({
          where: { id: apiToken.id },
          data: { lastUsedAt: currentDate }
        });
      }
      return apiToken;
    },
    verify: function(auth, config2) {
      const { credentials: apiToken, ability } = auth;
      if (!apiToken) {
        throw new UnauthorizedError2("Token not found");
      }
      if (!isNil$1(apiToken.expiresAt)) {
        const currentDate = /* @__PURE__ */ new Date();
        const expirationDate = new Date(apiToken.expiresAt);
        if (expirationDate < currentDate) {
          throw new UnauthorizedError2("Token expired");
        }
      }
      if (apiToken.type === API_TOKEN_TYPE.FULL_ACCESS) {
        return;
      } else if (apiToken.type === API_TOKEN_TYPE.READ_ONLY) {
        const scopes = castArray(config2.scope);
        if (config2.scope && scopes.every(isReadScope)) {
          return;
        }
      } else if (apiToken.type === API_TOKEN_TYPE.CUSTOM) {
        if (!ability) {
          throw new ForbiddenError2();
        }
        const scopes = castArray(config2.scope);
        const isAllowed = scopes.every((scope) => ability.can(scope));
        if (isAllowed) {
          return;
        }
      }
      throw new ForbiddenError2();
    },
    getRoomName: function(token2) {
      return `${this.name}-${token2.name.toLowerCase()}`;
    },
    getRooms: function() {
      return strapi2.db.query("admin::api-token").findMany({
        select: ["id", "type", "name"],
        where: {
          $or: [
            {
              expiresAt: {
                $gte: /* @__PURE__ */ new Date()
              }
            },
            {
              expiresAt: null
            }
          ]
        },
        populate: ["permissions"]
      });
    }
  };
  return {
    role,
    token
  };
};
const { sanitize: sanitize$1 } = require$$0;
var sanitize_1 = ({ strapi: strapi2 }) => {
  function output({ schema: schema2, data, options }) {
    if (!sanitize$1 || !sanitize$1.contentAPI || !sanitize$1.contentAPI.output) {
      strapi2.log.debug("socket.io: sanitize.contentAPI not available, returning raw data");
      return data;
    }
    return sanitize$1.contentAPI.output(data, schema2, options);
  }
  return {
    output
  };
};
const { isNil, isPlainObject } = fp;
var transform$1 = ({ strapi: strapi2 }) => {
  function response({ data, schema: schema2 }) {
    return transformResponse(data, {}, { contentType: schema2 });
  }
  return {
    response
  };
};
function isEntry(property2) {
  return property2 === null || isPlainObject(property2) || Array.isArray(property2);
}
function isDZEntries(property2) {
  return Array.isArray(property2);
}
function transformResponse(resource, meta = {}, opts = {}) {
  if (isNil(resource)) {
    return resource;
  }
  return {
    data: transformEntry(resource, opts?.contentType),
    meta
  };
}
function transformComponent(data, component) {
  if (Array.isArray(data)) {
    return data.map((datum) => transformComponent(datum, component));
  }
  const res = transformEntry(data, component);
  if (isNil(res)) {
    return res;
  }
  const { id, attributes } = res;
  return { id, ...attributes };
}
function transformEntry(entry, type2) {
  if (isNil(entry)) {
    return entry;
  }
  if (Array.isArray(entry)) {
    return entry.map((singleEntry) => transformEntry(singleEntry, type2));
  }
  if (!isPlainObject(entry)) {
    throw new Error("Entry must be an object");
  }
  const { id, ...properties } = entry;
  const attributeValues = {};
  for (const key of Object.keys(properties)) {
    const property2 = properties[key];
    const attribute = type2 && type2.attributes[key];
    if (attribute && attribute.type === "relation" && isEntry(property2) && "target" in attribute) {
      const data = transformEntry(property2, strapi.contentType(attribute.target));
      attributeValues[key] = { data };
    } else if (attribute && attribute.type === "component" && isEntry(property2)) {
      attributeValues[key] = transformComponent(property2, strapi.components[attribute.component]);
    } else if (attribute && attribute.type === "dynamiczone" && isDZEntries(property2)) {
      if (isNil(property2)) {
        attributeValues[key] = property2;
      }
      attributeValues[key] = property2.map((subProperty) => {
        return transformComponent(subProperty, strapi.components[subProperty.__component]);
      });
    } else if (attribute && attribute.type === "media" && isEntry(property2)) {
      const data = transformEntry(property2, strapi.contentType("plugin::upload.file"));
      attributeValues[key] = { data };
    } else {
      attributeValues[key] = property2;
    }
  }
  return {
    id,
    attributes: attributeValues
    // NOTE: not necessary for now
    // meta: {},
  };
}
const { pluginId: pluginId$1 } = pluginId_1;
var settings$1 = ({ strapi: strapi2 }) => {
  const getPluginStore = () => {
    return strapi2.store({
      type: "plugin",
      name: pluginId$1
    });
  };
  const getDefaultSettings = () => ({
    enabled: true,
    // CORS Settings (only origins, methods/credentials are per-role)
    cors: {
      origins: ["http://localhost:3000"]
      // Multiple origins
    },
    // Connection Settings
    connection: {
      maxConnections: 1e3,
      pingTimeout: 2e4,
      // ms
      pingInterval: 25e3,
      // ms
      connectionTimeout: 45e3
      // ms
    },
    // Security Settings
    security: {
      requireAuthentication: false,
      rateLimiting: {
        enabled: false,
        maxEventsPerSecond: 10
      },
      ipWhitelist: [],
      ipBlacklist: []
    },
    // Content Types with granular permissions
    contentTypes: {},
    // Object: { 'api::session.session': { create: true, update: true, delete: false, config: {...} } }
    // Event Configuration (global defaults)
    events: {
      customEventNames: false,
      // Use custom names like 'session:created' instead of 'session:create'
      includeRelations: false,
      // Populate relations
      excludeFields: [],
      // Fields to exclude globally
      onlyPublished: false
      // Only send events for published content (Draft & Publish)
    },
    // Rooms & Channels
    rooms: {
      autoJoinByRole: {},
      // { 'authenticated': ['users'], 'admin': ['admins'] }
      enablePrivateRooms: false
    },
    // Entity Subscriptions (NEW)
    entitySubscriptions: {
      enabled: true,
      // Enable/disable entity-specific subscriptions
      maxSubscriptionsPerSocket: 100,
      // Max entities a socket can subscribe to
      requireVerification: true,
      // Verify entity exists before subscribing
      allowedContentTypes: [],
      // Empty = all allowed, or specific UIDs: ['api::article.article']
      enableMetrics: true
      // Track subscription metrics
    },
    // Role-based Permissions
    rolePermissions: {
      // Default: all roles can connect with all methods
      authenticated: {
        canConnect: true,
        allowCredentials: true,
        allowedMethods: ["GET", "POST", "PUT", "DELETE"],
        contentTypes: {}
      },
      public: {
        canConnect: true,
        allowCredentials: false,
        allowedMethods: ["GET"],
        contentTypes: {}
      }
    },
    // Redis Adapter (for multi-server scaling)
    redis: {
      enabled: false,
      url: "redis://localhost:6379"
    },
    // Namespaces
    namespaces: {
      enabled: false,
      list: {
        // Example: 'admin': { requireAuth: true },
        // Example: 'chat': { requireAuth: false },
      }
    },
    // Custom Middleware
    middleware: {
      enabled: false,
      handlers: []
      // Array of middleware functions
    },
    // Monitoring & Logging
    monitoring: {
      enableConnectionLogging: true,
      enableEventLogging: false,
      maxEventLogSize: 100
    }
  });
  return {
    /**
     * Get current settings (merged with defaults)
     */
    async getSettings() {
      const pluginStore = getPluginStore();
      const storedSettings = await pluginStore.get({ key: "settings" });
      const defaults = getDefaultSettings();
      if (!storedSettings) {
        return defaults;
      }
      return {
        ...defaults,
        ...storedSettings
      };
    },
    /**
     * Update settings
     */
    async setSettings(newSettings) {
      const pluginStore = getPluginStore();
      const currentSettings = await this.getSettings();
      const updatedSettings = {
        ...currentSettings,
        ...newSettings
      };
      await pluginStore.set({
        key: "settings",
        value: updatedSettings
      });
      return updatedSettings;
    },
    /**
     * Get default settings
     */
    getDefaultSettings
  };
};
const { pluginId } = pluginId_1;
var monitoring$1 = ({ strapi: strapi2 }) => {
  let eventLog = [];
  let eventStats = {
    totalEvents: 0,
    eventsByType: {},
    lastReset: Date.now()
  };
  return {
    /**
     * Get current connection statistics
     */
    getConnectionStats() {
      const io2 = strapi2.$io?.server;
      if (!io2) {
        return {
          connected: 0,
          rooms: [],
          sockets: [],
          entitySubscriptions: {
            total: 0,
            byContentType: {}
          }
        };
      }
      const sockets = Array.from(io2.sockets.sockets.values());
      const rooms = Array.from(io2.sockets.adapter.rooms.keys()).filter((room) => !io2.sockets.sockets.has(room));
      const entityRooms = rooms.filter((room) => room.includes(":") && room.match(/^(api|plugin)::/));
      const entitySubsByType = {};
      entityRooms.forEach((room) => {
        const uid = room.substring(0, room.lastIndexOf(":"));
        entitySubsByType[uid] = (entitySubsByType[uid] || 0) + 1;
      });
      return {
        connected: sockets.length,
        rooms: rooms.map((room) => ({
          name: room,
          members: io2.sockets.adapter.rooms.get(room)?.size || 0,
          isEntityRoom: room.includes(":") && room.match(/^(api|plugin)::/) !== null
        })),
        sockets: sockets.map((socket) => ({
          id: socket.id,
          connected: socket.connected,
          rooms: Array.from(socket.rooms).filter((r) => r !== socket.id),
          entitySubscriptions: Array.from(socket.rooms).filter((r) => r !== socket.id && r.includes(":") && r.match(/^(api|plugin)::/)).map((room) => {
            const lastColon = room.lastIndexOf(":");
            return {
              uid: room.substring(0, lastColon),
              id: room.substring(lastColon + 1),
              room
            };
          }),
          handshake: {
            address: socket.handshake.address,
            time: socket.handshake.time,
            query: socket.handshake.query
          },
          // Include user info if authenticated
          user: socket.user || null
        })),
        entitySubscriptions: {
          total: entityRooms.length,
          byContentType: entitySubsByType,
          rooms: entityRooms
        }
      };
    },
    /**
     * Get event statistics
     */
    getEventStats() {
      return {
        ...eventStats,
        eventsPerSecond: this.getEventsPerSecond()
      };
    },
    /**
     * Get recent event log
     */
    getEventLog(limit = 50) {
      return eventLog.slice(-limit);
    },
    /**
     * Log an event
     */
    logEvent(eventType, data = {}) {
      const settings2 = strapi2.$ioSettings || {};
      if (!settings2.monitoring?.enableEventLogging) return;
      const entry = {
        timestamp: Date.now(),
        type: eventType,
        data
      };
      eventLog.push(entry);
      eventStats.totalEvents++;
      eventStats.eventsByType[eventType] = (eventStats.eventsByType[eventType] || 0) + 1;
      const maxSize = settings2.monitoring?.maxEventLogSize || 100;
      if (eventLog.length > maxSize) {
        eventLog = eventLog.slice(-maxSize);
      }
    },
    /**
     * Calculate events per second
     */
    getEventsPerSecond() {
      const now = Date.now();
      const elapsed = (now - eventStats.lastReset) / 1e3;
      return elapsed > 0 ? (eventStats.totalEvents / elapsed).toFixed(2) : 0;
    },
    /**
     * Reset statistics
     */
    resetStats() {
      eventLog = [];
      eventStats = {
        totalEvents: 0,
        eventsByType: {},
        lastReset: Date.now()
      };
    },
    /**
     * Send test event
     */
    sendTestEvent(eventName = "test", data = {}) {
      const io2 = strapi2.$io?.server;
      if (!io2) {
        throw new Error("Socket.IO not initialized");
      }
      const testData = {
        ...data,
        timestamp: Date.now(),
        test: true
      };
      io2.emit(eventName, testData);
      this.logEvent("test", { eventName, data: testData });
      return {
        success: true,
        eventName,
        data: testData,
        recipients: io2.sockets.sockets.size
      };
    }
  };
};
const strategy = strategies;
const sanitize = sanitize_1;
const transform = transform$1;
const settings = settings$1;
const monitoring = monitoring$1;
var services$1 = {
  sanitize,
  strategy,
  transform,
  settings,
  monitoring
};
const bootstrap = bootstrap_1;
const config = config$1;
const controllers = controllers$1;
const routes = routes$1;
const services = services$1;
const destroy = async () => {
};
const register = async () => {
};
const contentTypes = {};
const middlewares = {};
const policies = {};
var server = {
  register,
  bootstrap,
  destroy,
  config,
  controllers,
  routes,
  services,
  contentTypes,
  policies,
  middlewares
};
const index = /* @__PURE__ */ getDefaultExportFromCjs(server);
export {
  index as default
};
