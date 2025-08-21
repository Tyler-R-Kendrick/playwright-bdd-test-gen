# Product Requirements Document (PRD): AI-Driven Gherkin → Playwright Test Generator

## Overview
This service converts Gherkin BDD feature files into executable Playwright tests using an AI-driven browser controller and Playwright's recorder/codegen. Feature files are treated as MCP (Model Context Protocol) resources rather than files that must be persisted by API endpoints. The server exposes both HTTP endpoints for convenience and an MCP Streamable HTTP endpoint for richer client integrations.

Core flow:
- A user submits a Gherkin feature file (HTTP upload or via an MCP client).
- The server registers the feature as an MCP resource (in-memory by default) and returns a stable resource id.
- A generation job is started (HTTP or via MCP tool) which builds an AI prompt, opens a Playwright recording context, and drives the browser via MCP while the recorder captures actions.
- Generated Playwright artifacts are persisted to disk (configurable `GEN_OUTPUT_DIR`) and are available for download.

## Goals
- Turn BDD feature files into reliable Playwright test recordings using AI-assisted browser control.
- Make feature files first-class MCP resources so clients (web apps, CLIs, agents) can access and operate on them using MCP capabilities.
- Provide both lightweight HTTP APIs for quick integration and a proper MCP Streamable HTTP transport for advanced clients and tooling.

## HTTP API (current endpoints)
- POST /api/features
  - Accepts multipart/form-data with field `file` (a `.feature` file).
  - The upload is stored in-memory and registered as an MCP resource. Response: `{ featureId, filename }`.
  - Note: files are no longer written to `features/` by the upload flow.

- GET /api/features
  - Returns the list of registered feature resources: `[{ id, filename, createdAt }, ...]`.

- GET /api/features/:id
  - Returns the raw Gherkin content for the feature resource with the given id (text/plain).

- POST /api/generation/:featureId
  - Start a generation job for the feature resource identified by `featureId`.
  - Body may include options (e.g. `baseUrl`). Returns a job record `{ jobId, status }`.

- GET /api/generation/:jobId/status
  - Returns the status and result/error for the generation job.

- GET /api/generation/files
  - Lists generated Playwright files written under `GEN_OUTPUT_DIR || generated/playwright`.

- GET /api/generation/files/:name
  - Download a generated Playwright test file by name.

Implementation notes:
- The upload middleware uses memory storage (no disk write) and the server registers the uploaded content in the MCP-backed resource manager.
- `sessionService.startSession()` reads feature content by resource id (MCP resource manager) instead of reading a file path.

## MCP (Model Context Protocol) interface
- Transport: Streamable HTTP transport is exposed at `/mcp` (session-managed). The server uses the official MCP TypeScript SDK (`@modelcontextprotocol/sdk`).
- Session management: clients may use the `Mcp-Session-Id` header to manage long-lived sessions. See SDK examples for initialization and session lifecycle.
- Resources: the server registers a `feature` resource template `feature://{id}` backed by the in-memory resource store. MCP clients can:
  - `listResources()` and filter `feature` resources
  - `readResource({ uri: 'feature://<id>' })` to retrieve feature contents
- Tools/Prompts: the server can register MCP tools and prompts (e.g., a `generate` tool) which clients can call. Future work: expose generation as an MCP tool so MCP clients can start generation jobs and receive progress/events.

Security and CORS:
- When using browser-based MCP clients, ensure CORS includes exposure of the `Mcp-Session-Id` response header.
- The Streamable HTTP transport can enable DNS rebinding protection and allowed host/origin lists.

## Data model and storage
- Features: stored as MCP resources (in-memory Map by default). They have `{ id, filename, content, createdAt }`.
- Generated artifacts: persisted to disk under `process.cwd() / (GEN_OUTPUT_DIR || 'generated')` with subfolders for `playwright` and `sessions`.
- Sessions & jobs: generation jobs are tracked in-memory in `sessionService.jobs`, and a session trace (JSON) is written to `generated/sessions/<jobId>.json` for diagnostics.

## Key modules (implementation)
- `src/mcp/resourceManager.ts` — in-memory MCP resource registry (feature resources).
- `src/mcp/server.ts` — MCP route/transport wiring using `@modelcontextprotocol/sdk` (Streamable HTTP) and registers the `feature` resource template.
- `src/routes/featureRoutes.ts` — HTTP feature upload/list/get; registers uploaded features as MCP resources.
- `src/services/sessionService.ts` — orchestration: parse feature, build prompt, create Playwright controller, run AI agent, execute actions, persist results.
- `src/middleware/upload.ts` — `multer` memory-storage for uploads.

## UX / User Flow Updates
- Uploading a feature now returns a `featureId`. Use this id when calling the generation API.
- Advanced clients can operate directly over MCP (read resources, invoke tools/prompts, receive notifications) instead of relying solely on HTTP.

## Future enhancements
- Expose generated artifacts as MCP resources (e.g. `generated://playwright/<file>`).
- Add authentication/authorization for MCP tools and resources.
- Persist MCP resources to durable storage (S3, DB, or disk) for longevity.
- Register an MCP `generate` tool that starts generation and streams progress events back to clients.

---

This PRD reflects the current implementation approach: features-as-resources (MCP-first), HTTP convenience endpoints, and a Streamable HTTP MCP transport powered by the official MCP TypeScript SDK.
