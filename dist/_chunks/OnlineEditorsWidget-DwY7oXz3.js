"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const jsxRuntime = require("react/jsx-runtime");
const React = require("react");
const designSystem = require("@strapi/design-system");
const icons = require("@strapi/icons");
const admin = require("@strapi/strapi/admin");
const styled = require("styled-components");
const socket_ioClient = require("socket.io-client");
const index = require("./index-BebGc_V1.js");
const _interopDefault = (e) => e && e.__esModule ? e : { default: e };
const styled__default = /* @__PURE__ */ _interopDefault(styled);
const pulse = styled.keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;
const WidgetContainer = styled__default.default(designSystem.Box)`
  padding: 0;
  position: relative;
`;
const HeaderContainer = styled__default.default(designSystem.Flex)`
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spaces[3]};
  padding-bottom: ${({ theme }) => theme.spaces[2]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};
`;
const LiveDot = styled__default.default.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ theme, $connected }) => $connected ? theme.colors.success500 : theme.colors.neutral400};
  margin-right: ${({ theme }) => theme.spaces[2]};
  animation: ${({ $connected }) => $connected ? pulse : "none"} 2s ease-in-out infinite;
`;
const CountBadge = styled__default.default.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  background: ${({ theme, $active }) => $active ? theme.colors.primary100 : theme.colors.neutral100};
  color: ${({ theme, $active }) => $active ? theme.colors.primary700 : theme.colors.neutral600};
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
`;
const UserList = styled__default.default.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spaces[2]};
  max-height: 280px;
  overflow-y: auto;
`;
const UserCard = styled__default.default.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spaces[3]};
  padding: ${({ theme }) => theme.spaces[3]};
  background: ${({ theme }) => theme.colors.neutral0};
  border: 1px solid ${({ theme }) => theme.colors.neutral150};
  border-radius: ${({ theme }) => theme.borderRadius};
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary200};
    box-shadow: 0 2px 8px rgba(73, 69, 255, 0.08);
  }
`;
const AVATAR_COLORS = [
  "linear-gradient(135deg, #4945ff 0%, #7b79ff 100%)",
  "linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)",
  "linear-gradient(135deg, #10b981 0%, #34d399 100%)",
  "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
  "linear-gradient(135deg, #ef4444 0%, #f87171 100%)",
  "linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)"
];
const UserAvatar = styled__default.default.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ $colorIndex }) => AVATAR_COLORS[$colorIndex % AVATAR_COLORS.length]};
  color: white;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;
const UserInfo = styled__default.default.div`
  flex: 1;
  min-width: 0;
`;
const UserName = styled__default.default.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.neutral800};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
const UserMeta = styled__default.default.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.neutral500};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spaces[2]};
  margin-top: 2px;
`;
const EditingBadge = styled__default.default.a`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.success700};
  background: ${({ theme }) => theme.colors.success100};
  padding: 4px 10px;
  border-radius: 10px;
  margin-top: ${({ theme }) => theme.spaces[1]};
  word-break: break-all;
  max-width: 100%;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.15s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors.success200};
    color: ${({ theme }) => theme.colors.success800};
    transform: translateY(-1px);
  }
`;
const IdleBadge = styled__default.default.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.neutral600};
  background: ${({ theme }) => theme.colors.neutral100};
  padding: 2px 8px;
  border-radius: 10px;
  margin-top: ${({ theme }) => theme.spaces[1]};
`;
const EmptyState = styled__default.default.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: ${({ theme }) => theme.spaces[8]} ${({ theme }) => theme.spaces[4]};
  color: ${({ theme }) => theme.colors.neutral500};
  min-height: 180px;
`;
const EmptyIcon = styled__default.default.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.neutral100};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }) => theme.spaces[3]};
`;
const LoadingContainer = styled__default.default.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spaces[6]};
`;
const FooterLink = styled__default.default.a`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.primary600};
  text-decoration: none;
  
  &:hover {
    text-decoration: underline;
  }
`;
const getInitials = (user) => {
  const first = (user.firstname?.[0] || user.username?.[0] || user.email?.[0] || "?").toUpperCase();
  const last = (user.lastname?.[0] || "").toUpperCase();
  return `${first}${last}`.trim() || "?";
};
const getDisplayName = (user) => {
  if (user.firstname) {
    return `${user.firstname} ${user.lastname || ""}`.trim();
  }
  return user.username || user.email || "Unknown";
};
const formatDuration = (seconds) => {
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
};
const OnlineEditorsWidget = () => {
  const { get, post } = admin.useFetchClient();
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [connected, setConnected] = React.useState(false);
  const socketRef = React.useRef(null);
  const fetchOnlineUsers = React.useCallback(async () => {
    try {
      const response = await get(`/${index.PLUGIN_ID}/online-users`);
      setData(response.data?.data || response.data);
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error("[plugin-io] Failed to fetch online users:", err);
      setError(err.message);
      setLoading(false);
    }
  }, [get]);
  React.useEffect(() => {
    let cancelled = false;
    let socket = null;
    const connectSocket = async () => {
      try {
        const { data: sessionData } = await post(`/${index.PLUGIN_ID}/presence/session`, {});
        if (cancelled || !sessionData?.token) return;
        const socketUrl = sessionData.wsUrl || `${window.location.protocol}//${window.location.host}`;
        socket = socket_ioClient.io(socketUrl, {
          path: sessionData.wsPath || "/socket.io",
          transports: ["websocket", "polling"],
          auth: {
            token: sessionData.token,
            strategy: "admin-jwt",
            isAdmin: true
          },
          reconnection: true,
          reconnectionAttempts: 3
        });
        socketRef.current = socket;
        socket.on("connect", () => {
          if (!cancelled) {
            setConnected(true);
            console.log(`[${index.PLUGIN_ID}] Dashboard presence connected`);
            fetchOnlineUsers();
          }
        });
        socket.on("disconnect", () => {
          if (!cancelled) {
            setConnected(false);
          }
        });
        socket.on("connect_error", (err) => {
          console.warn(`[${index.PLUGIN_ID}] Dashboard socket error:`, err.message);
        });
        socket.on("presence:update", () => {
          fetchOnlineUsers();
        });
      } catch (err) {
        console.error("[plugin-io] Failed to connect dashboard socket:", err);
      }
    };
    connectSocket();
    return () => {
      cancelled = true;
      if (socket) {
        socket.disconnect();
        socketRef.current = null;
      }
    };
  }, [post, fetchOnlineUsers]);
  React.useEffect(() => {
    const interval = setInterval(fetchOnlineUsers, 15e3);
    return () => clearInterval(interval);
  }, [fetchOnlineUsers]);
  if (loading) {
    return /* @__PURE__ */ jsxRuntime.jsx(LoadingContainer, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "pi", textColor: "neutral600", children: "Loading..." }) });
  }
  if (error) {
    return /* @__PURE__ */ jsxRuntime.jsx(EmptyState, { children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Typography, { variant: "pi", textColor: "danger600", children: [
      "Failed to load: ",
      error
    ] }) });
  }
  const users = data?.users || [];
  const counts = data?.counts || { total: 0, editing: 0 };
  return /* @__PURE__ */ jsxRuntime.jsxs(WidgetContainer, { children: [
    /* @__PURE__ */ jsxRuntime.jsxs(HeaderContainer, { children: [
      /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { alignItems: "center", gap: 2, children: [
        /* @__PURE__ */ jsxRuntime.jsx(LiveDot, { $connected: connected }),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "omega", fontWeight: "bold", textColor: "neutral800", children: "Who's Online" })
      ] }),
      /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { gap: 2, children: [
        /* @__PURE__ */ jsxRuntime.jsxs(CountBadge, { $active: counts.editing > 0, title: "Users editing", children: [
          /* @__PURE__ */ jsxRuntime.jsx(icons.Pencil, { width: "12", height: "12", style: { marginRight: 4 } }),
          counts.editing
        ] }),
        /* @__PURE__ */ jsxRuntime.jsxs(CountBadge, { title: "Total online", children: [
          /* @__PURE__ */ jsxRuntime.jsx(icons.User, { width: "12", height: "12", style: { marginRight: 4 } }),
          counts.total
        ] })
      ] })
    ] }),
    users.length === 0 ? /* @__PURE__ */ jsxRuntime.jsxs(EmptyState, { children: [
      /* @__PURE__ */ jsxRuntime.jsx(EmptyIcon, { children: /* @__PURE__ */ jsxRuntime.jsx(icons.User, { width: "28", height: "28", fill: "#a5a5ba" }) }),
      /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "omega", fontWeight: "semiBold", textColor: "neutral600", children: "No one else is online" }),
      /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "pi", textColor: "neutral500", style: { marginTop: 4 }, children: "You're the only one here right now" })
    ] }) : /* @__PURE__ */ jsxRuntime.jsx(UserList, { children: users.map((userData, index2) => /* @__PURE__ */ jsxRuntime.jsxs(UserCard, { children: [
      /* @__PURE__ */ jsxRuntime.jsx(UserAvatar, { $colorIndex: index2, children: getInitials(userData.user) }),
      /* @__PURE__ */ jsxRuntime.jsxs(UserInfo, { children: [
        /* @__PURE__ */ jsxRuntime.jsxs(UserName, { children: [
          getDisplayName(userData.user),
          userData.user.isAdmin && /* @__PURE__ */ jsxRuntime.jsx(designSystem.Badge, { size: "S", style: { marginLeft: 8 }, children: "Admin" })
        ] }),
        /* @__PURE__ */ jsxRuntime.jsxs(UserMeta, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(icons.Clock, { width: "12", height: "12" }),
          "Online ",
          formatDuration(userData.onlineFor)
        ] }),
        userData.isEditing ? userData.editingEntities.map((entity, idx) => /* @__PURE__ */ jsxRuntime.jsxs(
          EditingBadge,
          {
            href: `/admin/content-manager/collection-types/${entity.uid}/${entity.documentId}`,
            target: "_blank",
            rel: "noopener noreferrer",
            title: "Open in new tab",
            children: [
              /* @__PURE__ */ jsxRuntime.jsx(icons.Pencil, { width: "10", height: "10" }),
              entity.contentTypeName,
              " - ",
              entity.documentId
            ]
          },
          idx
        )) : /* @__PURE__ */ jsxRuntime.jsx(IdleBadge, { children: "Idle" })
      ] })
    ] }, userData.socketId)) }),
    /* @__PURE__ */ jsxRuntime.jsx(designSystem.Flex, { justifyContent: "flex-end", marginTop: 3, children: /* @__PURE__ */ jsxRuntime.jsx(FooterLink, { href: "/admin/settings/io/monitoring", children: "View All Activity" }) })
  ] });
};
exports.OnlineEditorsWidget = OnlineEditorsWidget;
