"use strict";
const React = require("react");
const jsxRuntime = require("react/jsx-runtime");
const icons = require("@strapi/icons");
const __variableDynamicImportRuntimeHelper = (glob, path, segs) => {
  const v = glob[path];
  if (v) {
    return typeof v === "function" ? v() : Promise.resolve(v);
  }
  return new Promise((_, reject) => {
    (typeof queueMicrotask === "function" ? queueMicrotask : setTimeout)(
      reject.bind(
        null,
        new Error(
          "Unknown variable dynamic import: " + path + (path.split("/").length !== segs ? ". Note that variables only represent file names one level deep." : "")
        )
      )
    );
  });
};
const PLUGIN_ID = "io";
const Initializer = ({ setPlugin }) => {
  const ref = React.useRef(setPlugin);
  React.useEffect(() => {
    ref.current(PLUGIN_ID);
  }, []);
  return null;
};
const PluginIcon = () => /* @__PURE__ */ jsxRuntime.jsx(icons.Server, {});
const index = {
  register(app) {
    app.registerPlugin({
      id: PLUGIN_ID,
      initializer: Initializer,
      isReady: false,
      name: PLUGIN_ID
    });
    app.createSettingSection(
      {
        id: PLUGIN_ID,
        intlLabel: {
          id: `${PLUGIN_ID}.plugin.name`,
          defaultMessage: "Socket.IO"
        }
      },
      [
        {
          intlLabel: {
            id: `${PLUGIN_ID}.settings.title`,
            defaultMessage: "Settings"
          },
          id: `${PLUGIN_ID}-settings`,
          to: `${PLUGIN_ID}/settings`,
          Component: () => Promise.resolve().then(() => require("./SettingsPage-B8_n4TVo.js")).then((mod) => ({ default: mod.SettingsPage }))
        },
        {
          intlLabel: {
            id: `${PLUGIN_ID}.monitoring.title`,
            defaultMessage: "Monitoring"
          },
          id: `${PLUGIN_ID}-monitoring`,
          to: `${PLUGIN_ID}/monitoring`,
          Component: () => Promise.resolve().then(() => require("./MonitoringPage-BCmhbeiy.js")).then((mod) => ({ default: mod.MonitoringPage }))
        }
      ]
    );
    if ("widgets" in app) {
      app.widgets.register({
        icon: PluginIcon,
        title: {
          id: `${PLUGIN_ID}.widget.socket-stats.title`,
          defaultMessage: "Socket.IO Stats"
        },
        component: async () => {
          const component = await Promise.resolve().then(() => require("./SocketStatsWidget-C1-1_VOB.js"));
          return component.SocketStatsWidget;
        },
        id: "socket-io-stats-widget",
        pluginId: PLUGIN_ID
      });
      app.widgets.register({
        icon: PluginIcon,
        title: {
          id: `${PLUGIN_ID}.widget.online-editors.title`,
          defaultMessage: "Who's Online"
        },
        component: async () => {
          const component = await Promise.resolve().then(() => require("./OnlineEditorsWidget-DwY7oXz3.js"));
          return component.OnlineEditorsWidget;
        },
        id: "socket-io-online-editors-widget",
        pluginId: PLUGIN_ID
      });
      console.log(`[${PLUGIN_ID}] [SUCCESS] Dashboard widgets registered`);
    }
  },
  async bootstrap(app) {
    console.log(`[${PLUGIN_ID}] [INFO] Bootstrapping plugin...`);
    try {
      const { default: LivePresencePanel } = await Promise.resolve().then(() => require("./LivePresencePanel-BEKRoHgG.js"));
      const contentManagerPlugin = app.getPlugin("content-manager");
      if (contentManagerPlugin && contentManagerPlugin.apis) {
        contentManagerPlugin.apis.addEditViewSidePanel([LivePresencePanel]);
        console.log(`[${PLUGIN_ID}] [SUCCESS] LivePresencePanel injected into sidebar`);
      }
    } catch (error) {
      console.log(`[${PLUGIN_ID}] [INFO] Content Manager panel injection not available:`, error.message);
    }
  },
  async registerTrads({ locales }) {
    const importedTrads = await Promise.all(
      locales.map((locale) => {
        return __variableDynamicImportRuntimeHelper(/* @__PURE__ */ Object.assign({ "./translations/de.json": () => Promise.resolve().then(() => require("./de-Crne_WJ-.js")), "./translations/en.json": () => Promise.resolve().then(() => require("./en-Bd2IKJzy.js")), "./translations/es.json": () => Promise.resolve().then(() => require("./es-Xj8RgKuQ.js")), "./translations/fr.json": () => Promise.resolve().then(() => require("./fr-D_r96iuZ.js")), "./translations/pt.json": () => Promise.resolve().then(() => require("./pt-Bba2cd2e.js")) }), `./translations/${locale}.json`, 3).then(({ default: data }) => {
          return {
            data: prefixPluginTranslations(data, PLUGIN_ID),
            locale
          };
        }).catch(() => {
          return {
            data: {},
            locale
          };
        });
      })
    );
    return Promise.resolve(importedTrads);
  }
};
const prefixPluginTranslations = (trad, pluginId) => {
  return Object.keys(trad).reduce((acc, current) => {
    acc[`${pluginId}.${current}`] = trad[current];
    return acc;
  }, {});
};
exports.PLUGIN_ID = PLUGIN_ID;
exports.index = index;
