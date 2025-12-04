import { useEffect, useState, useCallback } from 'react';
import { Box, Flex, Typography } from '@strapi/design-system';
import { User, Message, Lightning, Check } from '@strapi/icons';
import { useFetchClient } from '@strapi/strapi/admin';
import styled from 'styled-components';

// Styled Components
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
  background: ${({ theme, $isLive }) => 
    $isLive ? theme.colors.success100 : theme.colors.danger100
  };
  border-radius: ${({ theme }) => theme.borderRadius};
  font-size: ${({ theme }) => theme.fontSizes[1]};
  
  &::before {
    content: '';
    display: block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: ${({ theme, $isLive }) => 
      $isLive ? theme.colors.success600 : theme.colors.danger600
    };
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
      secondary: `linear-gradient(135deg, ${theme.colors.secondary100} 0%, ${theme.colors.secondary200} 100%)`,
    };
    return colorMap[$color] || theme.colors.neutral100;
  }};
  border: 1px solid ${({ theme, $color }) => {
    const colorMap = {
      primary: theme.colors.primary300,
      success: theme.colors.success300,
      warning: theme.colors.warning300,
      secondary: theme.colors.secondary300,
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
      secondary: theme.colors.secondary600,
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

/**
 * Socket.IO Stats Widget - Compact dashboard widget with mobile optimization
 * Shows real-time Socket.IO statistics in a clean, minimal design
 */
export const SocketStatsWidget = () => {
  const { get } = useFetchClient();
  const [stats, setStats] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await get('/io/monitoring/stats');
      setStats(data);
      setIsLive(true);
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch Socket.IO stats:', err);
      setError(err.message);
      setIsLive(false);
      setLoading(false);
    }
  }, [get]);

  useEffect(() => {
    fetchStats();

    // Poll every 60 seconds (1 minute) to reduce database load
    const interval = setInterval(fetchStats, 60000);

    return () => clearInterval(interval);
  }, [fetchStats]);

  if (loading) {
    return (
      <LoadingContainer>
        <Typography variant="pi" textColor="neutral600">Loading stats...</Typography>
      </LoadingContainer>
    );
  }

  if (error) {
    return (
      <ErrorContainer>
        <Flex direction="column" gap={1}>
          <Typography variant="pi" fontWeight="bold" textColor="danger700">
            Failed to load stats
          </Typography>
          <Typography variant="pi" textColor="danger600" style={{ fontSize: '12px' }}>
            {error}
          </Typography>
        </Flex>
      </ErrorContainer>
    );
  }

  if (!stats) {
    return (
      <LoadingContainer>
        <Typography variant="pi" textColor="neutral600">No data available</Typography>
      </LoadingContainer>
    );
  }

  const connectionStats = stats.connections || {};
  const eventStats = stats.events || {};

  return (
    <WidgetContainer>
      {/* Header with Live Status */}
      <HeaderContainer>
        <Typography variant="omega" fontWeight="bold" textColor="neutral800">
          Socket.IO Statistics
            </Typography>
        <LiveIndicator $isLive={isLive}>
          <Typography variant="pi" fontWeight="bold" textColor={isLive ? 'success700' : 'danger700'}>
              {isLive ? 'Live' : 'Offline'}
            </Typography>
        </LiveIndicator>
      </HeaderContainer>

        {/* Stats Grid */}
      <StatsGrid>
          {/* Active Connections */}
        <StatCard $color="primary">
          <StatContent>
            <IconWrapper $color="primary">
              <User width="18px" height="18px" fill="#ffffff" />
            </IconWrapper>
            <StatInfo>
              <Typography variant="pi" textColor="neutral700" style={{ fontSize: '12px' }}>
                Active Connections
              </Typography>
              <Typography variant="delta" fontWeight="bold" textColor="neutral900">
              {connectionStats.connected || 0}
            </Typography>
            </StatInfo>
          </StatContent>
        </StatCard>

          {/* Active Rooms */}
        <StatCard $color="success">
          <StatContent>
            <IconWrapper $color="success">
              <Message width="18px" height="18px" fill="#ffffff" />
            </IconWrapper>
            <StatInfo>
              <Typography variant="pi" textColor="neutral700" style={{ fontSize: '12px' }}>
                Active Rooms
              </Typography>
              <Typography variant="delta" fontWeight="bold" textColor="neutral900">
              {connectionStats.rooms?.length || 0}
            </Typography>
            </StatInfo>
          </StatContent>
        </StatCard>

          {/* Events/sec */}
        <StatCard $color="warning">
          <StatContent>
            <IconWrapper $color="warning">
              <Lightning width="18px" height="18px" fill="#ffffff" />
            </IconWrapper>
            <StatInfo>
              <Typography variant="pi" textColor="neutral700" style={{ fontSize: '12px' }}>
                Events/sec
              </Typography>
              <Typography variant="delta" fontWeight="bold" textColor="neutral900">
              {eventStats.eventsPerSecond || 0}
            </Typography>
            </StatInfo>
          </StatContent>
        </StatCard>

        {/* Total Events */}
        <StatCard $color="secondary">
          <StatContent>
            <IconWrapper $color="secondary">
              <Check width="18px" height="18px" fill="#ffffff" />
            </IconWrapper>
            <StatInfo>
              <Typography variant="pi" textColor="neutral700" style={{ fontSize: '12px' }}>
            Total Events
          </Typography>
              <Typography variant="delta" fontWeight="bold" textColor="neutral900">
            {(eventStats.totalEvents || 0).toLocaleString()}
          </Typography>
            </StatInfo>
          </StatContent>
        </StatCard>
      </StatsGrid>

      {/* Footer Link */}
        <Flex justifyContent="flex-end">
        <FooterLink href="/admin/settings/io/monitoring">
          View Monitoring
        </FooterLink>
      </Flex>
    </WidgetContainer>
  );
};
