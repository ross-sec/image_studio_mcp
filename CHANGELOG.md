# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-07-20

### Added

- Initial release.
- MCP tools: `list_models`, `generate_image`, `edit_image`, `get_job`, `cancel_job`.
- `generate_image` / `edit_image` submit an Image Studio `/v1` job, poll to completion, return each
  image **inline** (base64) so the model can see it, and save a PNG to `IMAGE_OUTPUT_DIR`.
- Transport: stdio (launched by your MCP client).
- Security: fail-closed on a missing `IMAGE_STUDIO_API_KEY`; Zod-validated tool inputs; stderr-only
  logging so credentials never enter the JSON-RPC stream.
- Talks to the hosted `https://studio.ross-developers.com/v1` API.
