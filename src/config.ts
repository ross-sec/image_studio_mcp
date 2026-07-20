import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

// Resolve the project root from THIS file's location (dist/config.js at runtime,
// or src/config.ts under tsx) so the .env is found regardless of the process CWD
// — an agent harness launches the stdio server with an arbitrary working dir.
const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "..");
loadEnv({ path: join(projectRoot, ".env") });

function required(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new Error(
      `Missing required env var ${name}. Set it in ${join(projectRoot, ".env")} (copy .env.example).`,
    );
  }
  return v.trim();
}

export interface Config {
  studioUrl: string;
  studioApiKey: string;
  outputDir: string;
  maxWaitS: number;
  projectRoot: string;
}

/** Load + validate config. FAIL-CLOSED: throws if IMAGE_STUDIO_API_KEY is unset. */
export function loadConfig(): Config {
  return {
    studioUrl: (process.env.IMAGE_STUDIO_URL || "https://studio.ross-developers.com").replace(/\/+$/, ""),
    studioApiKey: required("IMAGE_STUDIO_API_KEY"),
    outputDir: process.env.IMAGE_OUTPUT_DIR?.trim() || join(projectRoot, "outputs"),
    maxWaitS: Number(process.env.MCP_MAX_WAIT_S || 900),
    projectRoot,
  };
}
