// local services
import {
  sendMessageService,
  markAsReadService,
  reactToMessageService,
  editMessageService,
  deleteMessageService,
  markDeliveredService,
  markReadService,
  bulkMarkDeliveredService,
} from "../services/message.service.js";
import { updateUserPresenceService } from "../services/user.service.js";

// local models
import Conversation from "../models/Conversation.js";

const isParticipant = async (userId, roomId) => {
  return Conversation.findOne({
    _id: roomId,
    participants: userId,
  });
};

/**
 * Fetch unique contact IDs for a user across all their conversations.
 * Used to scope presence broadcasts — O(contacts) instead of O(all_sockets).
 */
const getContactIds = async (userId) => {
  const conversations = await Conversation.find(
    { participants: userId },
    { participants: 1 },
  ).lean();

  const contactIds = new Set();
  for (const conv of conversations) {
    for (const p of conv.participants) {
      if (p.toString() !== userId.toString()) {
        contactIds.add(p.toString());
      }
    }
  }
  return contactIds;
};

const chatSocket = (io, socket) => {
  const userId = socket.user?._id;

  const updatePresence = async (isOnline) => {
    try {
      await updateUserPresenceService({ userId, isOnline });

      // ⚠️ Critical fix: only emit to known contacts, not every connected socket.
      const contactIds = await getContactIds(userId);
      for (const contactId of contactIds) {
        io.to(contactId).emit("user_status_update", { userId, isOnline });
      }
    } catch (error) {
      console.error("Presence update failed:", error.message);
    }
  };

  // User connected
  updatePresence(true);

  // Auto-join a personal notification room keyed by userId
  socket.join(userId.toString());

  // 🔒 Authorized room join — verify user is a participant before joining
  socket.on("join_room", async (roomId) => {
    if (!roomId) return;

    const conversation = await isParticipant(userId, roomId);
    if (!conversation) {
      return socket.emit("error", {
        message: "Unauthorized: You are not a member of this conversation",
      });
    }

    socket.join(roomId);

    // 2.1 — Bulk-mark any undelivered messages as "delivered" for this user
    try {
      const deliveredIds = await bulkMarkDeliveredService({ conversationId: roomId, userId });
      if (deliveredIds.length > 0) {
        // Notify the sender(s) that their messages were delivered
        for (const msgId of deliveredIds) {
          io.to(roomId).emit("message_delivered", { messageId: msgId, userId });
        }
      }
    } catch (err) {
      console.error("Bulk delivered failed:", err.message);
    }
  });

  // Leave a chat room (called when switching conversations)
  socket.on("leave_room", (roomId) => {
    if (!roomId) return;
    socket.leave(roomId);
  });

  socket.on("typing", (roomId) => {
    socket.to(roomId).emit("user_typing", { userId, roomId });
  });

  socket.on("stop_typing", (roomId) => {
    socket.to(roomId).emit("user_stopped_typing", { userId, roomId });
  });

  // 🔒 Authorized message send — with optional replyToId (2.2 reply) + media (3.1)
  socket.on("send_message", async (data) => {
    const {
      roomId,
      content,
      type,
      replyToId,
      // 3.1 — Media
      mediaKey,
      mediaUrl,
      mediaMimeType,
      mediaSize,
      mediaDuration,
    } = data || {};

    if (!roomId || (!content && !mediaKey)) {
      return socket.emit("error", { message: "Invalid message payload" });
    }

    const conversation = await isParticipant(userId, roomId);
    if (!conversation) {
      return socket.emit("error", {
        message: "Unauthorized: You are not a member of this conversation",
      });
    }

    // Phase 4 — enforce onlyAdminsCanMessage restriction
    if (conversation.isGroupChat && conversation.onlyAdminsCanMessage) {
      const uid = userId.toString();
      const isAdmin =
        conversation.groupAdmin?.toString() === uid ||
        conversation.admins?.some((a) => a.toString() === uid);
      if (!isAdmin) {
        return socket.emit("error", {
          message: "Only admins can send messages in this group",
        });
      }
    }

    try {
      const message = await sendMessageService({
        senderId: userId,
        chatId: roomId,
        content,
        type,
        replyToId,
        mediaKey,
        mediaUrl,
        mediaMimeType,
        mediaSize,
        mediaDuration,
      });

      // Deliver message to everyone in the room
      io.to(roomId).emit("receive_message", message);

      // Notify offline/backgrounded participants via their personal rooms
      const participantIds = conversation.participants.map((p) => p.toString());
      for (const participantId of participantIds) {
        if (participantId === userId.toString()) continue;
        io.to(participantId).emit("new_message_notification", {
          chatId: roomId,
          message: message.content,
          sender: socket.user._id,
        });
      }
    } catch (error) {
      socket.emit("error", { message: error.message || "Message failed" });
    }
  });

  // Mark conversation as read — resets unread count for this user
  socket.on("mark_as_read", async (roomId) => {
    if (!roomId) return;
    try {
      await markAsReadService({ chatId: roomId, userId });
    } catch (error) {
      console.error("Mark as read failed:", error.message);
    }
  });

  // -------------------------------------------------------------------
  // 2.1 — Per-message read receipt
  // Payload: { messageId, roomId }
  // -------------------------------------------------------------------
  socket.on("message_read", async ({ messageId, roomId }) => {
    if (!messageId || !roomId) return;
    try {
      const { aggregateStatus, senderId } = await markReadService({ messageId, userId });

      // Inform the sender that their specific message was read
      io.to(senderId.toString()).emit("message_status_update", {
        messageId,
        status: aggregateStatus,
        readBy: userId,
      });
      // Also update the room so other participants' UIs sync
      io.to(roomId).emit("message_status_update", {
        messageId,
        status: aggregateStatus,
      });
    } catch (err) {
      console.error("message_read failed:", err.message);
    }
  });

  // -------------------------------------------------------------------
  // 2.3 — React to a message
  // Payload: { messageId, roomId, emoji }  (empty emoji = remove reaction)
  // -------------------------------------------------------------------
  socket.on("react_to_message", async ({ messageId, roomId, emoji }) => {
    if (!messageId || !roomId) return;
    try {
      const message = await reactToMessageService({
        messageId,
        userId,
        emoji: emoji ?? "",
        chatId: roomId,
      });
      io.to(roomId).emit("message_reaction_updated", {
        messageId,
        reactions: message.reactions,
      });
    } catch (err) {
      socket.emit("error", { message: err.message || "Reaction failed" });
    }
  });

  // -------------------------------------------------------------------
  // 2.4 — Edit a message
  // Payload: { messageId, roomId, content }
  // -------------------------------------------------------------------
  socket.on("edit_message", async ({ messageId, roomId, content }) => {
    if (!messageId || !roomId || !content) return;
    try {
      const message = await editMessageService({ messageId, userId, newContent: content });
      io.to(roomId).emit("message_edited", {
        messageId,
        content: message.content,
        isEdited: true,
        editedAt: message.editedAt,
      });
    } catch (err) {
      socket.emit("error", { message: err.message || "Edit failed" });
    }
  });

  // -------------------------------------------------------------------
  // 2.5 — Delete a message
  // Payload: { messageId, roomId, scope } — scope: "me" | "everyone"
  // -------------------------------------------------------------------
  socket.on("delete_message", async ({ messageId, roomId, scope }) => {
    if (!messageId || !roomId) return;
    try {
      const result = await deleteMessageService({ messageId, userId, scope: scope || "me" });

      if (result.scope === "everyone") {
        // Broadcast to everyone in the room so their UIs update
        io.to(roomId).emit("message_deleted", {
          messageId,
          scope: "everyone",
          content: "This message was deleted",
        });
      } else {
        // Only the requesting socket needs to hide this message
        socket.emit("message_deleted", { messageId, scope: "me" });
      }
    } catch (err) {
      socket.emit("error", { message: err.message || "Delete failed" });
    }
  });

  socket.on("disconnect", () => {
    updatePresence(false);
  });

  // -------------------------------------------------------------------
  // Phase 5 — Status / Stories
  // These events are emitted by the service layer via socketEmitter;
  // the socket handler here lets clients subscribe to a dedicated
  // statuses room so they receive feed updates in real-time.
  // -------------------------------------------------------------------

  /** Client joins the global statuses room for its own feed updates. */
  socket.on("subscribe_statuses", () => {
    socket.join(`statuses:${userId}`);
  });

  /** Client leaves the statuses room (e.g. navigates away from status tab). */
  socket.on("unsubscribe_statuses", () => {
    socket.leave(`statuses:${userId}`);
  });
};

export default chatSocket;
