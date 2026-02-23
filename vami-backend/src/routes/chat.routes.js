// libs imports
import express from "express";

// local controllers
import {
    accessChat,
    fetchChats,
    createGroupChat,
    addMember,
    removeMember,
    renameGroup,
} from "../controllers/chat.controller.js";

// local middleware
import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

// local validators
import { accessChatSchema } from "../validators/chat.validator.js";
import {
    createGroupSchema,
    groupMemberSchema,
    renameGroupSchema,
} from "../validators/group.validator.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// 1-on-1 chat
router.post("/", validate(accessChatSchema), accessChat);
router.get("/", fetchChats);

// Group chat management
router.post("/group", validate(createGroupSchema), createGroupChat);
router.put("/group/:chatId/rename", validate(renameGroupSchema), renameGroup);
router.put("/group/:chatId/add", validate(groupMemberSchema), addMember);
router.put("/group/:chatId/remove", validate(groupMemberSchema), removeMember);

export default router;
