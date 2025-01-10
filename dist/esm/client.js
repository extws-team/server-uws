import { ExtWSClient } from '@extws/server';
import { IP } from '@kirick/ip';
export class ExtWSUwsClient extends ExtWSClient {
    uws_client;
    constructor(server, uws_client) {
        const user_data = uws_client.getUserData();
        super(server, {
            url: user_data.url,
            headers: user_data.headers,
            ip: new IP(uws_client.getRemoteAddress()),
        });
        this.uws_client = uws_client;
        this.uws_client = uws_client;
    }
    addToGroup(group_id) {
        try {
            this.uws_client.subscribe(group_id);
        }
        catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
            this.disconnect();
        }
    }
    removeFromGroup(group_id) {
        try {
            this.uws_client.unsubscribe(group_id);
        }
        catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
            this.disconnect();
        }
    }
    sendPayload(payload) {
        try {
            this.uws_client.send(payload);
        }
        catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
            this.disconnect();
        }
    }
    disconnect(is_disconnected = false) {
        if (!is_disconnected) {
            try {
                this.uws_client.end();
            }
            catch { }
        }
        super.disconnect();
    }
}
