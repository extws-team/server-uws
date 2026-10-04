/* eslint-disable jsdoc/require-jsdoc */
// oxlint-disable max-nested-callbacks

import { once } from 'node:events';
import type { ExtWSClient } from '@extws/server';
import fetch from 'node-fetch';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { type RawData, WebSocket } from 'ws';
import {
	extwsServer,
	testBroadcast,
	testGroupJoin,
	testGroupLeave,
	testSendToGroup,
	testSendToSocket,
} from '../test/server.js';

const WEBSOCKET_URL = 'ws://localhost:8080/ws';
const MESSAGE_TIMEOUT_MS = 2000;
const NO_MESSAGE_TIMEOUT_MS = 100;

const ERROR_TIMEOUT = 'Timeout: No message received within the specified time';

/**
 * Wait for a message from the target WebSocket with a timeout.
 * @param target - The target WebSocket.
 * @param timeout_ms - Maximum waiting time in milliseconds.
 * @returns - The received message.
 */
function waitMessage(
	target: WebSocket,
	timeout_ms = MESSAGE_TIMEOUT_MS,
): Promise<string> {
	if (
		target.readyState === WebSocket.CLOSING
		|| target.readyState === WebSocket.CLOSED
	) {
		return Promise.reject(
			new Error('Cannot wait for a message on a closing or closed WebSocket'),
		);
	}

	return new Promise<string>((resolve, reject) => {
		const timeout = setTimeout(onTimeout, timeout_ms);

		function cleanup(): void {
			clearTimeout(timeout);
			target.off('message', onMessage);
			target.off('error', onError);
			target.off('close', onClose);
		}

		function onMessage(data: RawData): void {
			cleanup();

			const message =
				data instanceof ArrayBuffer
					? Buffer.from(data).toString()
					: Array.isArray(data)
						? Buffer.concat(data).toString()
						: data.toString();

			resolve(message);
		}

		function onError(error: Error): void {
			cleanup();
			reject(error);
		}

		function onClose(code: number): void {
			cleanup();
			reject(
				new Error(
					`WebSocket closed before a message was received (code: ${code})`,
				),
			);
		}

		function onTimeout(): void {
			cleanup();
			reject(new Error(ERROR_TIMEOUT));
		}

		target.once('message', onMessage);
		target.once('error', onError);
		target.once('close', onClose);
	});
}

/**
 * Create a WebSocket client and get the corresponding ExtWSClient.
 * @returns - The WebSocket and its corresponding server-side client.
 */
async function createClient(): Promise<{
	websocket: WebSocket;
	extwsClient: ExtWSClient;
}> {
	const websocket = new WebSocket(WEBSOCKET_URL);

	try {
		const init_message = await waitMessage(websocket);
		const client_id = JSON.parse(init_message.slice(1)).id;
		const extwsClient = extwsServer.clients.get(client_id);

		if (!extwsClient) {
			throw new Error(`Server-side client was not found for id: ${client_id}`);
		}

		return {
			websocket,
			extwsClient,
		};
	} catch (error) {
		if (
			websocket.readyState === WebSocket.CONNECTING
			|| websocket.readyState === WebSocket.OPEN
		) {
			if (websocket.readyState === WebSocket.CONNECTING) {
				websocket.once('error', () => {
					/* empty */
				});
			}

			websocket.terminate();
		}

		throw error;
	}
}

let client: Awaited<ReturnType<typeof createClient>>;

beforeAll(async () => {
	client = await createClient();
});

afterAll(() => {
	extwsServer.close();
});

describe('ExtWSUwsServer', () => {
	test('onBeforeUpgrade hook', async () => {
		const response = await fetch(
			`${WEBSOCKET_URL.replace('ws://', 'http://')}?drop=1`,
			{
				headers: {
					Connection: 'Upgrade',
					Upgrade: 'websocket',
					'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
					'Sec-WebSocket-Version': '13',
				},
			},
		);

		expect(response.status).toBe(400);
		expect(response.headers.get('x-test')).toBe('test');
		await expect(response.text()).resolves.toBe('drop');
	});

	test('ping', async () => {
		const promise = waitMessage(client.websocket);

		client.websocket.send('2');

		expect(await promise).toBe('3');
	});

	test('message', async () => {
		const promise = waitMessage(client.websocket);

		client.websocket.send('4hello{"name":"world"}');

		expect(await promise).toBe('4hello{"text":"Hello, world!"}');
	});
});

describe('broadcast', () => {
	test('broadcast', async () => {
		const promise = waitMessage(client.websocket);

		testBroadcast();

		expect(await promise).toBe('4{"foo":"bar"}');
	});
});

describe('groups', () => {
	test('before join any', async () => {
		const promise = waitMessage(client.websocket, NO_MESSAGE_TIMEOUT_MS);

		testSendToGroup('group');

		await expect(promise).rejects.toThrowError(ERROR_TIMEOUT);
	});

	test('joined', async () => {
		const promise = waitMessage(client.websocket);

		testGroupJoin(client.extwsClient, 'group');
		testSendToGroup('group');

		expect(await promise).toBe('4{"foo":"bar"}');
	});

	test('joined to another group', async () => {
		const promise = waitMessage(client.websocket, NO_MESSAGE_TIMEOUT_MS);

		testGroupJoin(client.extwsClient, 'group');
		testSendToGroup('group_another');

		await expect(promise).rejects.toThrowError(ERROR_TIMEOUT);
	});

	test('left', async () => {
		const promise = waitMessage(client.websocket, NO_MESSAGE_TIMEOUT_MS);

		testGroupLeave(client.extwsClient, 'group');
		testSendToGroup('group');

		await expect(promise).rejects.toThrowError(ERROR_TIMEOUT);
	});
});

describe('send to socket', () => {
	test('to existing client', async () => {
		const promise = waitMessage(client.websocket);

		testSendToSocket(client.extwsClient.id);

		expect(await promise).toBe('4{"foo":"bar"}');
	});

	test('to non-existing client', async () => {
		const promise = waitMessage(client.websocket, NO_MESSAGE_TIMEOUT_MS);

		testSendToSocket('777');

		await expect(promise).rejects.toThrowError(ERROR_TIMEOUT);
	});
});

describe('disconnect', () => {
	test('by server', async () => {
		const close_promise = once(client.websocket, 'close', {
			signal: AbortSignal.timeout(MESSAGE_TIMEOUT_MS),
		});

		client.extwsClient.disconnect();

		await close_promise;

		await expect
			.poll(() => extwsServer.clients.size, { timeout: MESSAGE_TIMEOUT_MS })
			.toBe(0);
	});

	test('by client', async () => {
		expect(extwsServer.clients.size).toBe(0);

		const client2 = await createClient();

		expect(extwsServer.clients.size).toBe(1);

		const close_promise = once(client2.websocket, 'close', {
			signal: AbortSignal.timeout(MESSAGE_TIMEOUT_MS),
		});

		client2.websocket.close();

		await close_promise;

		await expect
			.poll(() => extwsServer.clients.size, { timeout: MESSAGE_TIMEOUT_MS })
			.toBe(0);
	});
});
