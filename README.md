# playwright-bdd-test-gen
A small service that ingests Gherkin feature files and generates Playwright tests by orchestrating a parser, an AI adapter, and a Playwright controller.

This repository contains:
- an Express API for uploading features and starting generation jobs
- a Gherkin parser and fallback parser
- AI adapter hooks (Claude / Browser-Use)
- a Playwright controller that executes browser actions and captures an action trace
- a test writer that emits Playwright `.spec.ts` files under `generated/specs`


## Prerequisites
- Node.js (LTS) installed (Node 18+ recommended)
- Git
- Internet access (for Playwright browser downloads and optional AI API access)


## Quick setup
1. Install dependencies

   npm install

2. Install Playwright browsers (required for E2E tests)

   npx playwright install --with-deps

3. Copy the example env and configure values (optional)

   cp .env.example .env

   Edit `.env` to set:
   - `PORT` (server port)
   - `AI_PROVIDER` (e.g. `claude` or `browser-use`)
   - `ANTHROPIC_API_KEY` / `ANTHROPIC_API_URL` (if using Claude)
   - `BROWSER_USE_URL` (if using Browser-Use agent)
   - `DEFAULT_BASE_URL` (used by the deterministic translator)
   - `GEN_OUTPUT_DIR` (defaults to `generated`)


## Run the app (development)

Start the TypeScript dev server (uses `tsx`):

   npm run dev

The app exposes REST endpoints on `http://localhost:<PORT>` (default 4000).


## API (quick reference)
- `POST /api/features` — upload a Gherkin `.feature` file (form field `file`). Returns a `featureId`.
- `GET /api/features` — list uploaded feature filenames
- `GET /api/features/:id` — download the raw feature file
- `POST /api/generation/:featureId` — start a generation job. JSON body may include `{ baseUrl }`. Returns `{ jobId }`.
- `GET /api/generation/:jobId/status` — poll job status (`queued`, `running`, `completed`, `failed`).
- `GET /api/generation/files` — list generated spec files (under `generated/specs`).
- `GET /api/generation/files/:name` — download a generated spec file.


## Run tests

1. Ensure Playwright browsers are installed (required for E2E tests):

   npx playwright install --with-deps

2. Run the test suite (unit + e2e):

   npm test

Notes:
- Tests run with Vitest. The E2E test spins up a small fixture HTTP server and validates the full upload → generate flow.


## Linting & type-check

- Run ESLint (project uses flat config `eslint.config.cjs`):

   npm run lint

- Run TypeScript type-check only:

   npx tsc --noEmit


## CI suggestions
- In CI, run:
  1. `npm ci`
  2. `npx playwright install --with-deps`
  3. `npm test -- --run`
  4. `npm run lint`


## Troubleshooting
- If Playwright fails to launch in tests, ensure browsers were installed with `npx playwright install --with-deps`.
- If the linter warns about TypeScript versions or parser issues, run `npm install` to sync dependencies or ask to pin compatible versions.


## Notes
- The project contains two parsing strategies: the official `@cucumber/gherkin` parser (preferred) and a resilient line-based fallback.
- AI adapters are implemented as HTTP clients; you must provide appropriate API keys/URLs when using them.


Contributions & feedback welcome.
