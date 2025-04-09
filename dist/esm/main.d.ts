import { ExtWS } from '@extws/server';
import type { ExtWSOnBeforeUpgradeHandler } from '@extws/server/dev';
export declare class ExtWSUwsServer extends ExtWS {
    private uws_server;
    constructor({ port, path, idleTimeout, maxBackpressure, maxPayloadLength, ...options_rest }: {
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
export { ExtWSUwsClient } from './client.js';
