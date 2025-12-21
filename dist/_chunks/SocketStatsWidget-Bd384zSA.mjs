import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useCallback, useEffect } from "react";
import { T as Typography, F as Flex, B as Box } from "./index-De9lpNoT.mjs";
import { c as ForwardRef$6, d as ForwardRef$14, e as ForwardRef$1g, b as ForwardRef$2o } from "./index-Dmsc-WDK.mjs";
import { useFetchClient } from "@strapi/strapi/admin";
import styled from "styled-components";
const WidgetContainer = styled(Box)`
  padding: 0;
  position: relative;
`;
const HeaderContainer = styled(Flex)`
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spaces[2]};
  padding-bottom: ${({ theme }) => theme.spaces[2]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};
`;
const LiveIndicator = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spaces[1]};
  padding: ${({ theme }) => `${theme.spaces[1]} ${theme.spaces[2]}`};
  background: ${({ theme, $isLive }) => $isLive ? theme.colors.success100 : theme.colors.danger100};
  border-radius: ${({ theme }) => theme.borderRadius};
  font-size: ${({ theme }) => theme.fontSizes[1]};
  
  &::before {
    content: '';
    display: block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: ${({ theme, $isLive }) => $isLive ? theme.colors.success600 : theme.colors.danger600};
  }
`;
const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.spaces[2]};
  margin-bottom: ${({ theme }) => theme.spaces[3]};
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;
const StatCard = styled.div`
  background: ${({ theme, $color }) => {
  const colorMap = {
    primary: `linear-gradient(135deg, ${theme.colors.primary100} 0%, ${theme.colors.primary200} 100%)`,
    success: `linear-gradient(135deg, ${theme.colors.success100} 0%, ${theme.colors.success200} 100%)`,
    warning: `linear-gradient(135deg, ${theme.colors.warning100} 0%, ${theme.colors.warning200} 100%)`,
    secondary: `linear-gradient(135deg, ${theme.colors.secondary100} 0%, ${theme.colors.secondary200} 100%)`
  };
  return colorMap[$color] || theme.colors.neutral100;
}};
  border: 1px solid ${({ theme, $color }) => {
  const colorMap = {
    primary: theme.colors.primary300,
    success: theme.colors.success300,
    warning: theme.colors.warning300,
    secondary: theme.colors.secondary300
  };
  return colorMap[$color] || theme.colors.neutral200;
}};
  border-radius: ${({ theme }) => theme.borderRadius};
  padding: ${({ theme }) => theme.spaces[3]};
  transition: box-shadow 0.2s ease;
  
  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
`;
const StatContent = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spaces[2]};
`;
const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  min-width: 36px;
  background: ${({ theme, $color }) => {
  const colorMap = {
    primary: theme.colors.primary600,
    success: theme.colors.success600,
    warning: theme.colors.warning600,
    secondary: theme.colors.secondary600
  };
  return colorMap[$color] || theme.colors.neutral600;
}};
  border-radius: ${({ theme }) => theme.borderRadius};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;
const StatInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
`;
const FooterLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spaces[1]};
  padding: ${({ theme }) => `${theme.spaces[1]} ${theme.spaces[2]}`};
  background: ${({ theme }) => theme.colors.primary100};
  color: ${({ theme }) => theme.colors.primary700};
  border: 1px solid ${({ theme }) => theme.colors.primary300};
  border-radius: ${({ theme }) => theme.borderRadius};
  text-decoration: none;
  font-weight: 600;
  font-size: ${({ theme }) => theme.fontSizes[1]};
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors.primary600};
    color: ${({ theme }) => theme.colors.neutral0};
    border-color: ${({ theme }) => theme.colors.primary600};
  }
  
  &::after {
    content: '→';
  }
`;
const LoadingContainer = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spaces[4]};
  min-height: 120px;
`;
const ErrorContainer = styled(Box)`
  padding: ${({ theme }) => theme.spaces[3]};
  background: ${({ theme }) => theme.colors.danger100};
  border: 1px solid ${({ theme }) => theme.colors.danger300};
  border-radius: ${({ theme }) => theme.borderRadius};
`;
const SocketStatsWidget = () => {
  const { get } = useFetchClient();
  const [stats, setStats] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetchStats = useCallback(async () => {
    try {
      const { data } = await get("/io/monitoring/stats");
      setStats(data);
      setIsLive(true);
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch Socket.IO stats:", err);
      setError(err.message);
      setIsLive(false);
      setLoading(false);
    }
  }, [get]);
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 6e4);
    return () => clearInterval(interval);
  }, [fetchStats]);
  if (loading) {
    return /* @__PURE__ */ jsx(LoadingContainer, { children: /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral600", children: "Loading stats..." }) });
  }
  if (error) {
    return /* @__PURE__ */ jsx(ErrorContainer, { children: /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 1, children: [
      /* @__PURE__ */ jsx(Typography, { variant: "pi", fontWeight: "bold", textColor: "danger700", children: "Failed to load stats" }),
      /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "danger600", style: { fontSize: "12px" }, children: error })
    ] }) });
  }
  if (!stats) {
    return /* @__PURE__ */ jsx(LoadingContainer, { children: /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral600", children: "No data available" }) });
  }
  const connectionStats = stats.connections || {};
  const eventStats = stats.events || {};
  return /* @__PURE__ */ jsxs(WidgetContainer, { children: [
    /* @__PURE__ */ jsxs(HeaderContainer, { children: [
      /* @__PURE__ */ jsx(Typography, { variant: "omega", fontWeight: "bold", textColor: "neutral800", children: "Socket.IO Statistics" }),
      /* @__PURE__ */ jsx(LiveIndicator, { $isLive: isLive, children: /* @__PURE__ */ jsx(Typography, { variant: "pi", fontWeight: "bold", textColor: isLive ? "success700" : "danger700", children: isLive ? "Live" : "Offline" }) })
    ] }),
    /* @__PURE__ */ jsxs(StatsGrid, { children: [
      /* @__PURE__ */ jsx(StatCard, { $color: "primary", children: /* @__PURE__ */ jsxs(StatContent, { children: [
        /* @__PURE__ */ jsx(IconWrapper, { $color: "primary", children: /* @__PURE__ */ jsx(ForwardRef$6, { width: "18px", height: "18px", fill: "#ffffff" }) }),
        /* @__PURE__ */ jsxs(StatInfo, { children: [
          /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral700", style: { fontSize: "12px" }, children: "Active Connections" }),
          /* @__PURE__ */ jsx(Typography, { variant: "delta", fontWeight: "bold", textColor: "neutral900", children: connectionStats.connected || 0 })
        ] })
      ] }) }),
      /* @__PURE__ */ jsx(StatCard, { $color: "success", children: /* @__PURE__ */ jsxs(StatContent, { children: [
        /* @__PURE__ */ jsx(IconWrapper, { $color: "success", children: /* @__PURE__ */ jsx(ForwardRef$14, { width: "18px", height: "18px", fill: "#ffffff" }) }),
        /* @__PURE__ */ jsxs(StatInfo, { children: [
          /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral700", style: { fontSize: "12px" }, children: "Active Rooms" }),
          /* @__PURE__ */ jsx(Typography, { variant: "delta", fontWeight: "bold", textColor: "neutral900", children: connectionStats.rooms?.length || 0 })
        ] })
      ] }) }),
      /* @__PURE__ */ jsx(StatCard, { $color: "warning", children: /* @__PURE__ */ jsxs(StatContent, { children: [
        /* @__PURE__ */ jsx(IconWrapper, { $color: "warning", children: /* @__PURE__ */ jsx(ForwardRef$1g, { width: "18px", height: "18px", fill: "#ffffff" }) }),
        /* @__PURE__ */ jsxs(StatInfo, { children: [
          /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral700", style: { fontSize: "12px" }, children: "Events/sec" }),
          /* @__PURE__ */ jsx(Typography, { variant: "delta", fontWeight: "bold", textColor: "neutral900", children: eventStats.eventsPerSecond || 0 })
        ] })
      ] }) }),
      /* @__PURE__ */ jsx(StatCard, { $color: "secondary", children: /* @__PURE__ */ jsxs(StatContent, { children: [
        /* @__PURE__ */ jsx(IconWrapper, { $color: "secondary", children: /* @__PURE__ */ jsx(ForwardRef$2o, { width: "18px", height: "18px", fill: "#ffffff" }) }),
        /* @__PURE__ */ jsxs(StatInfo, { children: [
          /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral700", style: { fontSize: "12px" }, children: "Total Events" }),
          /* @__PURE__ */ jsx(Typography, { variant: "delta", fontWeight: "bold", textColor: "neutral900", children: (eventStats.totalEvents || 0).toLocaleString() })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx(Flex, { justifyContent: "flex-end", children: /* @__PURE__ */ jsx(FooterLink, { href: "/admin/settings/io/monitoring", children: "View Monitoring" }) })
  ] });
};
export {
  SocketStatsWidget
};
