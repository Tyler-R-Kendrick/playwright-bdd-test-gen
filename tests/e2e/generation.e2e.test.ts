import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { app } from '../../src/index.js';

describe('E2E generation', () => {
  let server: import('http').Server | null = null;
  let port = 0;

  beforeAll(async () => {
    const fixture = express();
    fixture.use(express.urlencoded({ extended: true }));
    fixture.get('/login', (_req, res) => {
      res.send(`<!doctype html><html><body>
        <form id="f">
          <input name="username" />
          <input name="password" />
          <button id="btn">Log in</button>
        </form>
        <script>
          document.getElementById('btn').addEventListener('click', function(e){ e.preventDefault(); document.body.innerHTML = '<div>Welcome</div>'; });
        </script>
      </body></html>`);
    });

    server = await new Promise<import('http').Server>((resolve) => {
      const s = fixture.listen(0, () => resolve(s));
    });

    const addr = server.address();
    if (addr && typeof addr !== 'string') {
      port = addr.port;
    } else {
      throw new Error('Failed to determine fixture port');
    }
  });

  afterAll(() => {
    try {
      server?.close();
      // cleanup generated files
      const gen = path.join(process.cwd(), 'generated');
      if (fs.existsSync(gen)) fs.rmSync(gen, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('uploads feature and generates a spec', async () => {
    const featurePath = path.join(process.cwd(), 'features', 'sample.feature');
    const upload = await request(app).post('/api/features').attach('file', featurePath);
    expect(upload.status).toBe(200);
    const featureId = upload.body.featureId;
    expect(featureId).toBeTruthy();

    const gen = await request(app)
      .post(`/api/generation/${featureId}`)
      .send({ baseUrl: `http://127.0.0.1:${port}` });
    expect(gen.status).toBe(200);
    const jobId = gen.body.jobId;
    expect(jobId).toBeTruthy();

    // poll for completion
    let status = 'queued';
    const timeout = Date.now() + 15000;
    while (Date.now() < timeout) {
      const s = await request(app).get(`/api/generation/${jobId}/status`);
      status = s.body.status;
      if (status === 'completed' || status === 'failed') break;
      await new Promise((r) => setTimeout(r, 500));
    }

    if (status === 'failed') {
      const sessFile = path.join(process.cwd(), 'generated', 'sessions', `${jobId}.json`);
      if (fs.existsSync(sessFile)) {
        console.error('Session trace:', fs.readFileSync(sessFile, 'utf-8'));
      }
    }

    expect(status).toBe('completed');

    const specPath = path.join(process.cwd(), 'generated', 'specs', 'sample_login---successful_login.spec.ts');
    expect(fs.existsSync(specPath)).toBe(true);
    const content = fs.readFileSync(specPath, 'utf-8');
    expect(content).toContain('page.fill');
    expect(content).toContain('page.click');
  }, 20000);
});
