// local services
import { sendMessageService, markAsReadService } from "../services/message.service.js";
import { updateUserPresenceService } from "../services/user.service.js";

// local models
import Conversation from "../models/Conversation.js";

const isParticipant = async (userId, roomId) => {
  return Conversation.findOne({
    _id: roomId,
    participants: userId,
  });
};

const chatSocket = (io, socket) => {
  const userId = socket.user?._id;

  const updatePresence = async (isOnline) => {
    try {
      await updateUserPresenceService({ userId, isOnline });

      socket.broadcast.emit("user_status_update", {
        userId,
        isOnline,
      });
    } catch (error) {
      console.error("Presence update failed:", error.message);
    }
  };

  // User connected
  updatePresence(true);

  // Auto-join a personal notification room keyed by userId
  // This enables O(1) targeted notifications instead of O(n) fetchSockets()
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

  // 🔒 Authorized message send — verify membership before writing
  socket.on("send_message", async (data) => {
    const { roomId, content } = data || {};

    if (!roomId || !content) {
      return socket.emit("error", {
        message: "Invalid message payload",
      });
    }

    // Authorization: verify the sender is a participant
    const conversation = await isParticipant(userId, roomId);
    if (!conversation) {
      return socket.emit("error", {
        message: "Unauthorized: You are not a member of this conversation",
      });
    }

    try {
      const message = await sendMessageService({
        senderId: userId,
        chatId: roomId,
        content,
      });

      // Emit message to room (only joined participants receive this)
      io.to(roomId).emit("receive_message", message);

      // Notify participants via their personal rooms (O(1) per participant)
      const participantIds = conversation.participants.map((p) => p.toString());
      for (const participantId of participantIds) {
        if (participantId === userId.toString()) continue; // skip sender

        io.to(participantId).emit("new_message_notification", {
          chatId: roomId,
          message: message.content,
          sender: socket.user.username,
        });
      }
    } catch (error) {
      socket.emit("error", {
        message: error.message || "Message failed",
      });
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

  socket.on("disconnect", () => {
    updatePresence(false);
  });
};

export default chatSocket;
