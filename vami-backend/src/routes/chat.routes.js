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
    leaveGroup,
    updateGroupInfo,
    promoteAdmin,
    demoteAdmin,
    updateGroupSettings,
    generateInviteLink,
    revokeInviteLink,
    joinByInviteLink,
    updateConversationSettings,
} from "../controllers/chat.controller.js";

// local middleware
import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

// local validators
import { accessChatSchema, conversationSettingsSchema } from "../validators/chat.validator.js";
import {
    createGroupSchema,
    groupMemberSchema,
    renameGroupSchema,
    updateGroupInfoSchema,
    updateGroupSettingsSchema,
    inviteTokenSchema,
} from "../validators/group.validator.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// ---------------------------------------------------------------------------
// 1-on-1 chat
// ---------------------------------------------------------------------------
router.post("/", validate(accessChatSchema), accessChat);
router.get("/", fetchChats);

// ---------------------------------------------------------------------------
// Group management (Phase 2 originals)
// ---------------------------------------------------------------------------
router.post("/group", validate(createGroupSchema), createGroupChat);
router.put("/group/:chatId/rename", validate(renameGroupSchema), renameGroup);
router.put("/group/:chatId/add", validate(groupMemberSchema), addMember);
router.put("/group/:chatId/remove", validate(groupMemberSchema), removeMember);

// ---------------------------------------------------------------------------
// Group management (Phase 4 additions)
// ---------------------------------------------------------------------------
// join-by-link must come before /:chatId routes to avoid collision
router.post("/group/join/:token", validate(inviteTokenSchema), joinByInviteLink);

router.delete("/group/:chatId/leave", leaveGroup);
router.patch("/group/:chatId", validate(updateGroupInfoSchema), updateGroupInfo);
router.patch("/group/:chatId/settings", validate(updateGroupSettingsSchema), updateGroupSettings);
router.put("/group/:chatId/promote", validate(groupMemberSchema), promoteAdmin);
router.put("/group/:chatId/demote", validate(groupMemberSchema), demoteAdmin);
router.get("/group/:chatId/invite", generateInviteLink);
router.delete("/group/:chatId/invite", revokeInviteLink);

// ---------------------------------------------------------------------------
// Conversation settings — pin / archive / mute (Phase 4)
// ---------------------------------------------------------------------------
router.patch("/:chatId/settings", validate(conversationSettingsSchema), updateConversationSettings);

export default router;
