// libs imports
import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema(
  {
    user:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    emoji: { type: String, required: true, maxlength: 8 },
  },
  { _id: false },
);

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      trim: true,
      // Not required — deleted messages replace content with a placeholder
    },
    type: {
      type: String,
      enum: ["text", "image", "video", "audio", "document", "voice"],
      default: "text",
    },

    // ------------------------------------------------------------------
    // 2.1 — Delivery / Read status
    // ------------------------------------------------------------------
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
      index: true,
    },

    // ------------------------------------------------------------------
    // 2.2 — Reply-to (quote reply)
    // ------------------------------------------------------------------
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    // ------------------------------------------------------------------
    // 2.3 — Reactions (one emoji per user, upserted)
    // ------------------------------------------------------------------
    reactions: {
      type: [reactionSchema],
      default: [],
    },

    // ------------------------------------------------------------------
    // 2.4 — Message editing
    // ------------------------------------------------------------------
    isEdited:  { type: Boolean, default: false },
    editedAt:  { type: Date },

    // ------------------------------------------------------------------
    // 2.5 — Message deletion
    // ------------------------------------------------------------------
    /** Set to true when deleted for everyone — content replaced with placeholder */
    isDeleted: { type: Boolean, default: false, index: true },

    /** Soft-delete for individual users — message is filtered out on fetch for listed userIds */
    deletedFor: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },

    // ------------------------------------------------------------------
    // 2.7 — Disappearing messages
    // Auto-deleted by MongoDB TTL index when this date is reached.
    // Null = no expiry.
    // ------------------------------------------------------------------
    disappearsAt: {
      type: Date,
      default: null,
    },

    // ------------------------------------------------------------------
    // 3.1 — Media / attachment fields
    // Populated by the client after a successful S3 direct upload.
    // ------------------------------------------------------------------
    /** S3 object key (e.g. "uploads/image/userId/abc.jpg") */
    mediaKey:      { type: String, default: null },
    /** Public / CDN URL for the media file */
    mediaUrl:      { type: String, default: null },
    mediaMimeType: { type: String, default: null },
    /** File size in bytes */
    mediaSize:     { type: Number, default: null },
    /** Duration in seconds — for voice / audio / video */
    mediaDuration: { type: Number, default: null },
    /** S3 key for the generated thumbnail image */
    thumbnailKey:  { type: String, default: null },
    /** Public / CDN URL for the thumbnail */
    thumbnailUrl:  { type: String, default: null },
  },
  { timestamps: true },
);

// -----------------------------------------------------------------------
// Indexes
// -----------------------------------------------------------------------

// Primary message fetch (conversation timeline, newest-first)
messageSchema.index({ conversation: 1, createdAt: -1 });

// Disappearing messages — TTL. MongoDB removes the document when
// disappearsAt <= now. Documents with disappearsAt: null are NOT deleted.
messageSchema.index({ disappearsAt: 1 }, { expireAfterSeconds: 0, sparse: true });

const Message = mongoose.model("Message", messageSchema);
export default Message;
