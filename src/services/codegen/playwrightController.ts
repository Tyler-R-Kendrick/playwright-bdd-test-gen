import { chromium, Browser, Page } from 'playwright';
import path from 'path';

export type Action =
  | { type: 'goto'; url: string }
  | { type: 'click'; selector: string }
  | { type: 'fill'; selector: string; value: string }
  | { type: 'waitForSelector'; selector: string; timeout?: number }
  | { type: 'screenshot'; name?: string };

export type ActionResult = { action: Action; time: string; ok: boolean; error?: string; screenshot?: string };

export class PlaywrightController {
  browser: Browser | null = null;
  page: Page | null = null;
  headless = true;
  baseDir: string;
  actions: ActionResult[] = [];

  constructor(headless = true, baseDir = process.cwd()) {
    this.headless = headless;
    this.baseDir = baseDir;
  }

  async start() {
    this.browser = await chromium.launch({ headless: this.headless });
    const context = await this.browser.newContext();
    this.page = await context.newPage();
    return this.page;
  }

  async execute(action: Action) {
    if (!this.page) throw new Error('Playwright page not started');
    const now = new Date().toISOString();
    const result: ActionResult = { action, time: now, ok: false };

    const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

    try {
      switch (action.type) {
        case 'goto':
          await this.page.goto(action.url, { waitUntil: 'load' });
          result.ok = true;
          break;
        case 'click':
          await this.page.click(action.selector);
          result.ok = true;
          break;
        case 'fill':
          await this.page.fill(action.selector, action.value);
          result.ok = true;
          break;
        case 'waitForSelector':
          await this.page.waitForSelector(action.selector, { timeout: action.timeout || 5000 });
          result.ok = true;
          break;
        case 'screenshot': {
          const name = action.name || `screenshot-${Date.now()}.png`;
          const out = path.join(this.baseDir, 'generated', 'sessions', name);
          await this.page.screenshot({ path: out, fullPage: true });
          result.ok = true;
          result.screenshot = out;
          break;
        }
        default:
          result.ok = false;
          result.error = 'Unknown action type';
      }
    } catch (err: unknown) {
      result.ok = false;
      result.error = getErrorMessage(err);
    }

    this.actions.push(result);
    return result;
  }

  getActions() {
    return this.actions;
  }

  async close() {
    try {
      await this.browser?.close();
    } catch {
      // ignore
    }
  }
}
