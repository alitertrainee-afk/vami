// libs imports
import mongoose from "mongoose";

/**
 * Status / Story — 24-hour ephemeral update (WhatsApp-style).
 *
 * Types:
 *  - text   : plain text + optional background colour
 *  - image  : S3 media key (image)
 *  - video  : S3 media key (video ≤ 30 s recommended)
 *
 * MongoDB TTL index on `expiresAt` automatically removes the document
 * at the end of its 24-hour window with no cron job required.
 */

const statusViewSchema = new mongoose.Schema(
  {
    viewer:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    viewedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const statusSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["text", "image", "video"],
      default: "text",
    },

    // ------------------------------------------------------------------
    // Text status
    // ------------------------------------------------------------------
    content:    { type: String, maxlength: 700, default: null },
    /** Hex background colour, e.g. "#075e54" */
    bgColor:    { type: String, default: "#075e54" },
    /** Font index (0-4) for text statuses */
    fontIndex:  { type: Number, default: 0, min: 0, max: 4 },

    // ------------------------------------------------------------------
    // Media status (image / video)
    // ------------------------------------------------------------------
    mediaKey:      { type: String, default: null },
    mediaUrl:      { type: String, default: null },
    mediaMimeType: { type: String, default: null },
    thumbnailKey:  { type: String, default: null },
    thumbnailUrl:  { type: String, default: null },
    /** Caption overlaid on the media */
    caption:       { type: String, maxlength: 700, default: null },

    // ------------------------------------------------------------------
    // Privacy
    // "contacts"          → visible to all mutual contacts
    // "contacts_except"   → hidden from the users in `privacyList`
    // "only_share"        → visible ONLY to users in `privacyList`
    // ------------------------------------------------------------------
    privacy:     { type: String, enum: ["contacts", "contacts_except", "only_share"], default: "contacts" },
    privacyList: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // ------------------------------------------------------------------
    // View tracking
    // ------------------------------------------------------------------
    views: {
      type: [statusViewSchema],
      default: [],
    },

    // ------------------------------------------------------------------
    // TTL — MongoDB auto-deletes this document at expiresAt
    // ------------------------------------------------------------------
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
      index: { expireAfterSeconds: 0 },
    },
  },
  { timestamps: true },
);

// Fetch all statuses for a user ordered newest-first
statusSchema.index({ user: 1, createdAt: -1 });

const Status = mongoose.model("Status", statusSchema);
export default Status;
