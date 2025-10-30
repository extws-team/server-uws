/* eslint-disable jsdoc/require-jsdoc */

import { type ExtWSClient } from '@extws/server';
import * as v from 'valibot';
import { ExtWSUwsServer } from '../src/main.js';

export const extwsServer = new ExtWSUwsServer({
	port: 8080,
	async onBeforeUpgrade({ url }) {
		await new Promise((resolve) => {
			setTimeout(resolve, 1);
		});

		if (url.searchParams.has('drop')) {
			return new Response('drop', {
				status: 400,
				headers: {
					'x-test': 'test',
				},
			});
		}
	},
});

extwsServer.on('hello', (event) => {
	const data = v.parse(
		v.object({
			name: v.string(),
		}),
		event.detail,
	);

	event.client.send('hello', {
		text: `Hello, ${data.name}!`,
	});
});

export function testBroadcast() {
	extwsServer.broadcast({
		foo: 'bar',
	});
}

export function testGroupJoin(extwsClient: ExtWSClient, name: string) {
	extwsClient.join(name);
}

export function testGroupLeave(extwsClient: ExtWSClient, name: string) {
	extwsClient.leave(name);
}

export function testSendToGroup(group_name: string) {
	extwsServer.sendToGroup(group_name, {
		foo: 'bar',
	});
}

export function testSendToSocket(client_id: string) {
	extwsServer.sendToSocket(client_id, {
		foo: 'bar',
	});
}
