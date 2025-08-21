import fs from 'fs';
import path from 'path';
import { parseGherkin } from '../parsers/gherkinParser.js';
import { buildPrompt } from './promptService.js';
import { createAgent } from './ai/agentFactory.js';
import { PlaywrightController, Action, ActionResult } from './codegen/playwrightController.js';
import { writeSpecForScenario } from './generation/testWriter.js';
import { v4 as uuidv4 } from 'uuid';

type JobStatus = 'queued' | 'running' | 'completed' | 'failed';
type JobRecord = { id: string; status: JobStatus; featureId: string; createdAt: string; error?: string; result?: unknown };

type AgentLike = { runSession: (prompt: string, options?: Record<string, unknown>) => Promise<{ raw: unknown; actions: Action[] | null }> } | null;

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

export const sessionService = {
  jobs: new Map<string, JobRecord>(),

  async startSession(featureId: string, options: Record<string, unknown> = {}) {
    const featuresDir = path.join(process.cwd(), 'features');
    const full = path.join(featuresDir, featureId);
    if (!fs.existsSync(full)) throw new Error('Feature not found');
    const content = fs.readFileSync(full, 'utf-8');
    const feature = parseGherkin(content);
    const scenario = feature.scenarios[0];
    if (!scenario) throw new Error('No scenarios in feature');

    const jobId = uuidv4();
    const job: JobRecord = { id: jobId, status: 'queued', featureId, createdAt: new Date().toISOString() };
    this.jobs.set(jobId, job);

    // start background processing
    (async () => {
      try {
        job.status = 'running';
        // Build prompt
        const baseUrl = (options.baseUrl as string) || process.env.DEFAULT_BASE_URL || 'http://localhost:3000';
        const prompt = buildPrompt(feature, scenario, baseUrl);

        // instantiate AI agent
        let agent: AgentLike = null;
        try {
          agent = createAgent();
        } catch {
          // no agent configured
          agent = null;
        }

        // start playwright
        const controller = new PlaywrightController(process.env.PLAYWRIGHT_HEADLESS !== 'false', process.cwd());
        await controller.start();

        // ask agent for actions
        let actions: Action[] | null = null;
        if (agent) {
          const resp = await agent.runSession(prompt, { baseUrl });
          actions = resp?.actions || null;
        }

        // fallback deterministic translator if no actions
        if (!actions) {
          actions = this.translateStepsToActions(scenario.steps, baseUrl);
        }

        const results: ActionResult[] = [];
        for (const a of actions) {
          const r = await controller.execute(a as Action);
          results.push(r);
          // simple failure handling
          if (!r.ok) {
            job.status = 'failed';
            job.error = r.error;
            break;
          }
        }

        if (job.status !== 'failed') {
          // write generated spec
          const out = path.join(process.cwd(), process.env.GEN_OUTPUT_DIR || 'generated');
          await writeSpecForScenario(feature.title, scenario.title, controller.getActions(), out);
          job.status = 'completed';
          job.result = { generated: true };
        }

        // store session trace
        const sessDir = path.join(process.cwd(), process.env.GEN_OUTPUT_DIR || 'generated', 'sessions');
        fs.mkdirSync(sessDir, { recursive: true });
        fs.writeFileSync(path.join(sessDir, `${jobId}.json`), JSON.stringify({ job, actions: controller.getActions() }, null, 2));

        await controller.close();
      } catch (err: unknown) {
        job.status = 'failed';
        job.error = getErrorMessage(err);
        try {
          const sessDir = path.join(process.cwd(), process.env.GEN_OUTPUT_DIR || 'generated', 'sessions');
          fs.mkdirSync(sessDir, { recursive: true });
          fs.writeFileSync(path.join(sessDir, `${jobId}.json`), JSON.stringify({ job, error: job.error }, null, 2));
        } catch {
          // ignore
        }
      }
    })();

    return job;
  },

  getStatus(jobId: string) {
    return this.jobs.get(jobId);
  },

  translateStepsToActions(steps: Array<{ keyword: string; text: string }>, baseUrl: string) {
    const actions: Action[] = [];
    for (const s of steps) {
      const t = s.text;
      // heuristic translations
      if (/go to|navigate to|open/i.test(t)) {
        const m = t.match(/(?:to|visit)\s+(.*)/i);
        let urlPart = m ? (m[1] as string).trim() : '';
        // strip surrounding quotes if present
        if ((urlPart.startsWith('"') && urlPart.endsWith('"')) || (urlPart.startsWith("'") && urlPart.endsWith("'"))) {
          urlPart = urlPart.slice(1, -1);
        }
        const url = urlPart.startsWith('http') ? urlPart : `${baseUrl}${urlPart.startsWith('/') ? '' : '/'}${urlPart}`;
        actions.push({ type: 'goto', url } as Action);
        continue;
      }

      // fill field: "I fill in "username" with "user""
      const fillMatch = t.match(/fill in "?([^"]+)"? with "?([^"]+)"?/i);
      if (fillMatch) {
        const selector = `input[name="${fillMatch[1]}"]`;
        actions.push({ type: 'fill', selector, value: fillMatch[2] } as Action);
        continue;
      }

      // click link or button with text
      const clickMatch = t.match(/click(?: on)?(?: the)? "?([^"]+)"?/i);
      if (clickMatch) {
        const text = clickMatch[1];
        const selector = `text="${text}"`;
        actions.push({ type: 'click', selector } as Action);
        continue;
      }

      // "I should see "Welcome"" -> wait for text
      const seeMatch = t.match(/should see "?([^"]+)"?/i);
      if (seeMatch) {
        const txt = seeMatch[1];
        actions.push({ type: 'waitForSelector', selector: `text="${txt}"`, timeout: 7000 } as Action);
        continue;
      }

      // default: wait for text
      actions.push({ type: 'waitForSelector', selector: `text="${t}"`, timeout: 7000 } as Action);
    }
    return actions;
  }
};
