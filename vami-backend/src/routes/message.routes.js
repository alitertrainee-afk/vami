// libs imports
import express from "express";

// local imports
import { allMessages, sendMessage } from "../controllers/message.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  getMessagesSchema,
  sendMessageSchema,
} from "../validators/message.validator.js";

const router = express.Router();

router.route("/:chatId").get(protect, validate(getMessagesSchema), allMessages);
router.route("/").post(protect, validate(sendMessageSchema), sendMessage);

export default router;
