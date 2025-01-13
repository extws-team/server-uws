import { ExtWS } from '@extws/server';
export declare class ExtWSUwsServer extends ExtWS {
    private uws_server;
    constructor({ port, path, }: {
        port: number;
        path?: string;
    });
    protected publish(channel: string, payload: string): void;
    close(): Promise<void>;
}
