import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { homedir } from "node:os";
import type { Config } from "./config.js";
import { ImageStudioClient, ImageStudioError, TERMINAL, type Job } from "./client.js";
import { editShape, generateShape, jobIdShape } from "./schemas.js";

type ToolResult = {
  content: Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }>;
  isError?: boolean;
};

function errResult(e: unknown): ToolResult {
  const msg =
    e instanceof ImageStudioError
      ? `Image Studio error${e.status ? ` (${e.status})` : ""}${e.code ? ` [${e.code}]` : ""}: ${e.message}`
      : `Error: ${(e as Error)?.message ?? String(e)}`;
  return { content: [{ type: "text", text: msg }], isError: true };
}

/** Turn a file path / data URI / raw base64 into raw base64 the API accepts. */
async function toBase64(input: string): Promise<string> {
  if (input.startsWith("data:")) return input.split(",", 2)[1] ?? "";
  const looksLikePath =
    isAbsolute(input) || input.startsWith("./") || input.startsWith("../") || input.startsWith("~");
  if (looksLikePath) {
    const p = input.startsWith("~") ? join(homedir(), input.slice(1)) : input;
    return (await readFile(p)).toString("base64");
  }
  return input; // already base64
}

/** Render a terminal job: inline image blocks + saved PNGs + a text summary. */
async function jobToResult(cfg: Config, job: Job): Promise<ToolResult> {
  if (job.status === "failed" || job.status === "canceled") {
    const err = typeof job.error === "string" ? job.error : (job.error?.message ?? job.status);
    return { content: [{ type: "text", text: `Job ${job.id} ${job.status}: ${err}` }], isError: true };
  }
  const images = job.output?.images ?? [];
  const content: ToolResult["content"] = [];
  const saved: string[] = [];
  const dir = join(cfg.outputDir, job.id);
  let idx = 0;
  for (const img of images) {
    if (!img.b64_json) continue;
    content.push({ type: "image", data: img.b64_json, mimeType: "image/png" });
    try {
      await mkdir(dir, { recursive: true });
      const file = join(dir, `${idx}.png`);
      await writeFile(file, Buffer.from(img.b64_json, "base64"));
      saved.push(file);
    } catch (e) {
      console.error(`[image-studio-mcp] save failed: ${(e as Error).message}`);
    }
    idx++;
  }
  const summary = [
    `job ${job.id} · ${job.status} · model ${job.model ?? "?"} · ${images.length} image(s)`,
    images.map((im, i) => `  [${i}] ${im.width ?? "?"}x${im.height ?? "?"} seed=${im.seed ?? "?"}`).join("\n"),
    saved.length ? `saved:\n${saved.map((s) => `  ${s}`).join("\n")}` : "(no file saved — no b64 in response)",
  ]
    .filter(Boolean)
    .join("\n");
  content.push({ type: "text", text: summary });
  return { content };
}

export function buildServer(cfg: Config): McpServer {
  const client = new ImageStudioClient(cfg);
  const server = new McpServer({ name: "image_studio_mcp", version: "1.0.0" });

  server.registerTool(
    "list_models",
    {
      title: "List image models",
      description:
        "List the available Image Studio image models (text-to-image generation + image editing) with each model's task, endpoint, and tunable parameters. Call this to pick the right model id.",
      inputSchema: {},
    },
    async (): Promise<ToolResult> => {
      try {
        const data = await client.listModels();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return errResult(e);
      }
    },
  );

  server.registerTool(
    "generate_image",
    {
      title: "Generate image (text-to-image)",
      description:
        "Generate image(s) from a text prompt using an Image Studio generation model (irie, vibes, roots, sunsplash, criss, kaya, wagwan). Blocks until the render finishes, returns the image INLINE (so you can see it) and saves a PNG to the outputs dir.",
      inputSchema: generateShape,
    },
    async (args): Promise<ToolResult> => {
      try {
        let job = await client.generate(args as Record<string, unknown>);
        if (!TERMINAL.has(job.status)) job = await client.pollUntilDone(job.id, cfg.maxWaitS);
        if (!TERMINAL.has(job.status))
          return { content: [{ type: "text", text: `Still running after ${cfg.maxWaitS}s. Poll with get_job job_id=${job.id}.` }] };
        return await jobToResult(cfg, job);
      } catch (e) {
        return errResult(e);
      }
    },
  );

  server.registerTool(
    "edit_image",
    {
      title: "Edit image (image-conditioned)",
      description:
        "Edit or transform an input image with an Image Studio edit model (remix, bashment, patchie[needs mask], bredda, rocksteady, biggup[upscale]). input_image accepts an absolute file path, a data URI, or raw base64. Blocks, returns inline + saves.",
      inputSchema: editShape,
    },
    async (args): Promise<ToolResult> => {
      try {
        const a: Record<string, unknown> = { ...(args as Record<string, unknown>) };
        a.input_image = await toBase64(String(a.input_image));
        if (a.mask) a.mask = await toBase64(String(a.mask));
        let job = await client.edit(a);
        if (!TERMINAL.has(job.status)) job = await client.pollUntilDone(job.id, cfg.maxWaitS);
        if (!TERMINAL.has(job.status))
          return { content: [{ type: "text", text: `Still running after ${cfg.maxWaitS}s. Poll with get_job job_id=${job.id}.` }] };
        return await jobToResult(cfg, job);
      } catch (e) {
        return errResult(e);
      }
    },
  );

  server.registerTool(
    "get_job",
    {
      title: "Get job status / result",
      description:
        "Fetch an image job by id. If it has finished, returns the image(s) inline + saved; otherwise returns the current status.",
      inputSchema: jobIdShape,
    },
    async ({ job_id }): Promise<ToolResult> => {
      try {
        const job = await client.getJob(job_id);
        if (TERMINAL.has(job.status)) return await jobToResult(cfg, job);
        return { content: [{ type: "text", text: `job ${job.id} · ${job.status}` }] };
      } catch (e) {
        return errResult(e);
      }
    },
  );

  server.registerTool(
    "cancel_job",
    {
      title: "Cancel job",
      description: "Cancel a queued or running image job by id.",
      inputSchema: jobIdShape,
    },
    async ({ job_id }): Promise<ToolResult> => {
      try {
        const job = await client.cancel(job_id);
        return { content: [{ type: "text", text: `job ${job.id} · ${job.status}` }] };
      } catch (e) {
        return errResult(e);
      }
    },
  );

  return server;
}
