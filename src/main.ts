/* eslint-disable unicorn/no-for-each */
// oxlint-disable unicorn/no-array-for-each
import {
	App,
	SHARED_COMPRESSOR,
	type TemplatedApp,
	type WebSocketBehavior,
} from 'uWebSockets.js';
import { ExtWS } from '@extws/server';
import type {
	ExtWSOnBeforeUpgradeOptions,
	ExtWSOptions,
} from '@extws/server/dev';
import { IP } from '@kirick/ip';
import { ExtWSUwsClient, type WebSocketUserData } from './client.js';

export class ExtWSUwsServer<
	TData extends Record<string, unknown> | undefined = undefined,
> extends ExtWS<TData> {
	private uws_server: TemplatedApp;

	// oxlint-disable-next-line max-lines-per-function
	constructor(
		options: {
			/** The port to listen on. */
			port: number;
			/** The path to listen on. */
			path?: string;
			/**
			 * Options of the underlying uWebSockets.js WebSocket behavior. `compression` defaults to `SHARED_COMPRESSOR`.
			 * @see https://unetworking.github.io/uWebSockets.js/generated/interfaces/WebSocketBehavior.html
			 */
			uws?: Pick<
				WebSocketBehavior<unknown>,
				| 'closeOnBackpressureLimit'
				| 'compression'
				| 'maxBackpressure'
				| 'maxPayloadLength'
			>;
		} & ExtWSOptions &
			ExtWSOnBeforeUpgradeOptions<TData>,
	) {
		const {
			port,
			path = '/ws',
			uws,
			idleTimeout,
			pingTimeout,
			...options_rest
		} = options;

		super({ idleTimeout, pingTimeout });

		this.uws_server = App().ws<WebSocketUserData<TData>>(path, {
			closeOnBackpressureLimit: uws?.closeOnBackpressureLimit,
			compression: uws?.compression ?? SHARED_COMPRESSOR,
			// silent clients are disconnected by the ExtWS watchdog
			idleTimeout: 0,
			maxBackpressure: uws?.maxBackpressure,
			maxLifetime: 0,
			maxPayloadLength: uws?.maxPayloadLength,
			async upgrade(response, request, context) {
				let is_aborted = false;
				response.onAborted(() => {
					is_aborted = true;
				});

				try {
					const headers = new Headers();
					request.forEach((key, value) => {
						headers.set(key, value);
					});

					const url = new URL(
						`${request.getUrl()}?${request.getQuery()}`,
						`ws://${headers.get('host')}`,
					);

					const ip = new IP(response.getRemoteAddress());

					const upgrade_result = await options_rest.onBeforeUpgrade?.({
						url,
						headers,
						ip,
					});

					if (is_aborted) {
						return;
					}

					if (upgrade_result instanceof Response) {
						const upgrade_response_body = await upgrade_result.arrayBuffer();

						if (is_aborted) {
							return;
						}

						response.cork(() => {
							response.writeStatus(String(upgrade_result.status));

							upgrade_result.headers.forEach((value, key) => {
								response.writeHeader(key, value);
							});

							response.write(upgrade_response_body);
							response.end();
						});
					} else {
						response.cork(() => {
							response.upgrade<WebSocketUserData<TData>>(
								{
									id: '',
									url,
									headers,
									// undefined only gets here when TData allows it, otherwise the hook is required and cannot return it
									data: upgrade_result as TData,
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

		this.uws_server.listen(port, (listen_socket) => {
			// uWS calls back synchronously, so this throws from the constructor
			if (listen_socket === false) {
				throw new Error(`Cannot listen on port ${port}.`);
			}
		});
	}

	/** @internal */
	publish(channel: string, payload: string): void {
		this.uws_server.publish(channel, payload);
	}

	override async close(): Promise<void> {
		this.uws_server.close();
		await super.close();
	}
}

export { ExtWSUwsClient } from './client.js';
