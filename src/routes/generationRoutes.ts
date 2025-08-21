import express from 'express';
import path from 'path';
import fs from 'fs';
import { sessionService } from '../services/sessionService.js';

export const generationRouter = express.Router();

// Start a generation job for a feature
generationRouter.post('/:featureId', async (req, res) => {
  try {
    const featureId = req.params.featureId;
    const options = req.body || {};
    const job = await sessionService.startSession(featureId, options);
    res.json({ jobId: job.id, status: job.status });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// Get job status
generationRouter.get('/:jobId/status', (req, res) => {
  const jobId = req.params.jobId;
  const status = sessionService.getStatus(jobId);
  if (!status) return res.status(404).json({ error: 'Job not found' });
  return res.json(status);
});

// List generated spec files
generationRouter.get('/files', (_req, res) => {
  const specsDir = path.join(process.cwd(), process.env.GEN_OUTPUT_DIR || 'generated', 'specs');
  if (!fs.existsSync(specsDir)) return res.json({ files: [] });
  const files = fs.readdirSync(specsDir).filter((f) => f.endsWith('.spec.ts') || f.endsWith('.spec.js'));
  res.json({ files });
});

// Download a generated file by name
generationRouter.get('/files/:name', (req, res) => {
  const name = req.params.name;
  const file = path.join(process.cwd(), process.env.GEN_OUTPUT_DIR || 'generated', 'specs', name);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'File not found' });
  res.download(file);
});
