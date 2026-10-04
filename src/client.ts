import type { WebSocket } from 'uWebSockets.js';
import { ExtWSClient } from '@extws/server';
import type { IP } from '@kirick/ip';
import { ExtWSUwsServer } from './main.js';

export type WebSocketUserData<ClientData = undefined> = {
	id: string;
	url: URL;
	headers: Headers;
	ip: IP;
} & ([ClientData] extends [undefined]
	? { data?: undefined }
	: { data: ClientData });

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

export class ExtWSUwsClient<
	ClientData = undefined,
> extends ExtWSClient<ClientData> {
	constructor(
		server: ExtWSUwsServer<ClientData>,
		private uws_client: WebSocket<WebSocketUserData<ClientData>>,
	) {
		const user_data = uws_client.getUserData();

		super(server, {
			url: user_data.url,
			headers: user_data.headers,
			ip: user_data.ip,
			data: user_data.data,
		} as ConstructorParameters<typeof ExtWSClient<ClientData>>[1]);
	}

	/** @internal */
	override _addToChannel(channel_id: string): void {
		try {
			this.uws_client.subscribe(channel_id);
		} catch (error) {
			printError(error);
			this.disconnect();
		}
	}

	/** @internal */
	override _removeFromChannel(channel_id: string): void {
		try {
			this.uws_client.unsubscribe(channel_id);
		} catch (error) {
			printError(error);
			this.disconnect();
		}
	}

	/** @internal */
	override _sendPayload(payload: string): void {
		try {
			this.uws_client.send(payload);
		} catch (error) {
			printError(error);
			this.disconnect();
		}
	}

	override disconnect(is_disconnected = false): void {
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
