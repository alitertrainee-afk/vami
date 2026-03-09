// libs imports
import { z } from "zod";

// local validators
import { objectIdSchema } from "./chat.validator.js";

const VALID_EMOJIS_MAX_LENGTH = 8;

export const sendMessageSchema = z
  .object({
    body: z.object({
      chatId:        objectIdSchema,
      content:       z.string().min(1, "Message cannot be empty").optional(),
      type:          z.enum(["text", "image", "video", "audio", "document", "voice"]).optional(),
      replyToId:     objectIdSchema.optional(),
      // 3.1 — Media fields (populated after client S3 upload)
      mediaKey:      z.string().optional(),
      mediaUrl:      z.string().url("mediaUrl must be a valid URL").optional(),
      mediaMimeType: z.string().optional(),
      mediaSize:     z.number().int().positive().optional(),
      mediaDuration: z.number().positive().optional(),
    }),
  })
  .refine(
    (data) => data.body.content || data.body.mediaKey,
    { message: "Message must have text content or a media attachment", path: ["body", "content"] },
  );

export const getMessagesSchema = z.object({
  params: z.object({
    chatId: objectIdSchema,
  }),
  query: z.object({
    page:  z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }).optional(),
});

export const reactToMessageSchema = z.object({
  params: z.object({ messageId: objectIdSchema }),
  body: z.object({
    chatId: objectIdSchema,
    // Empty string = remove reaction
    emoji:  z.string().max(VALID_EMOJIS_MAX_LENGTH),
  }),
});

export const editMessageSchema = z.object({
  params: z.object({ messageId: objectIdSchema }),
  body: z.object({
    content: z.string().min(1, "Content cannot be empty"),
  }),
});

export const deleteMessageSchema = z.object({
  params: z.object({ messageId: objectIdSchema }),
  query: z.object({
    scope: z.enum(["me", "everyone"]).optional(),
  }).optional(),
});

export const starMessageSchema = z.object({
  params: z.object({ messageId: objectIdSchema }),
});

export const getStarredSchema = z.object({
  query: z.object({
    page:  z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }).optional(),
});

export const disappearTimerSchema = z.object({
  params: z.object({ messageId: objectIdSchema }),
  body: z.object({
    // seconds until message disappears; null/0 clears the timer
    seconds: z.coerce.number().int().min(0).nullable().optional(),
  }),
});
