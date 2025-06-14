import { ExtWS, ExtWSClient } from "@extws/server";
import { App, SHARED_COMPRESSOR } from "uWebSockets.js";
import { IP } from "@kirick/ip";

//#region src/client.ts
var ExtWSUwsClient = class extends ExtWSClient {
	constructor(server, uws_client) {
		const user_data = uws_client.getUserData();
		super(server, {
			url: user_data.url,
			headers: user_data.headers,
			ip: new IP(uws_client.getRemoteAddress())
		});
		this.uws_client = uws_client;
	}
	addToChannel(channel_id) {
		try {
			this.uws_client.subscribe(channel_id);
		} catch (error) {
			console.error(error);
			this.disconnect();
		}
	}
	removeFromChannel(channel_id) {
		try {
			this.uws_client.unsubscribe(channel_id);
		} catch (error) {
			console.error(error);
			this.disconnect();
		}
	}
	sendPayload(payload) {
		try {
			this.uws_client.send(payload);
		} catch (error) {
			console.error(error);
			this.disconnect();
		}
	}
	disconnect(is_disconnected = false) {
		if (!is_disconnected) try {
			this.uws_client.end();
		} catch {}
		super.disconnect();
	}
};

//#endregion
//#region src/main.ts
var ExtWSUwsServer = class extends ExtWS {
	uws_server;
	constructor({ port, path = "/ws", idleTimeout = 4e5, maxBackpressure, maxPayloadLength,...options_rest }) {
		super(options_rest);
		this.uws_server = App().ws(path, {
			compression: SHARED_COMPRESSOR,
			idleTimeout: Math.floor(idleTimeout / 1e3),
			maxBackpressure,
			maxLifetime: 0,
			maxPayloadLength,
			upgrade: async (response, request, context) => {
				let is_aborted = false;
				response.onAborted(() => {
					is_aborted = true;
				});
				try {
					const headers = new Headers();
					request.forEach((key, value) => {
						headers.set(key, value);
					});
					const url = new URL(`${request.getUrl()}?${request.getQuery()}`, `ws://${headers.get("host")}`);
					const ip = new IP(response.getRemoteAddress());
					const upgrade_response = await this.options?.onBeforeUpgrade?.({
						url,
						headers,
						ip
					});
					if (is_aborted) return;
					if (upgrade_response) {
						const upgrade_response_body = await upgrade_response.arrayBuffer();
						if (is_aborted) return;
						response.cork(() => {
							response.writeStatus(String(upgrade_response.status));
							upgrade_response.headers.forEach((value, key) => {
								response.writeHeader(key, value);
							});
							response.write(upgrade_response_body);
							response.end();
						});
					} else response.cork(() => {
						response.upgrade({
							id: "",
							url,
							headers
						}, headers.get("sec-websocket-key") ?? "", headers.get("sec-websocket-protocol") ?? "", headers.get("sec-websocket-extensions") ?? "", context);
					});
				} catch (error) {
					console.error("Upgrade handler error:", error);
					if (!is_aborted) response.cork(() => {
						response.writeStatus("500");
						response.end();
					});
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
						const payload_str = Buffer.from(payload).toString("utf8");
						this.onMessage(client, payload_str);
					}
				}
			},
			close: (uws_client) => {
				const socket_id = uws_client.getUserData().id;
				if (socket_id !== null) {
					const client = this.clients.get(socket_id);
					if (client) client.disconnect(true);
				}
			}
		});
		this.uws_server.listen(port, () => {});
	}
	publish(channel, payload) {
		this.uws_server.publish(channel, payload);
	}
	close() {
		this.uws_server.close();
		return Promise.resolve();
	}
};

//#endregion
export { ExtWSUwsClient, ExtWSUwsServer };