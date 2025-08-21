# Product Requirements Document (PRD): AI-Driven Gherkin to Playwright Test Generator Server

## Overview
Build an MCP (Model Context Protocol) server integrating Anthropic's Claude Computer Use tool (or open-source Browser-Use) with Playwright's codegen for automating Playwright test generation from Gherkin BDD feature files. User uploads Gherkin file; server enhances as AI prompt, starts Playwright codegen session, guides AI agent to perform actions, records tests, ends session when complete.

## Objectives
- Automate test code generation for Gherkin scenarios using AI browser control.
- Ensure compatibility: Claude/Playwright via MCP; fallback to open-source Browser-Use.
- Output executable Playwright tests in Cucumber-style for BDD execution.

## Target Users
- QA engineers, developers using BDD for web app testing.

## Key Features
- Gherkin file upload and parsing.
- AI prompt enhancement from Gherkin (add context, steps breakdown).
- Start Playwright codegen session (browser recording).
- AI agent (Claude or Browser-Use) execution: Use prompt to control browser via MCP.
- Task completion detection: AI checks all Gherkin steps done.
- End codegen, output Playwright test files.
- Error handling: Retry failed actions, log sessions.

## User Scenario
1. User uploads Gherkin feature file.
2. Server enhances as prompt.
3. Starts Playwright codegen.
4. AI agent executes steps in browser.
5. On completion, ends session, generates tests.

## Architecture
- Server: Node.js/Express for API endpoints.
- Gherkin Parser: cucumber-gherkin library.
- AI Integration: Anthropic API for Claude Computer Use; fallback GitHub Browser-Use.
- Browser Control: Playwright MCP server for AI interaction.
- Output: Generated .spec.ts files with Cucumber steps mapped to Playwright actions.

## Tech Stack
- Backend: Node.js.
- AI: Claude 3.5 Sonnet with Computer Use tool.
- Open-Source Alt: Browser-Use (GitHub: browser-use/browser-use).
- Automation: Playwright v1.47+ with codegen and MCP.
- BDD: Cucumber.js for Gherkin execution in output tests.

## Compatibility Check
- Claude Computer Use compatible with Playwright via MCP (GitHub: invariantlabs-ai/playwright-computer-use). Supports browser control, screenshots, actions.
- Browser-Use: Open-source, integrates with MCP servers for AI agents; compatible with Playwright.
- Playwright Codegen: Records AI-driven actions into tests.
- Gherkin to Playwright: Supported via Cucumber-Playwright integration; generated tests run Gherkin files.
- Issues: Claude beta latency; mitigate with caching. No direct conflicts found.

## Control Flow Diagram

```mermaid
flowchart TD
    A[User Uploads Gherkin File] --> B[Server Parses & Enhances as AI Prompt]
    B --> C[Start Playwright Codegen Session]
    C --> D[AI Agent (Claude/Browser-Use) Receives Prompt]
    D --> E[AI Executes Steps via MCP Browser Control]
    E --> F{All Steps Complete?}
    F -->|Yes| G[End Codegen Session]
    F -->|No| E
    G --> H[Output Playwright Test Files]
```
