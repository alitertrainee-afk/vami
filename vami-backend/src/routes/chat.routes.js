// libs imports
import express from "express";

// local imports
import { accessChat, fetchChats } from "../controllers/chat.controller.js";
import { protect } from "../middleware/auth.middleware.js"; // We need to create this!
import { validate } from "../middleware/validate.middleware.js";
import { accessChatSchema } from "../validators/chat.validator.js";

const router = express.Router();

router.route("/").post(protect, validate(accessChatSchema), accessChat);
router.route("/").get(protect, fetchChats);

export default router;
