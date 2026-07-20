import { z } from "zod";

// A pixel dimension: 256-2048, multiple of 16 (server-enforced; we validate the range).
const dimension = z.number().int().min(256).max(2048);

const common = {
  prompt: z.string().min(1).max(4000).describe("The text prompt."),
  negative_prompt: z.string().max(4000).optional(),
  seed: z.number().int().min(0).max(2147483647).optional().describe("Omit to let the server pick (it is echoed back)."),
  steps: z.number().int().min(1).max(100).optional().describe("Diffusion steps (default 50)."),
  cfg_scale: z.number().min(0).max(15).optional().describe("Guidance scale (default 4)."),
  width: dimension.optional(),
  height: dimension.optional(),
  n: z.number().int().min(1).max(4).optional().describe("Number of images (1-4)."),
  params: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Model-specific knobs, e.g. {age:60} for roots, {scale:0.5} for sunsplash/criss/bredda. See list_models."),
};

// registerTool takes a RAW Zod shape (NOT z.object(...)).
export const generateShape = {
  model: z
    .string()
    .describe("Generation model id: irie, vibes, roots, sunsplash, criss, kaya, wagwan. Call list_models to discover."),
  ...common,
};

export const editShape = {
  model: z
    .string()
    .describe("Edit model id: remix, bashment, patchie (needs mask), bredda, rocksteady, biggup. Call list_models."),
  input_image: z
    .string()
    .describe("The image to edit: an absolute local file path, a data: URI, or a raw base64 PNG/JPEG (<=4 megapixels)."),
  mask: z
    .string()
    .optional()
    .describe("Optional mask (REQUIRED for patchie): file path / data URI / base64. Editable region = non-black pixels."),
  ...common,
};

export const jobIdShape = {
  job_id: z.string().describe("An Image Studio job id returned by generate_image/edit_image."),
};
