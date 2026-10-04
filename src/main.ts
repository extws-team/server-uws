/* eslint-disable unicorn/no-for-each */
import { App, SHARED_COMPRESSOR, type TemplatedApp } from 'uWebSockets.js';
import { ExtWS } from '@extws/server';
import type { ExtWSOnBeforeUpgradeHandler } from '@extws/server/dev';
import { IP } from '@kirick/ip';
import { ExtWSUwsClient, type WebSocketUserData } from './client.js';

type ExtWSUwsServerOptions<ClientData> = {
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
} & ([ClientData] extends [undefined]
	? {
			onBeforeUpgrade?: ExtWSOnBeforeUpgradeHandler<ClientData>;
		}
	: {
			/** Hook that is called before a WebSocket upgrade. Useful to parse authorization and reject upgrade with custom headers such as `Set-Cookie`. */
			onBeforeUpgrade: ExtWSOnBeforeUpgradeHandler<ClientData>;
		});

export class ExtWSUwsServer<ClientData = undefined> extends ExtWS<ClientData> {
	private uws_server: TemplatedApp;

	// oxlint-disable-next-line max-lines-per-function
	constructor(options: ExtWSUwsServerOptions<ClientData>) {
		const {
			port,
			path = '/ws',
			idleTimeout,
			maxBackpressure,
			maxPayloadLength,
			...options_rest
		} = options;

		super({ idle_timeout: idleTimeout });

		this.uws_server = App().ws<WebSocketUserData<ClientData>>(path, {
			compression: SHARED_COMPRESSOR,
			idleTimeout: 400,
			maxBackpressure,
			maxLifetime: 0,
			maxPayloadLength,
			async upgrade(response, request, context) {
				let is_aborted = false;
				let is_response_finished = false;

				response.onAborted(() => {
					is_aborted = true;
				});

				try {
					const headers = new Headers();
					// .forEach is uws method, not js/ts one
					// disabled eslint rule for the whole file, two rules under eslint-disable doesn't work
					// oxlint-disable-next-line unicorn/no-array-for-each
					request.forEach((key, value) => {
						headers.set(key, value);
					});

					const url = new URL(
						`${request.getUrl()}?${request.getQuery()}`,
						`ws://${headers.get('host')}`,
					);

					const ip = new IP(response.getRemoteAddress());
					const websocket_key = headers.get('sec-websocket-key') ?? '';
					const websocket_protocol =
						headers.get('sec-websocket-protocol') ?? '';
					const websocket_extensions =
						headers.get('sec-websocket-extensions') ?? '';

					const upgrade_response = await options_rest.onBeforeUpgrade?.({
						url,
						headers,
						ip,
					});

					if (is_aborted) {
						return;
					}

					if (upgrade_response instanceof Response) {
						const upgrade_response_body = await upgrade_response.arrayBuffer();

						if (is_aborted) {
							return;
						}

						response.cork(() => {
							response.writeStatus(String(upgrade_response.status));

							for (const [key, value] of upgrade_response.headers.entries()) {
								const name = key.toLowerCase();

								if (
									[
										'set-cookie',
										'content-length',
										'transfer-encoding',
									].includes(name)
								) {
									continue;
								}

								response.writeHeader(key, value);
							}

							for (const cookie of upgrade_response.headers.getSetCookie()) {
								response.writeHeader('set-cookie', cookie);
							}

							is_response_finished = true;
							response.end(upgrade_response_body);
						});
					} else {
						response.cork(() => {
							is_response_finished = true;
							response.upgrade<WebSocketUserData<ClientData>>(
								{
									id: '',
									url,
									headers,
									ip,
									data: upgrade_response?.data,
								} as WebSocketUserData<ClientData>,
								websocket_key,
								websocket_protocol,
								websocket_extensions,
								context,
							);
						});
					}
				} catch (error) {
					// oxlint-disable-next-line no-console
					console.error('Upgrade handler error:', error);

					if (!is_aborted && !is_response_finished) {
						response.cork(() => {
							response.writeStatus('500');
							is_response_finished = true;
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
		this.stopClientsWatch();
		this.uws_server.close();

		return Promise.resolve();
	}
}

export { ExtWSUwsClient } from './client.js';
