import { useState, useEffect, useRef, useCallback } from 'react';
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
  Loader,
  Tag,
} from '@strapi/design-system';
import { Check, Download, Upload, Cross, Plus } from '@strapi/icons';
import { Layouts, useFetchClient, useNotification } from '@strapi/strapi/admin';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { PLUGIN_ID } from '../pluginId';

// ─── Minimal styled overrides (only where DS props are insufficient) ─────────

const ToggleCard = styled(Box)`
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  border: 2px solid ${({ $borderColor, theme }) => theme.colors[$borderColor] || theme.colors.neutral200};
  background: ${({ $bg, theme }) => theme.colors[$bg] || theme.colors.neutral0};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary500};
  }
`;

const HiddenInput = styled.input`
  display: none;
`;

const NumberInputClean = styled.div`
  width: 100%;

  /* Hide native spinners */
  input[type='number'] {
    -moz-appearance: textfield;
    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
  }
  /* Hide Strapi NumberInput inc/dec buttons */
  button[aria-label='Increment'],
  button[aria-label='Decrement'] {
    display: none !important;
  }
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AVAILABLE_ACTIONS = ['create', 'update', 'delete'];
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

/**
 * Validates settings before save.
 * @param {object} s - Settings object
 * @returns {string[]} Array of human-readable error messages
 */
function validateSettings(s) {
  const errors = [];

  s.cors?.origins?.forEach((o) => {
    try {
      new URL(o);
    } catch {
      errors.push(`Invalid origin: ${o}`);
    }
  });

  if (s.connection?.pingTimeout <= 0) errors.push('Ping timeout must be positive');
  if (s.connection?.pingInterval <= 0) errors.push('Ping interval must be positive');
  if (s.connection?.connectionTimeout <= 0) errors.push('Connection timeout must be positive');
  if (s.connection?.maxConnections <= 0) errors.push('Max connections must be positive');
  if (s.redis?.enabled && !s.redis?.url) errors.push('Redis URL is required when Redis is enabled');

  return errors;
}

// ─── Section heading helper ──────────────────────────────────────────────────

function SectionHeading({ title, description, children }) {
  return (
    <Flex justifyContent="space-between" alignItems="center" paddingBottom={4}>
      <Box>
        <Typography variant="delta" tag="h2">
          {title}
        </Typography>
        {description && (
          <Typography variant="pi" textColor="neutral600">
            {description}
          </Typography>
        )}
      </Box>
      {children}
    </Flex>
  );
}

// ─── Feature toggle card ─────────────────────────────────────────────────────

function FeatureToggle({ label, hint, checked, onChange, color = 'primary' }) {
  const bg = checked ? `${color}100` : 'neutral0';
  const border = checked ? `${color}500` : 'neutral200';

  return (
    <ToggleCard
      padding={4}
      hasRadius
      $bg={bg}
      $borderColor={border}
      onClick={() => onChange(!checked)}
    >
      <Flex gap={3} alignItems="center">
        <Toggle checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <Flex direction="column" alignItems="flex-start" gap={1}>
          <Typography variant="omega" fontWeight="semiBold" textColor="neutral800">
            {label}
          </Typography>
          <Typography variant="pi" textColor="neutral600">
            {hint || (checked ? 'Active' : 'Inactive')}
          </Typography>
        </Flex>
      </Flex>
    </ToggleCard>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

const SettingsPage = () => {
  const { get, put } = useFetchClient();
  const { toggleNotification } = useNotification();
  const { formatMessage } = useIntl();

  const t = (id, defaultMessage) =>
    formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [settings, setSettings] = useState(null);
  const [availableContentTypes, setAvailableContentTypes] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [newOrigin, setNewOrigin] = useState('');
  const [newNamespace, setNewNamespace] = useState('');
  const fileInputRef = useRef(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const [settingsRes, ctRes, rolesRes] = await Promise.all([
          get(`/${PLUGIN_ID}/settings`),
          get(`/${PLUGIN_ID}/content-types`),
          get(`/${PLUGIN_ID}/roles`),
        ]);
        if (settingsRes.data?.data) setSettings(settingsRes.data.data);
        if (ctRes.data?.data) setAvailableContentTypes(ctRes.data.data);
        if (rolesRes.data?.data) setAvailableRoles(rolesRes.data.data);
      } catch (err) {
        strapi?.log?.error?.('Error loading IO settings:', err);
        toggleNotification({
          type: 'danger',
          message: t('settings.loadError', 'Error loading settings'),
        });
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ── Generic updaters ───────────────────────────────────────────────────────

  const update = useCallback((updater) => {
    setSettings(updater);
    setHasChanges(true);
  }, []);

  const updateNested = useCallback(
    (section, key, value) => {
      update((prev) => ({
        ...prev,
        [section]: { ...prev[section], [key]: value },
      }));
    },
    [update]
  );

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    const errors = validateSettings(settings);
    if (errors.length > 0) {
      toggleNotification({
        type: 'danger',
        message: `Validation: ${errors.join(', ')}`,
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
    } catch {
      toggleNotification({
        type: 'danger',
        message: t('settings.error', 'Error saving settings'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Export / Import ────────────────────────────────────────────────────────

  const exportSettings = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `socket-io-settings-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toggleNotification({ type: 'success', message: t('settings.exported', 'Settings exported!') });
  };

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
            message: `Import failed: ${errors.join(', ')}`,
          });
          return;
        }
        update(imported);
        toggleNotification({ type: 'success', message: t('settings.imported', 'Settings imported!') });
      } catch {
        toggleNotification({ type: 'danger', message: t('settings.invalidJson', 'Invalid JSON file') });
      }
    };
    reader.readAsText(file);
    event.target.value = null;
  };

  // ── CORS helpers ───────────────────────────────────────────────────────────

  const addOrigin = () => {
    if (!newOrigin || settings.cors?.origins?.includes(newOrigin)) return;
    update((prev) => ({
      ...prev,
      cors: { ...prev.cors, origins: [...(prev.cors?.origins || []), newOrigin] },
    }));
    setNewOrigin('');
  };

  const removeOrigin = (origin) => {
    update((prev) => ({
      ...prev,
      cors: { ...prev.cors, origins: prev.cors?.origins?.filter((o) => o !== origin) || [] },
    }));
  };

  // ── Namespace helpers ──────────────────────────────────────────────────────

  const addNamespace = () => {
    const trimmed = newNamespace.trim();
    if (!trimmed || settings.namespaces?.list?.[trimmed]) return;
    update((prev) => ({
      ...prev,
      namespaces: {
        ...prev.namespaces,
        list: { ...(prev.namespaces?.list || {}), [trimmed]: { requireAuth: false } },
      },
    }));
    setNewNamespace('');
  };

  const removeNamespace = (ns) => {
    update((prev) => {
      const list = { ...prev.namespaces?.list };
      delete list[ns];
      return { ...prev, namespaces: { ...prev.namespaces, list } };
    });
  };

  // ── Bulk content type perms ────────────────────────────────────────────────

  const enableAllContentTypes = (roleType) => {
    const ct = {};
    availableContentTypes.forEach((c) => {
      ct[c.uid] = { create: true, update: true, delete: true };
    });
    update((prev) => ({
      ...prev,
      rolePermissions: {
        ...prev.rolePermissions,
        [roleType]: { ...prev.rolePermissions?.[roleType], contentTypes: ct },
      },
    }));
  };

  const disableAllContentTypes = (roleType) => {
    update((prev) => ({
      ...prev,
      rolePermissions: {
        ...prev.rolePermissions,
        [roleType]: { ...prev.rolePermissions?.[roleType], contentTypes: {} },
      },
    }));
  };

  // ── Loading state ──────────────────────────────────────────────────────────

  if (isLoading || !settings) {
    return (
      <Main>
        <Box padding={8}>
          <Flex justifyContent="center">
            <Loader>{t('loading', 'Loading settings...')}</Loader>
          </Flex>
        </Box>
      </Main>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Main>
      <Layouts.Header
        title={`Socket.IO ${t('settings.title', 'Settings')}`}
        subtitle={t('settings.description', 'Configure the Socket.IO connection for real-time events')}
        primaryAction={
          <Button
            onClick={handleSave}
            loading={isSaving}
            startIcon={<Check />}
            disabled={!hasChanges}
          >
            {hasChanges ? t('settings.saveAndApply', 'Save & Apply') : t('settings.saved', 'Saved')}
          </Button>
        }
        secondaryAction={
          <Flex gap={2}>
            <Button variant="secondary" startIcon={<Download />} onClick={exportSettings} size="S">
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
            <HiddenInput ref={fileInputRef} type="file" accept=".json" onChange={importSettings} />
          </Flex>
        }
      />

      <Layouts.Content>
        <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius>
          {/* ── CORS ─────────────────────────────────────────────────── */}
          <SectionHeading
            title={t('cors.title', 'CORS Settings')}
            description={t('cors.description', 'Configure which frontends can connect')}
          />

          <Field.Root>
            <Field.Label>{t('cors.origins', 'Allowed Origins')}</Field.Label>
            <Flex gap={2} paddingBottom={2}>
              <Box style={{ flex: 1 }}>
                <TextInput
                  placeholder="https://example.com"
                  value={newOrigin}
                  onChange={(e) => setNewOrigin(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addOrigin()}
                />
              </Box>
              <Button onClick={addOrigin} startIcon={<Plus />}>
                {t('cors.add', 'Add')}
              </Button>
            </Flex>
            <Flex gap={2} wrap="wrap" paddingTop={1}>
              {settings.cors?.origins?.map((origin) => (
                <Tag key={origin} icon={<Cross />} onClick={() => removeOrigin(origin)}>
                  {origin}
                </Tag>
              ))}
            </Flex>
            <Field.Hint>{t('cors.originsHint', 'Add frontend URLs that can connect via Socket.IO')}</Field.Hint>
          </Field.Root>

          <Box paddingTop={6} paddingBottom={4}>
            <Divider />
          </Box>

          {/* ── Connection Settings ──────────────────────────────────── */}
          <SectionHeading
            title={t('connection.title', 'Connection Settings')}
            description={t('connection.description', 'Configure connection limits and timeouts')}
          />

          <Grid.Root gap={4}>
            {[
              { key: 'maxConnections', label: t('connection.maxConnections', 'Max Connections'), fallback: 1000 },
              { key: 'pingTimeout', label: t('connection.pingTimeout', 'Ping Timeout (ms)'), fallback: 20000 },
              { key: 'pingInterval', label: t('connection.pingInterval', 'Ping Interval (ms)'), fallback: 25000 },
              { key: 'connectionTimeout', label: t('connection.connectionTimeout', 'Connection Timeout (ms)'), fallback: 45000 },
            ].map(({ key, label, fallback }) => (
              <Grid.Item col={6} s={12} key={key}>
                <Field.Root>
                  <Field.Label>{label}</Field.Label>
                  <NumberInputClean>
                    <NumberInput
                      value={settings.connection?.[key] || fallback}
                      onValueChange={(v) => updateNested('connection', key, parseInt(v) || 0)}
                    />
                  </NumberInputClean>
                </Field.Root>
              </Grid.Item>
            ))}
          </Grid.Root>

          <Box paddingTop={6} paddingBottom={4}>
            <Divider />
          </Box>

          {/* ── Security ─────────────────────────────────────────────── */}
          <SectionHeading
            title={t('security.title', 'Security Settings')}
            description={t('security.description', 'Configure authentication and rate limiting')}
          />

          <Grid.Root gap={4}>
            <Grid.Item col={6} s={12}>
              <FeatureToggle
                label={t('security.requireAuth', 'Require Authentication')}
                checked={settings.security?.requireAuthentication || false}
                onChange={(v) => updateNested('security', 'requireAuthentication', v)}
                color="success"
              />
            </Grid.Item>
            <Grid.Item col={6} s={12}>
              <FeatureToggle
                label={t('security.rateLimiting', 'Rate Limiting')}
                checked={settings.security?.rateLimiting?.enabled || false}
                onChange={(v) =>
                  updateNested('security', 'rateLimiting', {
                    ...settings.security?.rateLimiting,
                    enabled: v,
                  })
                }
                color="warning"
              />
            </Grid.Item>
          </Grid.Root>

          {settings.security?.rateLimiting?.enabled && (
            <Box paddingTop={4}>
              <Grid.Root gap={4}>
                <Grid.Item col={6} s={12}>
                  <Field.Root>
                    <Field.Label>{t('security.maxEventsPerSecond', 'Max Events/Second')}</Field.Label>
                    <NumberInputClean>
                      <NumberInput
                        value={settings.security?.rateLimiting?.maxEventsPerSecond || 10}
                        onValueChange={(v) =>
                          updateNested('security', 'rateLimiting', {
                            ...settings.security?.rateLimiting,
                            maxEventsPerSecond: parseInt(v) || 10,
                          })
                        }
                      />
                    </NumberInputClean>
                  </Field.Root>
                </Grid.Item>
              </Grid.Root>
            </Box>
          )}

          <Box paddingTop={6} paddingBottom={4}>
            <Divider />
          </Box>

          {/* ── Real-time Events ──────────────────────────────────────── */}
          <SectionHeading
            title={t('events.title', 'Real-time Events')}
            description={t('events.description', 'Configure which events are sent for content types')}
          />

          <Grid.Root gap={4}>
            <Grid.Item col={4} s={12}>
              <FeatureToggle
                label={t('events.customNames', 'Custom Event Names')}
                checked={settings.events?.customEventNames || false}
                onChange={(v) => updateNested('events', 'customEventNames', v)}
              />
            </Grid.Item>
            <Grid.Item col={4} s={12}>
              <FeatureToggle
                label={t('events.includeRelations', 'Include Relations')}
                checked={settings.events?.includeRelations || false}
                onChange={(v) => updateNested('events', 'includeRelations', v)}
              />
            </Grid.Item>
            <Grid.Item col={4} s={12}>
              <FeatureToggle
                label={t('events.onlyPublished', 'Only Published Content')}
                checked={settings.events?.onlyPublished || false}
                onChange={(v) => updateNested('events', 'onlyPublished', v)}
              />
            </Grid.Item>
          </Grid.Root>

          <Box paddingTop={6} paddingBottom={4}>
            <Divider />
          </Box>

          {/* ── Role Permissions ──────────────────────────────────────── */}
          <SectionHeading
            title={t('permissions.title', 'Role Permissions')}
            description={t('permissions.description', 'Configure Socket.IO permissions per user role')}
          />

          {availableRoles.length > 0 ? (
            <Accordion.Root>
              {availableRoles.map((role) => {
                const rolePerms = settings.rolePermissions?.[role.type] || {};
                const canConnect = rolePerms.canConnect ?? true;
                const enabledCT = Object.entries(rolePerms.contentTypes || {}).filter(
                  ([, acts]) => acts.create || acts.update || acts.delete
                ).length;

                return (
                  <Accordion.Item key={role.id} value={role.type}>
                    <Accordion.Header>
                      <Accordion.Trigger>
                        <Flex justifyContent="space-between" width="100%" paddingRight={4}>
                          <Flex direction="column" alignItems="flex-start" gap={1}>
                            <Typography variant="omega" fontWeight="bold">
                              {role.name}
                            </Typography>
                            <Typography variant="pi" textColor="neutral600">
                              {enabledCT} {t('permissions.contentTypesEnabled', 'content types enabled')}
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
                        {/* Can Connect */}
                        <Box paddingBottom={4}>
                          <Flex gap={3} alignItems="center">
                            <Checkbox
                              checked={canConnect}
                              onCheckedChange={(checked) =>
                                update((prev) => ({
                                  ...prev,
                                  rolePermissions: {
                                    ...prev.rolePermissions,
                                    [role.type]: { ...prev.rolePermissions?.[role.type], canConnect: checked },
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

                        {/* Allow Credentials */}
                        <Box paddingBottom={4}>
                          <Flex gap={3} alignItems="center">
                            <Checkbox
                              checked={rolePerms.allowCredentials ?? true}
                              onCheckedChange={(checked) =>
                                update((prev) => ({
                                  ...prev,
                                  rolePermissions: {
                                    ...prev.rolePermissions,
                                    [role.type]: { ...prev.rolePermissions?.[role.type], allowCredentials: checked },
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
                          <Flex gap={2} wrap="wrap" paddingTop={2}>
                            {HTTP_METHODS.map((method) => {
                              const isActive = rolePerms.allowedMethods?.includes(method) || false;
                              return (
                                <Box
                                  key={method}
                                  padding={2}
                                  paddingLeft={3}
                                  paddingRight={3}
                                  background={isActive ? 'primary100' : 'neutral100'}
                                  hasRadius
                                  borderColor={isActive ? 'primary600' : 'neutral200'}
                                  style={{ cursor: 'pointer', border: '1px solid' }}
                                  onClick={() => {
                                    const current = rolePerms.allowedMethods || [];
                                    const updated = isActive
                                      ? current.filter((m) => m !== method)
                                      : [...current, method];
                                    update((prev) => ({
                                      ...prev,
                                      rolePermissions: {
                                        ...prev.rolePermissions,
                                        [role.type]: { ...prev.rolePermissions?.[role.type], allowedMethods: updated },
                                      },
                                    }));
                                  }}
                                >
                                  <Flex gap={2} alignItems="center">
                                    <Checkbox checked={isActive} onCheckedChange={() => {}} />
                                    <Typography variant="omega" fontWeight="bold">
                                      {method}
                                    </Typography>
                                  </Flex>
                                </Box>
                              );
                            })}
                          </Flex>
                        </Box>

                        <Divider />

                        {/* Content Type Permissions Table */}
                        <Box paddingTop={4}>
                          <Flex justifyContent="space-between" alignItems="center" paddingBottom={3}>
                            <Typography variant="omega" fontWeight="bold">
                              {t('permissions.contentTypePermissions', 'Content Type Permissions')}
                            </Typography>
                            <Flex gap={2}>
                              <Button size="S" variant="secondary" onClick={() => enableAllContentTypes(role.type)}>
                                {t('permissions.enableAll', 'Enable All')}
                              </Button>
                              <Button size="S" variant="tertiary" onClick={() => disableAllContentTypes(role.type)}>
                                {t('permissions.disableAll', 'Disable All')}
                              </Button>
                            </Flex>
                          </Flex>

                          {availableContentTypes.length > 0 ? (
                            <Box background="neutral0" hasRadius borderColor="neutral200" style={{ border: '1px solid' }}>
                              {/* Table header */}
                              <Box padding={2} background="neutral100" borderColor="neutral200" style={{ borderBottom: '1px solid' }}>
                                <Grid.Root>
                                  <Grid.Item col={4}>
                                    <Typography variant="sigma" textColor="neutral600">CONTENT TYPE</Typography>
                                  </Grid.Item>
                                  {AVAILABLE_ACTIONS.map((action) => (
                                    <Grid.Item col={2} key={action}>
                                      <Flex justifyContent="center">
                                        <Typography variant="sigma" textColor="neutral600">
                                          {action.toUpperCase()}
                                        </Typography>
                                      </Flex>
                                    </Grid.Item>
                                  ))}
                                  <Grid.Item col={2}>
                                    <Flex justifyContent="center">
                                      <Typography variant="sigma" textColor="neutral600">ENTITIES</Typography>
                                    </Flex>
                                  </Grid.Item>
                                </Grid.Root>
                              </Box>

                              {/* Table rows */}
                              {availableContentTypes.map((ct, idx) => {
                                const ctPerms = rolePerms.contentTypes?.[ct.uid] || {};
                                const hasAny = ctPerms.create || ctPerms.update || ctPerms.delete;
                                const entitySubsAllowed =
                                  settings.entitySubscriptions?.allowedContentTypes?.length === 0 ||
                                  settings.entitySubscriptions?.allowedContentTypes?.includes(ct.uid);

                                return (
                                  <Box
                                    key={ct.uid}
                                    padding={2}
                                    borderColor="neutral200"
                                    style={{
                                      borderBottom: idx < availableContentTypes.length - 1 ? '1px solid' : 'none',
                                      opacity: hasAny ? 1 : 0.5,
                                    }}
                                  >
                                    <Grid.Root>
                                      <Grid.Item col={4}>
                                        <Typography variant="omega">{ct.displayName}</Typography>
                                      </Grid.Item>
                                      {AVAILABLE_ACTIONS.map((action) => (
                                        <Grid.Item col={2} key={action}>
                                          <Flex justifyContent="center">
                                            <Checkbox
                                              checked={ctPerms[action] || false}
                                              onCheckedChange={(checked) =>
                                                update((prev) => ({
                                                  ...prev,
                                                  rolePermissions: {
                                                    ...prev.rolePermissions,
                                                    [role.type]: {
                                                      ...prev.rolePermissions?.[role.type],
                                                      contentTypes: {
                                                        ...prev.rolePermissions?.[role.type]?.contentTypes,
                                                        [ct.uid]: {
                                                          ...prev.rolePermissions?.[role.type]?.contentTypes?.[ct.uid],
                                                          [action]: checked,
                                                        },
                                                      },
                                                    },
                                                  },
                                                }))
                                              }
                                            />
                                          </Flex>
                                        </Grid.Item>
                                      ))}
                                      <Grid.Item col={2}>
                                        <Flex justifyContent="center">
                                          {settings.entitySubscriptions?.enabled ? (
                                            <Checkbox
                                              checked={hasAny && entitySubsAllowed}
                                              disabled={!hasAny}
                                              onCheckedChange={(checked) => {
                                                if (!hasAny) return;
                                                const current = settings.entitySubscriptions?.allowedContentTypes || [];
                                                let updated;
                                                if (current.length === 0) {
                                                  updated = checked
                                                    ? []
                                                    : availableContentTypes.filter((x) => x.uid !== ct.uid).map((x) => x.uid);
                                                } else {
                                                  updated = checked
                                                    ? [...current, ct.uid]
                                                    : current.filter((uid) => uid !== ct.uid);
                                                }
                                                updateNested('entitySubscriptions', 'allowedContentTypes', updated);
                                              }}
                                            />
                                          ) : (
                                            <Checkbox checked={false} disabled />
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

          {/* ── Redis Adapter ────────────────────────────────────────── */}
          <SectionHeading
            title={t('redis.title', 'Redis Adapter')}
            description={t('redis.description', 'Enable Redis for multi-server scaling')}
          />

          <Grid.Root gap={4}>
            <Grid.Item col={4} s={12}>
              <FeatureToggle
                label={t('redis.enable', 'Enable Redis Adapter')}
                checked={settings.redis?.enabled || false}
                onChange={(v) => updateNested('redis', 'enabled', v)}
                color="danger"
              />
            </Grid.Item>
            {settings.redis?.enabled && (
              <Grid.Item col={8} s={12}>
                <Field.Root>
                  <Field.Label>{t('redis.url', 'Redis URL')}</Field.Label>
                  <TextInput
                    value={settings.redis?.url || 'redis://localhost:6379'}
                    onChange={(e) => updateNested('redis', 'url', e.target.value)}
                    placeholder="redis://localhost:6379"
                  />
                </Field.Root>
              </Grid.Item>
            )}
          </Grid.Root>

          <Box paddingTop={6} paddingBottom={4}>
            <Divider />
          </Box>

          {/* ── Namespaces ───────────────────────────────────────────── */}
          <SectionHeading
            title={t('namespaces.title', 'Namespaces')}
            description={t('namespaces.description', 'Create separate Socket.IO endpoints')}
          >
            <Toggle
              checked={settings.namespaces?.enabled || false}
              onChange={(e) => updateNested('namespaces', 'enabled', e.target.checked)}
            />
          </SectionHeading>

          {settings.namespaces?.enabled && (
            <Box>
              <Field.Root>
                <Field.Label>{t('namespaces.list', 'Namespaces')}</Field.Label>
                <Flex gap={2} paddingBottom={2}>
                  <Box style={{ flex: 1 }}>
                    <TextInput
                      placeholder="admin"
                      value={newNamespace}
                      onChange={(e) => setNewNamespace(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addNamespace()}
                    />
                  </Box>
                  <Button onClick={addNamespace} startIcon={<Plus />}>
                    {t('namespaces.add', 'Add')}
                  </Button>
                </Flex>
                <Flex gap={2} wrap="wrap" paddingTop={1}>
                  {Object.entries(settings.namespaces?.list || {}).map(([ns, config]) => (
                    <Tag key={ns} icon={<Cross />} onClick={() => removeNamespace(ns)}>
                      /{ns} {config.requireAuth ? '[AUTH]' : ''}
                    </Tag>
                  ))}
                </Flex>
                <Field.Hint>{t('namespaces.hint', 'Examples: admin, chat, notifications')}</Field.Hint>
              </Field.Root>
            </Box>
          )}

          <Box paddingTop={6} paddingBottom={4}>
            <Divider />
          </Box>

          {/* ── Entity Subscriptions ─────────────────────────────────── */}
          <SectionHeading
            title={t('entitySubscriptions.title', 'Entity Subscriptions')}
            description={t('entitySubscriptions.description', 'Allow clients to subscribe to specific entities')}
          >
            <Toggle
              checked={settings.entitySubscriptions?.enabled ?? true}
              onChange={(e) => updateNested('entitySubscriptions', 'enabled', e.target.checked)}
            />
          </SectionHeading>

          {settings.entitySubscriptions?.enabled && (
            <Grid.Root gap={4}>
              <Grid.Item col={4} s={12}>
                <Field.Root>
                  <Field.Label>{t('entitySubscriptions.maxPerSocket', 'Max Per Socket')}</Field.Label>
                  <NumberInputClean>
                    <NumberInput
                      value={settings.entitySubscriptions?.maxSubscriptionsPerSocket ?? 100}
                      onValueChange={(v) => updateNested('entitySubscriptions', 'maxSubscriptionsPerSocket', v)}
                    />
                  </NumberInputClean>
                </Field.Root>
              </Grid.Item>
              <Grid.Item col={4} s={12}>
                <Flex gap={2} alignItems="center" paddingTop={6}>
                  <Checkbox
                    checked={settings.entitySubscriptions?.requireVerification ?? true}
                    onCheckedChange={(v) => updateNested('entitySubscriptions', 'requireVerification', v)}
                  />
                  <Typography variant="omega">{t('entitySubscriptions.verify', 'Verify Entity Exists')}</Typography>
                </Flex>
              </Grid.Item>
              <Grid.Item col={4} s={12}>
                <Flex gap={2} alignItems="center" paddingTop={6}>
                  <Checkbox
                    checked={settings.entitySubscriptions?.enableMetrics ?? true}
                    onCheckedChange={(v) => updateNested('entitySubscriptions', 'enableMetrics', v)}
                  />
                  <Typography variant="omega">{t('entitySubscriptions.metrics', 'Track Metrics')}</Typography>
                </Flex>
              </Grid.Item>
            </Grid.Root>
          )}

          <Box paddingTop={6} paddingBottom={4}>
            <Divider />
          </Box>

          {/* ── Presence System ───────────────────────────────────────── */}
          <SectionHeading
            title={t('presence.title', 'Presence System')}
            description={t('presence.description', 'Real-time collaboration awareness - see who is editing what')}
          >
            <Toggle
              checked={settings.presence?.enabled ?? true}
              onChange={(e) => updateNested('presence', 'enabled', e.target.checked)}
            />
          </SectionHeading>

          {settings.presence?.enabled !== false && (
            <Grid.Root gap={4}>
              <Grid.Item col={4} s={12}>
                <Field.Root>
                  <Field.Label>{t('presence.heartbeat', 'Heartbeat Interval (ms)')}</Field.Label>
                  <NumberInputClean>
                    <NumberInput
                      value={settings.presence?.heartbeatInterval ?? 30000}
                      onValueChange={(v) => updateNested('presence', 'heartbeatInterval', v)}
                    />
                  </NumberInputClean>
                </Field.Root>
              </Grid.Item>
              <Grid.Item col={4} s={12}>
                <Field.Root>
                  <Field.Label>{t('presence.staleTimeout', 'Stale Timeout (ms)')}</Field.Label>
                  <NumberInputClean>
                    <NumberInput
                      value={settings.presence?.staleTimeout ?? 60000}
                      onValueChange={(v) => updateNested('presence', 'staleTimeout', v)}
                    />
                  </NumberInputClean>
                </Field.Root>
              </Grid.Item>
              <Grid.Item col={4} s={12}>
                <Flex gap={2} alignItems="center" paddingTop={6}>
                  <Checkbox
                    checked={settings.presence?.showTypingIndicator ?? true}
                    onCheckedChange={(v) => updateNested('presence', 'showTypingIndicator', v)}
                  />
                  <Typography variant="omega">{t('presence.typing', 'Show Typing Indicators')}</Typography>
                </Flex>
              </Grid.Item>
              <Grid.Item col={12}>
                <Flex gap={2} alignItems="center">
                  <Checkbox
                    checked={settings.presence?.fieldHighlighting ?? false}
                    onCheckedChange={(v) => updateNested('presence', 'fieldHighlighting', v)}
                  />
                  <Flex direction="column" alignItems="flex-start" gap={1}>
                    <Typography variant="omega">
                      {t('presence.fieldHighlighting', 'Field-Level Highlighting')}
                    </Typography>
                    <Typography variant="pi" textColor="neutral600">
                      {t('presence.fieldHighlightingHint', 'Show a colored border and name label on fields where other editors are typing (experimental)')}
                    </Typography>
                  </Flex>
                </Flex>
              </Grid.Item>
            </Grid.Root>
          )}

          <Box paddingTop={6} paddingBottom={4}>
            <Divider />
          </Box>

          {/* ── Live Preview ──────────────────────────────────────────── */}
          <SectionHeading
            title={t('livePreview.title', 'Live Preview')}
            description={t('livePreview.description', 'Real-time preview of draft changes for frontends')}
          >
            <Toggle
              checked={settings.livePreview?.enabled ?? true}
              onChange={(e) => updateNested('livePreview', 'enabled', e.target.checked)}
            />
          </SectionHeading>

          {settings.livePreview?.enabled !== false && (
            <Grid.Root gap={4}>
              <Grid.Item col={4} s={12}>
                <Field.Root>
                  <Field.Label>{t('livePreview.debounce', 'Debounce (ms)')}</Field.Label>
                  <NumberInputClean>
                    <NumberInput
                      value={settings.livePreview?.debounceMs ?? 300}
                      onValueChange={(v) => updateNested('livePreview', 'debounceMs', v)}
                    />
                  </NumberInputClean>
                </Field.Root>
              </Grid.Item>
              <Grid.Item col={4} s={12}>
                <Flex gap={2} alignItems="center" paddingTop={6}>
                  <Checkbox
                    checked={settings.livePreview?.draftEvents ?? true}
                    onCheckedChange={(v) => updateNested('livePreview', 'draftEvents', v)}
                  />
                  <Typography variant="omega">{t('livePreview.draftEvents', 'Emit Draft Events')}</Typography>
                </Flex>
              </Grid.Item>
              <Grid.Item col={4} s={12}>
                <Field.Root>
                  <Field.Label>{t('livePreview.maxSubs', 'Max Subscriptions/Socket')}</Field.Label>
                  <NumberInputClean>
                    <NumberInput
                      value={settings.livePreview?.maxSubscriptionsPerSocket ?? 50}
                      onValueChange={(v) => updateNested('livePreview', 'maxSubscriptionsPerSocket', v)}
                    />
                  </NumberInputClean>
                </Field.Root>
              </Grid.Item>
            </Grid.Root>
          )}

          <Box paddingTop={6} paddingBottom={4}>
            <Divider />
          </Box>

          {/* ── Field-level Changes ───────────────────────────────────── */}
          <SectionHeading
            title={t('fieldChanges.title', 'Field-level Changes')}
            description={t('fieldChanges.description', 'Send only changed fields instead of full entities (bandwidth optimization)')}
          >
            <Toggle
              checked={settings.fieldLevelChanges?.enabled ?? true}
              onChange={(e) => updateNested('fieldLevelChanges', 'enabled', e.target.checked)}
            />
          </SectionHeading>

          {settings.fieldLevelChanges?.enabled !== false && (
            <Grid.Root gap={4}>
              <Grid.Item col={4} s={12}>
                <Flex gap={2} alignItems="center" paddingTop={2}>
                  <Checkbox
                    checked={settings.fieldLevelChanges?.includeFullData ?? false}
                    onCheckedChange={(v) => updateNested('fieldLevelChanges', 'includeFullData', v)}
                  />
                  <Typography variant="omega">{t('fieldChanges.includeFullData', 'Include Full Data')}</Typography>
                </Flex>
              </Grid.Item>
              <Grid.Item col={4} s={12}>
                <Field.Root>
                  <Field.Label>{t('fieldChanges.maxDepth', 'Max Diff Depth')}</Field.Label>
                  <NumberInputClean>
                    <NumberInput
                      value={settings.fieldLevelChanges?.maxDiffDepth ?? 3}
                      onValueChange={(v) => updateNested('fieldLevelChanges', 'maxDiffDepth', v)}
                    />
                  </NumberInputClean>
                </Field.Root>
              </Grid.Item>
            </Grid.Root>
          )}

          <Box paddingTop={6} paddingBottom={4}>
            <Divider />
          </Box>

          {/* ── Monitoring ────────────────────────────────────────────── */}
          <SectionHeading
            title={t('monitoring.title', 'Monitoring & Logging')}
          />

          <Grid.Root gap={4}>
            <Grid.Item col={6} s={12}>
              <FeatureToggle
                label={t('monitoring.connectionLogging', 'Connection Logging')}
                hint={t('monitoring.connectionLoggingHint', 'Log client connections')}
                checked={settings.monitoring?.enableConnectionLogging || false}
                onChange={(v) => updateNested('monitoring', 'enableConnectionLogging', v)}
              />
            </Grid.Item>
            <Grid.Item col={6} s={12}>
              <FeatureToggle
                label={t('monitoring.eventLogging', 'Event Logging')}
                hint={t('monitoring.eventLoggingHint', 'Log all events for debugging')}
                checked={settings.monitoring?.enableEventLogging || false}
                onChange={(v) => updateNested('monitoring', 'enableEventLogging', v)}
              />
            </Grid.Item>
          </Grid.Root>

          {settings.monitoring?.enableEventLogging && (
            <Box paddingTop={4}>
              <Grid.Root gap={4}>
                <Grid.Item col={6} s={12}>
                  <Field.Root>
                    <Field.Label>{t('monitoring.maxLogSize', 'Max Log Size')}</Field.Label>
                    <NumberInputClean>
                      <NumberInput
                        value={settings.monitoring?.maxEventLogSize || 100}
                        onValueChange={(v) => updateNested('monitoring', 'maxEventLogSize', v)}
                      />
                    </NumberInputClean>
                  </Field.Root>
                </Grid.Item>
              </Grid.Root>
            </Box>
          )}
        </Box>

        {/* ── Info banner ──────────────────────────────────────────── */}
        <Box marginTop={4} padding={4} background="success100" hasRadius>
          <Flex gap={2} alignItems="center">
            <Check />
            <Typography variant="pi">
              {t('settings.noRestart', 'Changes are applied immediately - no restart required!')}
            </Typography>
          </Flex>
        </Box>
      </Layouts.Content>
    </Main>
  );
};

export { SettingsPage };
