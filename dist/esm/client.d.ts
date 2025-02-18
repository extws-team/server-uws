import { ExtWSClient } from '@extws/server';
import { WebSocket } from 'uWebSockets.js';
import { ExtWSUwsServer } from './main.js';
export type WebSocketUserData = {
    id: string;
    url: URL;
    headers: Map<string, string>;
};
export declare class ExtWSUwsClient extends ExtWSClient {
    private uws_client;
    constructor(server: ExtWSUwsServer, uws_client: WebSocket<WebSocketUserData>);
    addToChannel(channel_id: string): void;
    removeFromChannel(channel_id: string): void;
    sendPayload(payload: string): void;
    disconnect(is_disconnected?: boolean): void;
}
