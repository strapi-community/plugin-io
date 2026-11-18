/**
 * StrictMode checks of every Socket.IO admin entry point: the two settings pages (Settings,
 * Monitoring with its test event dialog), the two homepage widgets, the Content Manager edit view
 * side panel "Live presence" (socket.io-client is the counting fake from harness/fake-socket.mjs)
 * and the plugin initializer. See harness/index.jsx for what each assertion counts.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { act } from 'react';
import { DescriptionComponentRenderer, Form } from '@strapi/strapi/admin';
import {
	checkStrictEntry,
	createdSockets,
	network,
	permission,
	renderStrict,
	settle,
	snapshotResources,
} from './harness/index.jsx';
import SettingsPage from '../../admin/src/pages/Settings';
import MonitoringPage from '../../admin/src/pages/Monitoring';
import StatsWidget from '../../admin/src/components/widgets/StatsWidget';
import OnlineEditorsWidget from '../../admin/src/components/widgets/OnlineEditorsWidget';
import { LivePresencePanel } from '../../admin/src/components/LivePresencePanel';
import { Initializer } from '../../admin/src/components/Initializer';

const require = createRequire(import.meta.url);
const { DEFAULT_SETTINGS } = require('../../server/src/utils/settings-schema.js');

const ALL = ['settings.read', 'settings.update', 'monitoring.read', 'monitoring.manage'].map((action) =>
	permission(`plugin::io.${action}`)
);
const ARTICLE = 'api::article.article';
const NOW = Date.now();
const iso = (secondsAgo) => new Date(NOW - secondsAgo * 1000).toISOString();

const stats = {
	connections: { connected: 3, rooms: 2, byKind: { admin: 1, user: 1, token: 1, public: 0 } },
	events: { totalEvents: 42, eventsPerSecond: 0.5, lastEventAt: iso(5), totalConnections: 9, since: iso(3600) },
	instances: { count: 1, mode: 'single', adapter: 'memory', clusterAdapter: false, warnings: [] },
};
const otherAdmin = {
	id: 2,
	firstname: 'Grace',
	lastname: 'Example',
	username: null,
	connectedAt: iso(60),
	editing: [{ uid: ARTICLE, documentId: 'doc-1', contentTypeName: 'Article', kind: 'collectionType' }],
	hiddenEditing: 0,
};

/** Monitoring and widget routes with synthetic data. */
const monitoringRoutes = () => {
	network.on('GET', '/io/stats', { data: stats });
	network.on('GET', '/io/online-users', {
		data: { admins: [otherAdmin], counts: { admin: 2 } },
		meta: { scope: 'all' },
	});
	network.on('GET', '/io/event-log', {
		data: [{ id: 'ev-1', timestamp: iso(5), event: 'article:update', source: 'content', audiences: 2 }],
		meta: { enabled: true },
	});
};

/**
 * A success toast (Strapi NotificationsProvider, sonner 2.0.7) adds a `visibilitychange` listener
 * to `document` and removes it from `window` (sonner `useIsDocumentHidden`), so every toast leaves
 * one listener behind. Library code, not the plugin.
 */
const TOAST_LISTENER = {
	match: /^listener document:visibilitychange lib:sonner\//,
	reason: 'sonner 2.0.7 (bundled by @strapi/admin) removes its toast listener from the wrong target',
};

/**
 * Clicks an element inside `act` (Design System buttons and Radix triggers handle `click`).
 * @param {Element | null | undefined} element - Element.
 */
const click = async (element) => {
	assert.ok(element, 'element to click exists');
	await act(async () => {
		element.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, button: 0 }));
		element.click();
	});
	await settle(4, 10);
};

/**
 * Finds a button by its accessible label or text anywhere in the document (dialogs render in
 * portals).
 * @param {string} label - Label or text.
 * @returns {HTMLElement | null} Button.
 */
const button = (label) =>
	document.querySelector(`button[aria-label="${label}"]`) ||
	[...document.querySelectorAll('button')].find((node) => node.textContent.trim() === label) ||
	null;

/**
 * Live (not aborted) requests to one path.
 * @param {Array<object>} calls - Recorded calls.
 * @param {string} pathname - Path without query.
 * @returns {Array<object>} Calls.
 */
const live = (calls, pathname) => calls.filter((call) => call.pathname === pathname && !call.aborted);

/** @param {Array<object>} calls - Recorded calls. @returns {Array<object>} Plugin mutations. */
const mutations = (calls) => calls.filter((call) => call.fromPlugin && call.method !== 'GET');

test('settings page: one load per resource, save sends one PUT', async () => {
	network.on('GET', '/io/settings', { data: structuredClone(DEFAULT_SETTINGS), meta: { revision: 4 } });
	network.on('GET', '/io/content-types', {
		data: [{ uid: ARTICLE, displayName: 'Article', draftAndPublish: true }],
	});
	network.on('GET', '/io/roles', {
		data: [{ id: 1, name: 'Authenticated', type: 'authenticated', description: 'Signed-in users' }],
	});
	network.on('PUT', '/io/settings', (call) => {
		const { revision, ...data } = call.json();
		return { data, meta: { revision: revision + 1 } };
	});
	const result = await checkStrictEntry(<SettingsPage />, {
		path: '/settings/io/settings',
		permissions: ALL,
		async whileMounted() {
			assert.match(document.body.textContent, /Article/);
			assert.match(document.body.textContent, /Authenticated/);
			await click(document.querySelector('[role="checkbox"][aria-label="Allow Authenticated to connect"]'));
			await click(button('Save'));
		},
		allowLeaks: [TOAST_LISTENER],
	});
	for (const path of ['/io/settings', '/io/content-types', '/io/roles']) {
		assert.equal(live(result.mountCalls, path).length, 1, `${path} is loaded once`);
	}
	const saves = mutations(result.calls);
	assert.equal(saves.length, 1, 'one PUT per save');
	assert.equal(JSON.parse(saves[0].body).revision, 4);
});

test('monitoring page: polling stops on unmount, no stale refresh error after the remount', async () => {
	monitoringRoutes();
	network.on('POST', '/io/test-event', { data: { sent: true, recipients: 3 } });
	const result = await checkStrictEntry(<MonitoringPage />, {
		path: '/settings/io/monitoring',
		permissions: ALL,
		async whileMounted() {
			assert.match(document.body.textContent, /Grace Example/);
			assert.match(document.body.textContent, /article:update/);
			// StrictMode aborts the first mount's requests; that must not read as a failed refresh.
			assert.doesNotMatch(document.body.textContent, /Refresh failed/);
			await click(button('Send test event'));
			assert.ok(document.querySelector('[role="dialog"]'), 'test event dialog is open');
		},
	});
	for (const path of ['/io/stats', '/io/online-users', '/io/event-log']) {
		assert.equal(live(result.mountCalls, path).length, 1, `${path} is loaded once`);
	}
	assert.equal(mutations(result.calls).length, 0);
});

/**
 * Records every text the document showed while `run` executed (to catch a state that flashes for
 * one render).
 * @param {() => Promise<unknown>} run - Work to observe.
 * @returns {Promise<string[]>} Document texts after each DOM change.
 */
const observeTexts = async (run) => {
	const texts = [];
	const observer = new MutationObserver(() => texts.push(document.body.textContent));
	observer.observe(document.body, { subtree: true, childList: true, characterData: true });
	try {
		await run();
	} finally {
		observer.disconnect();
	}
	return texts;
};

/**
 * Answers like a real server: after 40 ms, so the request StrictMode aborted on its simulated
 * unmount settles before the remount's request does.
 * @param {object} body - Response body.
 * @returns {() => Promise<object>} Route reply.
 */
const slow = (body) => async () => {
	await new Promise((resolve) => setTimeout(resolve, 40));
	return body;
};

test('regression: the request StrictMode aborts is not shown as a load error', async () => {
	network.on('GET', '/io/stats', slow({ data: stats }));
	const widgetTexts = await observeTexts(() => checkStrictEntry(<StatsWidget />, { permissions: ALL }));
	assert.equal(
		widgetTexts.filter((text) => /could not be loaded/.test(text)).length,
		0,
		'the stats widget never shows its error state'
	);

	network.on('GET', '/io/stats', slow({ data: stats }));
	network.on('GET', '/io/online-users', slow({ data: { admins: [], counts: {} }, meta: { scope: 'all' } }));
	network.on('GET', '/io/event-log', slow({ data: [], meta: { enabled: true } }));
	const pageTexts = await observeTexts(() =>
		checkStrictEntry(<MonitoringPage />, {
			path: '/settings/io/monitoring',
			permissions: ALL,
			whileMounted: () => settle(4, 30),
		})
	);
	assert.ok(
		pageTexts.some((text) => /Connected clients/.test(text)),
		'the page rendered its data'
	);
	assert.equal(
		pageTexts.filter((text) => /could not be loaded|Refresh failed/.test(text)).length,
		0,
		'the monitoring page never shows an error'
	);
});

test('monitoring page: three poll intervals while mounted, none after unmount', async () => {
	monitoringRoutes();
	const before = snapshotResources();
	const handle = await renderStrict(<MonitoringPage />, { path: '/settings/io/monitoring', permissions: ALL });
	const { resources } = globalThis.__strictHarness;
	const polls = [...resources.intervals.entries()].filter(([id]) => !before.intervals.has(id));
	assert.deepEqual(polls.map(([, entry]) => entry.delay).sort(), [10000, 10000, 15000]);
	await handle.unmount();
	assert.equal([...resources.intervals.keys()].filter((id) => !before.intervals.has(id)).length, 0);
	assert.equal(
		[...resources.listeners.entries()].filter(
			([id, entry]) => !before.listeners.has(id) && entry.type === 'visibilitychange'
		).length,
		0
	);
});

test('monitoring page: without permission no plugin request', async () => {
	const result = await checkStrictEntry(<MonitoringPage />, { path: '/settings/io/monitoring', permissions: [] });
	assert.equal(result.mountCalls.filter((call) => call.fromPlugin).length, 0);
});

test('homepage widgets: data, empty and error states', async () => {
	monitoringRoutes();
	const statsWidget = await checkStrictEntry(<StatsWidget />, { permissions: ALL });
	assert.match(statsWidget.html, /Connected clients/);
	assert.doesNotMatch(statsWidget.html, /could not be loaded/);
	assert.equal(live(statsWidget.mountCalls, '/io/stats').length, 1);

	monitoringRoutes();
	const online = await checkStrictEntry(<OnlineEditorsWidget />, { permissions: ALL });
	assert.match(online.html, /Grace Example/);
	assert.equal(live(online.mountCalls, '/io/online-users').length, 1);

	network.on('GET', '/io/online-users', { data: { admins: [], counts: {} }, meta: { scope: 'all' } });
	const empty = await checkStrictEntry(<OnlineEditorsWidget />, { permissions: ALL });
	assert.match(empty.html, /No other admins are editing right now/);

	network.on('GET', '/io/stats', { status: 500, body: { error: { status: 500 } } });
	const failed = await checkStrictEntry(<StatsWidget />, { permissions: ALL });
	assert.match(failed.html, /could not be loaded/);
});

/**
 * The edit view side panel as the Content Manager renders it: a description component inside
 * DescriptionComponentRenderer, below the edit view Form.
 * @param {{ documentId?: string }} props - Edit view props.
 * @returns {JSX.Element} Panel host.
 */
const PanelHost = ({ documentId }) => (
	<Form method="PUT" initialValues={{ title: 'Hello' }}>
		<DescriptionComponentRenderer
			props={{ model: ARTICLE, documentId, collectionType: 'collection-types', activeTab: 'draft' }}
			descriptions={[LivePresencePanel]}
		>
			{(panels) =>
				panels.map((panel) => (
					<section key={panel.id} aria-label={panel.title}>
						{panel.content}
					</section>
				))
			}
		</DescriptionComponentRenderer>
	</Form>
);

const presenceSession = { enabled: true, token: 'one-time-token', wsPath: '/socket.io', showTypingIndicator: true };

test('live presence panel: one session and one socket despite the StrictMode remount, closed on unmount', async () => {
	network.on('POST', '/io/presence/session', { data: presenceSession });
	const socketsBefore = createdSockets.length;
	const result = await checkStrictEntry(<PanelHost documentId="doc-1" />, {
		path: `/content-manager/collection-types/${ARTICLE}/doc-1`,
		permissions: ALL,
		async whileMounted() {
			// The panel starts 150 ms after mounting, so the throwaway StrictMode mount opens nothing.
			await act(async () => new Promise((resolve) => setTimeout(resolve, 250)));
			const sockets = createdSockets.slice(socketsBefore);
			assert.equal(sockets.length, 1, 'one socket');
			const [socket] = sockets;
			await act(async () => socket.receive('connect'));
			assert.deepEqual(
				socket.emitted.map((entry) => entry.event),
				['presence:join']
			);
			await act(async () =>
				socket.receive('presence:update', { uid: ARTICLE, documentId: 'doc-1', editors: [otherAdmin] })
			);
			await settle(4, 30);
			assert.match(document.body.textContent, /Grace Example/);
		},
	});
	assert.equal(mutations(result.calls).length, 1, 'one session token request');
	const [socket] = createdSockets.slice(socketsBefore);
	assert.equal(socket.connected, false, 'disconnected on unmount');
	assert.equal(socket.handlers.size, 0, 'every socket listener removed');
	assert.deepEqual(
		socket.emitted.map((entry) => entry.event),
		['presence:join', 'presence:leave']
	);
});

test('live presence panel: a socket still connecting closes once the handshake settles', async () => {
	network.on('POST', '/io/presence/session', { data: presenceSession });
	const socketsBefore = createdSockets.length;
	const handle = await renderStrict(<PanelHost documentId="doc-1" />, {
		path: `/content-manager/collection-types/${ARTICLE}/doc-1`,
		permissions: ALL,
	});
	await act(async () => new Promise((resolve) => setTimeout(resolve, 250)));
	const [socket] = createdSockets.slice(socketsBefore);
	assert.ok(socket, 'socket created');
	// A real socket.io socket is not `connected` until the handshake completes.
	socket.connected = false;
	await handle.unmount();
	assert.equal(socket.disconnected, false, 'not closed while connecting');
	socket.receive('connect');
	assert.equal(socket.disconnected, true, 'closed once the handshake settles');
	network.reset();
});

test('live presence panel: hidden on the create view and when presence is off', async () => {
	const create = await checkStrictEntry(<PanelHost />, {
		path: `/content-manager/collection-types/${ARTICLE}/create`,
		permissions: ALL,
		whileMounted: () => act(async () => new Promise((resolve) => setTimeout(resolve, 250))),
	});
	assert.equal(create.calls.filter((call) => call.fromPlugin).length, 0);

	network.on('POST', '/io/presence/session', { data: { enabled: false } });
	const socketsBefore = createdSockets.length;
	const off = await checkStrictEntry(<PanelHost documentId="doc-1" />, {
		path: `/content-manager/collection-types/${ARTICLE}/doc-1`,
		permissions: ALL,
		whileMounted: () => act(async () => new Promise((resolve) => setTimeout(resolve, 250))),
	});
	assert.doesNotMatch(off.html, /Live presence/);
	assert.equal(createdSockets.length, socketsBefore, 'no socket when presence is off');
});

test('initializer: registers the plugin once per mount', async () => {
	const ids = [];
	await checkStrictEntry(<Initializer setPlugin={(id) => ids.push(id)} />, { permissions: ALL });
	// StrictMode runs the effect twice; registering twice is idempotent in Strapi (setPlugin sets isReady).
	assert.ok(ids.length >= 1 && ids.every((id) => id === 'io'));
});
