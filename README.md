# @extws/sever-uws

WebSocket server with [ExtWS message protocol](https://github.com/extws-team/server/blob/dev-kirick/README.md#protocol) based on [uWebSockets.js](https://github.com/uNetworking/uWebSockets.js).

> [!WARNING]
> This package supports only Node.js 16.x, 18.x, 20.x and 21.x. This will be fixed in the future.

## Features

- 🚀 Custom message protocol that enables support for message types
- 👥 Group messaging system
- 🔄 Automatic connection management
- 🔌 Automatic handling of broken or silently disconnected clients

## Installation

```bash
pnpm add @extws/server-uws
# or
npm install @extws/server-uws
```

## Starting the server

To start the server, just create an instance of `ExtWSUwsServer`.

```typescript
import { ExtWSUwsServer } from '@extws/server-uws';

// Start the server.
const server = new ExtWSUwsServer({
  port: 8080,
});
```

By default, the server listens for WebSocket connections for the `/ws` path. If you want to change the path, use `path` option.

```typescript
const server = new ExtWSUwsServer({
  path: '/extws',
  port: 8080,
});
```

## Handling events

The key feature of ExtWS is its custom message protocol that allows efficient work with typed events. Instead of listening to all messages through a single WebSocket `message` event, ExtWS allows you to subscribe to specific event types.

### Event subscription

To listen for events sent by the client, use the `on` method:

```typescript
// Subscribe to all messages with type 'chat'
server.on('chat', (event) => {
  console.log('Chat message:', event.data);
  console.log('From client:', event.client.id);
});
```

If you are using TypeScript, you can specify the type of the event data:

```typescript
import type { ExtWSEvent } from '@extws/server';

interface ChatMessage {
  message: string;
  timestamp: number;
}

// Typed event subscription
server.on<ExtWSEvent<ChatMessage>>('chat', (event) => {
  // event.data is typed as ChatMessage
  console.log(event.data.message);
  console.log(event.data.timestamp);
});
```

> [!WARNING]
> However, because the data is sent from the client, it is better to validate the incoming data using libraries like [valibot](https://github.com/valibot/valibot), [zod](https://github.com/colinhacks/zod) or similar.

To create one-time subscriptions, use `once` or `wait` methods:

```typescript
// Subscription will trigger only once
server.once('user:ready', (event) => {
  console.log(`User ${event.client.id} is ready`);
});

// wait() is essentially the same as once() but returns a Promise instead of using a callback
const event = await server.wait('user:ready');
console.log(`User ${event.client.id} is ready`);
```

### Built-in events

ExtWS has several built-in events that cannot be used for event types:

```typescript
// New client connected
server.on('connect', (event) => {
  console.log('New client connected:', event.client.id);
});

// Client disconnected
server.on('disconnect', (event) => {
  console.log('Client disconnected:', event.client.id);
});
```

### Unsubscribing from events

Methods `on` and `once` return a function that, when called, removes the event subscription:

```typescript
const off = server.on('message', (event) => {
  console.log(event.data);
});

// Remove event subscription
off();
```

## Sending messages

ExtWS provides several ways to send messages: directly through the client or via the server.

#### To a specific client

If you have a client object, you can use the `send` method:

```typescript
client.send({ message: 'hello' }); // event of type 'message'
client.send('chat', { message: 'hello' }); // event of type 'chat'
client.send('typing'); // event of type 'typing' without data
client.send(); // event of type 'message' without data
```

If you have only the client ID, call the `sendToSocket` method on the server:

```typescript
const client_id = 'deadbeef';

server.sendToSocket(client_id, { message: 'hello' }); // event of type 'message'
server.sendToSocket(client_id, 'chat', { message: 'hello' }); // event of type 'chat'
server.sendToSocket(client_id, 'typing'); // event of type 'typing' without data
server.sendToSocket(client_id); // event of type 'message' without data
```

#### To a group of clients

To send a message to a group of clients, use the `sendToGroup` method on the server:

```typescript
server.sendToGroup('room1', { message: 'hello' }); // event of type 'message'
server.sendToGroup('room1', 'chat', { message: 'hello' }); // event of type 'chat'
server.sendToGroup('room1', 'typing'); // event of type 'typing' without data
server.sendToGroup('room1'); // event of type 'message' without data
```

#### To all clients of the server

To send a message to all clients, use the `broadcast` method on the server:

```typescript
server.broadcast({ message: 'hello' }); // event of type 'message'
server.broadcast('chat', { message: 'hello' }); // event of type 'chat'
server.broadcast('typing'); // event of type 'typing' without data
server.broadcast(); // event of type 'message' without data
```

## Groups

ExtWS has a built-in group system that allows organizing clients into logical groups for convenient message delivery to multiple clients simultaneously. Groups are identified by a string ID. Of course, client can be in multiple groups simultaneously.

```typescript
// Add client to group
client.join('room1');

// Send message to all clients in room1
server.sendToGroup('room1', 'chat', { message: 'Hello room!' });

// Remove client from group
client.leave('room1');
```

## Stopping the server

To stop the server, call the `close` method:

```typescript
await server.close();
```
