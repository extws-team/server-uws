Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
let uWebSockets_js = require("uWebSockets.js");
let _extws_server = require("@extws/server");
let _kirick_ip = require("@kirick/ip");
//#region src/client.ts
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
			ip: user_data.ip,
			data: user_data.data
		});
		this.uws_client = uws_client;
	}
	/** @internal */
	_addToChannel(channel_id) {
		try {
			this.uws_client.subscribe(channel_id);
		} catch (error) {
			printError(error);
			this.disconnect();
		}
	}
	/** @internal */
	_removeFromChannel(channel_id) {
		try {
			this.uws_client.unsubscribe(channel_id);
		} catch (error) {
			printError(error);
			this.disconnect();
		}
	}
	/** @internal */
	_sendPayload(payload) {
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
//#endregion
//#region src/main.ts
var ExtWSUwsServer = class extends _extws_server.ExtWS {
	uws_server;
	constructor(options) {
		const { port, path = "/ws", idleTimeout, maxBackpressure, maxPayloadLength, ...options_rest } = options;
		super({ idle_timeout: idleTimeout });
		this.uws_server = (0, uWebSockets_js.App)().ws(path, {
			compression: uWebSockets_js.SHARED_COMPRESSOR,
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
					request.forEach((key, value) => {
						headers.set(key, value);
					});
					const url = new URL(`${request.getUrl()}?${request.getQuery()}`, `ws://${headers.get("host")}`);
					const ip = new _kirick_ip.IP(response.getRemoteAddress());
					const websocket_key = headers.get("sec-websocket-key") ?? "";
					const websocket_protocol = headers.get("sec-websocket-protocol") ?? "";
					const websocket_extensions = headers.get("sec-websocket-extensions") ?? "";
					const upgrade_response = await options_rest.onBeforeUpgrade?.({
						url,
						headers,
						ip
					});
					if (is_aborted) return;
					if (upgrade_response instanceof Response) {
						const upgrade_response_body = await upgrade_response.arrayBuffer();
						if (is_aborted) return;
						response.cork(() => {
							response.writeStatus(String(upgrade_response.status));
							for (const [key, value] of upgrade_response.headers.entries()) {
								const name = key.toLowerCase();
								if ([
									"set-cookie",
									"content-length",
									"transfer-encoding"
								].includes(name)) continue;
								response.writeHeader(key, value);
							}
							for (const cookie of upgrade_response.headers.getSetCookie()) response.writeHeader("set-cookie", cookie);
							is_response_finished = true;
							response.end(upgrade_response_body);
						});
					} else response.cork(() => {
						is_response_finished = true;
						response.upgrade({
							id: "",
							url,
							headers,
							ip,
							data: upgrade_response?.data
						}, websocket_key, websocket_protocol, websocket_extensions, context);
					});
				} catch (error) {
					console.error("Upgrade handler error:", error);
					if (!is_aborted && !is_response_finished) response.cork(() => {
						response.writeStatus("500");
						is_response_finished = true;
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
		this.stopClientsWatch();
		this.uws_server.close();
		return Promise.resolve();
	}
};
//#endregion
exports.ExtWSUwsClient = ExtWSUwsClient;
exports.ExtWSUwsServer = ExtWSUwsServer;
