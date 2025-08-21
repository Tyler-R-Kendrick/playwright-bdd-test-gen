import { describe, it, expect } from 'vitest';
import { writePlaywrightCodegenForScenario } from '../src/services/generation/testWriter.js';
import fs from 'fs';
import path from 'path';
import type { ActionResult } from '../src/services/codegen/playwrightController.js';

describe('testWriter', () => {
  it('writes a Playwright codegen-like file from action log', async () => {
    const now = new Date().toISOString();
    const actions: ActionResult[] = [
      { action: { type: 'goto', url: 'https://example.com' }, time: now, ok: true },
      { action: { type: 'click', selector: 'text="Log in"' }, time: now, ok: true }
    ];
    const out = path.join(process.cwd(), 'generated_test');
    if (!fs.existsSync(out)) fs.mkdirSync(out, { recursive: true });
    const file = await writePlaywrightCodegenForScenario('Feature X', 'Scenario Y', actions, out);
    expect(fs.existsSync(file)).toBe(true);
    // cleanup
    fs.rmSync(out, { recursive: true, force: true });
  });
});
