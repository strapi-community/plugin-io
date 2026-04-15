/**
 * Who's Online Widget - Shows online users and what they're editing
 * Dashboard widget for real-time team collaboration awareness
 * Connects to Socket.IO to register presence on dashboard
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { Box, Flex, Typography, Badge } from '@strapi/design-system';
import { User, Pencil, Clock } from '@strapi/icons';
import { useFetchClient } from '@strapi/strapi/admin';
import styled, { keyframes } from 'styled-components';
import { io } from 'socket.io-client';

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
  background: ${({ theme, $connected }) => $connected ? theme.colors.success500 : theme.colors.neutral400};
  margin-right: ${({ theme }) => theme.spaces[2]};
  animation: ${({ $connected }) => $connected ? pulse : 'none'} 2s ease-in-out infinite;
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

/* ============================================
   HELPER FUNCTIONS
   ============================================ */

/**
 * Gets initials from user object
 */
const getInitials = (user) => {
  if (!user) return '?';
  const first = (user.firstname?.[0] || user.username?.[0] || user.email?.[0] || '?').toUpperCase();
  const last = (user.lastname?.[0] || '').toUpperCase();
  return `${first}${last}`.trim() || '?';
};

/**
 * Gets display name from user object
 */
const getDisplayName = (user) => {
  if (!user) return 'Unknown';
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
 * Automatically connects to Socket.IO to register presence
 */
export const OnlineEditorsWidget = () => {
  const { get, post } = useFetchClient();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  /**
   * Fetches online users from the API
   */
  const fetchOnlineUsers = useCallback(async () => {
    try {
      const response = await get(`/${PLUGIN_ID}/online-users`);
      // API returns { data: { users: [...], counts: {...} } }
      setData(response.data?.data || response.data);
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('[plugin-io] Failed to fetch online users:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [get]);

  /**
   * Connects to Socket.IO to register this user as online
   */
  useEffect(() => {
    let cancelled = false;
    let socket = null;

    const connectSocket = async () => {
      try {
        // Get session token for Socket.IO auth
        const { data: sessionData } = await post(`/${PLUGIN_ID}/presence/session`, {});
        
        if (cancelled || !sessionData?.token) return;

        const socketUrl = sessionData.wsUrl || `${window.location.protocol}//${window.location.host}`;
        socket = io(socketUrl, {
          path: sessionData.wsPath || '/socket.io',
          transports: ['websocket', 'polling'],
          auth: {
            token: sessionData.token,
            strategy: 'admin-jwt',
            isAdmin: true,
          },
          reconnection: true,
          reconnectionAttempts: 3,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          if (!cancelled) {
            setConnected(true);
            console.log(`[${PLUGIN_ID}] Dashboard presence connected`);
            // Fetch users after connecting
            fetchOnlineUsers();
          }
        });

        socket.on('disconnect', () => {
          if (!cancelled) {
            setConnected(false);
          }
        });

        socket.on('connect_error', (err) => {
          console.warn(`[${PLUGIN_ID}] Dashboard socket error:`, err.message);
        });

        // Listen for presence updates to refresh the list
        socket.on('presence:update', () => {
          fetchOnlineUsers();
        });

      } catch (err) {
        console.error('[plugin-io] Failed to connect dashboard socket:', err);
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

  // Poll for updates (backup for presence:update events)
  useEffect(() => {
    const interval = setInterval(fetchOnlineUsers, 15000);
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
          <LiveDot $connected={connected} />
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
          <EmptyIcon>
            <User width="28" height="28" fill="#a5a5ba" />
          </EmptyIcon>
          <Typography variant="omega" fontWeight="semiBold" textColor="neutral600">
            No one else is online
          </Typography>
          <Typography variant="pi" textColor="neutral500" style={{ marginTop: 4 }}>
            You're the only one here right now
          </Typography>
        </EmptyState>
      ) : (
        <UserList>
          {users.map((userData, index) => {
            const user = userData?.user;
            const onlineSecs = Math.floor((userData?.onlineFor || 0) / 1000);
            return (
              <UserCard key={userData?.socketId || index}>
                <UserAvatar $colorIndex={index}>
                  {getInitials(user)}
                </UserAvatar>
                <UserInfo>
                  <UserName>
                    {getDisplayName(user)}
                    {user?.isAdmin && (
                      <Badge size="S" style={{ marginLeft: 8 }}>Admin</Badge>
                    )}
                  </UserName>
                  <UserMeta>
                    <Clock width="12" height="12" />
                    Online {formatDuration(onlineSecs)}
                  </UserMeta>
                  {userData?.isEditing && userData.editingEntities?.length > 0 ? (
                    userData.editingEntities.map((entity, idx) => (
                      <EditingBadge 
                        key={idx}
                        href={`/admin/content-manager/collection-types/${entity.uid}/${entity.documentId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open in new tab"
                      >
                        <Pencil width="10" height="10" />
                        {entity.contentTypeName} - {entity.documentId}
                      </EditingBadge>
                    ))
                  ) : (
                    <IdleBadge>Idle</IdleBadge>
                  )}
                </UserInfo>
              </UserCard>
            );
          })}
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
