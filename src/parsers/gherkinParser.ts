import * as Gherkin from '@cucumber/gherkin';
import { IdGenerator } from '@cucumber/messages';

const GherkinMod = Gherkin as unknown as Record<string, unknown>;

type ParserCtor = new (builder: unknown, matcher: unknown) => { parse(source: string): unknown };
type AstBuilderCtor = new (idGen: unknown) => unknown;
type TokenMatcherCtor = new () => unknown;

const Parser = (GherkinMod.Parser as unknown as ParserCtor) || (GherkinMod.default && (GherkinMod.default as Record<string, unknown>).Parser as unknown as ParserCtor);
const AstBuilder = (GherkinMod.AstBuilder as unknown as AstBuilderCtor) || (GherkinMod.default && (GherkinMod.default as Record<string, unknown>).AstBuilder as unknown as AstBuilderCtor);
const TokenMatcher = (GherkinMod.TokenMatcher as unknown as TokenMatcherCtor) || (GherkinMod.default && (GherkinMod.default as Record<string, unknown>).TokenMatcher as unknown as TokenMatcherCtor);

export type Step = { keyword: string; text: string };
export type Scenario = { title: string; steps: Step[] };
export type Feature = { title: string; description?: string; scenarios: Scenario[] };

// Use the official Gherkin parser to build a stable AST and then convert it to our lightweight shape.
export function parseGherkin(source: string): Feature {
  let scenarios: Scenario[] = [];
  try {
    if (!Parser || !AstBuilder || !TokenMatcher) throw new Error('Gherkin parser API not available');

    const builder = new AstBuilder(IdGenerator.uuid());
    const matcher = new TokenMatcher();
    const parser = new Parser(builder, matcher);
    const gherkinDoc = parser.parse(source) as Record<string, unknown>;

    const feat = (gherkinDoc?.feature as Record<string, unknown>) || {};
    const title = (feat?.name as unknown as string) || 'Unnamed Feature';
    const description = (feat?.description as unknown as string) || '';
    scenarios = [];

    const children = (feat?.children as unknown as unknown[]) || [];
    for (const child of children) {
      // child may represent a standalone Scenario, Background, or a Rule wrapper
      // If it's a Rule, iterate its children
      const childRec = child as Record<string, unknown>;
      if (childRec?.rule) {
        const ruleChildren = ((childRec.rule as Record<string, unknown>).children as unknown[]) || [];
        for (const rc of ruleChildren) {
          const scNode = (rc as Record<string, unknown>).scenario || rc;
          const scRec = scNode as Record<string, unknown>;
          if (scRec && ((scRec.keyword as unknown as string)?.toLowerCase?.()?.includes('scenario') || scRec.name)) {
            const steps = ((scRec.steps as unknown[]) || []).map((st) => {
              const s = st as Record<string, unknown>;
              return { keyword: String(s.keyword || '').trim(), text: String(s.text || '').trim() } as Step;
            });
            scenarios.push({ title: String(scRec.name || 'Scenario'), steps });
          }
        }
        continue;
      }

      const scNode = (childRec.scenario as unknown) || child;
      const scRec = scNode as Record<string, unknown>;
      if (scRec && ((scRec.keyword as unknown as string)?.toLowerCase?.()?.includes('scenario') || scRec.name)) {
        const steps = ((scRec.steps as unknown[]) || []).map((st) => {
          const s = st as Record<string, unknown>;
          return { keyword: String(s.keyword || '').trim(), text: String(s.text || '').trim() } as Step;
        });
        scenarios.push({ title: String(scRec.name || 'Scenario'), steps });
      }
    }

    return { title, description, scenarios };
  } catch {
    // Fallback: simple resilient line-based parse if the official parser fails for any reason
    const lines = source.split(/\r?\n/).map((l) => l.trimRight());
    let title = '';
    const descriptionLines: string[] = [];

    let currentScenario: Scenario | null = null;

    const stepKeywordRegex = /^(Given|When|Then|And|But)\s+(.*)$/i;

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i].trim();
      if (!raw) {
        continue;
      }
      if (raw.startsWith('#')) continue; // comment

      if (raw.toLowerCase().startsWith('feature:')) {
        title = raw.replace(/^[Ff]eature:\s*/i, '').trim();
        continue;
      }

      if (raw.toLowerCase().startsWith('scenario:') || raw.toLowerCase().startsWith('scenario outline:')) {
        if (currentScenario) scenarios.push(currentScenario);
        const stitle = raw.replace(/^[Ss]cenario( outline)?:\s*/i, '').trim();
        currentScenario = { title: stitle || `Scenario ${scenarios.length + 1}`, steps: [] };
        continue;
      }

      const stepMatch = raw.match(stepKeywordRegex);
      if (stepMatch && currentScenario) {
        const [, kw, txt] = stepMatch;
        currentScenario.steps.push({ keyword: kw, text: txt.trim() });
        continue;
      }

      // If we reach here and we haven't hit a scenario yet, consider it description
      if (!currentScenario && title) {
        descriptionLines.push(raw);
      }
    }

    if (currentScenario) scenarios.push(currentScenario);

    return { title: title || 'Unnamed Feature', description: descriptionLines.join('\n'), scenarios };
  }
}
