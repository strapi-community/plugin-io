import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useRef, useCallback, useEffect } from "react";
import { Typography, Flex, Badge, Box } from "@strapi/design-system";
import { Pencil, User, Clock } from "@strapi/icons";
import { useFetchClient } from "@strapi/strapi/admin";
import styled, { keyframes } from "styled-components";
import { io } from "socket.io-client";
import { P as PLUGIN_ID } from "./index-D8FJmEh8.mjs";
const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;
const WidgetContainer = styled(Box)`
  padding: 0;
  position: relative;
`;
const HeaderContainer = styled(Flex)`
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spaces[3]};
  padding-bottom: ${({ theme }) => theme.spaces[2]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};
`;
const LiveDot = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ theme, $connected }) => $connected ? theme.colors.success500 : theme.colors.neutral400};
  margin-right: ${({ theme }) => theme.spaces[2]};
  animation: ${({ $connected }) => $connected ? pulse : "none"} 2s ease-in-out infinite;
`;
const CountBadge = styled.span`
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
const UserList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spaces[2]};
  max-height: 280px;
  overflow-y: auto;
`;
const UserCard = styled.div`
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
const UserAvatar = styled.div`
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
const UserInfo = styled.div`
  flex: 1;
  min-width: 0;
`;
const UserName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.neutral800};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
const UserMeta = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.neutral500};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spaces[2]};
  margin-top: 2px;
`;
const EditingBadge = styled.a`
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
const IdleBadge = styled.span`
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
const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: ${({ theme }) => theme.spaces[8]} ${({ theme }) => theme.spaces[4]};
  color: ${({ theme }) => theme.colors.neutral500};
  min-height: 180px;
`;
const EmptyIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.neutral100};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }) => theme.spaces[3]};
`;
const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spaces[6]};
`;
const FooterLink = styled.a`
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
  const { get, post } = useFetchClient();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const fetchOnlineUsers = useCallback(async () => {
    try {
      const response = await get(`/${PLUGIN_ID}/online-users`);
      setData(response.data?.data || response.data);
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error("[plugin-io] Failed to fetch online users:", err);
      setError(err.message);
      setLoading(false);
    }
  }, [get]);
  useEffect(() => {
    let cancelled = false;
    let socket = null;
    const connectSocket = async () => {
      try {
        const { data: sessionData } = await post(`/${PLUGIN_ID}/presence/session`, {});
        if (cancelled || !sessionData?.token) return;
        const socketUrl = sessionData.wsUrl || `${window.location.protocol}//${window.location.host}`;
        socket = io(socketUrl, {
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
            console.log(`[${PLUGIN_ID}] Dashboard presence connected`);
            fetchOnlineUsers();
          }
        });
        socket.on("disconnect", () => {
          if (!cancelled) {
            setConnected(false);
          }
        });
        socket.on("connect_error", (err) => {
          console.warn(`[${PLUGIN_ID}] Dashboard socket error:`, err.message);
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
  useEffect(() => {
    const interval = setInterval(fetchOnlineUsers, 15e3);
    return () => clearInterval(interval);
  }, [fetchOnlineUsers]);
  if (loading) {
    return /* @__PURE__ */ jsx(LoadingContainer, { children: /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral600", children: "Loading..." }) });
  }
  if (error) {
    return /* @__PURE__ */ jsx(EmptyState, { children: /* @__PURE__ */ jsxs(Typography, { variant: "pi", textColor: "danger600", children: [
      "Failed to load: ",
      error
    ] }) });
  }
  const users = data?.users || [];
  const counts = data?.counts || { total: 0, editing: 0 };
  return /* @__PURE__ */ jsxs(WidgetContainer, { children: [
    /* @__PURE__ */ jsxs(HeaderContainer, { children: [
      /* @__PURE__ */ jsxs(Flex, { alignItems: "center", gap: 2, children: [
        /* @__PURE__ */ jsx(LiveDot, { $connected: connected }),
        /* @__PURE__ */ jsx(Typography, { variant: "omega", fontWeight: "bold", textColor: "neutral800", children: "Who's Online" })
      ] }),
      /* @__PURE__ */ jsxs(Flex, { gap: 2, children: [
        /* @__PURE__ */ jsxs(CountBadge, { $active: counts.editing > 0, title: "Users editing", children: [
          /* @__PURE__ */ jsx(Pencil, { width: "12", height: "12", style: { marginRight: 4 } }),
          counts.editing
        ] }),
        /* @__PURE__ */ jsxs(CountBadge, { title: "Total online", children: [
          /* @__PURE__ */ jsx(User, { width: "12", height: "12", style: { marginRight: 4 } }),
          counts.total
        ] })
      ] })
    ] }),
    users.length === 0 ? /* @__PURE__ */ jsxs(EmptyState, { children: [
      /* @__PURE__ */ jsx(EmptyIcon, { children: /* @__PURE__ */ jsx(User, { width: "28", height: "28", fill: "#a5a5ba" }) }),
      /* @__PURE__ */ jsx(Typography, { variant: "omega", fontWeight: "semiBold", textColor: "neutral600", children: "No one else is online" }),
      /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral500", style: { marginTop: 4 }, children: "You're the only one here right now" })
    ] }) : /* @__PURE__ */ jsx(UserList, { children: users.map((userData, index) => /* @__PURE__ */ jsxs(UserCard, { children: [
      /* @__PURE__ */ jsx(UserAvatar, { $colorIndex: index, children: getInitials(userData.user) }),
      /* @__PURE__ */ jsxs(UserInfo, { children: [
        /* @__PURE__ */ jsxs(UserName, { children: [
          getDisplayName(userData.user),
          userData.user.isAdmin && /* @__PURE__ */ jsx(Badge, { size: "S", style: { marginLeft: 8 }, children: "Admin" })
        ] }),
        /* @__PURE__ */ jsxs(UserMeta, { children: [
          /* @__PURE__ */ jsx(Clock, { width: "12", height: "12" }),
          "Online ",
          formatDuration(userData.onlineFor)
        ] }),
        userData.isEditing ? userData.editingEntities.map((entity, idx) => /* @__PURE__ */ jsxs(
          EditingBadge,
          {
            href: `/admin/content-manager/collection-types/${entity.uid}/${entity.documentId}`,
            target: "_blank",
            rel: "noopener noreferrer",
            title: "Open in new tab",
            children: [
              /* @__PURE__ */ jsx(Pencil, { width: "10", height: "10" }),
              entity.contentTypeName,
              " - ",
              entity.documentId
            ]
          },
          idx
        )) : /* @__PURE__ */ jsx(IdleBadge, { children: "Idle" })
      ] })
    ] }, userData.socketId)) }),
    /* @__PURE__ */ jsx(Flex, { justifyContent: "flex-end", marginTop: 3, children: /* @__PURE__ */ jsx(FooterLink, { href: "/admin/settings/io/monitoring", children: "View All Activity" }) })
  ] });
};
export {
  OnlineEditorsWidget
};
