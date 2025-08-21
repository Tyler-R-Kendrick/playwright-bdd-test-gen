import type http from 'http';
import { PlaywrightController } from '../services/codegen/playwrightController.js';
import { logger } from '../utils/logger.js';

type MCPMessage = { type: string; payload?: any };

// Create a lightweight MCP-like WebSocket server on /mcp that lets a client
// open a context (Playwright controller), perform actions, and close the context.
// The `ws` dependency is imported dynamically so tests running in environments
// without the package won't fail at module-load time.
export function createMcpServer(server: http.Server) {
  (async () => {
    let WebSocketServer: any;
    try {
      // dynamic import avoids requiring `ws` at module load time (Vitest / Vite issues)
      ({ WebSocketServer } = await import('ws'));
    } catch (err: unknown) {
      logger.warn({ err }, 'ws package not available; MCP server will not be started');
      return;
    }

    const wss = new WebSocketServer({ server, path: '/mcp' });

    wss.on('connection', (ws: any, req: any) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      logger.info({ id, url: req?.url }, 'MCP client connected');

      const controllers = new Map<string, PlaywrightController>();

      ws.on('message', async (raw: any) => {
        try {
          const str = raw.toString();
          const msg: MCPMessage = JSON.parse(str);

          if (msg.type === 'open_context') {
            const ctxId = msg.payload?.contextId ?? `ctx-${id}`;
            const headless = msg.payload?.headless !== false;
            const controller = new PlaywrightController(headless, process.cwd());
            await controller.start();
            controllers.set(ctxId, controller);
            ws.send(JSON.stringify({ type: 'context_opened', payload: { contextId: ctxId } }));
            return;
          }

          if (msg.type === 'perform_action') {
            const ctxId = msg.payload?.contextId;
            const action = msg.payload?.action;
            const controller = controllers.get(ctxId);
            if (!controller) {
              ws.send(JSON.stringify({ type: 'error', payload: { error: 'No context for id: ' + ctxId } }));
              return;
            }
            const result = await controller.execute(action);
            ws.send(JSON.stringify({ type: 'action_result', payload: result }));
            return;
          }

          if (msg.type === 'close_context') {
            const ctxId = msg.payload?.contextId;
            const controller = controllers.get(ctxId);
            if (controller) {
              await controller.close();
              controllers.delete(ctxId);
              ws.send(JSON.stringify({ type: 'context_closed', payload: { contextId: ctxId } }));
            } else {
              ws.send(JSON.stringify({ type: 'error', payload: { error: 'No context for id: ' + ctxId } }));
            }
            return;
          }

          ws.send(JSON.stringify({ type: 'error', payload: { error: 'Unknown message type' } }));
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          ws.send(JSON.stringify({ type: 'error', payload: { error: msg } }));
        }
      });

      ws.on('close', async () => {
        for (const c of controllers.values()) {
          try {
            await c.close();
          } catch {
            // ignore
          }
        }
        logger.info({ id }, 'MCP client disconnected');
      });
    });

    logger.info({ path: '/mcp' }, 'MCP WebSocket server started');
  })();
}
