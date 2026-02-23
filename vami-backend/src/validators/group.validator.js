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
