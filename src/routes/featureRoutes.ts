import express from 'express';
import { upload } from '../middleware/upload.js';
import { createResource, getResource, listResources } from '../mcp/resourceManager.js';

export const featureRouter = express.Router();

featureRouter.post('/', upload.single('file'), (req, res) => {
  // multer stores file info on req.file (memoryStorage -> req.file.buffer)
  if (!req.file || !req.file.buffer) return res.status(400).json({ error: 'No file uploaded' });
  const content = req.file.buffer.toString('utf-8');
  const resource = createResource('feature', content, req.file.originalname);
  return res.json({ featureId: resource.id, filename: resource.filename });
});

featureRouter.get('/', (_req, res) => {
  const files = listResources('feature');
  res.json({ files });
});

featureRouter.get('/:id', (req, res) => {
  const id = req.params.id;
  const resource = getResource('feature', id);
  if (!resource) return res.status(404).json({ error: 'Feature not found' });
  res.type('text/plain').send(resource.content);
});
