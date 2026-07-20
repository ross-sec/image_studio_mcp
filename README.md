# image_studio_mcp

[![npm version](https://img.shields.io/npm/v/image_studio_mcp.svg)](https://www.npmjs.com/package/image_studio_mcp)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![node >=20](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org)

A [Model Context Protocol](https://modelcontextprotocol.io) server that lets any MCP client —
Claude Code, opencode, Claude Desktop, or your own — **generate and edit images in-loop** with
[Image Studio](https://studio.ross-developers.com/agents/mcp). Results come back **inline** (the
model sees the image) and each PNG is saved to disk.

You need nothing but Node ≥20 and an API key: point your client at `npx image_studio_mcp`, drop in
your key, and go. No clone, no build, no local model — all rendering runs on the hosted Image
Studio API.

- 🔑 **Get an API key:** https://studio.ross-developers.com/agents/mcp
- 📖 **Full docs:** https://studio.ross-developers.com/agents/mcp/docs

## Quick start

Add this to your MCP client config (e.g. `.mcp.json`), put in your key, and restart the client:

```jsonc
{
  "mcpServers": {
    "image-studio": {
      "command": "npx",
      "args": ["-y", "image_studio_mcp"],
      "env": { "IMAGE_STUDIO_API_KEY": "isk_your_key_here" }
    }
  }
}
```

Don't have a key yet? Use the watermarked, no-GPU sandbox key `isk_test_onelove` to try it out.

Then just ask your agent to make an image — e.g. *"generate a sunset over Kingston harbour"* — and
it will call `generate_image`, show you the result inline, and save the PNG.

## Tools

| tool | description |
|------|-------------|
| `list_models` | list the image models (generation + editing) with their tasks and parameters |
| `generate_image` | text→image (`irie`, `vibes`, `roots`, `sunsplash`, `criss`, `kaya`, `wagwan`) — blocks, returns inline + saves |
| `edit_image` | image edit (`remix`, `bashment`, `patchie`[mask], `bredda`, `rocksteady`, `biggup`[upscale]) — `input_image` = path / data URI / base64 |
| `get_job` | poll a job by id |
| `cancel_job` | cancel a job |

`generate_image` / `edit_image` submit the job, poll to completion (up to `MCP_MAX_WAIT_S`), return
every image as an inline base64 block **and** write it to `IMAGE_OUTPUT_DIR/<job_id>/<n>.png`. Call
`list_models` first to see every model, its task, and its tunable parameters.

## Configuration

Set via your MCP client's `env` block (above) or a `.env` file. See [.env.example](./.env.example).

| var | required | default | notes |
|-----|:---:|---------|-------|
| `IMAGE_STUDIO_API_KEY` | ✅ | — | Your key from https://studio.ross-developers.com/agents/mcp. Server refuses to start without it. |
| `IMAGE_OUTPUT_DIR` | | `<package>/outputs` | where PNGs are saved |
| `MCP_MAX_WAIT_S` | | `900` | max seconds a tool blocks before returning a job handle |

## Install (optional)

`npx` needs no install. To pin it globally instead:

```bash
npm install -g image_studio_mcp
# then use "command": "image_studio_mcp" (no npx) in your MCP config
```

## How it works

`generate_image` / `edit_image` call your Image Studio backend, poll the job to completion, and return
the finished PNG both **inline** (so the model sees it) and on disk. Nothing runs locally — the server
is a thin, typed client over the hosted `/v1` API. It talks to your MCP client over **stdio**, and logs
only to stderr (stdout is the JSON-RPC stream). Your `IMAGE_STUDIO_API_KEY` is read from the client
`env` / a local `.env` and is never written to disk or logged. See [SECURITY.md](./SECURITY.md).

## Contributing & conduct

Contributions welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md). This project follows the
[Contributor Covenant](./CODE_OF_CONDUCT.md).

## License

[MIT](./LICENSE) © Andre Ross
