import { Feature, Scenario } from '../parsers/gherkinParser.js';

export function buildPrompt(feature: Feature, scenario: Scenario, baseUrl: string) {
  const lines: string[] = [];
  lines.push(`Feature: ${feature.title}`);
  if (feature.description) lines.push(feature.description);
  lines.push(`Scenario: ${scenario.title}`);
  lines.push('Steps:');
  scenario.steps.forEach((s, i) => lines.push(`${i + 1}. ${s.keyword} ${s.text}`));

  lines.push('\nContext:');
  lines.push(`Base URL: ${baseUrl}`);
  lines.push('\nInstructions:');
  lines.push(
    'You are an automation agent. Translate each Gherkin step into atomic browser actions. Use selectors if possible, prefer semantic selectors, fallback to text selectors. Return JSON array named "actions" where each action is {type, selector?, value?, url?, extra?}.'
  );

  return lines.join('\n');
}
