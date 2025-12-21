import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useFetchClient, useNotification } from "@strapi/strapi/admin";
import styled, { css, keyframes } from "styled-components";
import { B as Box, L as Loader, F as Flex, b as Field, c as TextInput, d as Badge, T as Typography } from "./index-De9lpNoT.mjs";
import { u as useIntl } from "./index-CEh8vkxY.mjs";
import { P as PLUGIN_ID } from "./index-Dmsc-WDK.mjs";
const UsersIcon = () => /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" }) });
const BoltIcon = () => /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" }) });
const ChartBarIcon = () => /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" }) });
const HomeIcon = () => /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" }) });
const ArrowPathIcon = () => /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" }) });
const TrashIcon = () => /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" }) });
const PlayIcon = () => /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" }) });
const SignalIcon = () => /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M9.348 14.652a3.75 3.75 0 0 1 0-5.304m5.304 0a3.75 3.75 0 0 1 0 5.304m-7.425 2.121a6.75 6.75 0 0 1 0-9.546m9.546 0a6.75 6.75 0 0 1 0 9.546M5.106 18.894c-3.808-3.807-3.808-9.98 0-13.788m13.788 0c3.808 3.807 3.808 9.98 0 13.788M12 12h.008v.008H12V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" }) });
const customColors = {
  primary: { 100: "#E0F2FE", 500: "#0EA5E9", 600: "#0284C7" },
  secondary: { 100: "#EDE9FE", 500: "#A855F7", 600: "#9333EA" },
  success: { 100: "#DCFCE7", 500: "#22C55E", 600: "#16A34A" },
  warning: { 100: "#FEF3C7", 500: "#F59E0B", 600: "#D97706" }
};
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;
const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;
const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
`;
const Container = styled(Box)`
  ${css`animation: ${fadeIn} 0.6s;`}
  min-height: 100vh;
  max-width: 1440px;
  margin: 0 auto;
  padding: 24px 16px 0;
  
  @media (min-width: 768px) {
    padding: 32px 24px 0;
  }
`;
const Header = styled(Box)`
  background: linear-gradient(135deg, ${customColors.primary[600]} 0%, ${customColors.secondary[600]} 100%);
  border-radius: 12px;
  padding: 20px 16px;
  margin-bottom: 20px;
  position: relative;
  overflow: hidden;
  box-shadow: ${({ theme }) => theme.shadows.tableShadow};
  
  @media (min-width: 768px) {
    border-radius: 16px;
    padding: 32px 48px;
    margin-bottom: 32px;
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 200%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
    ${css`animation: ${shimmer} 3s infinite;`}
  }
`;
const Title = styled(Typography)`
  color: #fff;
  font-size: 1.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
  
  @media (min-width: 768px) {
    font-size: 2.25rem;
    gap: 16px;
    margin-bottom: 8px;
  }
  
  svg {
    width: 24px;
    height: 24px;
    ${css`animation: ${float} 3s ease-in-out infinite;`}
    
    @media (min-width: 768px) {
      width: 32px;
      height: 32px;
    }
  }
`;
const Subtitle = styled(Typography)`
  color: rgba(255,255,255,0.95);
  font-size: 0.875rem;
  
  @media (min-width: 768px) {
    font-size: 1rem;
  }
`;
const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 24px;
  
  @media (min-width: 640px) {
    gap: 16px;
    margin-bottom: 32px;
  }
  
  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
    margin-bottom: 40px;
  }
`;
const StatCard = styled(Box)`
  background: ${({ theme }) => theme.colors.neutral0};
  border-radius: 10px;
  padding: 16px;
  transition: all 0.2s;
  ${css`animation: ${fadeIn} 0.5s backwards;`}
  animation-delay: ${(p) => p.$delay || "0s"};
  box-shadow: ${({ theme }) => theme.shadows.filterShadow};
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  
  @media (min-width: 640px) {
    border-radius: 12px;
    padding: 20px;
  }
  
  @media (min-width: 1024px) {
    padding: 32px;
  }
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: ${({ theme }) => theme.shadows.tableShadow};
    border-color: ${(p) => p.$borderColor || customColors.primary[500]};
    
    .stat-icon {
      transform: scale(1.1);
    }
    
    .stat-value {
      transform: scale(1.05);
      color: ${(p) => p.$accentColor || customColors.primary[600]};
    }
  }
`;
const StatIcon = styled(Box)`
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${(p) => p.$bg || customColors.primary[100]};
  transition: all 0.2s;
  margin: 0 auto 12px;
  box-shadow: ${({ theme }) => theme.shadows.filterShadow};
  
  @media (min-width: 640px) {
    width: 60px;
    height: 60px;
    border-radius: 12px;
    margin-bottom: 16px;
  }
  
  @media (min-width: 1024px) {
    width: 80px;
    height: 80px;
    margin-bottom: 24px;
  }
  
  svg {
    width: 24px;
    height: 24px;
    color: ${(p) => p.$color || customColors.primary[600]};
    
    @media (min-width: 640px) {
      width: 30px;
      height: 30px;
    }
    
    @media (min-width: 1024px) {
      width: 40px;
      height: 40px;
    }
  }
`;
const StatValue = styled(Typography)`
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.neutral800};
  line-height: 1;
  margin-bottom: 6px;
  transition: all 0.2s;
  
  @media (min-width: 640px) {
    font-size: 2.5rem;
    margin-bottom: 8px;
  }
  
  @media (min-width: 1024px) {
    font-size: 3.5rem;
    margin-bottom: 12px;
  }
`;
const StatLabel = styled(Typography)`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.neutral600};
  font-weight: 500;
  
  @media (min-width: 640px) {
    font-size: 0.875rem;
  }
  
  @media (min-width: 1024px) {
    font-size: 1rem;
  }
`;
const Card = styled(Box)`
  background: ${({ theme }) => theme.colors.neutral0};
  border-radius: 10px;
  padding: 16px;
  box-shadow: ${({ theme }) => theme.shadows.filterShadow};
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  margin-bottom: 16px;
  transition: all 0.2s;
  
  @media (min-width: 640px) {
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;
  }
  
  @media (min-width: 1024px) {
    padding: 28px;
    margin-bottom: 28px;
    box-shadow: ${({ theme }) => theme.shadows.tableShadow};
  }
  
  &:hover {
    box-shadow: ${({ theme }) => theme.shadows.tableShadow};
    border-color: ${customColors.primary[100]};
    
    @media (min-width: 1024px) {
      box-shadow: ${({ theme }) => theme.shadows.popupShadow};
    }
  }
`;
const CardTitle = styled(Typography)`
  font-size: 1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.neutral800};
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  
  @media (min-width: 640px) {
    font-size: 1.125rem;
    margin-bottom: 16px;
    gap: 10px;
  }
  
  @media (min-width: 1024px) {
    font-size: 1.25rem;
    margin-bottom: 20px;
    gap: 12px;
  }
  
  svg {
    width: 20px;
    height: 20px;
    color: ${customColors.primary[600]};
    
    @media (min-width: 1024px) {
      width: 24px;
      height: 24px;
    }
  }
`;
const ClientItem = styled(Box)`
  background: ${({ theme }) => theme.colors.neutral100};
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  transition: all 0.15s;
  
  @media (min-width: 640px) {
    border-radius: 10px;
    padding: 16px 20px;
    margin-bottom: 12px;
  }
  
  &:hover {
    background: ${({ theme }) => theme.colors.neutral150};
    border-color: ${customColors.primary[100]};
  }
`;
const EventItem = styled(Box)`
  background: ${({ theme }) => theme.colors.neutral100};
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  transition: all 0.15s;
  
  @media (min-width: 640px) {
    border-radius: 10px;
    padding: 14px 18px;
    margin-bottom: 10px;
  }
  
  &:hover {
    background: ${({ theme }) => theme.colors.neutral150};
    border-color: ${customColors.success[500]};
  }
`;
const EmptyState = styled(Box)`
  text-align: center;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  
  @media (min-width: 640px) {
    padding: 36px 24px;
  }
  
  @media (min-width: 1024px) {
    padding: 48px 24px;
  }
  
  svg {
    width: 32px;
    height: 32px;
    color: ${({ theme }) => theme.colors.neutral400};
    margin-bottom: 12px;
    
    @media (min-width: 1024px) {
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
    }
  }
`;
const ActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  border: none;
  white-space: nowrap;
  
  @media (min-width: 640px) {
    gap: 8px;
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 14px;
  }
  
  @media (min-width: 1024px) {
    padding: 10px 20px;
  }
  
  svg {
    width: 16px;
    height: 16px;
    
    @media (min-width: 1024px) {
      width: 18px;
      height: 18px;
    }
  }
  
  &.primary {
    background: ${({ theme }) => theme.colors.primary600};
    color: ${({ theme }) => theme.colors.neutral0};
    box-shadow: 0 2px 8px rgba(14,165,233,0.3);
    
    @media (min-width: 1024px) {
      box-shadow: 0 4px 12px rgba(14,165,233,0.3);
    }
    
    &:hover {
      transform: translateY(-2px);
      background: ${({ theme }) => theme.colors.primary700};
      box-shadow: 0 4px 12px rgba(14,165,233,0.4);
      
      @media (min-width: 1024px) {
        box-shadow: 0 6px 16px rgba(14,165,233,0.4);
      }
    }
  }
  
  &.secondary {
    background: ${({ theme }) => theme.colors.neutral150};
    color: ${({ theme }) => theme.colors.neutral700};
    border: 1px solid ${({ theme }) => theme.colors.neutral200};
    
    &:hover {
      background: ${({ theme }) => theme.colors.neutral200};
    }
  }
  
  &.danger {
    background: ${({ theme }) => theme.colors.danger100};
    color: ${({ theme }) => theme.colors.danger700};
    border: 1px solid ${({ theme }) => theme.colors.danger200};
    
    &:hover {
      background: ${({ theme }) => theme.colors.danger200};
    }
  }
`;
const ResponsiveGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  
  @media (min-width: 1024px) {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
  }
`;
const ResponsiveBox = styled(Box)`
  min-width: 100%;
  
  @media (min-width: 1024px) {
    min-width: 400px;
  }
`;
const StyledSelect = styled.select`
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  font-size: 13px;
  cursor: pointer;
  background: ${({ theme }) => theme.colors.neutral0};
  color: ${({ theme }) => theme.colors.neutral800};
  transition: all 0.15s;
  
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary600};
  }
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary600};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary100};
  }
  
  option {
    background: ${({ theme }) => theme.colors.neutral0};
    color: ${({ theme }) => theme.colors.neutral800};
  }
`;
const MonitoringPage = () => {
  const { get, post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const { formatMessage } = useIntl();
  const t = (id, def) => formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage: def });
  const [stats, setStats] = useState(null);
  const [eventLog, setEventLog] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [testEventName, setTestEventName] = useState("test");
  const [testEventData, setTestEventData] = useState("{}");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 6e4);
    return () => clearInterval(interval);
  }, []);
  const fetchStats = async () => {
    try {
      const [s, l] = await Promise.all([
        get(`/${PLUGIN_ID}/stats`),
        get(`/${PLUGIN_ID}/event-log?limit=50`)
      ]);
      if (s.data?.data) setStats(s.data.data);
      if (l.data?.data) setEventLog(l.data.data);
      setIsLoading(false);
    } catch (e) {
      setIsLoading(false);
    }
  };
  const handleSendTestEvent = async () => {
    try {
      const data = JSON.parse(testEventData);
      await post(`/${PLUGIN_ID}/test-event`, { eventName: testEventName, data });
      toggleNotification({ type: "success", message: "Test event sent!" });
      fetchStats();
    } catch {
      toggleNotification({ type: "warning", message: "Invalid JSON" });
    }
  };
  const handleResetStats = async () => {
    try {
      await post(`/${PLUGIN_ID}/reset-stats`);
      toggleNotification({ type: "success", message: "Stats reset!" });
      fetchStats();
    } catch {
      toggleNotification({ type: "danger", message: "Error" });
    }
  };
  const filteredEvents = eventLog.filter((event) => {
    if (eventTypeFilter !== "all" && event.type !== eventTypeFilter) return false;
    if (searchTerm && !JSON.stringify(event).toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });
  const eventTypes = ["all", ...new Set(eventLog.map((e) => e.type))];
  if (isLoading) {
    return /* @__PURE__ */ jsx(Container, { children: /* @__PURE__ */ jsx(Box, { padding: 8, style: { textAlign: "center" }, children: /* @__PURE__ */ jsx(Loader, { children: "Loading..." }) }) });
  }
  return /* @__PURE__ */ jsxs(Container, { children: [
    /* @__PURE__ */ jsx(Header, { children: /* @__PURE__ */ jsxs(
      Flex,
      {
        direction: { base: "column", tablet: "row" },
        justifyContent: "space-between",
        alignItems: { base: "flex-start", tablet: "center" },
        gap: 3,
        style: { position: "relative", zIndex: 1 },
        children: [
          /* @__PURE__ */ jsxs(Box, { children: [
            /* @__PURE__ */ jsxs(Title, { children: [
              /* @__PURE__ */ jsx(SignalIcon, {}),
              t("monitoring.title", "Monitoring & Logging")
            ] }),
            /* @__PURE__ */ jsx(Subtitle, { children: t("monitoring.description", "Real-time connection and event statistics") })
          ] }),
          /* @__PURE__ */ jsxs(Flex, { gap: 2, children: [
            /* @__PURE__ */ jsxs(ActionButton, { className: "secondary", onClick: fetchStats, children: [
              /* @__PURE__ */ jsx(ArrowPathIcon, {}),
              /* @__PURE__ */ jsx("span", { style: { display: "none" }, children: "Refresh" }),
              /* @__PURE__ */ jsx("span", { style: { display: "inline" }, children: "↻" })
            ] }),
            /* @__PURE__ */ jsxs(ActionButton, { className: "danger", onClick: handleResetStats, children: [
              /* @__PURE__ */ jsx(TrashIcon, {}),
              /* @__PURE__ */ jsx("span", { style: { display: "none" }, children: "Reset" }),
              /* @__PURE__ */ jsx("span", { style: { display: "inline" }, children: "✕" })
            ] })
          ] })
        ]
      }
    ) }),
    /* @__PURE__ */ jsxs(StatsGrid, { children: [
      /* @__PURE__ */ jsxs(StatCard, { $delay: "0.1s", $borderColor: customColors.primary[500], $accentColor: customColors.primary[600], children: [
        /* @__PURE__ */ jsx(StatIcon, { className: "stat-icon", $bg: customColors.primary[100], $color: customColors.primary[600], children: /* @__PURE__ */ jsx(UsersIcon, {}) }),
        /* @__PURE__ */ jsx(StatValue, { className: "stat-value", children: stats?.connections?.connected || 0 }),
        /* @__PURE__ */ jsx(StatLabel, { children: t("monitoring.connectedClients", "Connected Clients") })
      ] }),
      /* @__PURE__ */ jsxs(StatCard, { $delay: "0.2s", $borderColor: customColors.success[500], $accentColor: customColors.success[600], children: [
        /* @__PURE__ */ jsx(StatIcon, { className: "stat-icon", $bg: customColors.success[100], $color: customColors.success[600], children: /* @__PURE__ */ jsx(BoltIcon, {}) }),
        /* @__PURE__ */ jsx(StatValue, { className: "stat-value", children: stats?.events?.totalEvents || 0 }),
        /* @__PURE__ */ jsx(StatLabel, { children: t("monitoring.totalEvents", "Total Events") })
      ] }),
      /* @__PURE__ */ jsxs(StatCard, { $delay: "0.3s", $borderColor: customColors.warning[500], $accentColor: customColors.warning[600], children: [
        /* @__PURE__ */ jsx(StatIcon, { className: "stat-icon", $bg: customColors.warning[100], $color: customColors.warning[600], children: /* @__PURE__ */ jsx(ChartBarIcon, {}) }),
        /* @__PURE__ */ jsx(StatValue, { className: "stat-value", children: stats?.events?.eventsPerSecond || "0.00" }),
        /* @__PURE__ */ jsx(StatLabel, { children: t("monitoring.eventsPerSecond", "Events/Second") })
      ] }),
      /* @__PURE__ */ jsxs(StatCard, { $delay: "0.4s", $borderColor: customColors.secondary[500], $accentColor: customColors.secondary[600], children: [
        /* @__PURE__ */ jsx(StatIcon, { className: "stat-icon", $bg: customColors.secondary[100], $color: customColors.secondary[600], children: /* @__PURE__ */ jsx(HomeIcon, {}) }),
        /* @__PURE__ */ jsx(StatValue, { className: "stat-value", children: stats?.connections?.rooms?.length || 0 }),
        /* @__PURE__ */ jsx(StatLabel, { children: t("monitoring.rooms", "Active Rooms") })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsxs(CardTitle, { children: [
        /* @__PURE__ */ jsx(PlayIcon, {}),
        t("monitoring.testEvent", "Send Test Event")
      ] }),
      /* @__PURE__ */ jsxs(
        Flex,
        {
          direction: { base: "column", tablet: "row" },
          gap: 3,
          alignItems: { base: "stretch", tablet: "flex-end" },
          children: [
            /* @__PURE__ */ jsx(Box, { style: { width: "100%", maxWidth: "220px" }, children: /* @__PURE__ */ jsxs(Field.Root, { children: [
              /* @__PURE__ */ jsx(Field.Label, { children: "Event Name" }),
              /* @__PURE__ */ jsx(
                TextInput,
                {
                  value: testEventName,
                  onChange: (e) => setTestEventName(e.target.value),
                  placeholder: "test"
                }
              )
            ] }) }),
            /* @__PURE__ */ jsx(Box, { style: { flex: 1 }, children: /* @__PURE__ */ jsxs(Field.Root, { children: [
              /* @__PURE__ */ jsx(Field.Label, { children: "Event Data (JSON)" }),
              /* @__PURE__ */ jsx(
                TextInput,
                {
                  value: testEventData,
                  onChange: (e) => setTestEventData(e.target.value),
                  placeholder: '{"message":"Hello"}'
                }
              )
            ] }) }),
            /* @__PURE__ */ jsxs(ActionButton, { className: "primary", onClick: handleSendTestEvent, style: { alignSelf: "flex-end" }, children: [
              /* @__PURE__ */ jsx(PlayIcon, {}),
              "Send"
            ] })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxs(ResponsiveGrid, { children: [
      /* @__PURE__ */ jsx(ResponsiveBox, { children: /* @__PURE__ */ jsxs(Card, { style: { minHeight: "280px" }, children: [
        /* @__PURE__ */ jsxs(Flex, { justifyContent: "space-between", alignItems: "center", marginBottom: 3, children: [
          /* @__PURE__ */ jsxs(CardTitle, { style: { marginBottom: 0 }, children: [
            /* @__PURE__ */ jsx(UsersIcon, {}),
            /* @__PURE__ */ jsx("span", { style: { display: "none" }, children: t("monitoring.connectedClientsList", "Connected Clients") }),
            /* @__PURE__ */ jsx("span", { style: { display: "inline" }, children: "Clients" })
          ] }),
          /* @__PURE__ */ jsxs(Badge, { active: true, children: [
            stats?.connections?.connected || 0,
            " online"
          ] })
        ] }),
        stats?.connections?.sockets?.length > 0 ? /* @__PURE__ */ jsx(Box, { style: { maxHeight: "220px", overflowY: "auto" }, children: stats.connections.sockets.map((s) => /* @__PURE__ */ jsx(ClientItem, { children: /* @__PURE__ */ jsxs(
          Flex,
          {
            direction: { base: "column", tablet: "row" },
            justifyContent: "space-between",
            alignItems: { base: "flex-start", tablet: "center" },
            gap: 2,
            children: [
              /* @__PURE__ */ jsxs(Box, { style: { flex: 1, minWidth: 0 }, children: [
                /* @__PURE__ */ jsx(Typography, { variant: "omega", fontWeight: "bold", children: s.user ? s.user.username : "Anonymous" }),
                /* @__PURE__ */ jsxs(Flex, { gap: 1, wrap: "wrap", children: [
                  /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral600", style: { fontSize: "12px" }, children: s.user?.email || s.handshake.address }),
                  /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral400", children: "•" }),
                  /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral500", style: { fontSize: "12px" }, children: s.user?.role || "public" })
                ] }),
                /* @__PURE__ */ jsx(
                  Typography,
                  {
                    variant: "pi",
                    textColor: "neutral300",
                    style: { fontFamily: "monospace", fontSize: "10px", wordBreak: "break-all" },
                    children: s.id
                  }
                )
              ] }),
              /* @__PURE__ */ jsx(Badge, { active: s.connected, children: s.connected ? "Online" : "Offline" })
            ]
          }
        ) }, s.id)) }) : /* @__PURE__ */ jsxs(EmptyState, { children: [
          /* @__PURE__ */ jsx(UsersIcon, {}),
          /* @__PURE__ */ jsx(Typography, { variant: "delta", textColor: "neutral600", children: t("monitoring.noClients", "No clients connected") })
        ] })
      ] }) }),
      /* @__PURE__ */ jsx(ResponsiveBox, { children: /* @__PURE__ */ jsxs(Card, { style: { minHeight: "280px" }, children: [
        /* @__PURE__ */ jsxs(Flex, { justifyContent: "space-between", alignItems: "center", marginBottom: 2, children: [
          /* @__PURE__ */ jsxs(CardTitle, { style: { marginBottom: 0 }, children: [
            /* @__PURE__ */ jsx(BoltIcon, {}),
            /* @__PURE__ */ jsx("span", { style: { display: "none" }, children: t("monitoring.eventLog", "Recent Events") }),
            /* @__PURE__ */ jsx("span", { style: { display: "inline" }, children: "Events" })
          ] }),
          /* @__PURE__ */ jsx(Badge, { children: filteredEvents.length })
        ] }),
        /* @__PURE__ */ jsxs(
          Flex,
          {
            direction: { base: "column", tablet: "row" },
            gap: 2,
            marginBottom: 3,
            children: [
              /* @__PURE__ */ jsx(Box, { style: { flex: 1 }, children: /* @__PURE__ */ jsx(
                TextInput,
                {
                  placeholder: t("monitoring.searchEvents", "Search events..."),
                  value: searchTerm,
                  onChange: (e) => setSearchTerm(e.target.value),
                  size: "S"
                }
              ) }),
              /* @__PURE__ */ jsx(
                StyledSelect,
                {
                  value: eventTypeFilter,
                  onChange: (e) => setEventTypeFilter(e.target.value),
                  children: eventTypes.map((type) => /* @__PURE__ */ jsx("option", { value: type, children: type === "all" ? "All Types" : type }, type))
                }
              )
            ]
          }
        ),
        filteredEvents.length > 0 ? /* @__PURE__ */ jsx(Box, { style: { maxHeight: "180px", overflowY: "auto" }, children: filteredEvents.slice().reverse().slice(0, 10).map((e, i) => /* @__PURE__ */ jsx(EventItem, { children: /* @__PURE__ */ jsx(
          Flex,
          {
            direction: { base: "column", tablet: "row" },
            justifyContent: "space-between",
            alignItems: { base: "flex-start", tablet: "center" },
            gap: 2,
            children: /* @__PURE__ */ jsxs(Box, { style: { flex: 1, minWidth: 0 }, children: [
              /* @__PURE__ */ jsxs(Flex, { gap: 2, alignItems: "center", wrap: "wrap", marginBottom: 1, children: [
                /* @__PURE__ */ jsx(Badge, { children: e.type }),
                /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral500", style: { fontSize: "11px" }, children: new Date(e.timestamp).toLocaleTimeString() })
              ] }),
              /* @__PURE__ */ jsxs(
                Typography,
                {
                  variant: "pi",
                  style: { fontFamily: "monospace", fontSize: "11px", wordBreak: "break-all" },
                  textColor: "neutral600",
                  children: [
                    JSON.stringify(e.data).substring(0, 50),
                    "..."
                  ]
                }
              )
            ] })
          }
        ) }, i)) }) : /* @__PURE__ */ jsxs(EmptyState, { children: [
          /* @__PURE__ */ jsx(BoltIcon, {}),
          /* @__PURE__ */ jsx(Typography, { variant: "delta", textColor: "neutral600", children: searchTerm || eventTypeFilter !== "all" ? t("monitoring.noMatchingEvents", "No matching events") : t("monitoring.noEvents", "No events logged") })
        ] })
      ] }) })
    ] })
  ] });
};
export {
  MonitoringPage
};
