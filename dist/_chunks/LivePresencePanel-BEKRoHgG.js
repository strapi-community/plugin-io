"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const jsxRuntime = require("react/jsx-runtime");
const React = require("react");
const index = require("./index-DWR5U-I4.js");
const designSystem = require("@strapi/design-system");
const admin = require("@strapi/strapi/admin");
const styled = require("styled-components");
const socket_ioClient = require("socket.io-client");
const index$1 = require("./index-BebGc_V1.js");
const _interopDefault = (e) => e && e.__esModule ? e : { default: e };
const styled__default = /* @__PURE__ */ _interopDefault(styled);
const pulse = styled.keyframes`
  0%, 100% { 
    box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
    transform: scale(1);
  }
  50% { 
    box-shadow: 0 0 0 6px rgba(34, 197, 94, 0.1);
    transform: scale(1.1);
  }
`;
const StatusCard = styled__default.default.div`
  background: ${(props) => props.theme.colors.neutral0};
  border: 1px solid ${({ $status, theme }) => $status === "connected" ? "rgba(34, 197, 94, 0.3)" : $status === "error" ? "rgba(239, 68, 68, 0.3)" : theme.colors.neutral200};
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
`;
const StatusDot = styled__default.default.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $status }) => $status === "connected" ? "#22c55e" : $status === "connecting" ? "#f59e0b" : $status === "error" ? "#ef4444" : "#94a3b8"};
  
  ${({ $status }) => $status === "connected" && styled.css`
    animation: ${pulse} 2s ease-in-out infinite;
  `}
`;
const StatusText = styled__default.default.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;
const StatusLabel = styled__default.default.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ $status, theme }) => $status === "connected" ? theme.colors.success600 : $status === "connecting" ? theme.colors.warning600 : $status === "error" ? theme.colors.danger600 : theme.colors.neutral600};
`;
const StatusSubtext = styled__default.default.span`
  font-size: 12px;
  color: ${(props) => props.theme.colors.neutral500};
`;
const SectionTitle = styled__default.default.div`
  font-size: 11px;
  font-weight: 600;
  color: ${(props) => props.theme.colors.neutral600};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
`;
const EditorItem = styled__default.default.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: ${(props) => props.theme.colors.neutral0};
  border-radius: 10px;
  border: 1px solid ${(props) => props.theme.colors.neutral150};
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${(props) => props.theme.colors.primary200};
    box-shadow: 0 2px 8px rgba(73, 69, 255, 0.08);
    transform: translateY(-1px);
  }
`;
const EDITOR_COLORS = [
  "linear-gradient(135deg, #4945ff 0%, #7b79ff 100%)",
  "linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)",
  "linear-gradient(135deg, #10b981 0%, #34d399 100%)",
  "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
  "linear-gradient(135deg, #ef4444 0%, #f87171 100%)",
  "linear-gradient(135deg, #ec4899 0%, #f472b6 100%)"
];
const EditorAvatar = styled__default.default.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${({ $color }) => $color || EDITOR_COLORS[0]};
  color: white;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;
const EditorInfo = styled__default.default.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;
const EditorName = styled__default.default.span`
  font-size: 13px;
  font-weight: 600;
  color: ${(props) => props.theme.colors.neutral800};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
const EditorEmail = styled__default.default.span`
  font-size: 11px;
  color: ${(props) => props.theme.colors.neutral500};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
const EditingBadge = styled__default.default.span`
  font-size: 10px;
  font-weight: 600;
  color: #166534;
  background: #dcfce7;
  padding: 4px 8px;
  border-radius: 12px;
  flex-shrink: 0;
`;
const TypingBadge = styled__default.default.span`
  font-size: 10px;
  font-weight: 600;
  color: #92400e;
  background: #fef3c7;
  padding: 4px 8px;
  border-radius: 12px;
  flex-shrink: 0;
`;
const EmptyState = styled__default.default.div`
  text-align: center;
  padding: 16px;
  background: ${(props) => props.theme.colors.neutral100};
  border-radius: 10px;
  border: 1px dashed ${(props) => props.theme.colors.neutral300};
`;
const EmptyText = styled__default.default.span`
  font-size: 13px;
  color: ${(props) => props.theme.colors.neutral500};
`;
const getEditorInitials = (user = {}) => {
  const first = (user.firstname?.[0] || user.username?.[0] || user.email?.[0] || "?").toUpperCase();
  const last = (user.lastname?.[0] || "").toUpperCase();
  return `${first}${last}`.trim();
};
const getEditorName = (user = {}) => {
  if (user.firstname) {
    return `${user.firstname} ${user.lastname || ""}`.trim();
  }
  return user.username || user.email || "Unknown";
};
const LivePresencePanel = ({ documentId, model, document }) => {
  const { formatMessage } = index.useIntl();
  const { post } = admin.useFetchClient();
  const t = (id, defaultMessage, values) => formatMessage({ id: `${index$1.PLUGIN_ID}.${id}`, defaultMessage }, values);
  const socketRef = React.useRef(null);
  const [sessionData, setSessionData] = React.useState(null);
  const [presenceState, setPresenceState] = React.useState({
    status: "initializing",
    editors: [],
    typingUsers: [],
    error: null
  });
  const uid = model?.uid || model;
  React.useEffect(() => {
    if (!uid || !documentId) {
      setPresenceState((prev) => ({ ...prev, status: "disconnected", error: "No content" }));
      return;
    }
    let cancelled = false;
    let refreshTimeoutId = null;
    const getSession = async (isRefresh = false) => {
      try {
        if (!isRefresh) {
          setPresenceState((prev) => ({ ...prev, status: "requesting" }));
        }
        const { data } = await post(`/${index$1.PLUGIN_ID}/presence/session`, {});
        if (cancelled) return;
        if (!data || !data.token) {
          throw new Error("Invalid session response");
        }
        console.log(`[${index$1.PLUGIN_ID}] Session ${isRefresh ? "refreshed" : "obtained"}:`, {
          expiresIn: Math.round((data.expiresAt - Date.now()) / 1e3) + "s",
          refreshAfter: Math.round((data.refreshAfter - Date.now()) / 1e3) + "s"
        });
        setSessionData(data);
        if (!isRefresh) {
          setPresenceState((prev) => ({ ...prev, status: "connecting" }));
        }
        if (data.refreshAfter) {
          const refreshIn = data.refreshAfter - Date.now();
          if (refreshIn > 0) {
            console.log(`[${index$1.PLUGIN_ID}] Token refresh scheduled in ${Math.round(refreshIn / 1e3)}s`);
            refreshTimeoutId = setTimeout(() => {
              if (!cancelled) {
                console.log(`[${index$1.PLUGIN_ID}] Refreshing session token...`);
                getSession(true);
              }
            }, refreshIn);
          }
        }
      } catch (error2) {
        if (cancelled) return;
        if (error2.response?.status === 429) {
          console.warn(`[${index$1.PLUGIN_ID}] Rate limited, retrying in 30s...`);
          refreshTimeoutId = setTimeout(() => {
            if (!cancelled) getSession(isRefresh);
          }, 3e4);
          return;
        }
        console.error(`[${index$1.PLUGIN_ID}] Failed to get presence session:`, error2);
        setPresenceState((prev) => ({
          ...prev,
          status: "error",
          error: error2.message || "Failed to get session"
        }));
      }
    };
    getSession();
    return () => {
      cancelled = true;
      if (refreshTimeoutId) {
        clearTimeout(refreshTimeoutId);
      }
    };
  }, [uid, documentId, post]);
  React.useEffect(() => {
    if (!sessionData?.token || !uid || !documentId) {
      return;
    }
    const socketUrl = sessionData.wsUrl || `${window.location.protocol}//${window.location.host}`;
    const socket = socket_ioClient.io(socketUrl, {
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
    let lastTypingEmit = 0;
    const TYPING_THROTTLE = 2e3;
    const getFieldName = (element) => {
      const name = element.name || element.id || "";
      const label = element.closest("label") || document.querySelector(`label[for="${element.id}"]`);
      if (label) {
        return label.textContent?.trim() || name;
      }
      const fieldWrapper = element.closest('[class*="Field"]');
      if (fieldWrapper) {
        const labelEl = fieldWrapper.querySelector('label, [class*="Label"]');
        if (labelEl) {
          return labelEl.textContent?.trim() || name;
        }
      }
      return name || "unknown field";
    };
    const handleInput = (event) => {
      const target = event.target;
      if (!["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      const isInContentManager = target.closest('[class*="ContentLayout"]') || target.closest("main");
      if (!isInContentManager) return;
      const now = Date.now();
      if (now - lastTypingEmit < TYPING_THROTTLE) return;
      lastTypingEmit = now;
      const fieldName = getFieldName(target);
      if (socket.connected) {
        socket.emit("presence:typing", { uid, documentId, fieldName });
        console.log(`[${index$1.PLUGIN_ID}] Typing in field: ${fieldName}`);
      }
    };
    if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
      document.addEventListener("input", handleInput, true);
    }
    socket.on("connect", () => {
      console.log(`[${index$1.PLUGIN_ID}] Presence socket connected`);
      setPresenceState((prev) => ({ ...prev, status: "connected", error: null }));
      socket.emit("presence:join", { uid, documentId }, (response) => {
        if (response?.success) {
          setPresenceState((prev) => ({
            ...prev,
            editors: (response.editors || []).map((e) => ({
              ...e,
              isCurrentUser: e.socketId === socket.id
            }))
          }));
        }
      });
    });
    socket.on("disconnect", () => {
      setPresenceState((prev) => ({ ...prev, status: "disconnected" }));
    });
    socket.on("connect_error", (err) => {
      console.warn(`[${index$1.PLUGIN_ID}] Presence socket error:`, err.message);
      setPresenceState((prev) => ({ ...prev, status: "error", error: err.message }));
    });
    socket.on("presence:update", (data) => {
      if (data.uid === uid && data.documentId === documentId) {
        setPresenceState((prev) => ({
          ...prev,
          editors: (data.editors || []).map((e) => ({
            ...e,
            isCurrentUser: e.socketId === socket.id
          }))
        }));
      }
    });
    socket.on("presence:typing", (data) => {
      if (data.uid === uid && data.documentId === documentId) {
        setPresenceState((prev) => {
          const newTyping = [...prev.typingUsers.filter((t2) => t2.user?.id !== data.user?.id)];
          newTyping.push({ user: data.user, fieldName: data.fieldName, timestamp: Date.now() });
          return { ...prev, typingUsers: newTyping };
        });
        setTimeout(() => {
          setPresenceState((prev) => ({
            ...prev,
            typingUsers: prev.typingUsers.filter((t2) => t2.user?.id !== data.user?.id)
          }));
        }, 3e3);
      }
    });
    const heartbeat = setInterval(() => {
      if (socket.connected) {
        socket.emit("presence:heartbeat");
      }
    }, 3e4);
    return () => {
      clearInterval(heartbeat);
      if (typeof document !== "undefined" && typeof document.removeEventListener === "function") {
        document.removeEventListener("input", handleInput, true);
      }
      if (socket.connected) {
        socket.emit("presence:leave", { uid, documentId });
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionData, uid, documentId]);
  const { status, editors, typingUsers, error } = presenceState;
  const otherEditors = React.useMemo(() => {
    return editors.filter((e) => !e.isCurrentUser);
  }, [editors]);
  const getUserTypingInfo = React.useCallback((userId) => {
    const typing = typingUsers.find((t2) => t2.user?.id === userId);
    return typing || null;
  }, [typingUsers]);
  React.useCallback((userId) => {
    return typingUsers.some((t2) => t2.user?.id === userId);
  }, [typingUsers]);
  const statusLabel = React.useMemo(() => {
    switch (status) {
      case "connected":
        return t("presence.live", "Live");
      case "connecting":
        return t("presence.connecting", "Connecting...");
      case "requesting":
        return t("presence.requesting", "Authenticating...");
      case "initializing":
        return t("presence.initializing", "Initializing...");
      case "error":
        return t("presence.error", "Connection Error");
      case "disconnected":
        return t("presence.disconnected", "Disconnected");
      default:
        return t("presence.offline", "Offline");
    }
  }, [status, t]);
  const isConnected = status === "connected";
  console.log(`[${index$1.PLUGIN_ID}] LivePresencePanel render:`, { uid, documentId, status, editors: otherEditors.length });
  return {
    title: t("presence.title", "Live Presence"),
    content: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "column", gap: 4, alignItems: "stretch", style: { width: "100%" }, children: [
      /* @__PURE__ */ jsxRuntime.jsxs(StatusCard, { $status: status, children: [
        /* @__PURE__ */ jsxRuntime.jsx(StatusDot, { $status: status }),
        /* @__PURE__ */ jsxRuntime.jsxs(StatusText, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(StatusLabel, { $status: status, children: statusLabel }),
          /* @__PURE__ */ jsxRuntime.jsx(StatusSubtext, { children: isConnected ? t("presence.realtimeActive", "Real-time sync active") : error || t("presence.establishing", "Establishing connection...") })
        ] })
      ] }),
      isConnected && otherEditors.length > 0 && /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntime.jsx(SectionTitle, { children: t("presence.activeEditors", "Also Editing ({count})", { count: otherEditors.length }) }),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Flex, { direction: "column", gap: 2, alignItems: "stretch", children: otherEditors.map((editor, idx) => {
          const user = editor.user || {};
          const typingInfo = getUserTypingInfo(user.id);
          return /* @__PURE__ */ jsxRuntime.jsxs(EditorItem, { children: [
            /* @__PURE__ */ jsxRuntime.jsx(EditorAvatar, { $color: EDITOR_COLORS[idx % EDITOR_COLORS.length], children: getEditorInitials(user) }),
            /* @__PURE__ */ jsxRuntime.jsxs(EditorInfo, { children: [
              /* @__PURE__ */ jsxRuntime.jsx(EditorName, { children: getEditorName(user) }),
              typingInfo?.fieldName ? /* @__PURE__ */ jsxRuntime.jsxs(EditorEmail, { children: [
                "Typing in: ",
                typingInfo.fieldName
              ] }) : user.email && user.firstname ? /* @__PURE__ */ jsxRuntime.jsx(EditorEmail, { children: user.email }) : null
            ] }),
            typingInfo ? /* @__PURE__ */ jsxRuntime.jsx(TypingBadge, { children: t("presence.typing", "Typing...") }) : /* @__PURE__ */ jsxRuntime.jsx(EditingBadge, { children: t("presence.editing", "Editing") })
          ] }, editor.socketId || idx);
        }) })
      ] }),
      isConnected && otherEditors.length === 0 && /* @__PURE__ */ jsxRuntime.jsx(EmptyState, { children: /* @__PURE__ */ jsxRuntime.jsx(EmptyText, { children: t("presence.workingAlone", "You are the only editor") }) })
    ] })
  };
};
exports.default = LivePresencePanel;
