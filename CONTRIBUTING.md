# Contributing

Thanks for your interest in improving **image_studio_mcp**. This project follows the
[Contributor Covenant](./CODE_OF_CONDUCT.md) — by participating you agree to uphold it.

## Development

```bash
npm install          # use npm (not pnpm) if the repo lives on an NTFS/exFAT mount
cp .env.example .env # set IMAGE_STUDIO_API_KEY (use isk_test_onelove for the sandbox)
npm run dev          # tsx src/stdio.ts (stdio)
npm run dev:http     # tsx src/http.ts  (secured HTTP + SSE)
npm run build        # tsc -> dist/
```

## Guidelines

- **TypeScript, ESM, Node ≥18.** Keep imports written with the `.js` suffix (NodeNext resolution).
- **Validate every tool input with Zod** (`src/schemas.ts`); treat all arguments as untrusted.
- **Never log to stdout** — it is the stdio JSON-RPC stream. Use `console.error`.
- **Keep secrets in `.env`** (gitignored, loaded via dotenv). Never commit a key or bake one into an image.
- **Preserve the security posture** of `src/http.ts`: env-key bearer auth, DNS-rebinding protection,
  CORS/Origin allowlists, loopback bind. Run the checks in the README before opening a PR.

## Pull requests

1. Fork + branch from `main`.
2. `npm run build` must pass with no errors.
3. Describe the change and how you tested it (include the stdio `tools/list` / `tools/call` transcript).

## Reporting security issues

Please do **not** open public issues for vulnerabilities. See [SECURITY.md](./SECURITY.md).
