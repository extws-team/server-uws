var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __moduleCache = /* @__PURE__ */ new WeakMap;
var __toCommonJS = (from) => {
  var entry = __moduleCache.get(from), desc;
  if (entry)
    return entry;
  entry = __defProp({}, "__esModule", { value: true });
  if (from && typeof from === "object" || typeof from === "function")
    __getOwnPropNames(from).map((key) => !__hasOwnProp.call(entry, key) && __defProp(entry, key, {
      get: () => from[key],
      enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
    }));
  __moduleCache.set(from, entry);
  return entry;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};

// src/main.ts
var exports_main = {};
__export(exports_main, {
  ExtWSUwsServer: () => ExtWSUwsServer,
  ExtWSUwsClient: () => ExtWSUwsClient
});
module.exports = __toCommonJS(exports_main);
var import_server2 = require("@extws/server");
var import_uWebSockets = require("uWebSockets.js");

// src/client.ts
var import_server = require("@extws/server");
var import_ip = require("@kirick/ip");

class ExtWSUwsClient extends import_server.ExtWSClient {
  uws_client;
  constructor(server, uws_client) {
    const user_data = uws_client.getUserData();
    super(server, {
      url: user_data.url,
      headers: user_data.headers,
      ip: new import_ip.IP(uws_client.getRemoteAddress())
    });
    this.uws_client = uws_client;
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
    if (!is_disconnected) {
      try {
        this.uws_client.end();
      } catch {
      }
    }
    super.disconnect();
  }
}

// src/main.ts
var import_ip2 = require("@kirick/ip");

class ExtWSUwsServer extends import_server2.ExtWS {
  uws_server;
  constructor({
    port,
    path = "/ws",
    ...options_rest
  }) {
    super(options_rest);
    this.uws_server = import_uWebSockets.App().ws(path, {
      compression: import_uWebSockets.SHARED_COMPRESSOR,
      idleTimeout: 400,
      upgrade: (response, request, context) => {
        const headers = new Map;
        request.forEach((key, value) => {
          headers.set(key, value);
        });
        const url = new URL(`${request.getUrl()}?${request.getQuery()}`, `ws://${headers.get("host")}`);
        const ip = new import_ip2.IP(response.getRemoteAddress());
        let is_aborted = false;
        response.onAborted(() => {
          is_aborted = true;
        });
        Promise.resolve().then(() => this.options?.onBeforeUpgrade?.({
          url,
          headers,
          ip
        })).then((upgrade_response) => {
          if (is_aborted) {
            return;
          }
          response.cork(() => {
            if (upgrade_response) {
              response.writeStatus(String(upgrade_response.status));
              if (upgrade_response.headers) {
                for (const [key, value] of Object.entries(upgrade_response.headers)) {
                  if (value !== undefined) {
                    response.writeHeader(key, value);
                  }
                }
              }
              response.write(upgrade_response.body ?? "");
              response.end();
            } else {
              response.upgrade({
                id: "",
                url,
                headers
              }, headers.get("sec-websocket-key") ?? "", headers.get("sec-websocket-protocol") ?? "", headers.get("sec-websocket-extensions") ?? "", context);
            }
          });
        }).catch((error) => {
          console.error("Upgrade handler error:", error);
          if (!is_aborted) {
            response.cork(() => {
              response.writeStatus("500");
              response.end();
            });
          }
        });
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
          if (client) {
            client.disconnect(true);
          }
        }
      }
    });
    this.uws_server.listen(port, () => {
    });
  }
  publish(channel, payload) {
    this.uws_server.publish(channel, payload);
  }
  close() {
    this.uws_server.close();
    return Promise.resolve();
  }
}
