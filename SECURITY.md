# Security Policy

## Supported versions

The latest published `1.x` release is supported.

## Reporting a vulnerability

Please report security issues **privately** to **devops.ross@gmail.com** — do not open a public
GitHub issue. Include steps to reproduce and the impact. We aim to acknowledge within 72 hours.

## Security model

This server runs as a local **stdio** subprocess launched by your MCP client:

- Your **API key** (`IMAGE_STUDIO_API_KEY`) is read from the client `env` block or a gitignored
  `.env` (dotenv) and is never written to `.mcp.json`, logs, or images.
- All tool inputs are validated with Zod. Image inputs are size-bounded by the upstream API
  (≤4 megapixels); the server never fetches remote URLs on your behalf.
- Logs go to `stderr` only, so credentials never enter the stdio JSON-RPC stream.
