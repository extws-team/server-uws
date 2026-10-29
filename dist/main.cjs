Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
let uWebSockets_js = require("uWebSockets.js");
let _extws_server = require("@extws/server");
let _kirick_ip = require("@kirick/ip");
// src/client.ts
/**
* Prints some errors to console.
* @param error Error to print.
*/
function printError(error) {
	if (error instanceof Error && error.message !== "Invalid access of closed uWS.WebSocket/SSLWebSocket.") console.error(error);
}
var ExtWSUwsClient = class extends _extws_server.ExtWSClient {
	uws_client;
	constructor(server, uws_client) {
		const user_data = uws_client.getUserData();
		super(server, {
			url: user_data.url,
			headers: user_data.headers,
			ip: new _kirick_ip.IP(uws_client.getRemoteAddress()),
			data: user_data.data
		});
		this.uws_client = uws_client;
	}
	/** @internal */
	addToChannel(channel_id) {
		try {
			this.uws_client.subscribe(channel_id);
		} catch (error) {
			printError(error);
			this.disconnect();
		}
	}
	/** @internal */
	removeFromChannel(channel_id) {
		try {
			this.uws_client.unsubscribe(channel_id);
		} catch (error) {
			printError(error);
			this.disconnect();
		}
	}
	/** @internal */
	sendPayload(payload) {
		try {
			this.uws_client.send(payload);
		} catch (error) {
			printError(error);
			this.disconnect();
		}
	}
	disconnect(is_disconnected = false) {
		if (!is_disconnected) try {
			this.uws_client.end();
		} catch (error) {
			printError(error);
		}
		super.disconnect();
	}
};
// src/main.ts
var ExtWSUwsServer = class extends _extws_server.ExtWS {
	uws_server;
	constructor(options) {
		const { port, path = "/ws", uws, idleTimeout, pingTimeout, ...options_rest } = options;
		super({
			idleTimeout,
			pingTimeout
		});
		this.uws_server = (0, uWebSockets_js.App)().ws(path, {
			closeOnBackpressureLimit: uws?.closeOnBackpressureLimit,
			compression: uws?.compression ?? uWebSockets_js.SHARED_COMPRESSOR,
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
					const url = new URL(`${request.getUrl()}?${request.getQuery()}`, `ws://${headers.get("host")}`);
					const ip = new _kirick_ip.IP(response.getRemoteAddress());
					const upgrade_result = await options_rest.onBeforeUpgrade?.({
						url,
						headers,
						ip
					});
					if (is_aborted) return;
					if (upgrade_result instanceof Response) {
						const upgrade_response_body = await upgrade_result.arrayBuffer();
						if (is_aborted) return;
						response.cork(() => {
							response.writeStatus(String(upgrade_result.status));
							upgrade_result.headers.forEach((value, key) => {
								response.writeHeader(key, value);
							});
							response.write(upgrade_response_body);
							response.end();
						});
					} else response.cork(() => {
						response.upgrade({
							id: "",
							url,
							headers,
							data: upgrade_result
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
		this.uws_server.listen(port, (listen_socket) => {
			if (listen_socket === false) throw new Error(`Cannot listen on port ${port}.`);
		});
	}
	/** @internal */
	publish(channel, payload) {
		this.uws_server.publish(channel, payload);
	}
	async close() {
		this.uws_server.close();
		await super.close();
	}
};
exports.ExtWSUwsClient = ExtWSUwsClient;
exports.ExtWSUwsServer = ExtWSUwsServer;
