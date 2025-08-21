import express from 'express';
import fs from 'fs';
import path from 'path';
import { upload } from '../middleware/upload.js';

export const featureRouter = express.Router();

const featuresDir = path.join(process.cwd(), 'features');

featureRouter.post('/', upload.single('file'), (req, res) => {
  // multer stores file info on req.file
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  return res.json({ featureId: req.file.filename, filename: req.file.originalname });
});

featureRouter.get('/', (_req, res) => {
  const files = fs.readdirSync(featuresDir).filter((f) => f.endsWith('.feature'));
  res.json({ files });
});

featureRouter.get('/:id', (req, res) => {
  const file = req.params.id;
  const full = path.join(featuresDir, file);
  if (!fs.existsSync(full)) return res.status(404).json({ error: 'Feature not found' });
  const content = fs.readFileSync(full, 'utf-8');
  res.type('text/plain').send(content);
});
