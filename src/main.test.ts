import { type ExtWSClient } from '@extws/server';
import {
	describe,
	test,
	expect,
	afterAll,
} from 'vitest';
import {
	extwsServer,
	testBroadcast,
	testGroupJoin,
	testGroupLeave,
	testSendToGroup,
	testSendToSocket,
} from '../test/server.js';
import { WebSocket } from 'ws';

const WEBSOCKET_URL = 'ws://localhost:8080/ws';
const ERROR_TIMEOUT = 'Timeout: No message received within the specified time';

/**
 * Wait for a message from the target WebSocket with a timeout.
 * @param target - The target WebSocket.
 * @returns - A promise that resolves with the message or rejects on timeout.
 */
function waitMessage(target: WebSocket): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		const timeout = setTimeout(
			() => {
				reject(new Error(ERROR_TIMEOUT));
			},
			100,
		);

		target.once(
			'message',
			(data) => {
				const message = data instanceof ArrayBuffer
					? Buffer.from(data).toString()
					: (data instanceof Buffer
						? data.toString()
						: Buffer.concat(data).toString());

				clearTimeout(timeout);
				resolve(message);
			},
		);
	});
}

/**
 * Create a WebSocket client and get the corresponding ExtWSClient.
 * @returns -
 */
async function createClient(): Promise<{
	websocket: WebSocket,
	extwsClient: ExtWSClient,
}> {
	const websocket = new WebSocket(WEBSOCKET_URL);
	const init_message_promise = waitMessage(websocket);
	await new Promise((resolve) => {
		websocket.once(
			'open',
			resolve,
		);
	});

	const init_message = await init_message_promise;
	const client_id = JSON.parse(init_message.slice(1)).id;

	const extwsClient = extwsServer.clients.get(client_id)!;

	return {
		websocket,
		extwsClient,
	};
}

const client = await createClient();

afterAll(async () => {
	await new Promise((resolve) => {
		setTimeout(resolve, 100);
	});

	// TODO:
	// extwsServer.close();
});

describe('ExtWSBunServer', () => {
	test('ping', async () => {
		const promise = waitMessage(client.websocket);

		client.websocket.send('2');

		expect(
			await promise,
		).toBe('3');
	});

	test('message', async () => {
		const promise = waitMessage(client.websocket);

		client.websocket.send('4hello{"name":"world"}');

		expect(
			await promise,
		).toBe('4hello{"text":"Hello, world!"}');
	});
});

describe('broadcast', () => {
	test('broadcast', async () => {
		const promise = waitMessage(client.websocket);

		testBroadcast();

		expect(
			await promise,
		).toBe('4{"foo":"bar"}');
	});
});

describe('groups', () => {
	test('before join any', () => {
		const promise = waitMessage(client.websocket);

		testSendToGroup('group');

		expect(promise).rejects.toThrowError(ERROR_TIMEOUT);
	});

	test('joined', async () => {
		const promise = waitMessage(client.websocket);

		testGroupJoin(client.extwsClient, 'group');
		testSendToGroup('group');

		expect(
			await promise,
		).toBe('4{"foo":"bar"}');
	});

	test('joined to another group', () => {
		const promise = waitMessage(client.websocket);

		testGroupJoin(client.extwsClient, 'group');
		testSendToGroup('group_another');

		expect(promise).rejects.toThrowError(ERROR_TIMEOUT);
	});

	test('left', () => {
		const promise = waitMessage(client.websocket);

		testGroupLeave(client.extwsClient, 'group');
		testSendToGroup('group');

		expect(promise).rejects.toThrowError(ERROR_TIMEOUT);
	});
});

describe('send to socket', () => {
	test('to existing client', async () => {
		const promise = waitMessage(client.websocket);

		testSendToSocket(client.extwsClient.id);

		expect(
			await promise,
		).toBe('4{"foo":"bar"}');
	});

	test('to non-existing client', () => {
		const promise = waitMessage(client.websocket);

		testSendToSocket('777');

		expect(promise).rejects.toThrowError(ERROR_TIMEOUT);
	});
});

describe('disconnect', () => {
	test('by server', async () => {
		const promise = new Promise<boolean>((resolve) => {
			client.websocket.once(
				'close',
				(_) => {
					resolve(true);
				},
			);
		});

		client.extwsClient.disconnect();

		expect(await promise).toBe(true);
	});

	test('by client', async () => {
		expect(extwsServer.clients.size).toBe(0);

		const client2 = await createClient();

		expect(extwsServer.clients.size).toBe(1);

		client2.websocket.close();

		await new Promise((resolve) => {
			setTimeout(
				resolve,
				100,
			);
		});

		expect(extwsServer.clients.size).toBe(0);
	});
});
