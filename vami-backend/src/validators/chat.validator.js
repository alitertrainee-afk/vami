// libs imports
import { z } from "zod";
import mongoose from "mongoose";

// Reusable ObjectId validator
export const objectIdSchema = z
  .string()
  .min(1, "ID is required")
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: "Invalid ObjectId format",
  });

export const accessChatSchema = z.object({
  body: z.object({
    userId: objectIdSchema,
  }),
});

// ---------------------------------------------------------------------------
// Phase 4 — Conversation settings (pin / archive / mute)
// ---------------------------------------------------------------------------

export const conversationSettingsSchema = z
  .object({
    params: z.object({ chatId: objectIdSchema }),
    body: z.object({
      isPinned:   z.boolean().optional(),
      isArchived: z.boolean().optional(),
      isMuted:    z.boolean().optional(),
    }),
  })
  .refine(
    (data) =>
      data.body.isPinned !== undefined ||
      data.body.isArchived !== undefined ||
      data.body.isMuted !== undefined,
    { message: "Provide at least one setting to update", path: ["body"] },
  );
