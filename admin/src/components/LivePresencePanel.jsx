/**
 * Live Presence Panel - Strapi Edit View Side Panel
 * Shows who else is editing this content in real-time
 * Uses the same API as Magic Editor X to appear in sidebar
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useIntl } from 'react-intl';
import { Box, Typography, Flex } from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';
import styled, { css, keyframes } from 'styled-components';
import { io } from 'socket.io-client';

import { PLUGIN_ID } from '../pluginId';

/* ============================================
   STYLED COMPONENTS
   ============================================ */

const pulse = keyframes`
  0%, 100% { 
    box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
    transform: scale(1);
  }
  50% { 
    box-shadow: 0 0 0 6px rgba(34, 197, 94, 0.1);
    transform: scale(1.1);
  }
`;

const StatusCard = styled.div`
  background: ${props => props.theme.colors.neutral0};
  border: 1px solid ${({ $status, theme }) => 
    $status === 'connected' ? 'rgba(34, 197, 94, 0.3)' : 
    $status === 'error' ? 'rgba(239, 68, 68, 0.3)' : 
    theme.colors.neutral200};
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const StatusDot = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $status }) => 
    $status === 'connected' ? '#22c55e' : 
    $status === 'connecting' ? '#f59e0b' :
    $status === 'error' ? '#ef4444' : 
    '#94a3b8'};
  
  ${({ $status }) => $status === 'connected' && css`
    animation: ${pulse} 2s ease-in-out infinite;
  `}
`;

const StatusText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const StatusLabel = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ $status, theme }) => 
    $status === 'connected' ? theme.colors.success600 : 
    $status === 'connecting' ? theme.colors.warning600 :
    $status === 'error' ? theme.colors.danger600 : 
    theme.colors.neutral600};
`;

const StatusSubtext = styled.span`
  font-size: 12px;
  color: ${props => props.theme.colors.neutral500};
`;

const SectionTitle = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${props => props.theme.colors.neutral600};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
`;

const EditorItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: ${props => props.theme.colors.neutral0};
  border-radius: 10px;
  border: 1px solid ${props => props.theme.colors.neutral150};
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${props => props.theme.colors.primary200};
    box-shadow: 0 2px 8px rgba(73, 69, 255, 0.08);
    transform: translateY(-1px);
  }
`;

const EDITOR_COLORS = [
  'linear-gradient(135deg, #4945ff 0%, #7b79ff 100%)',
  'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
  'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
  'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
  'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)',
];

const EditorAvatar = styled.div`
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

const EditorInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const EditorName = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${props => props.theme.colors.neutral800};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const EditorEmail = styled.span`
  font-size: 11px;
  color: ${props => props.theme.colors.neutral500};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const EditingBadge = styled.span`
  font-size: 10px;
  font-weight: 600;
  color: #166534;
  background: #dcfce7;
  padding: 4px 8px;
  border-radius: 12px;
  flex-shrink: 0;
`;

const TypingBadge = styled.span`
  font-size: 10px;
  font-weight: 600;
  color: #92400e;
  background: #fef3c7;
  padding: 4px 8px;
  border-radius: 12px;
  flex-shrink: 0;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 16px;
  background: ${props => props.theme.colors.neutral100};
  border-radius: 10px;
  border: 1px dashed ${props => props.theme.colors.neutral300};
`;

const EmptyText = styled.span`
  font-size: 13px;
  color: ${props => props.theme.colors.neutral500};
`;

/* ============================================
   FIELD PRESENCE INJECTION
   ============================================ */

const PRESENCE_STYLE_ID = 'io-presence-styles';

const PRESENCE_CSS = `
@keyframes io-dot-in {
  from { opacity: 0; transform: scale(0.5); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes io-dot-out {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.5); }
}
.io-presence-field {
  outline: 2px solid var(--io-presence-color, #4945ff) !important;
  outline-offset: -1px;
  border-radius: 4px;
  transition: outline-color 0.3s ease;
}
.io-presence-field-fade {
  outline-color: transparent !important;
  transition: outline-color 0.4s ease;
}
.io-presence-dot {
  position: absolute;
  top: -12px;
  right: -4px;
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 10;
  pointer-events: none;
  animation: io-dot-in 0.2s ease-out both;
  direction: rtl;
}
.io-presence-dot .io-dot-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--io-presence-color, #4945ff);
  color: white;
  font-size: 9px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.25);
  flex-shrink: 0;
  line-height: 1;
}
.io-presence-dot .io-dot-label {
  direction: ltr;
  font-size: 11px;
  font-weight: 600;
  color: white;
  background: var(--io-presence-color, #4945ff);
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.io-presence-dot.io-dot-leaving {
  animation: io-dot-out 0.3s ease-in both;
}
`;

const PRESENCE_FLAT_COLORS = [
  '#4945ff', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899',
];

/**
 * Injects the presence CSS into document head (idempotent).
 */
function injectPresenceStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(PRESENCE_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = PRESENCE_STYLE_ID;
  style.textContent = PRESENCE_CSS;
  document.head.appendChild(style);
}

/**
 * Removes injected presence CSS from document head.
 */
function removePresenceStyles() {
  if (typeof document === 'undefined') return;
  document.getElementById(PRESENCE_STYLE_ID)?.remove();
}

/**
 * Finds the field wrapper DOM element that matches a given fieldName.
 * @param {string} fieldName - name attribute, id, or label text
 * @returns {HTMLElement|null} The outermost field wrapper or null
 */
function findFieldElement(fieldName) {
  if (!fieldName || typeof document === 'undefined') return null;

  const clean = fieldName.trim().replace(/\s*\*\s*$/, '');
  const lowerClean = clean.toLowerCase();
  let input = null;

  // 1. By name attribute (most reliable)
  input = document.querySelector(
    `main input[name="${clean}"], main textarea[name="${clean}"]`
  );

  // 2. By id attribute
  if (!input) {
    input = document.getElementById(clean);
    if (input && !input.closest('main')) input = null;
  }

  // 3. By label text (fuzzy: ignores trailing * and whitespace)
  if (!input) {
    const labels = document.querySelectorAll('main label');
    for (const label of labels) {
      const labelText = label.textContent?.trim().replace(/\s*\*\s*$/, '').toLowerCase();
      if (labelText === lowerClean) {
        const forId = label.getAttribute('for');
        if (forId) input = document.getElementById(forId);
        if (!input) {
          const wrapper = label.closest('[class*="Field"]') || label.parentElement;
          input = wrapper?.querySelector('input, textarea, [contenteditable="true"]');
        }
        if (input) break;
      }
    }
  }

  // 4. By aria-label
  if (!input) {
    input = document.querySelector(`main [aria-label="${clean}"]`);
  }

  if (!input) return null;

  return input.closest('[class*="Field"]') || input.parentElement;
}

/**
 * Highlights a field with a colored border and avatar dot.
 * Returns a cleanup function.
 * @param {string} fieldName
 * @param {object} user - { firstname, lastname, email, id }
 * @param {number} colorIndex
 * @returns {Function|null} cleanup or null if field not found
 */
function highlightField(fieldName, user, colorIndex) {
  const wrapper = findFieldElement(fieldName);
  if (!wrapper) return null;

  const color = PRESENCE_FLAT_COLORS[colorIndex % PRESENCE_FLAT_COLORS.length];
  const initials = getEditorInitials(user);

  // Ensure wrapper is position:relative for the dot
  const prevPosition = wrapper.style.position;
  if (getComputedStyle(wrapper).position === 'static') {
    wrapper.style.position = 'relative';
  }

  // Apply outline
  wrapper.style.setProperty('--io-presence-color', color);
  wrapper.classList.add('io-presence-field');
  wrapper.classList.remove('io-presence-field-fade');

  wrapper.querySelector('.io-presence-dot')?.remove();

  const dot = document.createElement('div');
  dot.className = 'io-presence-dot';
  dot.style.setProperty('--io-presence-color', color);

  const avatar = document.createElement('span');
  avatar.className = 'io-dot-avatar';
  avatar.textContent = initials;

  const label = document.createElement('span');
  label.className = 'io-dot-label';
  label.textContent = getEditorName(user);

  dot.appendChild(avatar);
  dot.appendChild(label);
  wrapper.appendChild(dot);

  let fadeTimeoutId = null;

  const cleanup = (immediate = false) => {
    if (immediate) {
      wrapper.classList.remove('io-presence-field', 'io-presence-field-fade');
      wrapper.style.removeProperty('--io-presence-color');
      if (prevPosition) {
        wrapper.style.position = prevPosition;
      } else {
        wrapper.style.removeProperty('position');
      }
      dot.remove();
      if (fadeTimeoutId) clearTimeout(fadeTimeoutId);
      return;
    }

    wrapper.classList.add('io-presence-field-fade');
    dot.classList.add('io-dot-leaving');
    fadeTimeoutId = setTimeout(() => {
      if (document.body.contains(wrapper)) {
        wrapper.classList.remove('io-presence-field', 'io-presence-field-fade');
        wrapper.style.removeProperty('--io-presence-color');
        if (prevPosition) {
          wrapper.style.position = prevPosition;
        } else {
          wrapper.style.removeProperty('position');
        }
      }
      if (document.body.contains(dot)) {
        dot.remove();
      }
    }, 400);
  };

  return cleanup;
}

/* ============================================
   HELPER FUNCTIONS
   ============================================ */

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash;
}

/**
 * Gets initials from user object
 */
const getEditorInitials = (user = {}) => {
  const first = (user.firstname?.[0] || user.username?.[0] || user.email?.[0] || '?').toUpperCase();
  const last = (user.lastname?.[0] || '').toUpperCase();
  return `${first}${last}`.trim();
};

/**
 * Gets display name from user object
 */
const getEditorName = (user = {}) => {
  if (user.firstname) {
    return `${user.firstname} ${user.lastname || ''}`.trim();
  }
  return user.username || user.email || 'Unknown';
};

/* ============================================
   MAIN COMPONENT
   ============================================ */

/**
 * Live Presence Panel for Socket.IO plugin
 * Shows real-time presence information in Content Manager sidebar
 */
const LivePresencePanel = ({ documentId, model, document }) => {
  const { formatMessage } = useIntl();
  const { get, post } = useFetchClient();
  const t = (id, defaultMessage, values) => 
    formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage }, values);
  
  const socketRef = useRef(null);
  const fieldHighlightCleanups = useRef(new Map());
  const fieldHighlightEnabledRef = useRef(false);
  const [sessionData, setSessionData] = useState(null);
  const [presenceState, setPresenceState] = useState({
    status: 'initializing',
    editors: [],
    typingUsers: [],
    error: null,
  });

  // Load plugin settings to check if field highlighting is enabled
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await get(`/${PLUGIN_ID}/settings`);
        if (cancelled) return;
        fieldHighlightEnabledRef.current = !!data?.data?.presence?.fieldHighlighting;
      } catch {
        fieldHighlightEnabledRef.current = false;
      }
    })();
    return () => { cancelled = true; };
  }, [get]);

  // Inject presence CSS on mount, remove on unmount
  useEffect(() => {
    injectPresenceStyles();
    return () => {
      fieldHighlightCleanups.current.forEach((cleanup) => cleanup(true));
      fieldHighlightCleanups.current.clear();
      removePresenceStyles();
    };
  }, []);

  const uid = model?.uid || model;
  const contentTypeName = model?.info?.displayName || model?.info?.singularName || uid?.split('.')?.pop() || '';
  const entryTitle = document?.title || document?.name || document?.username || document?.email || documentId || '';

  // Step 1: Get session token from server with automatic refresh
  useEffect(() => {
    if (!uid || !documentId) {
      setPresenceState(prev => ({ ...prev, status: 'disconnected', error: 'No content' }));
      return;
    }

    let cancelled = false;
    let refreshTimeoutId = null;

    /**
     * Fetches a new session token from the server
     * @param {boolean} isRefresh - Whether this is a refresh request
     */
    const getSession = async (isRefresh = false) => {
      try {
        if (!isRefresh) {
          setPresenceState(prev => ({ ...prev, status: 'requesting' }));
        }
        
        // Use useFetchClient to get session token (automatically includes admin auth)
        const { data } = await post(`/${PLUGIN_ID}/presence/session`, {});
        
        if (cancelled) return;

        if (!data || !data.token) {
          throw new Error('Invalid session response');
        }

        console.log(`[${PLUGIN_ID}] Session ${isRefresh ? 'refreshed' : 'obtained'}:`, {
          expiresIn: Math.round((data.expiresAt - Date.now()) / 1000) + 's',
          refreshAfter: Math.round((data.refreshAfter - Date.now()) / 1000) + 's',
        });
        
        setSessionData(data);
        
        if (!isRefresh) {
          setPresenceState(prev => ({ ...prev, status: 'connecting' }));
        }

        // Schedule token refresh at 70% of TTL (when server suggests)
        if (data.refreshAfter) {
          const refreshIn = data.refreshAfter - Date.now();
          if (refreshIn > 0) {
            console.log(`[${PLUGIN_ID}] Token refresh scheduled in ${Math.round(refreshIn / 1000)}s`);
            refreshTimeoutId = setTimeout(() => {
              if (!cancelled) {
                console.log(`[${PLUGIN_ID}] Refreshing session token...`);
                getSession(true);
              }
            }, refreshIn);
          }
        }
      } catch (error) {
        if (cancelled) return;
        
        // Handle rate limiting gracefully
        if (error.response?.status === 429) {
          console.warn(`[${PLUGIN_ID}] Rate limited, retrying in 30s...`);
          refreshTimeoutId = setTimeout(() => {
            if (!cancelled) getSession(isRefresh);
          }, 30000);
          return;
        }
        
        console.error(`[${PLUGIN_ID}] Failed to get presence session:`, error);
        setPresenceState(prev => ({ 
          ...prev, 
          status: 'error', 
          error: error.message || 'Failed to get session' 
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

  // Step 2: Connect to Socket.IO once we have a session token
  useEffect(() => {
    if (!sessionData?.token || !uid || !documentId) {
      return;
    }

    // Connect to Socket.IO server with the session token
    const socketUrl = sessionData.wsUrl || `${window.location.protocol}//${window.location.host}`;
    const socket = io(socketUrl, {
      path: sessionData.wsPath || '/socket.io',
      transports: ['websocket', 'polling'],
      auth: { 
        token: sessionData.token, 
        strategy: 'admin-jwt',
        isAdmin: true 
      },
      reconnection: true,
      reconnectionAttempts: 3,
    });

    socketRef.current = socket;

    // Typing detection - throttle to avoid spam
    let lastTypingEmit = 0;
    const TYPING_THROTTLE = 2000; // 2 seconds between typing events

    /**
     * Extracts a stable field identifier from an input element.
     * Prefers name attribute, falls back to cleaned label text.
     */
    const getFieldName = (element) => {
      if (element.name) return element.name;
      if (element.id) return element.id;

      const label = element.closest('label') ||
                    document.querySelector(`label[for="${element.id}"]`);
      if (label) {
        return label.textContent?.trim().replace(/\s*\*\s*$/, '') || '';
      }

      const fieldWrapper = element.closest('[class*="Field"]');
      if (fieldWrapper) {
        const labelEl = fieldWrapper.querySelector('label');
        if (labelEl) {
          return labelEl.textContent?.trim().replace(/\s*\*\s*$/, '') || '';
        }
      }

      return '';
    };

    const handleInput = (event) => {
      const target = event.target;

      const isEditable = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
        || target.getAttribute('contenteditable') === 'true';
      if (!isEditable) return;

      if (!target.closest('main')) return;

      const now = Date.now();
      if (now - lastTypingEmit < TYPING_THROTTLE) return;
      lastTypingEmit = now;

      const fieldName = getFieldName(target);
      if (!fieldName) return;

      if (socket.connected) {
        socket.emit('presence:typing', { uid, documentId, fieldName });
      }
    };

    // Add global input listener for typing detection (check if document and addEventListener exist)
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('input', handleInput, true);
    }

    socket.on('connect', () => {
      console.log(`[${PLUGIN_ID}] Presence socket connected`);
      setPresenceState(prev => ({ ...prev, status: 'connected', error: null }));
      
      socket.emit('presence:join', { uid, documentId, contentTypeName, entryTitle }, (response) => {
        if (response?.success) {
          setPresenceState(prev => ({
            ...prev,
            editors: (response.editors || []).map(e => ({
              ...e,
              isCurrentUser: e.socketId === socket.id,
            })),
          }));
        }
      });
    });

    socket.on('disconnect', () => {
      setPresenceState(prev => ({ ...prev, status: 'disconnected' }));
    });

    socket.on('connect_error', (err) => {
      console.warn(`[${PLUGIN_ID}] Presence socket error:`, err.message);
      setPresenceState(prev => ({ ...prev, status: 'error', error: err.message }));
    });

    // Handle presence updates
    socket.on('presence:update', (data) => {
      if (data.uid === uid && data.documentId === documentId) {
        setPresenceState(prev => ({
          ...prev,
          editors: (data.editors || []).map(e => ({
            ...e,
            isCurrentUser: e.socketId === socket.id,
          })),
        }));
      }
    });

    // Handle typing indicators + field highlighting
    socket.on('presence:typing', (data) => {
      if (data.uid === uid && data.documentId === documentId) {
        const userId = data.user?.id || data.user?.email || 'unknown';

        setPresenceState(prev => {
          const newTyping = [...prev.typingUsers.filter(t => t.user?.id !== data.user?.id)];
          newTyping.push({ user: data.user, fieldName: data.fieldName, timestamp: Date.now() });
          return { ...prev, typingUsers: newTyping };
        });

        if (fieldHighlightEnabledRef.current) {
          const prevCleanup = fieldHighlightCleanups.current.get(userId);
          if (prevCleanup) prevCleanup();

          const editorIdx = presenceState.editors.findIndex(
            (e) => e.user?.id === data.user?.id
          );
          const colorIdx = editorIdx >= 0 ? editorIdx : Math.abs(hashCode(userId)) % PRESENCE_FLAT_COLORS.length;
          const cleanup = highlightField(data.fieldName, data.user || {}, colorIdx);

          if (cleanup) {
            fieldHighlightCleanups.current.set(userId, cleanup);
          }
        }

        // Auto-clear typing + highlight after 3 seconds
        setTimeout(() => {
          setPresenceState(prev => ({
            ...prev,
            typingUsers: prev.typingUsers.filter(t => t.user?.id !== data.user?.id),
          }));
          const cl = fieldHighlightCleanups.current.get(userId);
          if (cl) {
            cl();
            fieldHighlightCleanups.current.delete(userId);
          }
        }, 3000);
      }
    });

    // Heartbeat every 30 seconds
    const heartbeat = setInterval(() => {
      if (socket.connected) {
        socket.emit('presence:heartbeat');
      }
    }, 30000);

    return () => {
      clearInterval(heartbeat);
      if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
        document.removeEventListener('input', handleInput, true);
      }
      // Clear all field highlights
      fieldHighlightCleanups.current.forEach((cleanup) => cleanup());
      fieldHighlightCleanups.current.clear();
      if (socket.connected) {
        socket.emit('presence:leave', { uid, documentId });
      }
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionData, uid, documentId]);

  const { status, editors, typingUsers, error } = presenceState;

  // Filter out current user from editors list
  const otherEditors = useMemo(() => {
    return editors.filter(e => !e.isCurrentUser);
  }, [editors]);

  // Check if a user is typing and get their typing info
  const getUserTypingInfo = useCallback((userId) => {
    const typing = typingUsers.find(t => t.user?.id === userId);
    return typing || null;
  }, [typingUsers]);

  // Check if a user is typing
  const isUserTyping = useCallback((userId) => {
    return typingUsers.some(t => t.user?.id === userId);
  }, [typingUsers]);

  const statusLabel = useMemo(() => {
    switch (status) {
      case 'connected': return t('presence.live', 'Live');
      case 'connecting': return t('presence.connecting', 'Connecting...');
      case 'requesting': return t('presence.requesting', 'Authenticating...');
      case 'initializing': return t('presence.initializing', 'Initializing...');
      case 'error': return t('presence.error', 'Connection Error');
      case 'disconnected': return t('presence.disconnected', 'Disconnected');
      default: return t('presence.offline', 'Offline');
    }
  }, [status, t]);

  const isConnected = status === 'connected';

  // Return object format required by addEditViewSidePanel
  return {
    title: t('presence.title', 'Live Presence'),
    content: (
      <Flex direction="column" gap={4} alignItems="stretch" style={{ width: '100%' }}>
        {/* Status Card */}
        <StatusCard $status={status}>
          <StatusDot $status={status} />
          <StatusText>
            <StatusLabel $status={status}>{statusLabel}</StatusLabel>
            <StatusSubtext>
              {isConnected 
                ? t('presence.realtimeActive', 'Real-time sync active') 
                : error || t('presence.establishing', 'Establishing connection...')}
            </StatusSubtext>
          </StatusText>
        </StatusCard>

        {/* Current Context */}
        {isConnected && contentTypeName && (
          <StatusCard $status="connected">
            <StatusText>
              <StatusLabel $status="connected" style={{ fontSize: '12px' }}>
                {contentTypeName}
              </StatusLabel>
              <StatusSubtext>
                {entryTitle || documentId}
              </StatusSubtext>
            </StatusText>
          </StatusCard>
        )}

        {/* Other Editors List */}
        {isConnected && otherEditors.length > 0 && (
          <div>
            <SectionTitle>
              {t('presence.activeEditors', 'Also Editing ({count})', { count: otherEditors.length })}
            </SectionTitle>
            <Flex direction="column" gap={2} alignItems="stretch">
              {otherEditors.map((editor, idx) => {
                const user = editor.user || {};
                const typingInfo = getUserTypingInfo(user.id);
                const editingContent = editor.contentTypeName || editor.entryTitle;
                
                return (
                  <EditorItem key={editor.socketId || idx}>
                    <EditorAvatar $color={EDITOR_COLORS[idx % EDITOR_COLORS.length]}>
                      {getEditorInitials(user)}
                    </EditorAvatar>
                    <EditorInfo>
                      <EditorName>{getEditorName(user)}</EditorName>
                      {typingInfo?.fieldName ? (
                        <EditorEmail style={{ color: '#92400e' }}>
                          Typing in: {typingInfo.fieldName}
                        </EditorEmail>
                      ) : editingContent ? (
                        <EditorEmail>{editingContent}{editor.entryTitle ? ` - ${editor.entryTitle}` : ''}</EditorEmail>
                      ) : user.email ? (
                        <EditorEmail>{user.email}</EditorEmail>
                      ) : null}
                    </EditorInfo>
                    {typingInfo ? (
                      <TypingBadge>{t('presence.typing', 'Typing...')}</TypingBadge>
                    ) : (
                      <EditingBadge>{t('presence.editing', 'Editing')}</EditingBadge>
                    )}
                  </EditorItem>
                );
              })}
            </Flex>
          </div>
        )}

        {/* Empty State */}
        {isConnected && otherEditors.length === 0 && (
          <EmptyState>
            <EmptyText>{t('presence.workingAlone', 'You are the only editor')}</EmptyText>
          </EmptyState>
        )}
      </Flex>
    ),
  };
};

export default LivePresencePanel;
