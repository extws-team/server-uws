import { ExtWS, ExtWSClient } from "@extws/server";
import { ExtWSOnBeforeUpgradeHandler } from "@extws/server/dev";
import { WebSocket } from "uWebSockets.js";

//#region src/client.d.ts
type WebSocketUserData = {
  id: string;
  url: URL;
  // headers: Headers,
  headers: Map<string, string>;
};
declare class ExtWSUwsClient extends ExtWSClient {
  private uws_client;
  constructor(server: ExtWSUwsServer, uws_client: WebSocket<WebSocketUserData>);
  addToChannel(channel_id: string): void;
  removeFromChannel(channel_id: string): void;
  sendPayload(payload: string): void;
  disconnect(is_disconnected?: boolean): void;
}
//#endregion
//#region src/main.d.ts
declare class ExtWSUwsServer extends ExtWS {
  private uws_server;
  // eslint-disable-next-line max-lines-per-function
  constructor({
    port,
    path,
    idleTimeout,
    maxBackpressure,
    maxPayloadLength,
    ...options_rest
  }: {
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
  });
  protected publish(channel: string, payload: string): void;
  close(): Promise<void>;
}
//#endregion
export { ExtWSUwsClient, ExtWSUwsServer };