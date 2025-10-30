import type { WebSocket } from 'uWebSockets.js';
import { ExtWSClient } from '@extws/server';
import { IP } from '@kirick/ip';
import { ExtWSUwsServer } from './main.js';

export type WebSocketUserData = {
	id: string;
	url: URL;
	headers: Headers;
};

/**
 * Prints some errors to console.
 * @param error Error to print.
 */
function printError(error: unknown) {
	if (
		error instanceof Error
		&& error.message !== 'Invalid access of closed uWS.WebSocket/SSLWebSocket.'
	) {
		// oxlint-disable-next-line no-console
		console.error(error);
	}
}

export class ExtWSUwsClient extends ExtWSClient {
	constructor(
		server: ExtWSUwsServer,
		private uws_client: WebSocket<WebSocketUserData>,
	) {
		const user_data = uws_client.getUserData();

		super(server, {
			url: user_data.url,
			headers: user_data.headers,
			ip: new IP(uws_client.getRemoteAddress()),
		});
	}

	override addToChannel(channel_id: string): void {
		try {
			this.uws_client.subscribe(channel_id);
		} catch (error) {
			printError(error);
			this.disconnect();
		}
	}

	override removeFromChannel(channel_id: string): void {
		try {
			this.uws_client.unsubscribe(channel_id);
		} catch (error) {
			printError(error);
			this.disconnect();
		}
	}

	override sendPayload(payload: string): void {
		try {
			this.uws_client.send(payload);
		} catch (error) {
			printError(error);
			this.disconnect();
		}
	}

	override disconnect(is_disconnected: boolean = false): void {
		if (!is_disconnected) {
			try {
				this.uws_client.end();
			} catch (error) {
				printError(error);
			}
		}

		super.disconnect();
	}
}
