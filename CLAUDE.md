# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A thin MCP server that wraps the remote **Image Studio** `/v1` HTTP API (text→image + image edit) as agent tools. It does **no local image processing** — no sharp/jimp/canvas, no model SDKs. All inference runs on the backend (`studio.ross-developers.com`); this server submits jobs, polls them to a terminal state, and returns each result PNG **inline** (base64) while also saving it to disk. TypeScript, ESM, ~400 LOC across 5 files. Single transport: **stdio** (launched by the MCP client).

Published to npm as **`@ross_technologies/image_studio_mcp`** (`bin`: `image_studio_mcp`, unscoped); the supported end-user flow is `npx @ross_technologies/image_studio_mcp` + their own `IMAGE_STUDIO_API_KEY` (from https://studio.ross-developers.com), no clone/build. Name is scoped because npm's typosquat filter blocks the unscoped form as "too similar" to an existing `image-studio-mcp`. It is a **first-party client of the hosted Image Studio API** — it always targets the remote backend (`IMAGE_STUDIO_URL`, default `studio.ross-developers.com`). Self-hosting the image backend is **not** a supported path; treat `IMAGE_STUDIO_URL` overrides as internal dev/testing only and keep them out of public docs.

## Commands

```bash
npm run build         # tsc → dist/ (emits JS + .d.ts + sourcemaps)
npm run dev           # tsx src/stdio.ts   — run from source, no build
npm run start         # node dist/stdio.js — built server (the bin / agent launch target)
npm run clean         # cross-platform node one-liner (works on Windows + Unix)
```

- **No tests and no linter exist** — no test runner, no eslint/prettier/biome, no CI. Do not invent `npm test`/`npm run lint`. The only verification gate (per CONTRIBUTING.md) is that `npm run build` passes cleanly, plus a manual stdio `tools/list` / `tools/call` transcript.
- **NodeNext ESM:** source imports of sibling modules must carry the `.js` suffix even though the files are `.ts` (e.g. `import { buildServer } from "./server.js"`). Node `>=20`.
- **Build with `npm`, not `pnpm`, on NTFS/exFAT mounts** (pnpm's symlink store breaks there). `package-lock.json` is the committed lockfile.

## Architecture

`buildServer(cfg)` in `src/server.ts` is the **single composition root** — it constructs the `ImageStudioClient` and registers all 5 tools.

- `src/stdio.ts` — the entry / `bin` (`image_studio_mcp`). Calls `buildServer(cfg)` and connects it over `StdioServerTransport`. **Logs to stderr only** (stdout is the JSON-RPC stream).

Supporting files:
- `src/client.ts` — `ImageStudioClient`, a typed `fetch` wrapper. `Job`/`JobImage` types, `TERMINAL` set (`succeeded|failed|canceled`), typed `ImageStudioError` (carries HTTP status + code). Holds `pollUntilDone` (polls `getJob` every 1500ms until terminal or deadline).
- `src/schemas.ts` — Zod input shapes. **Raw shapes (plain objects), NOT `z.object(...)`** — `registerTool` requires this; there is an explicit comment saying so.
- `src/config.ts` — `loadConfig()`, fail-closed env validation.

### Request flow (generate / edit)

1. Handler calls `client.generate(args)` / `client.edit(args)`. Client forces `response_format: "b64_json"` and sends `Idempotency-Key: randomUUID()` + `Prefer: wait=55` (backend holds the connection ~55s for a synchronous result).
2. If the returned job isn't terminal, handler falls back to `client.pollUntilDone(id, cfg.maxWaitS)` (client-side poll). Two-timeout design: backend `wait=55s` vs client `MCP_MAX_WAIT_S` (default 900s).
3. Still not terminal after `maxWaitS` → return a text handle telling the agent to poll `get_job`.
4. Terminal → `jobToResult(cfg, job)` renders: one inline `{type:"image"}` block per image, writes each to `<outputDir>/<job_id>/<index>.png` (disk-save failures are swallowed, logged to stderr), then a text summary (job id, status, model, per-image `WxH seed=`, saved paths). Failed/canceled jobs render as `isError` text.

`edit_image` differs only in that the handler pre-converts `input_image`/`mask` to base64 via `toBase64()` (accepts a `data:` URI, an absolute/`./`/`../`/`~` file path, or raw base64) before submitting.

### The 5 tools (all in `src/server.ts`)

| tool | schema | notes |
|------|--------|-------|
| `list_models` | none | `GET /v1/models` — the model-discovery path |
| `generate_image` | `generateShape` | text→image: `irie, vibes, roots, sunsplash, criss, kaya, wagwan` |
| `edit_image` | `editShape` | edit: `remix, bashment, patchie`(mask), `bredda, rocksteady, biggup`(upscale) |
| `get_job` | `jobIdShape` | inline+save if terminal, else status text |
| `cancel_job` | `jobIdShape` | `POST /v1/jobs/{id}/cancel` |

Model ids are **stringly-typed** (documented in `.describe()`, validated server-side) — new backend models need no code change here.

**Adding a tool:** add one `registerTool(...)` block in `src/server.ts` (+ usually a Zod shape in `schemas.ts` and a client method in `client.ts`). No registry, manifest, or discovery step.

## Config & env

`src/config.ts` loads `.env` via dotenv **relative to the compiled/source file's own location** (`import.meta.url` → project root), **not** the process CWD — deliberate, because agent harnesses launch the stdio server from an arbitrary working directory. `studioUrl` has trailing slashes stripped.

| var | required | default |
|-----|:---:|---------|
| `IMAGE_STUDIO_API_KEY` | yes (fail-closed) | — |
| `IMAGE_STUDIO_URL` | no | `https://studio.ross-developers.com` |
| `IMAGE_OUTPUT_DIR` | no | `<project>/outputs` |
| `MCP_MAX_WAIT_S` | no | `900` |

`IMAGE_STUDIO_API_KEY` authenticates *this server → backend* (Bearer). stdio inbound needs no auth (trust = process boundary). Sandbox key for wiring up without a GPU: `IMAGE_STUDIO_API_KEY=isk_test_onelove`. Not the console's `IMAGE_STUDIO_ADMIN_TOKEN`.
