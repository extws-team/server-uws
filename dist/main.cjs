//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
let uWebSockets_js = require("uWebSockets.js");
uWebSockets_js = __toESM(uWebSockets_js);
let __extws_server = require("@extws/server");
__extws_server = __toESM(__extws_server);
let __kirick_ip = require("@kirick/ip");
__kirick_ip = __toESM(__kirick_ip);

//#region src/client.ts
/**
* Prints some errors to console.
* @param error Error to print.
*/
function printError(error) {
	if (error instanceof Error && error.message !== "Invalid access of closed uWS.WebSocket/SSLWebSocket.") console.error(error);
}
var ExtWSUwsClient = class extends __extws_server.ExtWSClient {
	constructor(server, uws_client) {
		const user_data = uws_client.getUserData();
		super(server, {
			url: user_data.url,
			headers: user_data.headers,
			ip: new __kirick_ip.IP(uws_client.getRemoteAddress())
		});
		this.uws_client = uws_client;
	}
	addToChannel(channel_id) {
		try {
			this.uws_client.subscribe(channel_id);
		} catch (error) {
			printError(error);
			this.disconnect();
		}
	}
	removeFromChannel(channel_id) {
		try {
			this.uws_client.unsubscribe(channel_id);
		} catch (error) {
			printError(error);
			this.disconnect();
		}
	}
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

//#endregion
//#region src/main.ts
var ExtWSUwsServer = class extends __extws_server.ExtWS {
	uws_server;
	constructor(options) {
		const { port, path = "/ws", idleTimeout = 4e5, maxBackpressure, maxPayloadLength,...options_rest } = options;
		super();
		this.uws_server = (0, uWebSockets_js.App)().ws(path, {
			compression: uWebSockets_js.SHARED_COMPRESSOR,
			idleTimeout: Math.floor(idleTimeout / 1e3),
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
					request.forEach((key, value) => {
						headers.set(key, value);
					});
					const url = new URL(`${request.getUrl()}?${request.getQuery()}`, `ws://${headers.get("host")}`);
					const ip = new __kirick_ip.IP(response.getRemoteAddress());
					const upgrade_response = await options_rest.onBeforeUpgrade?.({
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
exports.ExtWSUwsClient = ExtWSUwsClient;
exports.ExtWSUwsServer = ExtWSUwsServer;