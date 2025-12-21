import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from "react";
import { B as Box, T as Typography, F as Flex, a as Button, G as Grid, b as Field, c as TextInput, d as Badge, D as Divider, N as NumberInput, e as Toggle, A as Accordion, C as Checkbox, M as Main } from "./index-De9lpNoT.mjs";
import { F as ForwardRef$20, a as ForwardRef$7, b as ForwardRef$2o, P as PLUGIN_ID } from "./index-Dmsc-WDK.mjs";
import { useFetchClient, useNotification } from "@strapi/strapi/admin";
import { u as useIntl } from "./index-CEh8vkxY.mjs";
import styled from "styled-components";
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
const SettingsPage = () => {
  const { get, put } = useFetchClient();
  const { toggleNotification } = useNotification();
  const { formatMessage } = useIntl();
  const t = (id, defaultMessage) => formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [settings, setSettings] = useState({
    enabled: true,
    cors: {
      origins: ["http://localhost:3000"]
    },
    connection: {
      maxConnections: 1e3,
      pingTimeout: 2e4,
      pingInterval: 25e3,
      connectionTimeout: 45e3
    },
    security: {
      requireAuthentication: false,
      rateLimiting: {
        enabled: false,
        maxEventsPerSecond: 10
      },
      ipWhitelist: [],
      ipBlacklist: []
    },
    events: {
      customEventNames: false,
      includeRelations: false,
      excludeFields: [],
      onlyPublished: false
    },
    rooms: {
      autoJoinByRole: {},
      enablePrivateRooms: false
    },
    redis: {
      enabled: false,
      url: "redis://localhost:6379"
    },
    namespaces: {
      enabled: false,
      list: {}
    },
    middleware: {
      enabled: false,
      handlers: []
    },
    monitoring: {
      enableConnectionLogging: true,
      enableEventLogging: false,
      maxEventLogSize: 100
    },
    entitySubscriptions: {
      enabled: true,
      maxSubscriptionsPerSocket: 100,
      requireVerification: true,
      allowedContentTypes: [],
      enableMetrics: true
    }
  });
  const [availableContentTypes, setAvailableContentTypes] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const fileInputRef = useRef(null);
  const validateSettings = (settingsToValidate) => {
    const errors = [];
    settingsToValidate.cors?.origins?.forEach((origin) => {
      try {
        new URL(origin);
      } catch {
        errors.push(t("validation.invalidOrigin", `Invalid origin: ${origin}`));
      }
    });
    if (settingsToValidate.connection?.pingTimeout <= 0) {
      errors.push(t("validation.pingTimeoutPositive", "Ping timeout must be positive"));
    }
    if (settingsToValidate.connection?.pingInterval <= 0) {
      errors.push(t("validation.pingIntervalPositive", "Ping interval must be positive"));
    }
    if (settingsToValidate.connection?.connectionTimeout <= 0) {
      errors.push(t("validation.connectionTimeoutPositive", "Connection timeout must be positive"));
    }
    if (settingsToValidate.connection?.maxConnections <= 0) {
      errors.push(t("validation.maxConnectionsPositive", "Max connections must be positive"));
    }
    if (settingsToValidate.redis?.enabled && !settingsToValidate.redis?.url) {
      errors.push(t("validation.redisUrlRequired", "Redis URL is required when Redis is enabled"));
    }
    return errors;
  };
  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileDefaultName = `socket-io-settings-${Date.now()}.json`;
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
    toggleNotification({
      type: "success",
      message: t("settings.exported", "Settings exported successfully!")
    });
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
            type: "danger",
            message: `${t("settings.importError", "Import failed")}: ${errors.join(", ")}`
          });
          return;
        }
        updateSettings(imported);
        toggleNotification({
          type: "success",
          message: t("settings.imported", "Settings imported successfully!")
        });
      } catch {
        toggleNotification({
          type: "danger",
          message: t("settings.invalidJson", "Invalid settings file!")
        });
      }
    };
    reader.readAsText(file);
    event.target.value = null;
  };
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
            contentTypes
          }
        }
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
          contentTypes: {}
        }
      }
    }));
  };
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsRes, contentTypesRes, rolesRes] = await Promise.all([
          get(`/${PLUGIN_ID}/settings`),
          get(`/${PLUGIN_ID}/content-types`),
          get(`/${PLUGIN_ID}/roles`)
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
        console.error("Error loading settings:", err);
        toggleNotification({
          type: "danger",
          message: t("settings.loadError", "Error loading settings")
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [get, toggleNotification]);
  const handleSave = async () => {
    const errors = validateSettings(settings);
    if (errors.length > 0) {
      toggleNotification({
        type: "danger",
        message: `${t("validation.errors", "Validation errors")}: ${errors.join(", ")}`
      });
      return;
    }
    setIsSaving(true);
    try {
      await put(`/${PLUGIN_ID}/settings`, settings);
      setHasChanges(false);
      toggleNotification({
        type: "success",
        message: t("settings.success", "Settings saved successfully!")
      });
    } catch (err) {
      console.error("Error saving settings:", err);
      toggleNotification({
        type: "danger",
        message: t("settings.error", "Error saving settings")
      });
    } finally {
      setIsSaving(false);
    }
  };
  const updateSettings = (updater) => {
    setSettings(updater);
    setHasChanges(true);
  };
  const httpMethods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
  const [newOrigin, setNewOrigin] = useState("");
  const [newNamespace, setNewNamespace] = useState("");
  const addOrigin = () => {
    if (newOrigin && !settings.cors?.origins?.includes(newOrigin)) {
      updateSettings((prev) => ({
        ...prev,
        cors: {
          ...prev.cors,
          origins: [...prev.cors?.origins || [], newOrigin]
        }
      }));
      setNewOrigin("");
    }
  };
  const removeOrigin = (origin) => {
    updateSettings((prev) => ({
      ...prev,
      cors: {
        ...prev.cors,
        origins: prev.cors?.origins?.filter((o) => o !== origin) || []
      }
    }));
  };
  const updateConnection = (key, value) => {
    updateSettings((prev) => ({
      ...prev,
      connection: {
        ...prev.connection,
        [key]: parseInt(value) || 0
      }
    }));
  };
  const updateSecurity = (key, value) => {
    updateSettings((prev) => ({
      ...prev,
      security: {
        ...prev.security,
        [key]: value
      }
    }));
  };
  const updateEvents = (key, value) => {
    updateSettings((prev) => ({
      ...prev,
      events: {
        ...prev.events,
        [key]: value
      }
    }));
  };
  const updateMonitoring = (key, value) => {
    updateSettings((prev) => ({
      ...prev,
      monitoring: {
        ...prev.monitoring,
        [key]: value
      }
    }));
  };
  const updateEntitySubscriptions = (key, value) => {
    updateSettings((prev) => ({
      ...prev,
      entitySubscriptions: {
        ...prev.entitySubscriptions,
        [key]: value
      }
    }));
  };
  const updateRedis = (key, value) => {
    updateSettings((prev) => ({
      ...prev,
      redis: {
        ...prev.redis,
        [key]: value
      }
    }));
  };
  const updateNamespaces = (key, value) => {
    updateSettings((prev) => ({
      ...prev,
      namespaces: {
        ...prev.namespaces,
        [key]: value
      }
    }));
  };
  const addNamespace = () => {
    const trimmed = newNamespace.trim();
    console.log("addNamespace called, newNamespace:", trimmed);
    console.log("current list:", settings.namespaces?.list);
    if (!trimmed) {
      console.log("Empty namespace name");
      return;
    }
    const currentList = settings.namespaces?.list || {};
    if (currentList[trimmed]) {
      console.log("Namespace already exists");
      return;
    }
    updateSettings((prev) => ({
      ...prev,
      namespaces: {
        enabled: prev.namespaces?.enabled || false,
        list: {
          ...currentList,
          [trimmed]: { requireAuth: false }
        }
      }
    }));
    setNewNamespace("");
    console.log("Namespace added:", trimmed);
  };
  const removeNamespace = (namespace) => {
    updateSettings((prev) => {
      const newList = { ...prev.namespaces?.list };
      delete newList[namespace];
      return {
        ...prev,
        namespaces: {
          ...prev.namespaces,
          list: newList
        }
      };
    });
  };
  if (isLoading) {
    return /* @__PURE__ */ jsx(ResponsiveMain, { children: /* @__PURE__ */ jsx(Box, { padding: 8, children: /* @__PURE__ */ jsx(Typography, { children: "Loading..." }) }) });
  }
  return /* @__PURE__ */ jsx(ResponsiveMain, { children: /* @__PURE__ */ jsxs(Box, { padding: 8, background: "neutral100", children: [
    /* @__PURE__ */ jsx(ResponsiveHeader, { children: /* @__PURE__ */ jsxs(Flex, { direction: { base: "column", tablet: "row" }, justifyContent: "space-between", alignItems: { base: "flex-start", tablet: "center" }, gap: 3, children: [
      /* @__PURE__ */ jsxs(Box, { children: [
        /* @__PURE__ */ jsxs(ResponsiveTitle, { variant: "alpha", as: "h1", children: [
          t("plugin.name", "Socket.IO"),
          " ",
          t("settings.title", "Settings")
        ] }),
        /* @__PURE__ */ jsx(ResponsiveSubtitle, { variant: "epsilon", textColor: "neutral600", children: t("settings.description", "Configure the Socket.IO connection for real-time events") })
      ] }),
      /* @__PURE__ */ jsxs(ResponsiveButtonGroup, { children: [
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "secondary",
            startIcon: /* @__PURE__ */ jsx(ForwardRef$20, {}),
            onClick: exportSettings,
            size: "S",
            children: t("settings.export", "Export")
          }
        ),
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "secondary",
            startIcon: /* @__PURE__ */ jsx(ForwardRef$7, {}),
            onClick: () => fileInputRef.current?.click(),
            size: "S",
            children: t("settings.import", "Import")
          }
        ),
        /* @__PURE__ */ jsx(
          "input",
          {
            ref: fileInputRef,
            type: "file",
            accept: ".json",
            onChange: importSettings,
            style: { display: "none" }
          }
        ),
        /* @__PURE__ */ jsx(
          Button,
          {
            onClick: handleSave,
            loading: isSaving,
            startIcon: /* @__PURE__ */ jsx(ForwardRef$2o, {}),
            disabled: !hasChanges,
            size: "S",
            children: hasChanges ? t("settings.saveAndApply", "Save & Apply") : t("settings.saved", "Saved")
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs(ResponsiveCard, { background: "neutral0", shadow: "filterShadow", hasRadius: true, children: [
      /* @__PURE__ */ jsxs(ResponsiveSection, { children: [
        /* @__PURE__ */ jsx(ResponsiveSectionTitle, { variant: "delta", as: "h2", children: t("cors.title", "CORS Origins") }),
        /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral600", children: t("cors.description", "Configure which frontend URLs are allowed to connect") })
      ] }),
      /* @__PURE__ */ jsx(Grid.Root, { gap: 4, children: /* @__PURE__ */ jsx(Grid.Item, { col: 12, children: /* @__PURE__ */ jsxs(ResponsiveField, { children: [
        /* @__PURE__ */ jsx(Field.Label, { children: t("cors.origins", "Allowed Origins") }),
        /* @__PURE__ */ jsxs(Flex, { direction: { base: "column", tablet: "row" }, gap: 2, paddingBottom: 2, children: [
          /* @__PURE__ */ jsx(InputWrapper, { style: { flex: 1, width: "100%" }, children: /* @__PURE__ */ jsx(
            TextInput,
            {
              placeholder: "http://localhost:3000",
              value: newOrigin,
              onChange: (e) => setNewOrigin(e.target.value),
              onKeyPress: (e) => e.key === "Enter" && addOrigin()
            }
          ) }),
          /* @__PURE__ */ jsx(Button, { onClick: addOrigin, size: "L", style: { width: "100%", maxWidth: "200px", minHeight: "44px" }, children: t("cors.add", "Add") })
        ] }),
        /* @__PURE__ */ jsx(Flex, { gap: 2, wrap: "wrap", paddingTop: 2, children: settings.cors?.origins?.map((origin) => /* @__PURE__ */ jsxs(Badge, { onClick: () => removeOrigin(origin), style: { cursor: "pointer", fontSize: "13px", padding: "6px 12px" }, children: [
          origin,
          " ✕"
        ] }, origin)) }),
        /* @__PURE__ */ jsx(Field.Hint, { children: t("cors.originsHint", "Add multiple frontend URLs that can connect") })
      ] }) }) }),
      /* @__PURE__ */ jsx(Box, { paddingTop: 4, paddingBottom: 2, children: /* @__PURE__ */ jsx(Divider, {}) }),
      /* @__PURE__ */ jsxs(ResponsiveSection, { children: [
        /* @__PURE__ */ jsx(ResponsiveSectionTitle, { variant: "delta", as: "h2", children: t("connection.title", "Connection Settings") }),
        /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral600", children: t("connection.description", "Configure connection limits and timeouts") })
      ] }),
      /* @__PURE__ */ jsxs(Grid.Root, { gap: 3, children: [
        /* @__PURE__ */ jsx(Grid.Item, { col: 6, s: 12, children: /* @__PURE__ */ jsxs(ResponsiveField, { children: [
          /* @__PURE__ */ jsx(Field.Label, { children: t("connection.maxConnections", "Max Connections") }),
          /* @__PURE__ */ jsx(InputWrapper, { children: /* @__PURE__ */ jsx(
            NumberInput,
            {
              value: settings.connection?.maxConnections || 1e3,
              onValueChange: (value) => updateConnection("maxConnections", value)
            }
          ) })
        ] }) }),
        /* @__PURE__ */ jsx(Grid.Item, { col: 6, s: 12, children: /* @__PURE__ */ jsxs(ResponsiveField, { children: [
          /* @__PURE__ */ jsx(Field.Label, { children: t("connection.pingTimeout", "Ping Timeout (ms)") }),
          /* @__PURE__ */ jsx(InputWrapper, { children: /* @__PURE__ */ jsx(
            NumberInput,
            {
              value: settings.connection?.pingTimeout || 2e4,
              onValueChange: (value) => updateConnection("pingTimeout", value)
            }
          ) })
        ] }) }),
        /* @__PURE__ */ jsx(Grid.Item, { col: 6, s: 12, children: /* @__PURE__ */ jsxs(ResponsiveField, { children: [
          /* @__PURE__ */ jsx(Field.Label, { children: t("connection.pingInterval", "Ping Interval (ms)") }),
          /* @__PURE__ */ jsx(InputWrapper, { children: /* @__PURE__ */ jsx(
            NumberInput,
            {
              value: settings.connection?.pingInterval || 25e3,
              onValueChange: (value) => updateConnection("pingInterval", value)
            }
          ) })
        ] }) }),
        /* @__PURE__ */ jsx(Grid.Item, { col: 6, s: 12, children: /* @__PURE__ */ jsxs(ResponsiveField, { children: [
          /* @__PURE__ */ jsx(Field.Label, { children: t("connection.connectionTimeout", "Connection Timeout (ms)") }),
          /* @__PURE__ */ jsx(InputWrapper, { children: /* @__PURE__ */ jsx(
            NumberInput,
            {
              value: settings.connection?.connectionTimeout || 45e3,
              onValueChange: (value) => updateConnection("connectionTimeout", value)
            }
          ) })
        ] }) })
      ] }),
      /* @__PURE__ */ jsx(Box, { paddingTop: 4, paddingBottom: 2, children: /* @__PURE__ */ jsx(Divider, {}) }),
      /* @__PURE__ */ jsxs(ResponsiveSection, { children: [
        /* @__PURE__ */ jsx(ResponsiveSectionTitle, { variant: "delta", as: "h2", children: t("security.title", "Security Settings") }),
        /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral600", children: t("security.description", "Configure authentication and rate limiting") })
      ] }),
      /* @__PURE__ */ jsxs(Grid.Root, { gap: 3, children: [
        /* @__PURE__ */ jsx(Grid.Item, { col: 6, s: 12, children: /* @__PURE__ */ jsx(
          Box,
          {
            padding: 4,
            background: settings.security?.requireAuthentication ? "success100" : "neutral0",
            hasRadius: true,
            style: {
              cursor: "pointer",
              border: `2px solid ${settings.security?.requireAuthentication ? "#5cb176" : "#dcdce4"}`,
              transition: "all 0.2s ease",
              minHeight: "110px",
              display: "flex",
              alignItems: "center"
            },
            onClick: () => updateSecurity("requireAuthentication", !settings.security?.requireAuthentication),
            children: /* @__PURE__ */ jsxs(Flex, { gap: 3, alignItems: "center", style: { width: "100%" }, children: [
              /* @__PURE__ */ jsx(
                Toggle,
                {
                  checked: settings.security?.requireAuthentication || false,
                  onChange: (e) => updateSecurity("requireAuthentication", e.target.checked)
                }
              ),
              /* @__PURE__ */ jsxs(Flex, { direction: "column", alignItems: "flex-start", gap: 1, children: [
                /* @__PURE__ */ jsx(
                  Typography,
                  {
                    variant: "omega",
                    fontWeight: settings.security?.requireAuthentication ? "bold" : "normal",
                    textColor: settings.security?.requireAuthentication ? "success700" : "neutral800",
                    children: t("security.requireAuth", "Require Authentication")
                  }
                ),
                /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral600", style: { fontSize: "12px" }, children: settings.security?.requireAuthentication ? "✓ Active" : "Inactive" })
              ] })
            ] })
          }
        ) }),
        /* @__PURE__ */ jsx(Grid.Item, { col: 4, s: 12, children: /* @__PURE__ */ jsx(
          Box,
          {
            padding: 4,
            background: settings.security?.rateLimiting?.enabled ? "warning100" : "neutral0",
            hasRadius: true,
            style: {
              cursor: "pointer",
              border: `2px solid ${settings.security?.rateLimiting?.enabled ? "#f59e0b" : "#dcdce4"}`,
              transition: "all 0.2s ease",
              minHeight: "110px",
              display: "flex",
              alignItems: "center"
            },
            onClick: () => updateSecurity("rateLimiting", { ...settings.security?.rateLimiting, enabled: !settings.security?.rateLimiting?.enabled }),
            children: /* @__PURE__ */ jsxs(Flex, { gap: 3, alignItems: "center", style: { width: "100%" }, children: [
              /* @__PURE__ */ jsx(
                Toggle,
                {
                  checked: settings.security?.rateLimiting?.enabled || false,
                  onChange: (e) => updateSecurity("rateLimiting", { ...settings.security?.rateLimiting, enabled: e.target.checked })
                }
              ),
              /* @__PURE__ */ jsxs(Flex, { direction: "column", alignItems: "flex-start", gap: 1, children: [
                /* @__PURE__ */ jsx(
                  Typography,
                  {
                    variant: "omega",
                    fontWeight: settings.security?.rateLimiting?.enabled ? "bold" : "normal",
                    textColor: settings.security?.rateLimiting?.enabled ? "warning700" : "neutral800",
                    children: t("security.rateLimiting", "Enable Rate Limiting")
                  }
                ),
                /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral600", style: { fontSize: "12px" }, children: settings.security?.rateLimiting?.enabled ? "✓ Active" : "Inactive" })
              ] })
            ] })
          }
        ) }),
        settings.security?.rateLimiting?.enabled && /* @__PURE__ */ jsx(Grid.Item, { col: 6, s: 12, children: /* @__PURE__ */ jsx(
          NumberInput,
          {
            label: t("security.maxEventsPerSecond", "Max Events/Second"),
            value: settings.security?.rateLimiting?.maxEventsPerSecond || 10,
            onValueChange: (value) => updateSecurity("rateLimiting", { ...settings.security?.rateLimiting, maxEventsPerSecond: value })
          }
        ) })
      ] }),
      /* @__PURE__ */ jsx(Box, { paddingTop: 4, paddingBottom: 2, children: /* @__PURE__ */ jsx(Divider, {}) }),
      /* @__PURE__ */ jsxs(ResponsiveSection, { children: [
        /* @__PURE__ */ jsx(ResponsiveSectionTitle, { variant: "delta", as: "h2", children: t("events.title", "Event Configuration") }),
        /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral600", children: t("events.description", "Global event settings") })
      ] }),
      /* @__PURE__ */ jsxs(Grid.Root, { gap: 3, children: [
        /* @__PURE__ */ jsx(Grid.Item, { col: 4, s: 12, children: /* @__PURE__ */ jsx(
          Box,
          {
            padding: 4,
            background: settings.events?.customEventNames ? "primary100" : "neutral0",
            hasRadius: true,
            style: {
              cursor: "pointer",
              border: `2px solid ${settings.events?.customEventNames ? "#4945ff" : "#dcdce4"}`,
              transition: "all 0.2s ease",
              minHeight: "110px",
              display: "flex",
              alignItems: "center"
            },
            onClick: () => updateEvents("customEventNames", !settings.events?.customEventNames),
            children: /* @__PURE__ */ jsxs(Flex, { gap: 3, alignItems: "center", style: { width: "100%" }, children: [
              /* @__PURE__ */ jsx(
                Toggle,
                {
                  checked: settings.events?.customEventNames || false,
                  onChange: (e) => updateEvents("customEventNames", e.target.checked)
                }
              ),
              /* @__PURE__ */ jsxs(Flex, { direction: "column", alignItems: "flex-start", gap: 1, children: [
                /* @__PURE__ */ jsx(
                  Typography,
                  {
                    variant: "omega",
                    fontWeight: settings.events?.customEventNames ? "bold" : "normal",
                    textColor: settings.events?.customEventNames ? "primary700" : "neutral800",
                    children: t("events.customNames", "Use Custom Event Names")
                  }
                ),
                /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral600", style: { fontSize: "12px" }, children: settings.events?.customEventNames ? "✓ Active" : "Inactive" })
              ] })
            ] })
          }
        ) }),
        /* @__PURE__ */ jsx(Grid.Item, { col: 4, s: 12, children: /* @__PURE__ */ jsx(
          Box,
          {
            padding: 4,
            background: settings.events?.includeRelations ? "primary100" : "neutral0",
            hasRadius: true,
            style: {
              cursor: "pointer",
              border: `2px solid ${settings.events?.includeRelations ? "#4945ff" : "#dcdce4"}`,
              transition: "all 0.2s ease",
              minHeight: "110px",
              display: "flex",
              alignItems: "center"
            },
            onClick: () => updateEvents("includeRelations", !settings.events?.includeRelations),
            children: /* @__PURE__ */ jsxs(Flex, { gap: 3, alignItems: "center", style: { width: "100%" }, children: [
              /* @__PURE__ */ jsx(
                Toggle,
                {
                  checked: settings.events?.includeRelations || false,
                  onChange: (e) => updateEvents("includeRelations", e.target.checked)
                }
              ),
              /* @__PURE__ */ jsxs(Flex, { direction: "column", alignItems: "flex-start", gap: 1, children: [
                /* @__PURE__ */ jsx(
                  Typography,
                  {
                    variant: "omega",
                    fontWeight: settings.events?.includeRelations ? "bold" : "normal",
                    textColor: settings.events?.includeRelations ? "primary700" : "neutral800",
                    children: t("events.includeRelations", "Include Relations")
                  }
                ),
                /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral600", style: { fontSize: "12px" }, children: settings.events?.includeRelations ? "✓ Active" : "Inactive" })
              ] })
            ] })
          }
        ) }),
        /* @__PURE__ */ jsx(Grid.Item, { col: 4, s: 12, children: /* @__PURE__ */ jsx(
          Box,
          {
            padding: 4,
            background: settings.events?.onlyPublished ? "primary100" : "neutral0",
            hasRadius: true,
            style: {
              cursor: "pointer",
              border: `2px solid ${settings.events?.onlyPublished ? "#4945ff" : "#dcdce4"}`,
              transition: "all 0.2s ease",
              minHeight: "110px",
              display: "flex",
              alignItems: "center"
            },
            onClick: () => updateEvents("onlyPublished", !settings.events?.onlyPublished),
            children: /* @__PURE__ */ jsxs(Flex, { gap: 3, alignItems: "center", style: { width: "100%" }, children: [
              /* @__PURE__ */ jsx(
                Toggle,
                {
                  checked: settings.events?.onlyPublished || false,
                  onChange: (e) => updateEvents("onlyPublished", e.target.checked)
                }
              ),
              /* @__PURE__ */ jsxs(Flex, { direction: "column", alignItems: "flex-start", gap: 1, children: [
                /* @__PURE__ */ jsx(
                  Typography,
                  {
                    variant: "omega",
                    fontWeight: settings.events?.onlyPublished ? "bold" : "normal",
                    textColor: settings.events?.onlyPublished ? "primary700" : "neutral800",
                    children: t("events.onlyPublished", "Only Published Content")
                  }
                ),
                /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral600", style: { fontSize: "12px" }, children: settings.events?.onlyPublished ? "✓ Active" : "Inactive" })
              ] })
            ] })
          }
        ) })
      ] }),
      /* @__PURE__ */ jsx(Box, { paddingTop: 4, paddingBottom: 2, children: /* @__PURE__ */ jsx(Divider, {}) }),
      /* @__PURE__ */ jsxs(ResponsiveSection, { children: [
        /* @__PURE__ */ jsx(ResponsiveSectionTitle, { variant: "delta", as: "h2", children: t("permissions.title", "Role Permissions") }),
        /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral600", children: t("permissions.description", "Configure Socket.IO permissions per user role") })
      ] }),
      availableRoles.length > 0 ? /* @__PURE__ */ jsx(Accordion.Root, { children: availableRoles.map((role) => {
        const rolePerms = settings.rolePermissions?.[role.type] || {};
        const canConnect = rolePerms.canConnect ?? true;
        const enabledContentTypes = Object.entries(rolePerms.contentTypes || {}).filter(
          ([uid, actions]) => actions.create || actions.update || actions.delete
        ).length;
        return /* @__PURE__ */ jsxs(Accordion.Item, { value: role.type, children: [
          /* @__PURE__ */ jsx(Accordion.Header, { children: /* @__PURE__ */ jsx(Accordion.Trigger, { children: /* @__PURE__ */ jsxs(Flex, { justifyContent: "space-between", width: "100%", paddingRight: 4, alignItems: "flex-start", children: [
            /* @__PURE__ */ jsxs(Flex, { direction: "column", alignItems: "flex-start", gap: 1, children: [
              /* @__PURE__ */ jsx(Typography, { variant: "omega", fontWeight: "bold", children: role.name }),
              /* @__PURE__ */ jsxs(Typography, { variant: "pi", textColor: "neutral600", children: [
                "(",
                enabledContentTypes,
                " ",
                t("permissions.contentTypesEnabled", "content types enabled"),
                ")"
              ] })
            ] }),
            /* @__PURE__ */ jsx(Badge, { active: canConnect, children: canConnect ? t("permissions.canConnect", "Can Connect") : t("permissions.blocked", "Blocked") })
          ] }) }) }),
          /* @__PURE__ */ jsx(Accordion.Content, { children: /* @__PURE__ */ jsxs(Box, { padding: 4, background: "neutral100", children: [
            /* @__PURE__ */ jsx(Box, { paddingBottom: 4, children: /* @__PURE__ */ jsxs(Flex, { gap: 3, alignItems: "center", children: [
              /* @__PURE__ */ jsx(
                Checkbox,
                {
                  checked: canConnect,
                  onCheckedChange: (checked) => updateSettings((prev) => ({
                    ...prev,
                    rolePermissions: {
                      ...prev.rolePermissions,
                      [role.type]: {
                        ...prev.rolePermissions?.[role.type],
                        canConnect: checked
                      }
                    }
                  }))
                }
              ),
              /* @__PURE__ */ jsxs(Flex, { direction: "column", alignItems: "flex-start", gap: 1, children: [
                /* @__PURE__ */ jsx(Typography, { variant: "omega", fontWeight: "bold", children: t("permissions.allowConnection", "Allow Connection") }),
                /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral600", children: t("permissions.allowConnectionHint", "Users with this role can connect to Socket.IO") })
              ] })
            ] }) }),
            /* @__PURE__ */ jsx(Box, { paddingBottom: 4, children: /* @__PURE__ */ jsxs(Flex, { gap: 3, alignItems: "center", children: [
              /* @__PURE__ */ jsx(
                Checkbox,
                {
                  checked: rolePerms.allowCredentials ?? true,
                  onCheckedChange: (checked) => updateSettings((prev) => ({
                    ...prev,
                    rolePermissions: {
                      ...prev.rolePermissions,
                      [role.type]: {
                        ...prev.rolePermissions?.[role.type],
                        allowCredentials: checked
                      }
                    }
                  }))
                }
              ),
              /* @__PURE__ */ jsxs(Flex, { direction: "column", alignItems: "flex-start", gap: 1, children: [
                /* @__PURE__ */ jsx(Typography, { variant: "omega", fontWeight: "bold", children: t("permissions.allowCredentials", "Allow Credentials") }),
                /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral600", children: t("permissions.allowCredentialsHint", "Allow cookies and auth headers") })
              ] })
            ] }) }),
            /* @__PURE__ */ jsxs(Box, { paddingBottom: 4, children: [
              /* @__PURE__ */ jsx(Typography, { variant: "omega", fontWeight: "bold", paddingBottom: 2, children: t("permissions.allowedMethods", "Allowed HTTP Methods") }),
              /* @__PURE__ */ jsx(Flex, { gap: 2, wrap: "wrap", children: httpMethods.map((method) => /* @__PURE__ */ jsx(
                Box,
                {
                  padding: 2,
                  paddingLeft: 3,
                  paddingRight: 3,
                  background: rolePerms.allowedMethods?.includes(method) ? "primary100" : "neutral100",
                  hasRadius: true,
                  style: {
                    cursor: "pointer",
                    border: `1px solid ${rolePerms.allowedMethods?.includes(method) ? "#4945ff" : "#dcdce4"}`
                  },
                  onClick: () => {
                    const current = rolePerms.allowedMethods || [];
                    const updated = current.includes(method) ? current.filter((m) => m !== method) : [...current, method];
                    updateSettings((prev) => ({
                      ...prev,
                      rolePermissions: {
                        ...prev.rolePermissions,
                        [role.type]: {
                          ...prev.rolePermissions?.[role.type],
                          allowedMethods: updated
                        }
                      }
                    }));
                  },
                  children: /* @__PURE__ */ jsxs(Flex, { gap: 2, alignItems: "center", children: [
                    /* @__PURE__ */ jsx(
                      Checkbox,
                      {
                        checked: rolePerms.allowedMethods?.includes(method) || false,
                        onCheckedChange: () => {
                        }
                      }
                    ),
                    /* @__PURE__ */ jsx(Typography, { variant: "omega", fontWeight: "bold", children: method })
                  ] })
                },
                method
              )) })
            ] }),
            /* @__PURE__ */ jsx(Divider, {}),
            /* @__PURE__ */ jsxs(Box, { paddingTop: 4, children: [
              /* @__PURE__ */ jsxs(Flex, { justifyContent: "space-between", alignItems: "center", paddingBottom: 3, children: [
                /* @__PURE__ */ jsx(Typography, { variant: "omega", fontWeight: "bold", children: t("permissions.contentTypePermissions", "Content Type Permissions") }),
                /* @__PURE__ */ jsxs(Flex, { gap: 2, children: [
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      size: "S",
                      variant: "secondary",
                      onClick: () => enableAllContentTypes(role.type),
                      children: t("permissions.enableAll", "Enable All")
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      size: "S",
                      variant: "tertiary",
                      onClick: () => disableAllContentTypes(role.type),
                      children: t("permissions.disableAll", "Disable All")
                    }
                  )
                ] })
              ] }),
              availableContentTypes.length > 0 ? /* @__PURE__ */ jsxs(Box, { background: "neutral0", hasRadius: true, style: { border: "1px solid #dcdce4" }, children: [
                /* @__PURE__ */ jsx(Box, { padding: 2, background: "neutral100", style: { borderBottom: "1px solid #dcdce4" }, children: /* @__PURE__ */ jsxs(Grid.Root, { children: [
                  /* @__PURE__ */ jsx(Grid.Item, { col: 4, children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", textColor: "neutral600", children: t("events.contentType", "CONTENT TYPE") }) }),
                  /* @__PURE__ */ jsx(Grid.Item, { col: 2, children: /* @__PURE__ */ jsx(Flex, { justifyContent: "center", children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", textColor: "neutral600", children: t("events.create", "CREATE") }) }) }),
                  /* @__PURE__ */ jsx(Grid.Item, { col: 2, children: /* @__PURE__ */ jsx(Flex, { justifyContent: "center", children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", textColor: "neutral600", children: t("events.update", "UPDATE") }) }) }),
                  /* @__PURE__ */ jsx(Grid.Item, { col: 2, children: /* @__PURE__ */ jsx(Flex, { justifyContent: "center", children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", textColor: "neutral600", children: t("events.delete", "DELETE") }) }) }),
                  /* @__PURE__ */ jsx(Grid.Item, { col: 2, children: /* @__PURE__ */ jsx(Flex, { justifyContent: "center", children: /* @__PURE__ */ jsxs(Typography, { variant: "sigma", textColor: "neutral600", children: [
                    t("entitySubscriptions.allow", "ENTITIES"),
                    " 🆕"
                  ] }) }) })
                ] }) }),
                availableContentTypes.map((ct, idx) => {
                  const hasAnyPermission = rolePerms.contentTypes?.[ct.uid]?.create || rolePerms.contentTypes?.[ct.uid]?.update || rolePerms.contentTypes?.[ct.uid]?.delete;
                  settings.entitySubscriptions?.allowedContentTypes?.includes(ct.uid) || settings.entitySubscriptions?.allowedContentTypes?.length === 0;
                  return /* @__PURE__ */ jsx(
                    Box,
                    {
                      padding: 2,
                      style: {
                        borderBottom: idx < availableContentTypes.length - 1 ? "1px solid #dcdce4" : "none",
                        opacity: hasAnyPermission ? 1 : 0.5
                      },
                      children: /* @__PURE__ */ jsxs(Grid.Root, { children: [
                        /* @__PURE__ */ jsx(Grid.Item, { col: 4, children: /* @__PURE__ */ jsx(Typography, { variant: "omega", children: ct.displayName }) }),
                        /* @__PURE__ */ jsx(Grid.Item, { col: 2, children: /* @__PURE__ */ jsx(Flex, { justifyContent: "center", children: /* @__PURE__ */ jsx(
                          Checkbox,
                          {
                            checked: rolePerms.contentTypes?.[ct.uid]?.create || false,
                            onCheckedChange: (checked) => updateSettings((prev) => ({
                              ...prev,
                              rolePermissions: {
                                ...prev.rolePermissions,
                                [role.type]: {
                                  ...prev.rolePermissions?.[role.type],
                                  contentTypes: {
                                    ...prev.rolePermissions?.[role.type]?.contentTypes,
                                    [ct.uid]: {
                                      ...prev.rolePermissions?.[role.type]?.contentTypes?.[ct.uid],
                                      create: checked
                                    }
                                  }
                                }
                              }
                            }))
                          }
                        ) }) }),
                        /* @__PURE__ */ jsx(Grid.Item, { col: 2, children: /* @__PURE__ */ jsx(Flex, { justifyContent: "center", children: /* @__PURE__ */ jsx(
                          Checkbox,
                          {
                            checked: rolePerms.contentTypes?.[ct.uid]?.update || false,
                            onCheckedChange: (checked) => updateSettings((prev) => ({
                              ...prev,
                              rolePermissions: {
                                ...prev.rolePermissions,
                                [role.type]: {
                                  ...prev.rolePermissions?.[role.type],
                                  contentTypes: {
                                    ...prev.rolePermissions?.[role.type]?.contentTypes,
                                    [ct.uid]: {
                                      ...prev.rolePermissions?.[role.type]?.contentTypes?.[ct.uid],
                                      update: checked
                                    }
                                  }
                                }
                              }
                            }))
                          }
                        ) }) }),
                        /* @__PURE__ */ jsx(Grid.Item, { col: 2, children: /* @__PURE__ */ jsx(Flex, { justifyContent: "center", children: /* @__PURE__ */ jsx(
                          Checkbox,
                          {
                            checked: rolePerms.contentTypes?.[ct.uid]?.delete || false,
                            onCheckedChange: (checked) => updateSettings((prev) => ({
                              ...prev,
                              rolePermissions: {
                                ...prev.rolePermissions,
                                [role.type]: {
                                  ...prev.rolePermissions?.[role.type],
                                  contentTypes: {
                                    ...prev.rolePermissions?.[role.type]?.contentTypes,
                                    [ct.uid]: {
                                      ...prev.rolePermissions?.[role.type]?.contentTypes?.[ct.uid],
                                      delete: checked
                                    }
                                  }
                                }
                              }
                            }))
                          }
                        ) }) }),
                        /* @__PURE__ */ jsx(Grid.Item, { col: 2, children: /* @__PURE__ */ jsx(Flex, { justifyContent: "center", children: settings.entitySubscriptions?.enabled ? /* @__PURE__ */ jsx(
                          Checkbox,
                          {
                            checked: hasAnyPermission && (settings.entitySubscriptions?.allowedContentTypes?.length === 0 || settings.entitySubscriptions?.allowedContentTypes?.includes(ct.uid)),
                            disabled: !hasAnyPermission,
                            onCheckedChange: (checked) => {
                              if (!hasAnyPermission) return;
                              const current = settings.entitySubscriptions?.allowedContentTypes || [];
                              let updated;
                              if (current.length === 0) {
                                if (!checked) {
                                  updated = availableContentTypes.filter((t2) => t2.uid !== ct.uid).map((t2) => t2.uid);
                                } else {
                                  updated = [];
                                }
                              } else {
                                if (checked) {
                                  updated = [...current, ct.uid];
                                } else {
                                  updated = current.filter((uid) => uid !== ct.uid);
                                }
                              }
                              updateEntitySubscriptions("allowedContentTypes", updated);
                            }
                          }
                        ) : /* @__PURE__ */ jsx(Checkbox, { checked: false, disabled: true }) }) })
                      ] })
                    },
                    ct.uid
                  );
                })
              ] }) : /* @__PURE__ */ jsx(Box, { padding: 4, background: "neutral100", hasRadius: true, children: /* @__PURE__ */ jsx(Typography, { textColor: "neutral600", children: t("events.noContentTypes", "No content types found") }) })
            ] })
          ] }) })
        ] }, role.id);
      }) }) : /* @__PURE__ */ jsx(Box, { padding: 4, background: "neutral100", hasRadius: true, children: /* @__PURE__ */ jsx(Typography, { textColor: "neutral600", children: t("permissions.noRoles", "No roles found") }) }),
      /* @__PURE__ */ jsx(Box, { paddingTop: 6, paddingBottom: 4, children: /* @__PURE__ */ jsx(Divider, {}) }),
      /* @__PURE__ */ jsxs(Box, { paddingBottom: 4, children: [
        /* @__PURE__ */ jsx(Typography, { variant: "delta", as: "h2", children: t("redis.title", "Redis Adapter") }),
        /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral600", children: t("redis.description", "Enable Redis for multi-server scaling") })
      ] }),
      /* @__PURE__ */ jsxs(Grid.Root, { gap: 4, children: [
        /* @__PURE__ */ jsx(Grid.Item, { col: 4, s: 12, children: /* @__PURE__ */ jsx(
          Box,
          {
            padding: 4,
            background: settings.redis?.enabled ? "danger100" : "neutral0",
            hasRadius: true,
            style: {
              cursor: "pointer",
              border: `2px solid ${settings.redis?.enabled ? "#dc2626" : "#dcdce4"}`,
              transition: "all 0.2s ease",
              minHeight: "110px",
              display: "flex",
              alignItems: "center"
            },
            onClick: () => updateRedis("enabled", !settings.redis?.enabled),
            children: /* @__PURE__ */ jsxs(Flex, { gap: 3, alignItems: "center", style: { width: "100%" }, children: [
              /* @__PURE__ */ jsx(
                Toggle,
                {
                  checked: settings.redis?.enabled || false,
                  onChange: (e) => updateRedis("enabled", e.target.checked)
                }
              ),
              /* @__PURE__ */ jsxs(Flex, { direction: "column", alignItems: "flex-start", gap: 1, children: [
                /* @__PURE__ */ jsx(
                  Typography,
                  {
                    variant: "omega",
                    fontWeight: settings.redis?.enabled ? "bold" : "normal",
                    textColor: settings.redis?.enabled ? "danger700" : "neutral800",
                    children: t("redis.enable", "Enable Redis Adapter")
                  }
                ),
                /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral600", style: { fontSize: "12px" }, children: settings.redis?.enabled ? "✓ Active" : "Inactive" })
              ] })
            ] })
          }
        ) }),
        settings.redis?.enabled && /* @__PURE__ */ jsx(Grid.Item, { col: 6, s: 12, children: /* @__PURE__ */ jsxs(ResponsiveField, { children: [
          /* @__PURE__ */ jsx(Field.Label, { children: t("redis.url", "Redis URL") }),
          /* @__PURE__ */ jsx(InputWrapper, { children: /* @__PURE__ */ jsx(
            TextInput,
            {
              value: settings.redis?.url || "redis://localhost:6379",
              onChange: (e) => updateRedis("url", e.target.value),
              placeholder: "redis://localhost:6379"
            }
          ) })
        ] }) })
      ] }),
      /* @__PURE__ */ jsx(Box, { paddingTop: 4, paddingBottom: 2, children: /* @__PURE__ */ jsx(Divider, {}) }),
      /* @__PURE__ */ jsxs(ResponsiveSection, { children: [
        /* @__PURE__ */ jsx(ResponsiveSectionTitle, { variant: "delta", as: "h2", children: t("namespaces.title", "Namespaces") }),
        /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral600", children: t("namespaces.description", "Create separate Socket.IO endpoints") })
      ] }),
      /* @__PURE__ */ jsxs(Grid.Root, { gap: 3, children: [
        /* @__PURE__ */ jsx(Grid.Item, { col: 6, s: 12, children: /* @__PURE__ */ jsx(
          Box,
          {
            padding: 4,
            background: settings.namespaces?.enabled ? "secondary100" : "neutral0",
            hasRadius: true,
            style: {
              cursor: "pointer",
              border: `2px solid ${settings.namespaces?.enabled ? "#a855f7" : "#dcdce4"}`,
              transition: "all 0.2s ease",
              minHeight: "110px",
              display: "flex",
              alignItems: "center"
            },
            onClick: () => updateNamespaces("enabled", !settings.namespaces?.enabled),
            children: /* @__PURE__ */ jsxs(Flex, { gap: 3, alignItems: "center", style: { width: "100%" }, children: [
              /* @__PURE__ */ jsx(
                Toggle,
                {
                  checked: settings.namespaces?.enabled || false,
                  onChange: (e) => updateNamespaces("enabled", e.target.checked)
                }
              ),
              /* @__PURE__ */ jsxs(Flex, { direction: "column", alignItems: "flex-start", gap: 1, children: [
                /* @__PURE__ */ jsx(
                  Typography,
                  {
                    variant: "omega",
                    fontWeight: settings.namespaces?.enabled ? "bold" : "normal",
                    textColor: settings.namespaces?.enabled ? "secondary700" : "neutral800",
                    children: t("namespaces.enable", "Enable Namespaces")
                  }
                ),
                /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral600", style: { fontSize: "12px" }, children: settings.namespaces?.enabled ? "✓ Active" : "Inactive" })
              ] })
            ] })
          }
        ) }),
        settings.namespaces?.enabled && /* @__PURE__ */ jsx(Grid.Item, { col: 12, children: /* @__PURE__ */ jsxs(ResponsiveField, { children: [
          /* @__PURE__ */ jsx(Field.Label, { children: t("namespaces.list", "Namespaces") }),
          /* @__PURE__ */ jsxs(Flex, { direction: { base: "column", tablet: "row" }, gap: 2, paddingBottom: 2, children: [
            /* @__PURE__ */ jsx(InputWrapper, { style: { flex: 1, width: "100%" }, children: /* @__PURE__ */ jsx(
              TextInput,
              {
                placeholder: "admin",
                value: newNamespace,
                onChange: (e) => setNewNamespace(e.target.value),
                onKeyPress: (e) => e.key === "Enter" && addNamespace()
              }
            ) }),
            /* @__PURE__ */ jsx(Button, { onClick: addNamespace, size: "L", style: { width: "100%", maxWidth: "200px", minHeight: "44px" }, children: t("namespaces.add", "Add") })
          ] }),
          /* @__PURE__ */ jsx(Flex, { gap: 2, wrap: "wrap", paddingTop: 2, children: Object.entries(settings.namespaces?.list || {}).map(([ns, config]) => /* @__PURE__ */ jsxs(Flex, { gap: 1, alignItems: "center", children: [
            /* @__PURE__ */ jsxs(Badge, { children: [
              "/",
              ns,
              config.requireAuth && /* @__PURE__ */ jsx("span", { style: { marginLeft: "4px" }, children: "🔒" }),
              /* @__PURE__ */ jsx(
                Button,
                {
                  variant: "ghost",
                  size: "S",
                  onClick: () => removeNamespace(ns),
                  style: { marginLeft: "8px", padding: "0 4px" },
                  children: "×"
                }
              )
            ] }),
            config.requireAuth && /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral500", style: { fontSize: "11px" }, children: t("namespaces.authRequired", "Auth required") })
          ] }, ns)) }),
          /* @__PURE__ */ jsx(Box, { paddingTop: 2, children: /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral500", children: t("namespaces.hint", "Examples: admin, chat, notifications") }) })
        ] }) })
      ] }),
      /* @__PURE__ */ jsx(Box, { paddingTop: 4, paddingBottom: 2, children: /* @__PURE__ */ jsx(Divider, {}) }),
      /* @__PURE__ */ jsx(ResponsiveSection, { children: /* @__PURE__ */ jsxs(Flex, { justifyContent: "space-between", alignItems: "center", children: [
        /* @__PURE__ */ jsxs(Box, { children: [
          /* @__PURE__ */ jsxs(ResponsiveSectionTitle, { variant: "delta", as: "h2", children: [
            t("entitySubscriptions.title", "Entity Subscriptions"),
            " 🆕"
          ] }),
          /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral600", children: t("entitySubscriptions.description", "Allow clients to subscribe to specific entities") })
        ] }),
        /* @__PURE__ */ jsx(
          Toggle,
          {
            checked: settings.entitySubscriptions?.enabled ?? true,
            onChange: (e) => updateEntitySubscriptions("enabled", e.target.checked)
          }
        )
      ] }) }),
      settings.entitySubscriptions?.enabled && /* @__PURE__ */ jsx(Box, { paddingTop: 3, children: /* @__PURE__ */ jsxs(Grid.Root, { gap: 3, children: [
        /* @__PURE__ */ jsx(Grid.Item, { col: 4, s: 12, children: /* @__PURE__ */ jsxs(ResponsiveField, { children: [
          /* @__PURE__ */ jsx(Field.Label, { children: t("entitySubscriptions.maxPerSocket", "Max Per Socket") }),
          /* @__PURE__ */ jsx(InputWrapper, { children: /* @__PURE__ */ jsx(
            NumberInput,
            {
              value: settings.entitySubscriptions?.maxSubscriptionsPerSocket ?? 100,
              onValueChange: (value) => updateEntitySubscriptions("maxSubscriptionsPerSocket", value)
            }
          ) })
        ] }) }),
        /* @__PURE__ */ jsx(Grid.Item, { col: 4, s: 12, children: /* @__PURE__ */ jsxs(Flex, { gap: 2, alignItems: "center", paddingTop: 6, children: [
          /* @__PURE__ */ jsx(
            Checkbox,
            {
              checked: settings.entitySubscriptions?.requireVerification ?? true,
              onCheckedChange: (checked) => updateEntitySubscriptions("requireVerification", checked)
            }
          ),
          /* @__PURE__ */ jsx(Typography, { variant: "omega", children: t("entitySubscriptions.verify", "Verify Entity Exists") })
        ] }) }),
        /* @__PURE__ */ jsx(Grid.Item, { col: 4, s: 12, children: /* @__PURE__ */ jsxs(Flex, { gap: 2, alignItems: "center", paddingTop: 6, children: [
          /* @__PURE__ */ jsx(
            Checkbox,
            {
              checked: settings.entitySubscriptions?.enableMetrics ?? true,
              onCheckedChange: (checked) => updateEntitySubscriptions("enableMetrics", checked)
            }
          ),
          /* @__PURE__ */ jsx(Typography, { variant: "omega", children: t("entitySubscriptions.metrics", "Track Metrics") })
        ] }) })
      ] }) }),
      /* @__PURE__ */ jsx(Box, { paddingTop: 4, paddingBottom: 2, children: /* @__PURE__ */ jsx(Divider, {}) }),
      /* @__PURE__ */ jsx(ResponsiveSection, { children: /* @__PURE__ */ jsx(ResponsiveSectionTitle, { variant: "delta", as: "h2", children: t("monitoring.title", "Monitoring & Logging") }) }),
      /* @__PURE__ */ jsxs(Grid.Root, { gap: 3, children: [
        /* @__PURE__ */ jsx(Grid.Item, { col: 6, s: 12, children: /* @__PURE__ */ jsx(
          Box,
          {
            padding: 4,
            background: settings.monitoring?.enableConnectionLogging ? "primary100" : "neutral0",
            hasRadius: true,
            style: { cursor: "pointer", border: `1px solid ${settings.monitoring?.enableConnectionLogging ? "#4945ff" : "#dcdce4"}` },
            onClick: () => updateMonitoring("enableConnectionLogging", !settings.monitoring?.enableConnectionLogging),
            children: /* @__PURE__ */ jsxs(Flex, { gap: 3, alignItems: "center", children: [
              /* @__PURE__ */ jsx(
                Checkbox,
                {
                  checked: settings.monitoring?.enableConnectionLogging || false,
                  onCheckedChange: (checked) => updateMonitoring("enableConnectionLogging", checked)
                }
              ),
              /* @__PURE__ */ jsxs(Flex, { direction: "column", alignItems: "flex-start", gap: 1, children: [
                /* @__PURE__ */ jsx(Typography, { variant: "omega", fontWeight: "bold", children: t("monitoring.connectionLogging", "Connection Logging") }),
                /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral600", children: t("monitoring.connectionLoggingHint", "Log client connections") })
              ] })
            ] })
          }
        ) }),
        /* @__PURE__ */ jsx(Grid.Item, { col: 4, s: 12, children: /* @__PURE__ */ jsx(
          Box,
          {
            padding: 4,
            background: settings.monitoring?.enableEventLogging ? "primary100" : "neutral0",
            hasRadius: true,
            style: { cursor: "pointer", border: `1px solid ${settings.monitoring?.enableEventLogging ? "#4945ff" : "#dcdce4"}` },
            onClick: () => updateMonitoring("enableEventLogging", !settings.monitoring?.enableEventLogging),
            children: /* @__PURE__ */ jsxs(Flex, { gap: 3, alignItems: "center", children: [
              /* @__PURE__ */ jsx(
                Checkbox,
                {
                  checked: settings.monitoring?.enableEventLogging || false,
                  onCheckedChange: (checked) => updateMonitoring("enableEventLogging", checked)
                }
              ),
              /* @__PURE__ */ jsxs(Flex, { direction: "column", alignItems: "flex-start", gap: 1, children: [
                /* @__PURE__ */ jsx(Typography, { variant: "omega", fontWeight: "bold", children: t("monitoring.eventLogging", "Event Logging") }),
                /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral600", children: t("monitoring.eventLoggingHint", "Log all events for debugging") })
              ] })
            ] })
          }
        ) }),
        settings.monitoring?.enableEventLogging && /* @__PURE__ */ jsx(Grid.Item, { col: 12, s: 12, children: /* @__PURE__ */ jsx(ResponsiveField, { children: /* @__PURE__ */ jsx(InputWrapper, { children: /* @__PURE__ */ jsx(
          NumberInput,
          {
            label: t("monitoring.maxLogSize", "Max Log Size"),
            value: settings.monitoring?.maxEventLogSize || 100,
            onValueChange: (value) => updateMonitoring("maxEventLogSize", value)
          }
        ) }) }) })
      ] })
    ] }),
    /* @__PURE__ */ jsx(Box, { marginTop: 3, padding: 3, background: "success100", hasRadius: true, children: /* @__PURE__ */ jsxs(Flex, { gap: 2, alignItems: "center", children: [
      /* @__PURE__ */ jsx(ForwardRef$2o, {}),
      /* @__PURE__ */ jsx(Typography, { variant: "pi", style: { fontSize: "13px" }, children: t("settings.noRestart", "Changes are applied immediately – no restart required!") })
    ] }) })
  ] }) });
};
export {
  SettingsPage
};
