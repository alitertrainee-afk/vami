// libs imports
import mongoose from "mongoose";

/**
 * MessageReceipt tracks per-user delivery and read status for each message.
 *
 * This is especially important for group chats where the message-level
 * `status` field (sent/delivered/read) represents the *aggregate* state
 * (e.g. "read" only once all non-sender participants have read it), while
 * individual receipts are stored here.
 *
 * For 1-on-1 chats the receipt is also written so the sender can see
 * a single-tick → double-tick → blue-tick progression.
 */
const messageReceiptSchema = new mongoose.Schema(
  {
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      required: true,
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["delivered", "read"],
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Prevent duplicate receipts per (message, user)
messageReceiptSchema.index({ message: 1, user: 1 }, { unique: true });

// Fast aggregate queries: "which messages in this conversation has this user read?"
messageReceiptSchema.index({ conversation: 1, user: 1, status: 1 });

const MessageReceipt = mongoose.model("MessageReceipt", messageReceiptSchema);
export default MessageReceipt;
