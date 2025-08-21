import express from 'express';
import { randomUUID } from 'node:crypto';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../utils/logger.js';
import { getResource } from './resourceManager.js';

// Attach MCP Streamable HTTP routes to an express app.
// This uses the official MCP TypeScript SDK and registers a simple "feature" resource
// backed by the in-memory resource manager.
export function createMcpRoutes(app: express.Application) {
  const transports: Record<string, StreamableHTTPServerTransport> = {};

  const server = new McpServer({ name: 'playwright-bdd-test-gen', version: process.env.npm_package_version || '1.0.0' });

  // Register a 'feature' resource that reads content from our in-memory resource manager
  server.registerResource(
    'feature',
    new ResourceTemplate('feature://{id}', { list: undefined }),
    {
      title: 'Gherkin feature',
      description: 'Feature resource stored in-memory',
      mimeType: 'text/plain'
    },
    async (uri: URL) => {
      // ResourceTemplate('feature://{id}') produces a URL like 'feature://<id>' where the id
      // appears in the hostname portion of the URL.
      const id = uri.hostname || uri.pathname.replace(/^\/+/, '');
      const r = getResource('feature', id);
      if (!r) throw new Error('Resource not found');
      return {
        contents: [
          {
            uri: uri.href,
            text: r.content
          }
        ]
      };
    }
  );

  // POST handler for Streamable HTTP transport with session management
  app.post('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid: string) => {
          transports[sid] = transport;
        }
      });

      transport.onclose = () => {
        if (transport.sessionId) delete transports[transport.sessionId];
      };

      await server.connect(transport);
    } else {
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided'
        },
        id: null
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  });

  const handleSessionRequest = async (req: express.Request, res: express.Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  };

  app.get('/mcp', handleSessionRequest);
  app.delete('/mcp', handleSessionRequest);

  logger.info({ path: '/mcp' }, 'MCP Streamable HTTP routes registered');
}
