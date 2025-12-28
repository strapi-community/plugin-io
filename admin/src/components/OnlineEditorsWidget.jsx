/**
 * Who's Online Widget - Shows online users and what they're editing
 * Dashboard widget for real-time team collaboration awareness
 */
import { useEffect, useState, useCallback } from 'react';
import { Box, Flex, Typography, Badge } from '@strapi/design-system';
import { User, Pencil, Clock } from '@strapi/icons';
import { useFetchClient } from '@strapi/strapi/admin';
import styled, { keyframes } from 'styled-components';

import { PLUGIN_ID } from '../pluginId';

/* ============================================
   STYLED COMPONENTS
   ============================================ */

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
  background: ${({ theme }) => theme.colors.success500};
  margin-right: ${({ theme }) => theme.spaces[2]};
  animation: ${pulse} 2s ease-in-out infinite;
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
  'linear-gradient(135deg, #4945ff 0%, #7b79ff 100%)',
  'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
  'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
  'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
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

const EditingBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.success700};
  background: ${({ theme }) => theme.colors.success100};
  padding: 2px 8px;
  border-radius: 10px;
  margin-top: ${({ theme }) => theme.spaces[1]};
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
  text-align: center;
  padding: ${({ theme }) => theme.spaces[6]};
  color: ${({ theme }) => theme.colors.neutral500};
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

/* ============================================
   HELPER FUNCTIONS
   ============================================ */

/**
 * Gets initials from user object
 */
const getInitials = (user) => {
  const first = (user.firstname?.[0] || user.username?.[0] || user.email?.[0] || '?').toUpperCase();
  const last = (user.lastname?.[0] || '').toUpperCase();
  return `${first}${last}`.trim() || '?';
};

/**
 * Gets display name from user object
 */
const getDisplayName = (user) => {
  if (user.firstname) {
    return `${user.firstname} ${user.lastname || ''}`.trim();
  }
  return user.username || user.email || 'Unknown';
};

/**
 * Formats duration in seconds to human readable
 */
const formatDuration = (seconds) => {
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
};

/* ============================================
   MAIN COMPONENT
   ============================================ */

/**
 * Who's Online Widget Component
 * Shows all online users in the Strapi admin and what they're editing
 */
export const OnlineEditorsWidget = () => {
  const { get } = useFetchClient();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetches online users from the API
   */
  const fetchOnlineUsers = useCallback(async () => {
    try {
      const response = await get(`/${PLUGIN_ID}/online-users`);
      setData(response.data);
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('[plugin-io] Failed to fetch online users:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [get]);

  useEffect(() => {
    fetchOnlineUsers();

    // Poll every 10 seconds for real-time updates
    const interval = setInterval(fetchOnlineUsers, 10000);

    return () => clearInterval(interval);
  }, [fetchOnlineUsers]);

  if (loading) {
    return (
      <LoadingContainer>
        <Typography variant="pi" textColor="neutral600">Loading...</Typography>
      </LoadingContainer>
    );
  }

  if (error) {
    return (
      <EmptyState>
        <Typography variant="pi" textColor="danger600">
          Failed to load: {error}
        </Typography>
      </EmptyState>
    );
  }

  const users = data?.users || [];
  const counts = data?.counts || { total: 0, editing: 0 };

  return (
    <WidgetContainer>
      {/* Header */}
      <HeaderContainer>
        <Flex alignItems="center" gap={2}>
          <LiveDot />
          <Typography variant="omega" fontWeight="bold" textColor="neutral800">
            Who's Online
          </Typography>
        </Flex>
        <Flex gap={2}>
          <CountBadge $active={counts.editing > 0} title="Users editing">
            <Pencil width="12" height="12" style={{ marginRight: 4 }} />
            {counts.editing}
          </CountBadge>
          <CountBadge title="Total online">
            <User width="12" height="12" style={{ marginRight: 4 }} />
            {counts.total}
          </CountBadge>
        </Flex>
      </HeaderContainer>

      {/* User List */}
      {users.length === 0 ? (
        <EmptyState>
          <User width="32" height="32" style={{ opacity: 0.3, marginBottom: 8 }} />
          <Typography variant="pi" textColor="neutral500">
            No one else is online
          </Typography>
        </EmptyState>
      ) : (
        <UserList>
          {users.map((userData, index) => (
            <UserCard key={userData.socketId}>
              <UserAvatar $colorIndex={index}>
                {getInitials(userData.user)}
              </UserAvatar>
              <UserInfo>
                <UserName>
                  {getDisplayName(userData.user)}
                  {userData.user.isAdmin && (
                    <Badge size="S" style={{ marginLeft: 8 }}>Admin</Badge>
                  )}
                </UserName>
                <UserMeta>
                  <Clock width="12" height="12" />
                  Online {formatDuration(userData.onlineFor)}
                </UserMeta>
                {userData.isEditing ? (
                  userData.editingEntities.map((entity, idx) => (
                    <EditingBadge key={idx}>
                      <Pencil width="10" height="10" />
                      Editing {entity.contentTypeName}
                    </EditingBadge>
                  ))
                ) : (
                  <IdleBadge>Idle</IdleBadge>
                )}
              </UserInfo>
            </UserCard>
          ))}
        </UserList>
      )}

      {/* Footer */}
      <Flex justifyContent="flex-end" marginTop={3}>
        <FooterLink href="/admin/settings/io/monitoring">
          View All Activity
        </FooterLink>
      </Flex>
    </WidgetContainer>
  );
};

export default OnlineEditorsWidget;
