import { randomUUID } from "node:crypto";
import type { Config } from "./config.js";

export interface JobImage {
  url?: string;
  b64_json?: string;
  seed?: number;
  width?: number;
  height?: number;
  [k: string]: unknown;
}

export interface Job {
  id: string;
  status: "queued" | "running" | "succeeded" | "failed" | "canceled" | string;
  model?: string;
  output?: { images?: JobImage[] } | null;
  error?: { code?: string; message?: string } | string | null;
  [k: string]: unknown;
}

export const TERMINAL = new Set(["succeeded", "failed", "canceled"]);

export class ImageStudioError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ImageStudioError";
  }
}

/** Thin typed client for the Image Studio /v1 customer API. */
export class ImageStudioClient {
  constructor(private readonly cfg: Config) {}

  private async req(
    method: string,
    path: string,
    opts: { body?: unknown; headers?: Record<string, string> } = {},
  ): Promise<any> {
    const res = await fetch(`${this.cfg.studioUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.cfg.studioApiKey}`,
        ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...opts.headers,
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    const text = await res.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : undefined;
    } catch {
      /* non-JSON body */
    }
    if (!res.ok) {
      const msg = data?.error?.message ?? data?.detail ?? text ?? `HTTP ${res.status}`;
      const code = data?.error?.code ?? data?.error?.type;
      throw new ImageStudioError(String(msg), res.status, code ? String(code) : undefined);
    }
    return data;
  }

  listModels(): Promise<any> {
    return this.req("GET", "/v1/models");
  }

  /** Submit a text-to-image job (forces b64_json so we can return bytes inline). */
  generate(body: Record<string, unknown>, waitSec = 55): Promise<Job> {
    return this.req("POST", "/v1/images/generations", {
      body: { ...body, response_format: "b64_json" },
      headers: { "Idempotency-Key": randomUUID(), Prefer: `wait=${waitSec}` },
    });
  }

  /** Submit an image-edit job. */
  edit(body: Record<string, unknown>, waitSec = 55): Promise<Job> {
    return this.req("POST", "/v1/images/edits", {
      body: { ...body, response_format: "b64_json" },
      headers: { "Idempotency-Key": randomUUID(), Prefer: `wait=${waitSec}` },
    });
  }

  getJob(id: string): Promise<Job> {
    return this.req("GET", `/v1/jobs/${encodeURIComponent(id)}`);
  }

  cancel(id: string): Promise<Job> {
    return this.req("POST", `/v1/jobs/${encodeURIComponent(id)}/cancel`);
  }

  /** Poll a job until it reaches a terminal status or `maxWaitS` elapses. */
  async pollUntilDone(id: string, maxWaitS: number): Promise<Job> {
    const deadline = Date.now() + maxWaitS * 1000;
    let job = await this.getJob(id);
    while (!TERMINAL.has(job.status) && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 1500));
      job = await this.getJob(id);
    }
    return job;
  }
}
