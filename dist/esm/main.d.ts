import { ExtWS } from '@extws/server';
import type { ExtWSOnBeforeUpgradeHandler } from '@extws/server/dev';
export declare class ExtWSUwsServer extends ExtWS {
    private uws_server;
    constructor({ port, path, ...options_rest }: {
        port: number;
        path?: string;
        onBeforeUpgrade?: ExtWSOnBeforeUpgradeHandler;
    });
    protected publish(channel: string, payload: string): void;
    close(): Promise<void>;
}
export { ExtWSUwsClient } from './client.js';
