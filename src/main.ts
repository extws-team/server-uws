import { ExtWS } from '@extws/server';
import { type ExtWSOnBeforeUpgradeHandler } from '@extws/server/dev';
import {
	App,
	type TemplatedApp,
} from 'uWebSockets.js';
import {
	ExtWSUwsClient,
	type WebSocketUserData,
} from './client.js';

export class ExtWSUwsServer extends ExtWS {
	private uws_server: TemplatedApp;

	constructor({
		port,
		path = '/ws',
		...options_rest
	}: {
		port: number,
		path?: string,
		onBeforeUpgrade?: ExtWSOnBeforeUpgradeHandler,
	}) {
		super(options_rest);

		// eslint-disable-next-line new-cap
		this.uws_server = App().ws<WebSocketUserData>(
			path,
			{
				compression: 1,
				idleTimeout: 400,
				upgrade: async (response, request, context) => {
					const headers = new Map<string, string>();
					// eslint-disable-next-line unicorn/no-array-for-each
					request.forEach((key, value) => {
						headers.set(key, value);
					});

					const url = new URL(
						`${request.getUrl()}?${request.getQuery()}`,
						`ws://${headers.get('host')}`,
					);

					const upgrade_response = await this.options?.onBeforeUpgrade?.(url, headers);
					if (upgrade_response) {
						response.writeStatus(
							String(upgrade_response.status),
						);

						if (upgrade_response.headers) {
							for (const [ key, value ] of upgrade_response.headers.entries()) {
								response.writeHeader(key, value);
							}
						}

						response.write(upgrade_response.body ?? '');

						response.end();
					}
					else {
						response.upgrade<WebSocketUserData>(
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
					}
				},
				open: (uws_client) => {
					const client = new ExtWSUwsClient(
						this,
						uws_client,
					);

					uws_client.getUserData().id = client.id;
					this.onConnect(client);
				},
				message: (uws_client, payload) => {
					const socket_id = uws_client.getUserData().id;
					if (socket_id !== null) {
						const client = this.clients.get(socket_id);

						if (client) {
							const payload_str = Buffer.from(payload).toString('utf8');

							this.onMessage(
								client,
								payload_str,
							);
						}
					}
				},
				close: (uws_client) => {
					const socket_id = uws_client.getUserData().id;
					if (socket_id !== null) {
						const client = this.clients.get(socket_id);

						if (client) {
							client.disconnect(true);
						}
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

	close() {
		this.uws_server.close();

		return Promise.resolve();
	}
}
