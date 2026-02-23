import mongoose from "mongoose";

const conversationParticipantSchema = new mongoose.Schema(
  {
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
      index: true,
    },

    unreadCount: {
      type: Number,
      default: 0,
    },

    lastReadAt: {
      type: Date,
    },

    lastMessageSeenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },

    isPinned: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    isMuted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Prevent duplicates
conversationParticipantSchema.index(
  { user: 1, conversation: 1 },
  { unique: true }
);

// Fast sidebar queries
conversationParticipantSchema.index({ user: 1, unreadCount: 1 });
conversationParticipantSchema.index({ user: 1, isArchived: 1 });

export default mongoose.model(
  "ConversationParticipant",
  conversationParticipantSchema
);