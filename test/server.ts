/* eslint-disable jsdoc/require-jsdoc */

import {
	ExtWSEvent,
	type ExtWSClient,
} from '@extws/server';
import { ExtWSUwsServer } from '../src/main.js';

export const extwsServer = new ExtWSUwsServer({
	port: 8080,
});

extwsServer.on(
	'hello',
	(event: ExtWSEvent<{ name: string }>) => {
		event.client.send(
			'hello',
			{
				text: `Hello, ${event.detail.name}!`,
			},
		);
	},
);

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
	extwsServer.sendToGroup(
		group_name,
		{
			foo: 'bar',
		},
	);
}

export function testSendToSocket(client_id: string) {
	extwsServer.sendToSocket(
		client_id,
		{
			foo: 'bar',
		},
	);
}
