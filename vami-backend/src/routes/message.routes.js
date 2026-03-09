// libs imports
import express from "express";

// local controllers
import {
  allMessages,
  sendMessage,
  reactToMessage,
  editMessage,
  deleteMessage,
  starMessage,
  unstarMessage,
  getStarredMessages,
  setDisappearTimer,
} from "../controllers/message.controller.js";

// local middleware
import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

// local validators
import {
  getMessagesSchema,
  sendMessageSchema,
  reactToMessageSchema,
  editMessageSchema,
  deleteMessageSchema,
  starMessageSchema,
  getStarredSchema,
  disappearTimerSchema,
} from "../validators/message.validator.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// -----------------------------------------------------------------------
// Existing
// -----------------------------------------------------------------------
router.get("/:chatId",  validate(getMessagesSchema), allMessages);
router.post("/",        validate(sendMessageSchema),  sendMessage);

// -----------------------------------------------------------------------
// 2.6 — Starred messages (static path must come before :messageId param)
// -----------------------------------------------------------------------
router.get("/starred", validate(getStarredSchema), getStarredMessages);

// -----------------------------------------------------------------------
// 2.3 — Reactions
// -----------------------------------------------------------------------
router.post("/:messageId/react",  validate(reactToMessageSchema), reactToMessage);

// -----------------------------------------------------------------------
// 2.4 — Edit
// -----------------------------------------------------------------------
router.patch("/:messageId",       validate(editMessageSchema),    editMessage);

// -----------------------------------------------------------------------
// 2.5 — Delete
// -----------------------------------------------------------------------
router.delete("/:messageId",      validate(deleteMessageSchema),  deleteMessage);

// -----------------------------------------------------------------------
// 2.6 — Star / Unstar
// -----------------------------------------------------------------------
router.post("/:messageId/star",   validate(starMessageSchema),    starMessage);
router.delete("/:messageId/star", validate(starMessageSchema),    unstarMessage);

// -----------------------------------------------------------------------
// 2.7 — Disappearing messages
// -----------------------------------------------------------------------
router.patch("/:messageId/disappear", validate(disappearTimerSchema), setDisappearTimer);

export default router;
