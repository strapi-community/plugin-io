/**
 * React StrictMode harness for the plugin's admin entry points (RFC strapi/strapi#27897 StrictMode,
 * #25739 React 19).
 *
 * `renderStrict(ui)` mounts `ui` inside `<React.StrictMode>` and the provider tree Strapi 5.62
 * uses for its own admin tests (`@strapi/admin/dist/admin/admin/tests/utils.mjs`, `Providers`):
 * data router (createMemoryRouter), StrapiAppProvider, Redux store with `adminApi`,
 * LanguageProvider, Theme (Design System light/dark), NotificationsProvider, AuthProvider,
 * react-query QueryClientProvider, react-dnd DndProvider, GuidedTourContext,
 * ConfigurationProvider and AppInfoProvider. These providers are not in the package's `exports`
 * map, so they are imported by file path; Strapi's own test utils need jest and msw, which this
 * repository does not use. Every `@strapi/strapi/admin` component and hook the plugin imports is
 * the real one: the package loads unchanged through loader.mjs.
 *
 * In StrictMode React mounts every component, runs each effect's cleanup, and mounts again
 * (react.dev/reference/react/StrictMode). Assertions:
 * - `expectNoDuplicateRequests`: no mutation (POST/PUT/PATCH/DELETE) twice, no GET twice unless the
 *   first copy was aborted by the effect cleanup or the test lists it with a reason.
 * - `unmount()` + `expectNoLeaks`: no interval, animation frame, window/document/body listener,
 *   WebSocket/EventSource/BroadcastChannel/socket.io connection or Resize/Intersection observer
 *   left behind, and no pending plugin timeout. Resources Strapi's own providers leave behind
 *   (measured once per file with an empty tree) are not counted.
 * - `expectNoConsole`: no console.error/console.warn and no uncaught error, apart from messages the
 *   providers alone print (measured in the same calibration run).
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { configureStore } from '@reduxjs/toolkit';
import { darkTheme, lightTheme } from '@strapi/design-system';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { QueryClient, QueryClientProvider, setLogger } from 'react-query';
import { Provider as ReduxProvider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { installNetwork, network } from './network.mjs';

export { network };
export { createdSockets } from './fake-socket.mjs';

const harnessDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(harnessDir, '../../..');
const requireFromRepo = createRequire(path.join(repoRoot, 'package.json'));
const adminDist = path.join(
	path.dirname(requireFromRepo.resolve('@strapi/admin/package.json')),
	'dist/admin/admin/src'
);
/**
 * Imports a module of the installed @strapi/admin by file path (same URL as the package's own
 * relative imports, so the same module instance and React contexts).
 * @param {string} file - Path below dist/admin/admin/src.
 * @returns {Promise<object>} Module namespace.
 */
const adminModule = (file) => import(pathToFileURL(path.join(adminDist, file)).href);

const [
	{ GuidedTourContext },
	{ LanguageProvider },
	{ Theme },
	{ RBAC },
	{ AppInfoProvider },
	{ AuthProvider },
	{ _internalConfigurationContextProvider: ConfigurationContextProvider },
	{ NotificationsProvider },
	{ StrapiAppProvider },
	{ reducer },
	{ adminApi },
] = await Promise.all(
	[
		adminModule('components/GuidedTour/Context.mjs'),
		adminModule('components/LanguageProvider.mjs'),
		adminModule('components/Theme.mjs'),
		adminModule('core/apis/rbac.mjs'),
		adminModule('features/AppInfo.mjs'),
		adminModule('features/Auth.mjs'),
		adminModule('features/Configuration.mjs'),
		adminModule('features/Notifications.mjs'),
		adminModule('features/StrapiApp.mjs'),
		'reducer.mjs',
		'services/api.mjs',
	].map((entry) => (typeof entry === 'string' ? adminModule(entry) : entry))
);

setLogger({ log: () => {}, warn: () => {}, error: () => {} });
installNetwork(repoRoot);

const { resources, window } = globalThis.__strictHarness;
const nativeAddListener = window.EventTarget.prototype.addEventListener;

// Console and uncaught errors.
const consoleMessages = [];
for (const level of ['error', 'warn']) {
	const original = console[level].bind(console);
	console[level] = (...args) => {
		const text = args
			.map((arg) => (arg instanceof Error ? arg.stack || arg.message : typeof arg === 'string' ? arg : safeJson(arg)))
			.join(' ');
		consoleMessages.push({ level, text });
		if (process.env.STRICT_HARNESS_VERBOSE) original(...args);
	};
}
nativeAddListener.call(window, 'error', (event) => {
	consoleMessages.push({ level: 'uncaught', text: String(event.error?.stack || event.message) });
});
process.on('unhandledRejection', (reason) => {
	consoleMessages.push({ level: 'unhandledRejection', text: String(reason?.stack || reason) });
});

/**
 * JSON for console arguments, tolerant of cycles.
 * @param {unknown} value - Value.
 * @returns {string} Text.
 */
function safeJson(value) {
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

const ADMIN_USER = {
	id: 1,
	documentId: 'admin-user-1',
	firstname: 'Ada',
	lastname: 'Example',
	username: null,
	email: 'ada@example.test',
	isActive: true,
	blocked: false,
	preferedLanguage: 'en',
	roles: [{ id: 1, name: 'Super Admin', code: 'strapi-super-admin' }],
};

/**
 * Answers the requests Strapi's own providers make (AuthProvider: users/me and permissions).
 * @param {object[]} permissions - Permissions of the signed-in admin.
 */
const installCoreRoutes = (permissions) => {
	network.on('GET', '/admin/users/me', { data: ADMIN_USER });
	network.on('GET', '/admin/users/me/permissions', { data: permissions });
	network.on('POST', '/admin/permissions/check', (call) => ({
		data: (call.json()?.permissions || []).map(() => true),
	}));
};

/**
 * Builds a permission entry as the admin API returns it.
 * @param {string} action - Action uid.
 * @param {string | null} [subject] - Subject uid.
 * @returns {object} Permission.
 */
export const permission = (action, subject = null) => ({
	id: Math.floor(Math.random() * 1e6),
	action,
	subject,
	properties: {},
	conditions: [],
	actionParameters: {},
});

/**
 * Lets effects, fetch promises and short timers run inside `act`.
 * @param {number} [rounds] - Number of macrotask rounds.
 * @param {number} [ms] - Delay per round.
 */
export const settle = async (rounds = 6, ms = 5) => {
	for (let index = 0; index < rounds; index += 1) {
		await React.act(async () => {
			await new Promise((resolve) => setTimeout(resolve, ms));
		});
	}
};

/**
 * Copies the live resource sets.
 * @returns {object} Snapshot of resource identities.
 */
export const snapshotResources = () => ({
	intervals: new Set(resources.intervals.keys()),
	timeouts: new Set(resources.timeouts.keys()),
	frames: new Set(resources.frames.keys()),
	listeners: new Set(resources.listeners.keys()),
	sockets: new Set(resources.sockets),
	observers: new Set(resources.observers),
});

/**
 * Resources created after `before` that still exist.
 * @param {object} before - Snapshot taken before mounting.
 * @returns {Array<{ kind: string, label: string, origin: string }>} Leftovers.
 */
const leftoversSince = (before) => {
	const out = [];
	for (const [id, entry] of resources.intervals)
		if (!before.intervals.has(id)) out.push({ kind: 'interval', label: `${entry.delay}ms`, origin: entry.origin });
	for (const [id, entry] of resources.timeouts)
		if (!before.timeouts.has(id)) out.push({ kind: 'timeout', label: `${entry.delay}ms`, origin: entry.origin });
	for (const [id, entry] of resources.frames)
		if (!before.frames.has(id)) out.push({ kind: 'animationFrame', label: '', origin: entry.origin });
	for (const [id, entry] of resources.listeners)
		if (!before.listeners.has(id))
			out.push({ kind: 'listener', label: `${entry.target}:${entry.type}`, origin: entry.origin });
	for (const socket of resources.sockets)
		if (!before.sockets.has(socket)) out.push({ kind: socket.kind, label: socket.url, origin: socket.origin });
	for (const observer of resources.observers)
		if (!before.observers.has(observer)) out.push({ kind: observer.kind, label: '', origin: observer.origin });
	return out;
};

const signature = (entry) => `${entry.kind}|${entry.label}|${entry.origin}`;

let calibration = null;

/**
 * Mounts the providers alone once per file and records what they leave behind and print, so the
 * plugin assertions only count the plugin's own resources and messages.
 * @returns {Promise<{ leftovers: Set<string>, messages: Set<string> }>} Baseline.
 */
const calibrate = async () => {
	if (calibration) return calibration;
	calibration = { leftovers: new Set(), messages: new Set() };
	const startMessages = consoleMessages.length;
	const before = snapshotResources();
	const handle = await mount(null, { permissions: [] });
	await handle.unmount();
	for (const entry of leftoversSince(before)) calibration.leftovers.add(signature(entry));
	for (const message of consoleMessages.slice(startMessages)) calibration.messages.add(message.text);
	return calibration;
};

/**
 * Mounts a tree in StrictMode with Strapi's admin providers.
 * @param {React.ReactNode} ui - Tree to render.
 * @param {object} options - See renderStrict.
 * @returns {Promise<object>} Mounted handle.
 */
async function mount(ui, options) {
	const {
		path: initialPath = '/',
		permissions = [],
		strict = true,
		plugins = {},
		getPlugin,
		locale = 'en',
		messages = {},
	} = options;
	installCoreRoutes(permissions);
	window.strapi = {
		backendURL: 'http://localhost:1337',
		isEE: false,
		features: { isEnabled: () => false, SSO: 'sso', AUDIT: 'audit-logs' },
		featureFlags: { isEnabled: () => false },
		future: { isEnabled: () => false },
		flags: { nps: false, promoteEE: false, docLinks: false },
		projectType: 'Community',
		telemetryDisabled: true,
	};
	window.localStorage.setItem('jwtToken', JSON.stringify('harness-token'));

	const store = configureStore({
		preloadedState: {
			admin_app: {
				language: { locale, localeNames: { en: 'English' } },
				permissions: {},
				theme: { availableThemes: [], currentTheme: 'light' },
				token: 'harness-token',
			},
		},
		reducer: { [adminApi.reducerPath]: adminApi.reducer, admin_app: reducer },
		middleware: (getDefaultMiddleware) =>
			getDefaultMiddleware({ immutableCheck: false, serializableCheck: false }).concat(adminApi.middleware),
	});
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const noop = () => {};
	const element = (
		<StrapiAppProvider
			components={{}}
			rbac={new RBAC()}
			widgets={{ widgets: [], getAll: () => [], register: noop }}
			customFields={{ customFields: {}, get: () => undefined, getAll: () => ({}), register: noop }}
			fields={{}}
			menu={[]}
			getAdminInjectedComponents={() => []}
			getPlugin={getPlugin || ((id) => plugins[id])}
			plugins={plugins}
			runHookParallel={noop}
			runHookWaterfall={(_name, initialValue) => initialValue}
			runHookSeries={noop}
			settings={{}}
		>
			<ReduxProvider store={store}>
				<LanguageProvider messages={{ [locale]: messages }}>
					<Theme themes={{ dark: darkTheme, light: lightTheme }}>
						<NotificationsProvider>
							<AuthProvider _defaultPermissions={permissions} _disableRenewToken>
								<QueryClientProvider client={queryClient}>
									<DndProvider backend={HTML5Backend}>
										<GuidedTourContext enabled={false}>
											<ConfigurationContextProvider
												showReleaseNotification={false}
												logos={{ auth: { default: 'default' }, menu: { default: 'default' } }}
												updateProjectSettings={noop}
											>
												<AppInfoProvider
													autoReload
													useYarn={false}
													dependencies={{}}
													strapiVersion="5.62.0"
													communityEdition
													shouldUpdateStrapi={false}
												>
													{ui}
												</AppInfoProvider>
											</ConfigurationContextProvider>
										</GuidedTourContext>
									</DndProvider>
								</QueryClientProvider>
							</AuthProvider>
						</NotificationsProvider>
					</Theme>
				</LanguageProvider>
			</ReduxProvider>
		</StrapiAppProvider>
	);
	const router = createMemoryRouter([{ path: '/*', element }], { initialEntries: [initialPath] });
	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container, {
		onRecoverableError: (error) => consoleMessages.push({ level: 'recoverable', text: String(error?.stack || error) }),
	});
	const tree = <RouterProvider router={router} />;
	await React.act(async () => {
		root.render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
	});
	await settle();
	let mounted = true;
	return {
		container,
		router,
		store,
		queryClient,
		/** Unmounts the tree, tears the harness router/store down and lets cleanups run. */
		async unmount() {
			if (!mounted) return;
			mounted = false;
			await React.act(async () => root.unmount());
			router.dispose();
			queryClient.clear();
			store.dispatch(adminApi.util.resetApiState());
			container.remove();
			window.localStorage.clear();
			await settle(4, 10);
		},
	};
}

/**
 * Renders a plugin entry point in StrictMode with Strapi's admin providers and records what it
 * does while mounting.
 * @param {React.ReactNode} ui - Element to render (page, widget, injected component, side panel).
 * @param {object} [options] - Options.
 * @param {string} [options.path] - Initial router location.
 * @param {object[]} [options.permissions] - Permissions of the admin (see `permission()`).
 * @param {Record<string, object>} [options.plugins] - Plugins for `useStrapiApp().getPlugin`.
 * @param {Record<string, string>} [options.messages] - Translations.
 * @returns {Promise<object>} Handle: container, unmount, mountCalls, before (resource snapshot).
 */
export async function renderStrict(ui, options = {}) {
	await calibrate();
	network.clearCalls();
	const before = snapshotResources();
	const startMessages = consoleMessages.length;
	const handle = await mount(ui, options);
	return {
		...handle,
		/** Unmounts and forgets the test's network routes. */
		async unmount() {
			await handle.unmount();
			network.reset();
		},
		before,
		startMessages,
		/** Requests made while mounting (StrictMode mount, cleanup, mount). */
		mountCalls: [...network.calls],
	};
}

/**
 * Fails when plugin code sent the same mutation twice, or the same GET twice without aborting the
 * first copy and without an explicit allowance.
 * @param {Array<object>} calls - Recorded calls (handle.mountCalls or network.calls).
 * @param {object} [options] - Options.
 * @param {Array<{ path: string | RegExp, reason: string }>} [options.allowDuplicateGets] - GETs the
 *   plugin may repeat (idempotent reads), each with the reason.
 */
export function expectNoDuplicateRequests(calls, { allowDuplicateGets = [] } = {}) {
	const groups = new Map();
	for (const call of calls.filter((entry) => entry.fromPlugin)) {
		const key = `${call.method} ${call.path} ${call.method === 'GET' ? '' : (call.body ?? '')}`;
		if (!groups.has(key)) groups.set(key, []);
		groups.get(key).push(call);
	}
	const problems = [];
	for (const [key, group] of groups) {
		if (group.length < 2) continue;
		const [first] = group;
		if (first.method !== 'GET') {
			problems.push(`${group.length}x ${key.trim()} (mutation sent more than once)`);
			continue;
		}
		const live = group.filter((call) => !call.aborted);
		if (live.length <= 1) continue;
		const allowed = allowDuplicateGets.find((entry) =>
			entry.path instanceof RegExp ? entry.path.test(first.path) : entry.path === first.pathname
		);
		if (allowed) {
			if (!allowed.reason) problems.push(`allowance for ${first.path} has no reason`);
			continue;
		}
		problems.push(`${live.length}x GET ${first.path} (not aborted by the effect cleanup)`);
	}
	if (problems.length) throw new Error(`Duplicate requests in StrictMode:\n  ${problems.join('\n  ')}`);
}

/**
 * Fails when the unmounted tree left resources behind (see module docs).
 * @param {object} handle - Handle from renderStrict (after `await handle.unmount()`).
 * @param {object} [options] - Options.
 * @param {Array<{ match: RegExp, reason: string }>} [options.allow] - Leftovers that are expected,
 *   matched against `kind label origin`, each with a reason.
 */
export function expectNoLeaks(handle, { allow = [] } = {}) {
	const leftovers = leftoversSince(handle.before).filter((entry) => {
		if (calibration.leftovers.has(signature(entry))) return false;
		// A pending timeout is a leak only when plugin code set it (library caches expire on their own).
		if (entry.kind === 'timeout' && entry.origin.startsWith('lib:')) return false;
		// React DOM delegates events on every root and portal container (document.body for
		// dialogs and popovers) and never removes those listeners, by design.
		if (entry.kind === 'listener' && entry.origin.startsWith('lib:react-dom/')) return false;
		const text = `${entry.kind} ${entry.label} ${entry.origin}`;
		return !allow.some((rule) => rule.match.test(text));
	});
	if (leftovers.length) {
		throw new Error(
			`Resources left after unmount:\n  ${leftovers
				.map((entry) => `${entry.kind} ${entry.label} from ${entry.origin}`)
				.join('\n  ')}`
		);
	}
}

/**
 * Fails on console errors/warnings and uncaught errors since the handle was mounted.
 * @param {object} handle - Handle from renderStrict.
 * @param {object} [options] - Options.
 * @param {Array<{ match: RegExp, reason: string }>} [options.allow] - Third-party messages that are
 *   expected, each with a reason.
 */
export function expectNoConsole(handle, { allow = [] } = {}) {
	const messages = consoleMessages
		.slice(handle.startMessages)
		.filter((message) => !calibration.messages.has(message.text))
		.filter((message) => !allow.some((rule) => rule.match.test(message.text)));
	if (messages.length) {
		throw new Error(
			`Console output while mounted:\n  ${messages
				.map((message) => `[${message.level}] ${message.text.split('\n').slice(0, 6).join('\n    ')}`)
				.join('\n  ')}`
		);
	}
}

/**
 * Renders, unmounts and runs all three assertions: the standard StrictMode check of one entry
 * point.
 * @param {React.ReactNode} ui - Element.
 * @param {object} [options] - renderStrict options plus `allowDuplicateGets`, `allowLeaks`,
 *   `allowConsole` and `whileMounted(handle)` (interactions before unmount).
 * @returns {Promise<object>} The unmounted handle (calls, container snapshot).
 */
export async function checkStrictEntry(ui, options = {}) {
	const handle = await renderStrict(ui, options);
	let html;
	let calls;
	try {
		if (options.whileMounted) await options.whileMounted(handle);
	} finally {
		// Unmount also after a failed interaction, so live intervals do not keep the process alive.
		html = handle.container.innerHTML;
		calls = [...network.calls];
		await handle.unmount();
	}
	expectNoConsole(handle, { allow: options.allowConsole });
	expectNoDuplicateRequests(handle.mountCalls, { allowDuplicateGets: options.allowDuplicateGets });
	expectNoLeaks(handle, { allow: options.allowLeaks });
	return { ...handle, html, calls };
}
