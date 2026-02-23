import { z } from "zod";
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
});
