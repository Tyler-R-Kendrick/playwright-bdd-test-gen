import { describe, it, expect } from 'vitest';
import { parseGherkin } from '../src/parsers/gherkinParser.js';

const sample = `Feature: Foo\n  Scenario: Bar\n    Given I am on "/"\n    When I click "Go"\n    Then I should see "Hello"\n`;

describe('Gherkin parser', () => {
  it('parses a simple feature', () => {
    const f = parseGherkin(sample);
    expect(f.title).toBe('Foo');
    expect(f.scenarios.length).toBe(1);
    expect(f.scenarios[0].steps.length).toBe(3);
  });
});
