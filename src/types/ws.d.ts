declare module 'ws' {
  import type http from 'http';
  export class WebSocketServer {
    constructor(options?: { server?: http.Server; path?: string });
    on(event: 'connection', cb: (socket: unknown, req?: http.IncomingMessage) => void): void;
    on(event: string, cb: (...args: unknown[]) => void): void;
  }
  export type WebSocket = unknown;
}
