import { App, SHARED_COMPRESSOR, type TemplatedApp } from 'uWebSockets.js';
import { ExtWS } from '@extws/server';
import type { ExtWSOnBeforeUpgradeHandler } from '@extws/server/dev';
import { IP } from '@kirick/ip';
import { ExtWSUwsClient, type WebSocketUserData } from './client.js';

export class ExtWSUwsServer extends ExtWS {
	private uws_server: TemplatedApp;

	// oxlint-disable-next-line max-lines-per-function
	constructor(options: {
		/** The port to listen on. */
		port: number;
		/** The path to listen on. */
		path?: string;
		/**
		 * Maximum amount of seconds that may pass without sending or getting a message.
		 * Connection is closed if this timeout passes. Resolution (granularity) for timeouts are typically 4 seconds, rounded to closest.
		 * Disable by using 0. Defaults to 120.
		 * @see https://unetworking.github.io/uWebSockets.js/generated/interfaces/WebSocketBehavior.html#idleTimeout
		 */
		idleTimeout?: number;
		/**
		 * Maximum length of allowed backpressure per socket when publishing or sending messages.
		 * Slow receivers with too high backpressure will be skipped until they catch up or timeout.
		 * Defaults to 64 * 1024.
		 * @see https://unetworking.github.io/uWebSockets.js/generated/interfaces/WebSocketBehavior.html#maxBackpressure
		 */
		maxBackpressure?: number;
		/**
		 * Maximum length of received message. If a client tries to send you a message larger than this, the connection is immediately closed.
		 * Defaults to 16 * 1024.
		 * @see https://unetworking.github.io/uWebSockets.js/generated/interfaces/WebSocketBehavior.html#maxPayloadLength
		 */
		maxPayloadLength?: number;
		/** Hook that is called before a WebSocket upgrade. Useful to parse authorization and reject upgrade with custom headers such as `Set-Cookie`. */
		onBeforeUpgrade?: ExtWSOnBeforeUpgradeHandler;
	}) {
		const {
			port,
			path = '/ws',
			idleTimeout = 400_000,
			maxBackpressure,
			maxPayloadLength,
			...options_rest
		} = options;

		super();

		this.uws_server = App().ws<WebSocketUserData>(path, {
			compression: SHARED_COMPRESSOR,
			idleTimeout: Math.floor(idleTimeout / 1000),
			maxBackpressure,
			maxLifetime: 0,
			maxPayloadLength,
			async upgrade(response, request, context) {
				let is_aborted = false;
				response.onAborted(() => {
					is_aborted = true;
				});

				try {
					const headers = new Headers();
					// oxlint-disable-next-line unicorn/no-array-for-each
					request.forEach((key, value) => {
						headers.set(key, value);
					});

					const url = new URL(
						`${request.getUrl()}?${request.getQuery()}`,
						`ws://${headers.get('host')}`,
					);

					const ip = new IP(response.getRemoteAddress());

					const upgrade_response = await options_rest.onBeforeUpgrade?.({
						url,
						headers,
						ip,
					});

					if (is_aborted) {
						return;
					}

					if (upgrade_response) {
						const upgrade_response_body = await upgrade_response.arrayBuffer();

						if (is_aborted) {
							return;
						}

						response.cork(() => {
							response.writeStatus(String(upgrade_response.status));

							// oxlint-disable-next-line unicorn/no-array-for-each
							upgrade_response.headers.forEach((value, key) => {
								response.writeHeader(key, value);
							});

							response.write(upgrade_response_body);
							response.end();
						});
					} else {
						response.cork(() => {
							response.upgrade<WebSocketUserData>(
								{
									id: '',
									url,
									headers,
								},
								headers.get('sec-websocket-key') ?? '',
								headers.get('sec-websocket-protocol') ?? '',
								headers.get('sec-websocket-extensions') ?? '',
								context,
							);
						});
					}
				} catch (error) {
					// oxlint-disable-next-line no-console
					console.error('Upgrade handler error:', error);

					if (!is_aborted) {
						response.cork(() => {
							response.writeStatus('500');
							response.end();
						});
					}
				}
			},
			open: (uws_client) => {
				const client = new ExtWSUwsClient(this, uws_client);

				uws_client.getUserData().id = client.id;
				this.onConnect(client);
			},
			message: (uws_client, payload) => {
				const socket_id = uws_client.getUserData().id;
				if (socket_id !== null) {
					const client = this.clients.get(socket_id);

					if (client) {
						const payload_str = Buffer.from(payload).toString('utf8');

						this.onMessage(client, payload_str);
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
		});

		this.uws_server.listen(port, () => {
			// do nothing
		});
	}

	protected override publish(channel: string, payload: string): void {
		this.uws_server.publish(channel, payload);
	}

	override close(): Promise<void> {
		this.uws_server.close();

		return Promise.resolve();
	}
}

export { ExtWSUwsClient } from './client.js';
