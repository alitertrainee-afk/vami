// libs imports
import { z } from "zod";

// local validators
import { objectIdSchema } from "./chat.validator.js";

// ---------------------------------------------------------------------------
// Push subscription schemas
// ---------------------------------------------------------------------------

const pushKeysSchema = z.object({
  p256dh: z.string().min(1, "p256dh key is required"),
  auth:   z.string().min(1, "auth key is required"),
});

export const subscribePushSchema = z.object({
  body: z.object({
    subscription: z.object({
      endpoint: z.string().url("endpoint must be a valid URL"),
      keys:     pushKeysSchema,
    }),
    deviceLabel: z.string().max(100).optional(),
  }),
});

export const unsubscribePushSchema = z.object({
  body: z.object({
    endpoint: z.string().url("endpoint must be a valid URL"),
  }),
});
