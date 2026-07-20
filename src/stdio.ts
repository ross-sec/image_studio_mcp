#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { buildServer } from "./server.js";

async function main(): Promise<void> {
  const cfg = loadConfig();
  const server = buildServer(cfg);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr ONLY — stdout is the JSON-RPC protocol stream.
  console.error(`[image-studio-mcp] stdio ready → ${cfg.studioUrl}`);
}

main().catch((e) => {
  console.error("[image-studio-mcp] fatal:", e);
  process.exit(1);
});
