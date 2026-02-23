// libs imports
import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(30),
    email: z.email("Invalid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email().optional(),
    username: z.string().min(3).optional(),
    password: z.string().min(8),
  }),
});
