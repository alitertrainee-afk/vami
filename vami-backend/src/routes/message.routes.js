// libs imports
import express from "express";

// local controllers
import { allMessages, sendMessage } from "../controllers/message.controller.js";

// local middleware
import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

// local validators
import {
  getMessagesSchema,
  sendMessageSchema,
} from "../validators/message.validator.js";

const router = express.Router();

router.route("/:chatId").get(protect, validate(getMessagesSchema), allMessages);
router.route("/").post(protect, validate(sendMessageSchema), sendMessage);

export default router;
