declare module 'ws' {
  import type http from 'http';
  export class WebSocketServer {
    constructor(options?: { server?: http.Server; path?: string });
    on(event: 'connection', cb: (socket: any, req?: http.IncomingMessage) => void): void;
    on(event: string, cb: (...args: any[]) => void): void;
  }
  export type WebSocket = any;
}
