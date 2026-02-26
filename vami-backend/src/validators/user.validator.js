// libs imports
import { z } from "zod";

export const updateProfileSchema = z.object({
  body: z.object({
    username: z.string().min(3).max(30).optional(),
    email: z.string().email("Invalid email").optional(),
    bio: z.string().max(160).optional(),
    avatar: z.string().url("Invalid URL").nullable().optional(),
    theme: z.enum(["light", "dark", "system"]).optional(),
    notifications: z.boolean().optional(),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(8, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters"),
  }),
});
