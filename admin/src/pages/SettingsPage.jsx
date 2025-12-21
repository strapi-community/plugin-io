import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Flex,
  Grid,
  Main,
  TextInput,
  Typography,
  Field,
  Checkbox,
  Divider,
  Badge,
  NumberInput,
  Toggle,
  Accordion,
} from '@strapi/design-system';
import { Check, Download, Upload } from '@strapi/icons';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { PLUGIN_ID } from '../pluginId';

// Mobile-optimized styled components
const ResponsiveMain = styled(Main)`
  & > div {
    padding: 16px !important;
    
    @media (min-width: 768px) {
      padding: 32px !important;
    }
  }
`;

const ResponsiveHeader = styled(Box)`
  padding-bottom: 16px !important;
  
  @media (min-width: 768px) {
    padding-bottom: 32px !important;
  }
`;

const ResponsiveTitle = styled(Typography)`
  font-size: 1.25rem !important;
  
  @media (min-width: 768px) {
    font-size: 2rem !important;
  }
`;

const ResponsiveSubtitle = styled(Typography)`
  font-size: 0.875rem !important;
  
  @media (min-width: 768px) {
    font-size: 1rem !important;
  }
`;

const ResponsiveCard = styled(Box)`
  padding: 16px !important;
  
  @media (min-width: 768px) {
    padding: 24px !important;
  }
`;

const ResponsiveSection = styled(Box)`
  padding-bottom: 16px !important;
  
  @media (min-width: 768px) {
    padding-bottom: 24px !important;
  }
`;

const ResponsiveSectionTitle = styled(Typography)`
  font-size: 1.125rem !important;
  margin-bottom: 8px !important;
  
  @media (min-width: 768px) {
    font-size: 1.5rem !important;
    margin-bottom: 12px !important;
  }
`;

const ResponsiveButtonGroup = styled(Flex)`
  flex-direction: column;
  gap: 8px;
  width: 100%;
  
  @media (min-width: 640px) {
    flex-direction: row;
    width: auto;
  }
  
  button {
    width: 100%;
    justify-content: center;
    
    @media (min-width: 640px) {
      width: auto;
    }
  }
`;

// Styled Input wrappers for better mobile UX
const InputWrapper = styled.div`
  width: 100%;
  
  input, textarea, select {
    width: 100% !important;
    min-height: 48px !important;
    font-size: 16px !important;
    padding: 14px 16px !important;
    box-sizing: border-box !important;
    
    @media (min-width: 768px) {
      min-height: 44px !important;
      font-size: 15px !important;
      padding: 12px 16px !important;
    }
  }
  
  /* Number Input specific - remove ALL spinners */
  input[type="number"] {
    width: 100% !important;
    min-height: 48px !important;
    font-size: 16px !important;
    
    /* Remove native browser spinner arrows */
    -moz-appearance: textfield;
    
    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    
    @media (min-width: 768px) {
      min-height: 44px !important;
      font-size: 15px !important;
    }
  }
  
  /* Strapi Input Component Override */
  > div {
    width: 100% !important;
    
    > div {
      width: 100% !important;
      
      input {
        width: 100% !important;
      }
    }
  }
  
  /* Strapi NumberInput Component - ALWAYS hide increment/decrement buttons */
  button[aria-label="Increment"],
  button[aria-label="Decrement"],
  div button[aria-label="Increment"],
  div button[aria-label="Decrement"],
  & button[aria-label="Increment"],
  & button[aria-label="Decrement"] {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    width: 0 !important;
    height: 0 !important;
    overflow: hidden !important;
    pointer-events: none !important;
  }
  
  /* NumberInput Container - proper alignment */
  > div {
    display: flex !important;
    align-items: center !important;
    width: 100% !important;
    
    /* Input field container */
    > div:first-child {
      flex: 1 !important;
      min-width: 0 !important;
      margin-right: 0 !important;
      
      input {
        width: 100% !important;
        padding-right: 12px !important;
      }
    }
    
    /* Spinner Buttons Container - ALWAYS HIDDEN */
    > div:last-child {
      display: none !important;
      visibility: hidden !important;
      width: 0 !important;
      height: 0 !important;
      overflow: hidden !important;
    }
  }
`;

const ResponsiveField = styled(Field.Root)`
  width: 100%;
  
  label {
    font-size: 15px !important;
    margin-bottom: 10px !important;
    font-weight: 600 !important;
    display: block !important;
    
    @media (min-width: 768px) {
      font-size: 14px !important;
      margin-bottom: 8px !important;
    }
  }
  
  /* Field hint */
  > span:last-child {
    font-size: 14px !important;
    margin-top: 8px !important;
    
    @media (min-width: 768px) {
      font-size: 13px !important;
      margin-top: 6px !important;
    }
  }
`;

// Available actions for each content type
const AVAILABLE_ACTIONS = ['create', 'update', 'delete'];

const SettingsPage = () => {
  const { get, put } = useFetchClient();
  const { toggleNotification } = useNotification();
  const { formatMessage } = useIntl();

  // Helper for translations
  const t = (id, defaultMessage) => formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [settings, setSettings] = useState({
    enabled: true,
    cors: {
      origins: ['http://localhost:3000'],
    },
    connection: {
      maxConnections: 1000,
      pingTimeout: 20000,
      pingInterval: 25000,
      connectionTimeout: 45000,
    },
    security: {
      requireAuthentication: false,
      rateLimiting: {
        enabled: false,
        maxEventsPerSecond: 10,
      },
      ipWhitelist: [],
      ipBlacklist: [],
    },
    events: {
      customEventNames: false,
      includeRelations: false,
      excludeFields: [],
      onlyPublished: false,
    },
    rooms: {
      autoJoinByRole: {},
      enablePrivateRooms: false,
    },
    redis: {
      enabled: false,
      url: 'redis://localhost:6379',
    },
    namespaces: {
      enabled: false,
      list: {},
    },
    middleware: {
      enabled: false,
      handlers: [],
    },
    monitoring: {
      enableConnectionLogging: true,
      enableEventLogging: false,
      maxEventLogSize: 100,
    },
    entitySubscriptions: {
      enabled: true,
      maxSubscriptionsPerSocket: 100,
      requireVerification: true,
      allowedContentTypes: [],
      enableMetrics: true,
    },
  });
  const [availableContentTypes, setAvailableContentTypes] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const fileInputRef = useRef(null);

  // Validation function
  const validateSettings = (settingsToValidate) => {
    const errors = [];

    // Validate CORS Origins
    settingsToValidate.cors?.origins?.forEach((origin) => {
      try {
        new URL(origin);
      } catch {
        errors.push(t('validation.invalidOrigin', `Invalid origin: ${origin}`));
      }
    });

    // Validate connection timeouts
    if (settingsToValidate.connection?.pingTimeout <= 0) {
      errors.push(t('validation.pingTimeoutPositive', 'Ping timeout must be positive'));
    }
    if (settingsToValidate.connection?.pingInterval <= 0) {
      errors.push(t('validation.pingIntervalPositive', 'Ping interval must be positive'));
    }
    if (settingsToValidate.connection?.connectionTimeout <= 0) {
      errors.push(t('validation.connectionTimeoutPositive', 'Connection timeout must be positive'));
    }
    if (settingsToValidate.connection?.maxConnections <= 0) {
      errors.push(t('validation.maxConnectionsPositive', 'Max connections must be positive'));
    }

    // Validate Redis URL if enabled
    if (settingsToValidate.redis?.enabled && !settingsToValidate.redis?.url) {
      errors.push(t('validation.redisUrlRequired', 'Redis URL is required when Redis is enabled'));
    }

    return errors;
  };

  // Export settings
  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `socket-io-settings-${Date.now()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    toggleNotification({
      type: 'success',
      message: t('settings.exported', 'Settings exported successfully!'),
    });
  };

  // Import settings
  const importSettings = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        const errors = validateSettings(imported);

        if (errors.length > 0) {
          toggleNotification({
            type: 'danger',
            message: `${t('settings.importError', 'Import failed')}: ${errors.join(', ')}`,
          });
          return;
        }

        updateSettings(imported);
        toggleNotification({
          type: 'success',
          message: t('settings.imported', 'Settings imported successfully!'),
        });
      } catch {
        toggleNotification({
          type: 'danger',
          message: t('settings.invalidJson', 'Invalid settings file!'),
        });
      }
    };
    reader.readAsText(file);
    event.target.value = null; // Reset file input
  };

  // Bulk actions for content type permissions
  const enableAllContentTypes = (roleType) => {
    updateSettings((prev) => {
      const contentTypes = {};
      availableContentTypes.forEach((ct) => {
        contentTypes[ct.uid] = { create: true, update: true, delete: true };
      });

      return {
        ...prev,
        rolePermissions: {
          ...prev.rolePermissions,
          [roleType]: {
            ...prev.rolePermissions?.[roleType],
            contentTypes,
          },
        },
      };
    });
  };

  const disableAllContentTypes = (roleType) => {
    updateSettings((prev) => ({
      ...prev,
      rolePermissions: {
        ...prev.rolePermissions,
        [roleType]: {
          ...prev.rolePermissions?.[roleType],
          contentTypes: {},
        },
      },
    }));
  };

  // Load settings and content types on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsRes, contentTypesRes, rolesRes] = await Promise.all([
          get(`/${PLUGIN_ID}/settings`),
          get(`/${PLUGIN_ID}/content-types`),
          get(`/${PLUGIN_ID}/roles`),
        ]);

        if (settingsRes.data?.data) {
          setSettings(settingsRes.data.data);
        }
        if (contentTypesRes.data?.data) {
          setAvailableContentTypes(contentTypesRes.data.data);
        }
        if (rolesRes.data?.data) {
          setAvailableRoles(rolesRes.data.data);
        }
      } catch (err) {
        console.error('Error loading settings:', err);
        toggleNotification({
          type: 'danger',
          message: t('settings.loadError', 'Error loading settings'),
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [get, toggleNotification]);

  // Save settings and reload Socket.IO
  const handleSave = async () => {
    // Validate before saving
    const errors = validateSettings(settings);
    if (errors.length > 0) {
      toggleNotification({
        type: 'danger',
        message: `${t('validation.errors', 'Validation errors')}: ${errors.join(', ')}`,
      });
      return;
    }

    setIsSaving(true);
    try {
      await put(`/${PLUGIN_ID}/settings`, settings);
      setHasChanges(false);
      toggleNotification({
        type: 'success',
        message: t('settings.success', 'Settings saved successfully!'),
      });
    } catch (err) {
      console.error('Error saving settings:', err);
      toggleNotification({
        type: 'danger',
        message: t('settings.error', 'Error saving settings'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Update settings and mark as changed
  const updateSettings = (updater) => {
    setSettings(updater);
    setHasChanges(true);
  };

  // Available HTTP methods
  const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];


  // CORS Origins management
  const [newOrigin, setNewOrigin] = useState('');
  const [newNamespace, setNewNamespace] = useState('');
  const addOrigin = () => {
    if (newOrigin && !settings.cors?.origins?.includes(newOrigin)) {
      updateSettings((prev) => ({
        ...prev,
        cors: {
          ...prev.cors,
          origins: [...(prev.cors?.origins || []), newOrigin],
        },
      }));
      setNewOrigin('');
    }
  };
  const removeOrigin = (origin) => {
    updateSettings((prev) => ({
      ...prev,
      cors: {
        ...prev.cors,
        origins: prev.cors?.origins?.filter((o) => o !== origin) || [],
      },
    }));
  };

  // Connection settings update
  const updateConnection = (key, value) => {
    updateSettings((prev) => ({
      ...prev,
      connection: {
        ...prev.connection,
        [key]: parseInt(value) || 0,
      },
    }));
  };

  // Security settings update
  const updateSecurity = (key, value) => {
    updateSettings((prev) => ({
      ...prev,
      security: {
        ...prev.security,
        [key]: value,
      },
    }));
  };

  // Events settings update
  const updateEvents = (key, value) => {
    updateSettings((prev) => ({
      ...prev,
      events: {
        ...prev.events,
        [key]: value,
      },
    }));
  };

  // Monitoring settings update
  const updateMonitoring = (key, value) => {
    updateSettings((prev) => ({
      ...prev,
      monitoring: {
        ...prev.monitoring,
        [key]: value,
      },
    }));
  };

  // Entity Subscriptions settings update
  const updateEntitySubscriptions = (key, value) => {
    updateSettings((prev) => ({
      ...prev,
      entitySubscriptions: {
        ...prev.entitySubscriptions,
        [key]: value,
      },
    }));
  };

  // Redis settings update
  const updateRedis = (key, value) => {
    updateSettings((prev) => ({
      ...prev,
      redis: {
        ...prev.redis,
        [key]: value,
      },
    }));
  };

  // Namespaces settings update
  const updateNamespaces = (key, value) => {
    updateSettings((prev) => ({
      ...prev,
      namespaces: {
        ...prev.namespaces,
        [key]: value,
      },
    }));
  };

  // Namespace management
  const addNamespace = () => {
    const trimmed = newNamespace.trim();
    console.log('addNamespace called, newNamespace:', trimmed);
    console.log('current list:', settings.namespaces?.list);
    
    if (!trimmed) {
      console.log('Empty namespace name');
      return;
    }
    
    const currentList = settings.namespaces?.list || {};
    if (currentList[trimmed]) {
      console.log('Namespace already exists');
      return;
    }
    
    updateSettings((prev) => ({
      ...prev,
      namespaces: {
        enabled: prev.namespaces?.enabled || false,
        list: {
          ...currentList,
          [trimmed]: { requireAuth: false },
        },
      },
    }));
    setNewNamespace('');
    console.log('Namespace added:', trimmed);
  };

  const removeNamespace = (namespace) => {
    updateSettings((prev) => {
      const newList = { ...prev.namespaces?.list };
      delete newList[namespace];
      return {
        ...prev,
        namespaces: {
          ...prev.namespaces,
          list: newList,
        },
      };
    });
  };

  if (isLoading) {
    return (
      <ResponsiveMain>
        <Box padding={8}>
          <Typography>Loading...</Typography>
        </Box>
      </ResponsiveMain>
    );
  }

  return (
    <ResponsiveMain>
      <Box padding={8} background="neutral100">
        {/* Header */}
        <ResponsiveHeader>
          <Flex direction={{ base: 'column', tablet: 'row' }} justifyContent="space-between" alignItems={{ base: 'flex-start', tablet: 'center' }} gap={3}>
            <Box>
              <ResponsiveTitle variant="alpha" as="h1">
                {t('plugin.name', 'Socket.IO')} {t('settings.title', 'Settings')}
              </ResponsiveTitle>
              <ResponsiveSubtitle variant="epsilon" textColor="neutral600">
                {t('settings.description', 'Configure the Socket.IO connection for real-time events')}
              </ResponsiveSubtitle>
            </Box>
            <ResponsiveButtonGroup>
              <Button
                variant="secondary"
                startIcon={<Download />}
                onClick={exportSettings}
                size="S"
              >
                {t('settings.export', 'Export')}
              </Button>
              <Button
                variant="secondary"
                startIcon={<Upload />}
                onClick={() => fileInputRef.current?.click()}
                size="S"
              >
                {t('settings.import', 'Import')}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={importSettings}
                style={{ display: 'none' }}
              />
              <Button
                onClick={handleSave}
                loading={isSaving}
                startIcon={<Check />}
                disabled={!hasChanges}
                size="S"
              >
                {hasChanges ? t('settings.saveAndApply', 'Save & Apply') : t('settings.saved', 'Saved')}
              </Button>
            </ResponsiveButtonGroup>
            </Flex>
        </ResponsiveHeader>

        <ResponsiveCard background="neutral0" shadow="filterShadow" hasRadius>
          {/* CORS Origins Section */}
          <ResponsiveSection>
            <ResponsiveSectionTitle variant="delta" as="h2">
              {t('cors.title', 'CORS Origins')}
            </ResponsiveSectionTitle>
            <Typography variant="pi" textColor="neutral600">
              {t('cors.description', 'Configure which frontend URLs are allowed to connect')}
            </Typography>
          </ResponsiveSection>

          <Grid.Root gap={4}>
            <Grid.Item col={12}>
              <ResponsiveField>
                <Field.Label>{t('cors.origins', 'Allowed Origins')}</Field.Label>
                <Flex direction={{ base: 'column', tablet: 'row' }} gap={2} paddingBottom={2}>
                  <InputWrapper style={{ flex: 1, width: '100%' }}>
                    <TextInput
                      placeholder="http://localhost:3000"
                      value={newOrigin}
                      onChange={(e) => setNewOrigin(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addOrigin()}
                    />
                  </InputWrapper>
                  <Button onClick={addOrigin} size="L" style={{ width: '100%', maxWidth: '200px', minHeight: '44px' }}>{t('cors.add', 'Add')}</Button>
                </Flex>
                <Flex gap={2} wrap="wrap" paddingTop={2}>
                  {settings.cors?.origins?.map((origin) => (
                    <Badge key={origin} onClick={() => removeOrigin(origin)} style={{ cursor: 'pointer', fontSize: '13px', padding: '6px 12px' }}>
                      {origin} ✕
                    </Badge>
                  ))}
                </Flex>
                <Field.Hint>
                  {t('cors.originsHint', 'Add multiple frontend URLs that can connect')}
                </Field.Hint>
              </ResponsiveField>
            </Grid.Item>

          </Grid.Root>

          <Box paddingTop={4} paddingBottom={2}>
            <Divider />
          </Box>

          {/* Connection Settings */}
          <ResponsiveSection>
            <ResponsiveSectionTitle variant="delta" as="h2">
              {t('connection.title', 'Connection Settings')}
            </ResponsiveSectionTitle>
            <Typography variant="pi" textColor="neutral600">
              {t('connection.description', 'Configure connection limits and timeouts')}
            </Typography>
          </ResponsiveSection>

          <Grid.Root gap={3}>
            <Grid.Item col={6} s={12}>
              <ResponsiveField>
                <Field.Label>{t('connection.maxConnections', 'Max Connections')}</Field.Label>
                <InputWrapper>
                <NumberInput
                  value={settings.connection?.maxConnections || 1000}
                  onValueChange={(value) => updateConnection('maxConnections', value)}
                />
                </InputWrapper>
              </ResponsiveField>
            </Grid.Item>
            <Grid.Item col={6} s={12}>
              <ResponsiveField>
                <Field.Label>{t('connection.pingTimeout', 'Ping Timeout (ms)')}</Field.Label>
                <InputWrapper>
                <NumberInput
                  value={settings.connection?.pingTimeout || 20000}
                  onValueChange={(value) => updateConnection('pingTimeout', value)}
                />
                </InputWrapper>
              </ResponsiveField>
            </Grid.Item>
            <Grid.Item col={6} s={12}>
              <ResponsiveField>
                <Field.Label>{t('connection.pingInterval', 'Ping Interval (ms)')}</Field.Label>
                <InputWrapper>
                <NumberInput
                  value={settings.connection?.pingInterval || 25000}
                  onValueChange={(value) => updateConnection('pingInterval', value)}
                />
                </InputWrapper>
              </ResponsiveField>
            </Grid.Item>
            <Grid.Item col={6} s={12}>
              <ResponsiveField>
                <Field.Label>{t('connection.connectionTimeout', 'Connection Timeout (ms)')}</Field.Label>
                <InputWrapper>
                <NumberInput
                  value={settings.connection?.connectionTimeout || 45000}
                  onValueChange={(value) => updateConnection('connectionTimeout', value)}
                />
                </InputWrapper>
              </ResponsiveField>
            </Grid.Item>
          </Grid.Root>

          <Box paddingTop={4} paddingBottom={2}>
            <Divider />
          </Box>

          {/* Security Settings */}
          <ResponsiveSection>
            <ResponsiveSectionTitle variant="delta" as="h2">
              {t('security.title', 'Security Settings')}
            </ResponsiveSectionTitle>
            <Typography variant="pi" textColor="neutral600">
              {t('security.description', 'Configure authentication and rate limiting')}
            </Typography>
          </ResponsiveSection>

          <Grid.Root gap={3}>
            <Grid.Item col={6} s={12}>
              <Box
                padding={4}
                background={settings.security?.requireAuthentication ? 'success100' : 'neutral0'}
                hasRadius
                style={{
                  cursor: 'pointer',
                  border: `2px solid ${settings.security?.requireAuthentication ? '#5cb176' : '#dcdce4'}`,
                  transition: 'all 0.2s ease',
                  minHeight: '110px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                onClick={() => updateSecurity('requireAuthentication', !settings.security?.requireAuthentication)}
              >
                <Flex gap={3} alignItems="center" style={{ width: '100%' }}>
                  <Toggle
                    checked={settings.security?.requireAuthentication || false}
                    onChange={(e) => updateSecurity('requireAuthentication', e.target.checked)}
                  />
                  <Flex direction="column" alignItems="flex-start" gap={1}>
                    <Typography
                      variant="omega"
                      fontWeight={settings.security?.requireAuthentication ? 'bold' : 'normal'}
                      textColor={settings.security?.requireAuthentication ? 'success700' : 'neutral800'}
                    >
                      {t('security.requireAuth', 'Require Authentication')}
                    </Typography>
                    <Typography variant="pi" textColor="neutral600" style={{ fontSize: '12px' }}>
                      {settings.security?.requireAuthentication ? '✓ Active' : 'Inactive'}
                    </Typography>
                  </Flex>
                </Flex>
              </Box>
            </Grid.Item>
            <Grid.Item col={4} s={12}>
              <Box
                padding={4}
                background={settings.security?.rateLimiting?.enabled ? 'warning100' : 'neutral0'}
                hasRadius
                style={{
                  cursor: 'pointer',
                  border: `2px solid ${settings.security?.rateLimiting?.enabled ? '#f59e0b' : '#dcdce4'}`,
                  transition: 'all 0.2s ease',
                  minHeight: '110px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                onClick={() => updateSecurity('rateLimiting', { ...settings.security?.rateLimiting, enabled: !settings.security?.rateLimiting?.enabled })}
              >
                <Flex gap={3} alignItems="center" style={{ width: '100%' }}>
                  <Toggle
                    checked={settings.security?.rateLimiting?.enabled || false}
                    onChange={(e) => updateSecurity('rateLimiting', { ...settings.security?.rateLimiting, enabled: e.target.checked })}
                  />
                  <Flex direction="column" alignItems="flex-start" gap={1}>
                    <Typography
                      variant="omega"
                      fontWeight={settings.security?.rateLimiting?.enabled ? 'bold' : 'normal'}
                      textColor={settings.security?.rateLimiting?.enabled ? 'warning700' : 'neutral800'}
                    >
                      {t('security.rateLimiting', 'Enable Rate Limiting')}
                    </Typography>
                    <Typography variant="pi" textColor="neutral600" style={{ fontSize: '12px' }}>
                      {settings.security?.rateLimiting?.enabled ? '✓ Active' : 'Inactive'}
                    </Typography>
                  </Flex>
                </Flex>
              </Box>
            </Grid.Item>
            {settings.security?.rateLimiting?.enabled && (
              <Grid.Item col={6} s={12}>
                <NumberInput
                  label={t('security.maxEventsPerSecond', 'Max Events/Second')}
                  value={settings.security?.rateLimiting?.maxEventsPerSecond || 10}
                  onValueChange={(value) => updateSecurity('rateLimiting', { ...settings.security?.rateLimiting, maxEventsPerSecond: value })}
                />
              </Grid.Item>
            )}
          </Grid.Root>

          <Box paddingTop={4} paddingBottom={2}>
            <Divider />
          </Box>

          {/* Events Settings */}
          <ResponsiveSection>
            <ResponsiveSectionTitle variant="delta" as="h2">
              {t('events.title', 'Event Configuration')}
            </ResponsiveSectionTitle>
            <Typography variant="pi" textColor="neutral600">
              {t('events.description', 'Global event settings')}
            </Typography>
          </ResponsiveSection>

          <Grid.Root gap={3}>
            <Grid.Item col={4} s={12}>
              <Box
                padding={4}
                background={settings.events?.customEventNames ? 'primary100' : 'neutral0'}
                hasRadius
                style={{
                  cursor: 'pointer',
                  border: `2px solid ${settings.events?.customEventNames ? '#4945ff' : '#dcdce4'}`,
                  transition: 'all 0.2s ease',
                  minHeight: '110px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                onClick={() => updateEvents('customEventNames', !settings.events?.customEventNames)}
              >
                <Flex gap={3} alignItems="center" style={{ width: '100%' }}>
                  <Toggle
                    checked={settings.events?.customEventNames || false}
                    onChange={(e) => updateEvents('customEventNames', e.target.checked)}
                  />
                  <Flex direction="column" alignItems="flex-start" gap={1}>
                    <Typography
                      variant="omega"
                      fontWeight={settings.events?.customEventNames ? 'bold' : 'normal'}
                      textColor={settings.events?.customEventNames ? 'primary700' : 'neutral800'}
                    >
                      {t('events.customNames', 'Use Custom Event Names')}
                    </Typography>
                    <Typography variant="pi" textColor="neutral600" style={{ fontSize: '12px' }}>
                      {settings.events?.customEventNames ? '✓ Active' : 'Inactive'}
                    </Typography>
                  </Flex>
                </Flex>
              </Box>
            </Grid.Item>
            <Grid.Item col={4} s={12}>
              <Box
                padding={4}
                background={settings.events?.includeRelations ? 'primary100' : 'neutral0'}
                hasRadius
                style={{
                  cursor: 'pointer',
                  border: `2px solid ${settings.events?.includeRelations ? '#4945ff' : '#dcdce4'}`,
                  transition: 'all 0.2s ease',
                  minHeight: '110px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                onClick={() => updateEvents('includeRelations', !settings.events?.includeRelations)}
              >
                <Flex gap={3} alignItems="center" style={{ width: '100%' }}>
                  <Toggle
                    checked={settings.events?.includeRelations || false}
                    onChange={(e) => updateEvents('includeRelations', e.target.checked)}
                  />
                  <Flex direction="column" alignItems="flex-start" gap={1}>
                    <Typography
                      variant="omega"
                      fontWeight={settings.events?.includeRelations ? 'bold' : 'normal'}
                      textColor={settings.events?.includeRelations ? 'primary700' : 'neutral800'}
                    >
                      {t('events.includeRelations', 'Include Relations')}
                    </Typography>
                    <Typography variant="pi" textColor="neutral600" style={{ fontSize: '12px' }}>
                      {settings.events?.includeRelations ? '✓ Active' : 'Inactive'}
                    </Typography>
                  </Flex>
                </Flex>
              </Box>
            </Grid.Item>
            <Grid.Item col={4} s={12}>
              <Box
                padding={4}
                background={settings.events?.onlyPublished ? 'primary100' : 'neutral0'}
                hasRadius
                style={{
                  cursor: 'pointer',
                  border: `2px solid ${settings.events?.onlyPublished ? '#4945ff' : '#dcdce4'}`,
                  transition: 'all 0.2s ease',
                  minHeight: '110px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                onClick={() => updateEvents('onlyPublished', !settings.events?.onlyPublished)}
              >
                <Flex gap={3} alignItems="center" style={{ width: '100%' }}>
                  <Toggle
                    checked={settings.events?.onlyPublished || false}
                    onChange={(e) => updateEvents('onlyPublished', e.target.checked)}
                  />
                  <Flex direction="column" alignItems="flex-start" gap={1}>
                    <Typography
                      variant="omega"
                      fontWeight={settings.events?.onlyPublished ? 'bold' : 'normal'}
                      textColor={settings.events?.onlyPublished ? 'primary700' : 'neutral800'}
                    >
                      {t('events.onlyPublished', 'Only Published Content')}
                    </Typography>
                    <Typography variant="pi" textColor="neutral600" style={{ fontSize: '12px' }}>
                      {settings.events?.onlyPublished ? '✓ Active' : 'Inactive'}
                    </Typography>
                  </Flex>
                </Flex>
              </Box>
            </Grid.Item>
          </Grid.Root>

          <Box paddingTop={4} paddingBottom={2}>
            <Divider />
          </Box>

          {/* Role Permissions Section */}
          <ResponsiveSection>
            <ResponsiveSectionTitle variant="delta" as="h2">
              {t('permissions.title', 'Role Permissions')}
            </ResponsiveSectionTitle>
            <Typography variant="pi" textColor="neutral600">
              {t('permissions.description', 'Configure Socket.IO permissions per user role')}
            </Typography>
          </ResponsiveSection>

          {availableRoles.length > 0 ? (
            <Accordion.Root>
              {availableRoles.map((role) => {
                const rolePerms = settings.rolePermissions?.[role.type] || {};
                const canConnect = rolePerms.canConnect ?? true;
                const enabledContentTypes = Object.entries(rolePerms.contentTypes || {}).filter(
                  ([uid, actions]) => actions.create || actions.update || actions.delete
                ).length;

                return (
                  <Accordion.Item key={role.id} value={role.type}>
                    <Accordion.Header>
                      <Accordion.Trigger>
                        <Flex justifyContent="space-between" width="100%" paddingRight={4} alignItems="flex-start">
                          <Flex direction="column" alignItems="flex-start" gap={1}>
                            <Typography variant="omega" fontWeight="bold">
                              {role.name}
                            </Typography>
                            <Typography variant="pi" textColor="neutral600">
                              ({enabledContentTypes} {t('permissions.contentTypesEnabled', 'content types enabled')})
                            </Typography>
                          </Flex>
                          <Badge active={canConnect}>
                            {canConnect ? t('permissions.canConnect', 'Can Connect') : t('permissions.blocked', 'Blocked')}
                          </Badge>
                        </Flex>
                      </Accordion.Trigger>
                    </Accordion.Header>
                    <Accordion.Content>
                      <Box padding={4} background="neutral100">
                        {/* Can Connect Toggle */}
                        <Box paddingBottom={4}>
                          <Flex gap={3} alignItems="center">
                            <Checkbox
                              checked={canConnect}
                              onCheckedChange={(checked) =>
                                updateSettings((prev) => ({
                                  ...prev,
                                  rolePermissions: {
                                    ...prev.rolePermissions,
                                    [role.type]: {
                                      ...prev.rolePermissions?.[role.type],
                                      canConnect: checked,
                                    },
                                  },
                                }))
                              }
                            />
                            <Flex direction="column" alignItems="flex-start" gap={1}>
                              <Typography variant="omega" fontWeight="bold">
                                {t('permissions.allowConnection', 'Allow Connection')}
                              </Typography>
                              <Typography variant="pi" textColor="neutral600">
                                {t('permissions.allowConnectionHint', 'Users with this role can connect to Socket.IO')}
                              </Typography>
                            </Flex>
                          </Flex>
                        </Box>

                        {/* Credentials */}
                        <Box paddingBottom={4}>
                          <Flex gap={3} alignItems="center">
                            <Checkbox
                              checked={rolePerms.allowCredentials ?? true}
                              onCheckedChange={(checked) =>
                                updateSettings((prev) => ({
                                  ...prev,
                                  rolePermissions: {
                                    ...prev.rolePermissions,
                                    [role.type]: {
                                      ...prev.rolePermissions?.[role.type],
                                      allowCredentials: checked,
                                    },
                                  },
                                }))
                              }
                            />
                            <Flex direction="column" alignItems="flex-start" gap={1}>
                              <Typography variant="omega" fontWeight="bold">
                                {t('permissions.allowCredentials', 'Allow Credentials')}
                              </Typography>
                              <Typography variant="pi" textColor="neutral600">
                                {t('permissions.allowCredentialsHint', 'Allow cookies and auth headers')}
                              </Typography>
                            </Flex>
                          </Flex>
                        </Box>

                        {/* HTTP Methods */}
                        <Box paddingBottom={4}>
                          <Typography variant="omega" fontWeight="bold" paddingBottom={2}>
                            {t('permissions.allowedMethods', 'Allowed HTTP Methods')}
                          </Typography>
                          <Flex gap={2} wrap="wrap">
                            {httpMethods.map((method) => (
                              <Box
                                key={method}
                                padding={2}
                                paddingLeft={3}
                                paddingRight={3}
                                background={rolePerms.allowedMethods?.includes(method) ? 'primary100' : 'neutral100'}
                                hasRadius
                                style={{
                                  cursor: 'pointer',
                                  border: `1px solid ${rolePerms.allowedMethods?.includes(method) ? '#4945ff' : '#dcdce4'}`,
                                }}
                                onClick={() => {
                                  const current = rolePerms.allowedMethods || [];
                                  const updated = current.includes(method)
                                    ? current.filter((m) => m !== method)
                                    : [...current, method];
                                  updateSettings((prev) => ({
                                    ...prev,
                                    rolePermissions: {
                                      ...prev.rolePermissions,
                                      [role.type]: {
                                        ...prev.rolePermissions?.[role.type],
                                        allowedMethods: updated,
                                      },
                                    },
                                  }));
                                }}
                              >
                                <Flex gap={2} alignItems="center">
                                  <Checkbox
                                    checked={rolePerms.allowedMethods?.includes(method) || false}
                                    onCheckedChange={() => {}}
                                  />
                                  <Typography variant="omega" fontWeight="bold">
                                    {method}
                                  </Typography>
                                </Flex>
                              </Box>
                            ))}
                          </Flex>
                        </Box>

                        <Divider />

                        {/* Content Type Permissions */}
                        <Box paddingTop={4}>
                          <Flex justifyContent="space-between" alignItems="center" paddingBottom={3}>
                            <Typography variant="omega" fontWeight="bold">
                              {t('permissions.contentTypePermissions', 'Content Type Permissions')}
                            </Typography>
                            <Flex gap={2}>
                              <Button
                                size="S"
                                variant="secondary"
                                onClick={() => enableAllContentTypes(role.type)}
                              >
                                {t('permissions.enableAll', 'Enable All')}
                              </Button>
                              <Button
                                size="S"
                                variant="tertiary"
                                onClick={() => disableAllContentTypes(role.type)}
                              >
                                {t('permissions.disableAll', 'Disable All')}
                              </Button>
                            </Flex>
                          </Flex>

                          {availableContentTypes.length > 0 ? (
                            <Box background="neutral0" hasRadius style={{ border: '1px solid #dcdce4' }}>
                              {/* Header */}
                              <Box padding={2} background="neutral100" style={{ borderBottom: '1px solid #dcdce4' }}>
                                <Grid.Root>
                                  <Grid.Item col={4}>
                                    <Typography variant="sigma" textColor="neutral600">
                                      {t('events.contentType', 'CONTENT TYPE')}
                                    </Typography>
                                  </Grid.Item>
                                  <Grid.Item col={2}>
                                    <Flex justifyContent="center">
                                      <Typography variant="sigma" textColor="neutral600">
                                        {t('events.create', 'CREATE')}
                                      </Typography>
                                    </Flex>
                                  </Grid.Item>
                                  <Grid.Item col={2}>
                                    <Flex justifyContent="center">
                                      <Typography variant="sigma" textColor="neutral600">
                                        {t('events.update', 'UPDATE')}
                                      </Typography>
                                    </Flex>
                                  </Grid.Item>
                                  <Grid.Item col={2}>
                                    <Flex justifyContent="center">
                                      <Typography variant="sigma" textColor="neutral600">
                                        {t('events.delete', 'DELETE')}
                                      </Typography>
                                    </Flex>
                                  </Grid.Item>
                                  <Grid.Item col={2}>
                                    <Flex justifyContent="center">
                                      <Typography variant="sigma" textColor="neutral600">
                                        {t('entitySubscriptions.allow', 'ENTITIES')} 🆕
                                      </Typography>
                                    </Flex>
                                  </Grid.Item>
                                </Grid.Root>
                              </Box>

                              {/* Content Type Rows */}
                              {availableContentTypes.map((ct, idx) => {
                                const hasAnyPermission = rolePerms.contentTypes?.[ct.uid]?.create || 
                                                        rolePerms.contentTypes?.[ct.uid]?.update || 
                                                        rolePerms.contentTypes?.[ct.uid]?.delete;
                                const allowEntitySubs = settings.entitySubscriptions?.allowedContentTypes?.includes(ct.uid) || 
                                                       settings.entitySubscriptions?.allowedContentTypes?.length === 0;
                                
                                return (
                                  <Box
                                    key={ct.uid}
                                    padding={2}
                                    style={{
                                      borderBottom: idx < availableContentTypes.length - 1 ? '1px solid #dcdce4' : 'none',
                                      opacity: hasAnyPermission ? 1 : 0.5,
                                    }}
                                  >
                                    <Grid.Root>
                                      <Grid.Item col={4}>
                                        <Typography variant="omega">
                                          {ct.displayName}
                                        </Typography>
                                      </Grid.Item>
                                      <Grid.Item col={2}>
                                        <Flex justifyContent="center">
                                          <Checkbox
                                            checked={rolePerms.contentTypes?.[ct.uid]?.create || false}
                                            onCheckedChange={(checked) =>
                                              updateSettings((prev) => ({
                                                ...prev,
                                                rolePermissions: {
                                                  ...prev.rolePermissions,
                                                  [role.type]: {
                                                    ...prev.rolePermissions?.[role.type],
                                                    contentTypes: {
                                                      ...prev.rolePermissions?.[role.type]?.contentTypes,
                                                      [ct.uid]: {
                                                        ...prev.rolePermissions?.[role.type]?.contentTypes?.[ct.uid],
                                                        create: checked,
                                                      },
                                                    },
                                                  },
                                                },
                                              }))
                                            }
                                          />
                                        </Flex>
                                      </Grid.Item>
                                      <Grid.Item col={2}>
                                        <Flex justifyContent="center">
                                          <Checkbox
                                            checked={rolePerms.contentTypes?.[ct.uid]?.update || false}
                                            onCheckedChange={(checked) =>
                                              updateSettings((prev) => ({
                                                ...prev,
                                                rolePermissions: {
                                                  ...prev.rolePermissions,
                                                  [role.type]: {
                                                    ...prev.rolePermissions?.[role.type],
                                                    contentTypes: {
                                                      ...prev.rolePermissions?.[role.type]?.contentTypes,
                                                      [ct.uid]: {
                                                        ...prev.rolePermissions?.[role.type]?.contentTypes?.[ct.uid],
                                                        update: checked,
                                                      },
                                                    },
                                                  },
                                                },
                                              }))
                                            }
                                          />
                                        </Flex>
                                      </Grid.Item>
                                      <Grid.Item col={2}>
                                        <Flex justifyContent="center">
                                          <Checkbox
                                            checked={rolePerms.contentTypes?.[ct.uid]?.delete || false}
                                            onCheckedChange={(checked) =>
                                              updateSettings((prev) => ({
                                                ...prev,
                                                rolePermissions: {
                                                  ...prev.rolePermissions,
                                                  [role.type]: {
                                                    ...prev.rolePermissions?.[role.type],
                                                    contentTypes: {
                                                      ...prev.rolePermissions?.[role.type]?.contentTypes,
                                                      [ct.uid]: {
                                                        ...prev.rolePermissions?.[role.type]?.contentTypes?.[ct.uid],
                                                        delete: checked,
                                                      },
                                                    },
                                                  },
                                                },
                                              }))
                                            }
                                          />
                                        </Flex>
                                      </Grid.Item>
                                      <Grid.Item col={2}>
                                        <Flex justifyContent="center">
                                          {settings.entitySubscriptions?.enabled ? (
                                            <Checkbox
                                              checked={
                                                hasAnyPermission && (
                                                  settings.entitySubscriptions?.allowedContentTypes?.length === 0 ||
                                                  settings.entitySubscriptions?.allowedContentTypes?.includes(ct.uid)
                                                )
                                              }
                                              disabled={!hasAnyPermission}
                                              onCheckedChange={(checked) => {
                                                if (!hasAnyPermission) return;
                                                
                                                const current = settings.entitySubscriptions?.allowedContentTypes || [];
                                                let updated;
                                                
                                                if (current.length === 0) {
                                                  // Currently all allowed - create whitelist with ALL EXCEPT this one
                                                  if (!checked) {
                                                    updated = availableContentTypes
                                                      .filter(t => t.uid !== ct.uid)
                                                      .map(t => t.uid);
                                                  } else {
                                                    // Keep all allowed
                                                    updated = [];
                                                  }
                                                } else {
                                                  // Whitelist exists
                                                  if (checked) {
                                                    // Add to whitelist
                                                    updated = [...current, ct.uid];
                                                  } else {
                                                    // Remove from whitelist
                                                    updated = current.filter(uid => uid !== ct.uid);
                                                  }
                                                }
                                                
                                                updateEntitySubscriptions('allowedContentTypes', updated);
                                              }}
                                            />
                                          ) : (
                                            <Checkbox checked={false} disabled={true} />
                                          )}
                                        </Flex>
                                      </Grid.Item>
                                    </Grid.Root>
                                  </Box>
                                );
                              })}
                            </Box>
                          ) : (
                            <Box padding={4} background="neutral100" hasRadius>
                              <Typography textColor="neutral600">
                                {t('events.noContentTypes', 'No content types found')}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </Accordion.Content>
                  </Accordion.Item>
                );
              })}
            </Accordion.Root>
          ) : (
            <Box padding={4} background="neutral100" hasRadius>
              <Typography textColor="neutral600">
                {t('permissions.noRoles', 'No roles found')}
              </Typography>
            </Box>
          )}

          <Box paddingTop={6} paddingBottom={4}>
            <Divider />
          </Box>

          {/* Redis Adapter */}
          <Box paddingBottom={4}>
            <Typography variant="delta" as="h2">
              {t('redis.title', 'Redis Adapter')}
            </Typography>
            <Typography variant="pi" textColor="neutral600">
              {t('redis.description', 'Enable Redis for multi-server scaling')}
            </Typography>
          </Box>
          <Grid.Root gap={4}>
            <Grid.Item col={4} s={12}>
              <Box
                padding={4}
                background={settings.redis?.enabled ? 'danger100' : 'neutral0'}
                hasRadius
                style={{
                  cursor: 'pointer',
                  border: `2px solid ${settings.redis?.enabled ? '#dc2626' : '#dcdce4'}`,
                  transition: 'all 0.2s ease',
                  minHeight: '110px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                onClick={() => updateRedis('enabled', !settings.redis?.enabled)}
              >
                <Flex gap={3} alignItems="center" style={{ width: '100%' }}>
                  <Toggle
                    checked={settings.redis?.enabled || false}
                    onChange={(e) => updateRedis('enabled', e.target.checked)}
                  />
                  <Flex direction="column" alignItems="flex-start" gap={1}>
                    <Typography
                      variant="omega"
                      fontWeight={settings.redis?.enabled ? 'bold' : 'normal'}
                      textColor={settings.redis?.enabled ? 'danger700' : 'neutral800'}
                    >
                      {t('redis.enable', 'Enable Redis Adapter')}
                    </Typography>
                    <Typography variant="pi" textColor="neutral600" style={{ fontSize: '12px' }}>
                      {settings.redis?.enabled ? '✓ Active' : 'Inactive'}
                    </Typography>
                  </Flex>
                </Flex>
              </Box>
            </Grid.Item>
            {settings.redis?.enabled && (
              <Grid.Item col={6} s={12}>
                <ResponsiveField>
                  <Field.Label>{t('redis.url', 'Redis URL')}</Field.Label>
                  <InputWrapper>
                  <TextInput
                    value={settings.redis?.url || 'redis://localhost:6379'}
                    onChange={(e) => updateRedis('url', e.target.value)}
                    placeholder="redis://localhost:6379"
                  />
                  </InputWrapper>
                </ResponsiveField>
              </Grid.Item>
            )}
          </Grid.Root>

          <Box paddingTop={4} paddingBottom={2}>
            <Divider />
          </Box>

          {/* Namespaces */}
          <ResponsiveSection>
            <ResponsiveSectionTitle variant="delta" as="h2">
              {t('namespaces.title', 'Namespaces')}
            </ResponsiveSectionTitle>
            <Typography variant="pi" textColor="neutral600">
              {t('namespaces.description', 'Create separate Socket.IO endpoints')}
            </Typography>
          </ResponsiveSection>

          <Grid.Root gap={3}>
            <Grid.Item col={6} s={12}>
              <Box
                padding={4}
                background={settings.namespaces?.enabled ? 'secondary100' : 'neutral0'}
                hasRadius
                style={{
                  cursor: 'pointer',
                  border: `2px solid ${settings.namespaces?.enabled ? '#a855f7' : '#dcdce4'}`,
                  transition: 'all 0.2s ease',
                  minHeight: '110px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                onClick={() => updateNamespaces('enabled', !settings.namespaces?.enabled)}
              >
                <Flex gap={3} alignItems="center" style={{ width: '100%' }}>
                  <Toggle
                    checked={settings.namespaces?.enabled || false}
                    onChange={(e) => updateNamespaces('enabled', e.target.checked)}
                  />
                  <Flex direction="column" alignItems="flex-start" gap={1}>
                    <Typography
                      variant="omega"
                      fontWeight={settings.namespaces?.enabled ? 'bold' : 'normal'}
                      textColor={settings.namespaces?.enabled ? 'secondary700' : 'neutral800'}
                    >
                      {t('namespaces.enable', 'Enable Namespaces')}
                    </Typography>
                    <Typography variant="pi" textColor="neutral600" style={{ fontSize: '12px' }}>
                      {settings.namespaces?.enabled ? '✓ Active' : 'Inactive'}
                    </Typography>
                  </Flex>
                </Flex>
              </Box>
            </Grid.Item>

            {settings.namespaces?.enabled && (
              <Grid.Item col={12}>
                <ResponsiveField>
                  <Field.Label>{t('namespaces.list', 'Namespaces')}</Field.Label>
                  <Flex direction={{ base: 'column', tablet: 'row' }} gap={2} paddingBottom={2}>
                    <InputWrapper style={{ flex: 1, width: '100%' }}>
                      <TextInput
                        placeholder="admin"
                        value={newNamespace}
                        onChange={(e) => setNewNamespace(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addNamespace()}
                      />
                    </InputWrapper>
                    <Button onClick={addNamespace} size="L" style={{ width: '100%', maxWidth: '200px', minHeight: '44px' }}>{t('namespaces.add', 'Add')}</Button>
                  </Flex>
                  <Flex gap={2} wrap="wrap" paddingTop={2}>
                    {Object.entries(settings.namespaces?.list || {}).map(([ns, config]) => (
                      <Flex key={ns} gap={1} alignItems="center">
                        <Badge>
                          /{ns}
                          {config.requireAuth && (
                            <span style={{ marginLeft: '4px' }}>🔒</span>
                          )}
                          <Button
                            variant="ghost"
                            size="S"
                            onClick={() => removeNamespace(ns)}
                            style={{ marginLeft: '8px', padding: '0 4px' }}
                          >
                            ×
                          </Button>
                        </Badge>
                        {config.requireAuth && (
                          <Typography variant="pi" textColor="neutral500" style={{ fontSize: '11px' }}>
                            {t('namespaces.authRequired', 'Auth required')}
                          </Typography>
                        )}
                      </Flex>
                    ))}
                  </Flex>
                  <Box paddingTop={2}>
                    <Typography variant="pi" textColor="neutral500">
                      {t('namespaces.hint', 'Examples: admin, chat, notifications')}
                    </Typography>
                  </Box>
                </ResponsiveField>
              </Grid.Item>
            )}
          </Grid.Root>

          <Box paddingTop={4} paddingBottom={2}>
            <Divider />
          </Box>

          {/* Entity Subscriptions - Compact Global Settings */}
          <ResponsiveSection>
            <Flex justifyContent="space-between" alignItems="center">
              <Box>
                <ResponsiveSectionTitle variant="delta" as="h2">
                  {t('entitySubscriptions.title', 'Entity Subscriptions')} 🆕
                </ResponsiveSectionTitle>
                <Typography variant="pi" textColor="neutral600">
                  {t('entitySubscriptions.description', 'Allow clients to subscribe to specific entities')}
                </Typography>
              </Box>
              <Toggle
                checked={settings.entitySubscriptions?.enabled ?? true}
                onChange={(e) => updateEntitySubscriptions('enabled', e.target.checked)}
              />
            </Flex>
          </ResponsiveSection>

          {settings.entitySubscriptions?.enabled && (
            <Box paddingTop={3}>
              <Grid.Root gap={3}>
                <Grid.Item col={4} s={12}>
                  <ResponsiveField>
                    <Field.Label>{t('entitySubscriptions.maxPerSocket', 'Max Per Socket')}</Field.Label>
                    <InputWrapper>
                      <NumberInput
                        value={settings.entitySubscriptions?.maxSubscriptionsPerSocket ?? 100}
                        onValueChange={(value) => updateEntitySubscriptions('maxSubscriptionsPerSocket', value)}
                      />
                    </InputWrapper>
                  </ResponsiveField>
                </Grid.Item>
                <Grid.Item col={4} s={12}>
                  <Flex gap={2} alignItems="center" paddingTop={6}>
                    <Checkbox
                      checked={settings.entitySubscriptions?.requireVerification ?? true}
                      onCheckedChange={(checked) => updateEntitySubscriptions('requireVerification', checked)}
                    />
                    <Typography variant="omega">{t('entitySubscriptions.verify', 'Verify Entity Exists')}</Typography>
                  </Flex>
                </Grid.Item>
                <Grid.Item col={4} s={12}>
                  <Flex gap={2} alignItems="center" paddingTop={6}>
                    <Checkbox
                      checked={settings.entitySubscriptions?.enableMetrics ?? true}
                      onCheckedChange={(checked) => updateEntitySubscriptions('enableMetrics', checked)}
                    />
                    <Typography variant="omega">{t('entitySubscriptions.metrics', 'Track Metrics')}</Typography>
                  </Flex>
                </Grid.Item>
              </Grid.Root>
            </Box>
          )}

          <Box paddingTop={4} paddingBottom={2}>
            <Divider />
          </Box>

          {/* Monitoring Section */}
          <ResponsiveSection>
            <ResponsiveSectionTitle variant="delta" as="h2">
              {t('monitoring.title', 'Monitoring & Logging')}
            </ResponsiveSectionTitle>
          </ResponsiveSection>

          <Grid.Root gap={3}>
            <Grid.Item col={6} s={12}>
              <Box
                padding={4}
                background={settings.monitoring?.enableConnectionLogging ? 'primary100' : 'neutral0'}
                hasRadius
                style={{ cursor: 'pointer', border: `1px solid ${settings.monitoring?.enableConnectionLogging ? '#4945ff' : '#dcdce4'}` }}
                onClick={() => updateMonitoring('enableConnectionLogging', !settings.monitoring?.enableConnectionLogging)}
              >
                <Flex gap={3} alignItems="center">
                  <Checkbox
                    checked={settings.monitoring?.enableConnectionLogging || false}
                    onCheckedChange={(checked) => updateMonitoring('enableConnectionLogging', checked)}
                  />
                  <Flex direction="column" alignItems="flex-start" gap={1}>
                    <Typography variant="omega" fontWeight="bold">
                      {t('monitoring.connectionLogging', 'Connection Logging')}
                    </Typography>
                    <Typography variant="pi" textColor="neutral600">
                      {t('monitoring.connectionLoggingHint', 'Log client connections')}
                    </Typography>
                  </Flex>
                </Flex>
              </Box>
            </Grid.Item>
            <Grid.Item col={4} s={12}>
              <Box
                padding={4}
                background={settings.monitoring?.enableEventLogging ? 'primary100' : 'neutral0'}
                hasRadius
                style={{ cursor: 'pointer', border: `1px solid ${settings.monitoring?.enableEventLogging ? '#4945ff' : '#dcdce4'}` }}
                onClick={() => updateMonitoring('enableEventLogging', !settings.monitoring?.enableEventLogging)}
              >
                <Flex gap={3} alignItems="center">
                  <Checkbox
                    checked={settings.monitoring?.enableEventLogging || false}
                    onCheckedChange={(checked) => updateMonitoring('enableEventLogging', checked)}
                  />
                  <Flex direction="column" alignItems="flex-start" gap={1}>
                    <Typography variant="omega" fontWeight="bold">
                      {t('monitoring.eventLogging', 'Event Logging')}
                    </Typography>
                    <Typography variant="pi" textColor="neutral600">
                      {t('monitoring.eventLoggingHint', 'Log all events for debugging')}
                    </Typography>
                  </Flex>
                </Flex>
              </Box>
            </Grid.Item>
            {settings.monitoring?.enableEventLogging && (
              <Grid.Item col={12} s={12}>
                <ResponsiveField>
                  <InputWrapper>
                <NumberInput
                  label={t('monitoring.maxLogSize', 'Max Log Size')}
                  value={settings.monitoring?.maxEventLogSize || 100}
                  onValueChange={(value) => updateMonitoring('maxEventLogSize', value)}
                />
                  </InputWrapper>
                </ResponsiveField>
              </Grid.Item>
            )}
          </Grid.Root>
        </ResponsiveCard>

        {/* Info Box */}
        <Box marginTop={3} padding={3} background="success100" hasRadius>
          <Flex gap={2} alignItems="center">
            <Check />
            <Typography variant="pi" style={{ fontSize: '13px' }}>
              {t('settings.noRestart', 'Changes are applied immediately – no restart required!')}
            </Typography>
          </Flex>
        </Box>
      </Box>
    </ResponsiveMain>
  );
};

export { SettingsPage };
