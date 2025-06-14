import { ExtWSClient } from '@extws/server';
import type { WebSocket } from 'uWebSockets.js';
import { IP } from '@kirick/ip';
import { ExtWSUwsServer } from './main.js';

export type WebSocketUserData = {
	id: string,
	url: URL,
	// headers: Headers,
	headers: Map<string, string>,
};

export class ExtWSUwsClient extends ExtWSClient {
	constructor(
		server: ExtWSUwsServer,
		private uws_client: WebSocket<WebSocketUserData>,
	) {
		const user_data = uws_client.getUserData();

		super(
			server,
			{
				url: user_data.url,
				headers: user_data.headers,
				ip: new IP(
					uws_client.getRemoteAddress(),
				),
			},
		);
		this.uws_client = uws_client;
	}

	override addToChannel(channel_id: string): void {
		try {
			this.uws_client.subscribe(channel_id);
		}
		catch (error) {
			// eslint-disable-next-line no-console
			console.error(error);
			this.disconnect();
		}
	}

	override removeFromChannel(channel_id: string): void {
		try {
			this.uws_client.unsubscribe(channel_id);
		}
		catch (error) {
			// eslint-disable-next-line no-console
			console.error(error);
			this.disconnect();
		}
	}

	override sendPayload(payload: string): void {
		try {
			this.uws_client.send(payload);
		}
		catch (error) {
			// eslint-disable-next-line no-console
			console.error(error);
			this.disconnect();
		}
	}

	override disconnect(is_disconnected: boolean = false): void {
		if (!is_disconnected) {
			try {
				this.uws_client.end();
			}
			catch {}
		}

		super.disconnect();
	}
}
