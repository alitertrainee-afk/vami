// libs imports
import { z } from "zod";

// local validators
import { objectIdSchema } from "./chat.validator.js";

export const createGroupSchema = z.object({
    body: z.object({
        chatName: z.string().min(1, "Group name is required").max(100, "Group name too long"),
        participants: z
            .array(objectIdSchema)
            .min(2, "At least 2 participants are required"),
    }),
});

export const groupMemberSchema = z.object({
    params: z.object({
        chatId: objectIdSchema,
    }),
    body: z.object({
        userId: objectIdSchema,
    }),
});

export const renameGroupSchema = z.object({
    params: z.object({
        chatId: objectIdSchema,
    }),
    body: z.object({
        chatName: z.string().min(1, "Group name is required").max(100, "Group name too long"),
    }),
});

// ---------------------------------------------------------------------------
// Phase 4 — New group management schemas
// ---------------------------------------------------------------------------

export const updateGroupInfoSchema = z
  .object({
    params: z.object({ chatId: objectIdSchema }),
    body: z.object({
      chatName:    z.string().min(1).max(100).optional(),
      description: z.string().max(512).optional(),
      groupAvatar: z.string().optional(),  // S3 object key
    }),
  })
  .refine(
    (data) =>
      data.body.chatName !== undefined ||
      data.body.description !== undefined ||
      data.body.groupAvatar !== undefined,
    { message: "Provide at least one field to update", path: ["body"] },
  );

export const updateGroupSettingsSchema = z.object({
  params: z.object({ chatId: objectIdSchema }),
  body: z.object({
    onlyAdminsCanMessage: z.boolean({
      required_error: "onlyAdminsCanMessage must be a boolean",
    }),
  }),
});

export const inviteTokenSchema = z.object({
  params: z.object({
    token: z.string().min(1, "Invite token is required"),
  }),
});
