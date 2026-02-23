// libs imports
import { z } from "zod";

// local validators
import { objectIdSchema } from "./chat.validator.js";

export const sendMessageSchema = z.object({
  body: z.object({
    chatId: objectIdSchema,
    content: z.string().min(1, "Message cannot be empty"),
  }),
});

export const getMessagesSchema = z.object({
  params: z.object({
    chatId: objectIdSchema,
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }).optional(),
});
