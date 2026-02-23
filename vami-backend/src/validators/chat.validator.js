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
