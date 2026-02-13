import { z } from "zod";

export const sendMessageSchema = z.object({
  body: z.object({
    chatId: z.string().min(1, "ChatId is required"),
    content: z.string().min(1, "Message cannot be empty"),
  }),
});

export const getMessagesSchema = z.object({
  params: z.object({
    chatId: z.string().min(1),
  }),
});
