import { z } from "zod";

export const accessChatSchema = z.object({
  body: z.object({
    userId: z.string().min(1, "UserId is required"),
  }),
});
