import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const featuresDir = path.join(process.cwd(), 'features');
fs.mkdirSync(featuresDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, featuresDir),
  filename: (_req, file, cb) => {
    const id = uuidv4();
    const ext = path.extname(file.originalname) || '.feature';
    cb(null, `${id}${ext}`);
  }
});

export const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });
