// libs imports
import { z } from "zod";

export const presignSchema = z.object({
  body: z.object({
    mimetype: z.string().min(3, "mimetype is required"),
    // size in bytes — must be a positive integer
    size: z.coerce.number().int().positive("size must be a positive integer"),
  }),
});

export const confirmUploadSchema = z.object({
  body: z.object({
    key: z.string().min(1, "key is required"),
  }),
});
