import { ExtWS } from '@extws/server';
import { App, } from 'uWebSockets.js';
import { ExtWSUwsClient, } from './client.js';
import { IP } from '@kirick/ip';
export class ExtWSUwsServer extends ExtWS {
    uws_server;
    constructor({ port, path = '/ws', ...options_rest }) {
        super(options_rest);
        // eslint-disable-next-line new-cap
        this.uws_server = App().ws(path, {
            compression: 1,
            idleTimeout: 400,
            upgrade: async (response, request, context) => {
                const headers = new Map();
                // eslint-disable-next-line unicorn/no-array-for-each
                request.forEach((key, value) => {
                    headers.set(key, value);
                });
                const url = new URL(`${request.getUrl()}?${request.getQuery()}`, `ws://${headers.get('host')}`);
                try {
                    const upgrade_response = await this.options?.onBeforeUpgrade?.({
                        url,
                        headers,
                        ip: new IP(response.getRemoteAddress()),
                    });
                    if (upgrade_response) {
                        response.writeStatus(String(upgrade_response.status));
                        if (upgrade_response.headers) {
                            for (const [key, value] of upgrade_response.headers.entries()) {
                                response.writeHeader(key, value);
                            }
                        }
                        response.write(upgrade_response.body ?? '');
                        response.end();
                        return;
                    }
                    response.upgrade({
                        id: '',
                        url,
                        headers,
                    }, headers.get('sec-websocket-key') ?? '', headers.get('sec-websocket-protocol') ?? '', headers.get('sec-websocket-extensions') ?? '', context);
                    return;
                }
                catch (error) {
                    // eslint-disable-next-line no-console
                    console.error(error);
                }
                response.writeStatus('500');
                response.end();
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
                        const payload_str = Buffer.from(payload).toString('utf8');
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
            },
        });
        this.uws_server.listen(port, () => {
            // do nothing
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
export { ExtWSUwsClient } from './client.js';
