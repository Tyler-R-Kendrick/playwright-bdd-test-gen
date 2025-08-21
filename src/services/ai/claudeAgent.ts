import axios from 'axios';
import type { Action } from '../codegen/playwrightController.js';

function hasActions(obj: unknown): obj is { actions: unknown } {
  return !!obj && typeof obj === 'object' && 'actions' in (obj as Record<string, unknown>);
}

export class ClaudeAgent {
  apiKey: string;
  apiUrl: string;
  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';
    this.apiUrl = process.env.ANTHROPIC_API_URL || 'https://api.anthropic.com';
    if (!this.apiKey) throw new Error('Missing ANTHROPIC_API_KEY');
  }

  async runSession(prompt: string, _options?: Record<string, unknown>): Promise<{ raw: unknown; actions: Action[] | null }> {
    // Use Anthropic Responses API (best-effort). This implementation sends a simple request and
    // expects the model to return a JSON array with actions. If the model replies with plain text, we try to parse JSON.
    const url = `${this.apiUrl}/v1/responses`;
    const body = {
      model: 'claude-3.1',
      input: prompt
    };

    const resp = await axios.post(url, body, {
      headers: { Authorization: `Bearer ${this.apiKey}` }
    });

    const data = resp.data;
    // try to find a JSON blob in the response
    const text = JSON.stringify(data);
    const actions = this.extractActionsFromText(text);
    return { raw: data, actions };
  }

  extractActionsFromText(text: string): Action[] | null {
    try {
      const maybe = JSON.parse(text);
      if (hasActions(maybe)) return (maybe.actions as Action[]);
      // fallback: walk object for actions field
      const found = this.findKey(maybe, 'actions');
      if (found) return found as Action[];
    } catch {
      // not JSON, try regex
      const m = text.match(/\{[\s\S]*\}/m);
      if (m) {
        try {
          const j = JSON.parse(m[0]);
          if (hasActions(j)) return j.actions as Action[];
        } catch {
          // ignore
        }
      }
    }
    return null;
  }

  findKey(obj: unknown, key: string): unknown {
    if (!obj || typeof obj !== 'object') return null;
    const asRec = obj as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(asRec, key)) return asRec[key];
    for (const k of Object.keys(asRec)) {
      const v = asRec[k];
      const found = this.findKey(v, key);
      if (found) return found;
    }
    return null;
  }
}
