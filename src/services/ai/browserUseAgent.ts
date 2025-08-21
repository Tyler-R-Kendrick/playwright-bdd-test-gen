import axios from 'axios';
import type { Action } from '../codegen/playwrightController.js';

function hasActions(obj: unknown): obj is { actions: unknown } {
  return !!obj && typeof obj === 'object' && 'actions' in (obj as Record<string, unknown>);
}

export class BrowserUseAgent {
  url: string;
  constructor() {
    this.url = process.env.BROWSER_USE_URL || 'http://localhost:3001';
  }

  async runSession(
    prompt: string,
    _options?: Record<string, unknown>
  ): Promise<{ raw: unknown; actions: Action[] | null }> {
    // POST prompt to browser-use server and expect JSON actions
    const resp = await axios.post(`${this.url}/api/agent`, { prompt });
    if (resp?.data) return { raw: resp.data, actions: hasActions(resp.data) ? (resp.data.actions as Action[]) : null };
    return { raw: resp.data, actions: null };
  }
}
