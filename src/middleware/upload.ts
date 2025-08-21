import multer from 'multer';

// Use memory storage so uploaded files are available on req.file.buffer
// and can be registered as MCP resources instead of being persisted to disk.
const storage = multer.memoryStorage();

export const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });
