# playwright-bdd-test-gen
A small service that ingests Gherkin feature files and generates Playwright tests by orchestrating a parser, an AI adapter, and a Playwright controller.

This repository contains:
- an Express API for uploading features and starting generation jobs
- an MCP Streamable HTTP endpoint (`/mcp`) implementing the Model Context Protocol using the official SDK (`@modelcontextprotocol/sdk`)
- a Gherkin parser and resilient fallback parser
- AI adapter hooks (Claude / Browser-Use)
- a Playwright controller that executes browser actions and captures an action trace
- a test writer that emits Playwright test files (simulated Playwright codegen/recorder output) under `generated/playwright`


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

When running normally (NODE_ENV !== "test") the server registers an MCP Streamable HTTP transport on `/mcp` using the official MCP TypeScript SDK. See the PRD and the MCP Server section below for details.


## API (quick reference)
- `POST /api/features` — upload a Gherkin `.feature` file (form field `file`). Returns `{ featureId, filename }`. Uploads are stored as MCP resources (in-memory by default) — they are not written to disk by the upload flow.
- `GET /api/features` — list registered feature resources (returns `[{ id, filename, createdAt }, ...]`).
- `GET /api/features/:id` — return raw Gherkin content for a feature resource (text/plain).
- `POST /api/generation/:featureId` — start a generation job for the feature resource identified by `featureId`. JSON body may include options like `{ baseUrl }`. Returns `{ jobId, status }`.
- `GET /api/generation/:jobId/status` — poll generation job status (`queued`, `running`, `completed`, `failed`).
- `GET /api/generation/files` — list generated Playwright files written under `GEN_OUTPUT_DIR || generated/playwright`.
- `GET /api/generation/files/:name` — download a generated Playwright test file by name.


### Upload notes
- The upload middleware uses `multer` memory storage and the server registers content in the MCP-backed resource manager.
- Use the returned `featureId` when starting a generation job.


## MCP Server (Streamable HTTP)

This project integrates the official MCP TypeScript SDK (`@modelcontextprotocol/sdk`) and exposes a Streamable HTTP transport on `/mcp`.

- Endpoint: `POST /mcp` (Streamable HTTP initialization and message handling), `GET /mcp` / `DELETE /mcp` used for session-managed interactions.
- Session header: `Mcp-Session-Id` is used for session management. Browser-based clients must expose this header via CORS (`exposedHeaders: ['Mcp-Session-Id']`).
- Registered resources: a `feature` resource template (`feature://{id}`) is registered and backed by the in-memory resource manager. MCP clients can:
  - `listResources()` and filter for `feature` resources
  - `readResource({ uri: 'feature://<id>' })` to retrieve feature contents
- Tools/Prompts: the server can register MCP tools and prompts (e.g. a future `generate` tool). Consider using MCP tools to start generation and stream progress back to clients.

Security / CORS suggestions:
- If you need browser-based MCP clients, enable CORS and expose `Mcp-Session-Id` in responses.
- Streamable HTTP transport supports DNS rebinding protection and allowed hosts/origins options — configure via `src/mcp/server.ts` if needed.


## Run tests

1. Ensure Playwright browsers are installed (required for E2E tests):

   npx playwright install --with-deps

2. Run the test suite (unit + e2e):

   npm test -- --run

Notes:
- Tests run with Vitest. The E2E test covers the upload → generation flow.


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
- If you need a pure WebSocket MCP transport, the SDK also supports other transports; refer to the PRD and the SDK docs.


## Key implementation files
- `src/mcp/resourceManager.ts` — in-memory MCP resource registry (feature resources)
- `src/mcp/server.ts` — MCP Streamable HTTP wiring using `@modelcontextprotocol/sdk`
- `src/routes/featureRoutes.ts` — HTTP feature upload/list/get; registers uploaded features as MCP resources
- `src/services/sessionService.ts` — orchestration and generation job processing
- `src/middleware/upload.ts` — `multer` memory-storage for uploads


## Notes
- The project contains two parsing strategies: the official `@cucumber/gherkin` parser (preferred) and a resilient line-based fallback.
- AI adapters are implemented as HTTP clients; you must provide appropriate API keys/URLs when using them.

Contributions & feedback welcome.
