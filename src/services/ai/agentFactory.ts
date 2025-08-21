import { config } from '../../config/index.js';
import { ClaudeAgent } from './claudeAgent.js';
import { BrowserUseAgent } from './browserUseAgent.js';
import type { Action } from '../codegen/playwrightController.js';

export type AgentResponse = { raw: unknown; actions: Action[] | null };
export type AIAdapter = { runSession: (prompt: string, options?: Record<string, unknown>) => Promise<AgentResponse> };

export function createAgent(): AIAdapter {
  const provider = (process.env.AI_PROVIDER || config.aiProvider || 'mock').toLowerCase();
  if (provider === 'claude') {
    return new ClaudeAgent();
  }
  if (provider === 'browser-use') {
    return new BrowserUseAgent();
  }
  // default: throw if no provider configured
  throw new Error('No AI provider configured; set AI_PROVIDER to "claude" or "browser-use"');
}
