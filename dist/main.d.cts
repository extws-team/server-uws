import { ExtWS, ExtWSClient } from "@extws/server";
import { ExtWSOnBeforeUpgradeHandler } from "@extws/server/dev";
import { WebSocket } from "uWebSockets.js";
import { IP } from "@kirick/ip";
//#region src/client.d.ts
type WebSocketUserData<ClientData = undefined> = {
  id: string;
  url: URL;
  headers: Headers;
  ip: IP;
} & ([ClientData] extends [undefined] ? {
  data?: undefined;
} : {
  data: ClientData;
});
export declare class ExtWSUwsClient<ClientData = undefined> extends ExtWSClient<ClientData> {
  private uws_client;
  constructor(server: ExtWSUwsServer<ClientData>, uws_client: WebSocket<WebSocketUserData<ClientData>>);
  /** @internal */
  override _addToChannel(channel_id: string): void;
  /** @internal */
  override _removeFromChannel(channel_id: string): void;
  /** @internal */
  override _sendPayload(payload: string): void;
  override disconnect(is_disconnected?: boolean): void;
}
//#endregion
//#region src/main.d.ts
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
} & ([ClientData] extends [undefined] ? {
  onBeforeUpgrade?: ExtWSOnBeforeUpgradeHandler<ClientData>;
} : {
  /** Hook that is called before a WebSocket upgrade. Useful to parse authorization and reject upgrade with custom headers such as `Set-Cookie`. */
  onBeforeUpgrade: ExtWSOnBeforeUpgradeHandler<ClientData>;
});
export declare class ExtWSUwsServer<ClientData = undefined> extends ExtWS<ClientData> {
  private uws_server;
  constructor(options: ExtWSUwsServerOptions<ClientData>);
  protected override publish(channel: string, payload: string): void;
  override close(): Promise<void>;
}
//#endregion