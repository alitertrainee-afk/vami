// libs imports
import { z } from "zod";

// local validators
import { objectIdSchema } from "./chat.validator.js";

// ---------------------------------------------------------------------------
// Create status schema
// ---------------------------------------------------------------------------

export const createStatusSchema = z
  .object({
    body: z.object({
      type: z.enum(["text", "image", "video"]),

      // text status
      content:   z.string().max(700).optional(),
      bgColor:   z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex colour").optional(),
      fontIndex: z.number().int().min(0).max(4).optional(),

      // media status
      mediaKey:      z.string().optional(),
      mediaUrl:      z.string().url().optional(),
      mediaMimeType: z.string().optional(),
      thumbnailKey:  z.string().optional(),
      thumbnailUrl:  z.string().url().optional(),
      caption:       z.string().max(700).optional(),

      // privacy
      privacy:     z.enum(["contacts", "contacts_except", "only_share"]).optional(),
      privacyList: z.array(objectIdSchema).optional(),
    }),
  })
  .refine(
    (data) => {
      if (data.body.type === "text") return !!data.body.content?.trim();
      return !!data.body.mediaKey;
    },
    {
      message: "Text status requires content; media status requires a mediaKey",
      path: ["body", "content"],
    },
  );

export const statusIdParamSchema = z.object({
  params: z.object({ statusId: objectIdSchema }),
});
