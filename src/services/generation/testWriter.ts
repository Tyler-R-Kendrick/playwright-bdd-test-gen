import fs from 'fs';
import path from 'path';
import type { ActionResult } from '../codegen/playwrightController.js';

export async function writeSpecForScenario(featureTitle: string, scenarioTitle: string, actionLog: ActionResult[], outDir: string) {
  const safeFeature = featureTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const safeScenario = scenarioTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const specsDir = path.join(outDir, 'specs');
  fs.mkdirSync(specsDir, { recursive: true });
  const file = path.join(specsDir, `${safeFeature}---${safeScenario}.spec.ts`);

  const lines: string[] = [];
  lines.push("import { test, expect } from '@playwright/test';");
  lines.push('');
  lines.push(`test('${featureTitle} - ${scenarioTitle}', async ({ page }) => {`);

  for (const r of actionLog) {
    const a = r.action;
    if (a.type === 'goto') {
      lines.push(`  await page.goto('${a.url}');`);
    } else if (a.type === 'click') {
      lines.push(`  await page.click('${a.selector}');`);
    } else if (a.type === 'fill') {
      lines.push(`  await page.fill('${a.selector}', ${JSON.stringify(a.value)});`);
    } else if (a.type === 'waitForSelector') {
      lines.push(`  await page.waitForSelector('${a.selector}', { timeout: ${a.timeout || 5000} });`);
    } else if (a.type === 'screenshot') {
      const p = r.screenshot ? r.screenshot : `screenshots/${Date.now()}.png`;
      lines.push(`  await page.screenshot({ path: '${p}', fullPage: true });`);
    }
  }

  lines.push('});');

  fs.writeFileSync(file, lines.join('\n'));
  return file;
}
