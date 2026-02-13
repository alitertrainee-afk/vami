// local imports
import { sendMessageService } from "../service/message.service.js";
import { updateUserPresenceService } from "../service/user.service.js";

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


  socket.on("join_room", (roomId) => {
    if (!roomId) return;
    socket.join(roomId);
  });

  socket.on("typing", (roomId) => {
    socket.to(roomId).emit("user_typing", { userId, roomId });
  });

  socket.on("stop_typing", (roomId) => {
    socket.to(roomId).emit("user_stopped_typing", { userId, roomId });
  });

  socket.on("send_message", async (data) => {
    const { roomId, content } = data || {};

    if (!roomId || !content) {
      return socket.emit("error", {
        message: "Invalid message payload",
      });
    }

    try {
      const message = await sendMessageService({
        senderId: userId,
        chatId: roomId,
        content,
      });

      // Emit message to room
      io.to(roomId).emit("receive_message", message);

      // Sidebar notification
      socket.broadcast.emit("new_message_notification", {
        chatId: roomId,
        message: message.content,
        sender: socket.user.username,
      });
    } catch (error) {
      socket.emit("error", {
        message: error.message || "Message failed",
      });
    }
  });

  socket.on("disconnect", () => {
    updatePresence(false);
  });
};

export default chatSocket;
