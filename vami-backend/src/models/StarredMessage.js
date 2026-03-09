// libs imports
import mongoose from "mongoose";

/**
 * StarredMessage lets a user bookmark individual messages.
 * Stars are private — only the starring user can see them.
 */
const starredMessageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      required: true,
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Each user can star a message at most once
starredMessageSchema.index({ user: 1, message: 1 }, { unique: true });

// Fast "get all starred messages for a user, newest first"
starredMessageSchema.index({ user: 1, createdAt: -1 });

const StarredMessage = mongoose.model("StarredMessage", starredMessageSchema);
export default StarredMessage;
