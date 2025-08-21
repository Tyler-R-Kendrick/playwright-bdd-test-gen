import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { featureRouter } from './routes/featureRoutes.js';
import { generationRouter } from './routes/generationRoutes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
import { createMcpServer } from './mcp/server.js';

dotenv.config();

const app = express();
app.use(express.json());

// Ensure runtime folders exist
const root = process.cwd();
const featuresDir = path.join(root, 'features');
const generatedDir = path.join(root, process.env.GEN_OUTPUT_DIR || 'generated');
fs.mkdirSync(featuresDir, { recursive: true });
fs.mkdirSync(generatedDir, { recursive: true });
fs.mkdirSync(path.join(generatedDir, 'sessions'), { recursive: true });
fs.mkdirSync(path.join(generatedDir, 'playwright'), { recursive: true });
fs.mkdirSync(path.join(generatedDir, 'steps'), { recursive: true });

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api/features', featureRouter);
app.use('/api/generation', generationRouter);

app.use(notFound);
app.use(errorHandler);

const port = Number(process.env.PORT || 4000);

// Export the app so tests can import without starting a listener
export { app };

// Start server when not running tests and attach MCP server
if (process.env.NODE_ENV !== 'test') {
  const server = http.createServer(app);
  server.listen(port, () => {
    logger.info({ port }, 'Server started');
    try {
      createMcpServer(server);
    } catch (err: unknown) {
      logger.error({ err }, 'Failed to start MCP server');
    }
  });
}
