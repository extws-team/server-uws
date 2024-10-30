import {
	ExtWS,
	ExtWSClient,
} from '@extws/server';
import {
	App,
	type TemplatedApp,
} from 'uWebSockets.js';
import { IP } from '@kirick/ip';
import { ExtWSUwsClient } from './client.js';

export class ExtWSUwsServer extends ExtWS {
	private uws_server: TemplatedApp;

	constructor({
		port,
		path = '/ws',
	}: {
		port: number,
		path?: string,
	}) {
		super();

		// TODO: add generic type to .ws() call
		// eslint-disable-next-line new-cap
		this.uws_server = App().ws(
			path,
			{
				compression: 1,
				idleTimeout: 400,
				upgrade(response, request, context) {
					const headers = new Map<string, string>();
					// eslint-disable-next-line unicorn/no-array-for-each
					request.forEach((key, value) => {
						headers.set(key, value);
					});

					const url = new URL(
						`${request.getUrl()}?${request.getQuery()}`,
						`ws://${headers.get('host')}`,
					);

					response.upgrade(
						{
							url,
							headers,
							id: null,
						},
						headers.get('sec-websocket-key') ?? '',
						headers.get('sec-websocket-protocol') ?? '',
						headers.get('sec-websocket-extensions') ?? '',
						context,
					);
				},
				open: (uws_client) => {
					const client = new ExtWSUwsClient(
						this,
						uws_client,
					);

					uws_client.id = client.id;
					this.onConnect(client);
				},
				message: (uws_client, payload) => {
					const client = this.clients.get(uws_client.id);
					if (client) {
						const payload_str = Buffer.from(payload).toString('utf8');

						this.onMessage(
							client,
							payload_str,
						);
					}
				},
				close: (uws_client) => {
					const client = this.clients.get(uws_client.id);
					if (client instanceof ExtWSClient) {
						client.disconnect(true);
					}
				},
			},
		);

		this.uws_server.listen(
			port,
			() => {
				// do nothing
			},
		);
	}

	protected publish(channel: string, payload: string) {
		this.uws_server.publish(
			channel,
			payload,
		);
	}

	// TODO: there is no close() method in uWebSockets.js 20.6.0
	// close() {
	// 	this.uws_server.close();
	// }
}
