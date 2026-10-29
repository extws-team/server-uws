import { WebSocket, WebSocketBehavior } from "uWebSockets.js";
import { ExtWS, ExtWSClient } from "@extws/server";
import { ExtWSOnBeforeUpgradeOptions, ExtWSOptions } from "@extws/server/dev";
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
     * Options of the underlying uWebSockets.js WebSocket behavior. `compression` defaults to `SHARED_COMPRESSOR`.
     * @see https://unetworking.github.io/uWebSockets.js/generated/interfaces/WebSocketBehavior.html
     */
    uws?: Pick<WebSocketBehavior<unknown>, "closeOnBackpressureLimit" | "compression" | "maxBackpressure" | "maxPayloadLength">;
  } & ExtWSOptions & ExtWSOnBeforeUpgradeOptions<TData>);
  override close(): Promise<void>;
}
export {};