import { ExtWSClient } from '@extws/server';
import { WebSocket } from 'uWebSockets.js';
import { ExtWSUwsServer } from './main.js';
export type WebSocketUserData = {
    url: URL;
    headers: Map<string, string>;
    id: string | null;
};
export declare class ExtWSUwsClient extends ExtWSClient {
    private uws_client;
    constructor(server: ExtWSUwsServer, uws_client: WebSocket<WebSocketUserData>);
    addToGroup(group_id: string): void;
    removeFromGroup(group_id: string): void;
    sendPayload(payload: string): void;
    disconnect(is_disconnected?: boolean): void;
}
