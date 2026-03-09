// libs imports
import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    chatName: { type: String, trim: true },
    isGroupChat: { type: Boolean, default: false },

    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    ],

    latestMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },

    lastMessageAt: {
      type: Date,
      index: true,
    },

    groupAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // ------------------------------------------------------------------
    // Phase 4 — Multi-admin + extended group info
    // ------------------------------------------------------------------

    /** All current group admins (includes original creator + promoted users). */
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    description: { type: String, maxlength: 512, default: "" },

    /** S3 object key for the group avatar image */
    groupAvatar: { type: String, default: null },

    /** When true, only admins may send messages to this group */
    onlyAdminsCanMessage: { type: Boolean, default: false },

    /** Random token enabling anyone with the link to join (null = disabled) */
    inviteToken: { type: String, default: null },
  },
  { timestamps: true },
);

// Sparse index for join-by-link lookups
conversationSchema.index({ inviteToken: 1 }, { sparse: true });

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;
