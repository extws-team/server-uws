import { ExtWS, ExtWSClient } from "@extws/server";
import { ExtWSOnBeforeUpgradeOptions } from "@extws/server/dev";
import { WebSocket } from "uWebSockets.js";
type WebSocketUserData<TData extends Record<string, unknown> | undefined> = {
  id: string;
  url: URL;
  headers: Headers;
  data: TData;
};
export declare class ExtWSUwsClient<TData extends Record<string, unknown> | undefined = undefined> extends ExtWSClient<TData> {
  private uws_client;
  constructor(server: ExtWSUwsServer<TData>, uws_client: WebSocket<WebSocketUserData<TData>>);
  override disconnect(is_disconnected?: boolean): void;
}
export declare class ExtWSUwsServer<TData extends Record<string, unknown> | undefined = undefined> extends ExtWS<TData> {
  private uws_server;
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
  } & ExtWSOnBeforeUpgradeOptions<TData>);
  override close(): Promise<void>;
}
export {};