// libs import
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: function () {
        return this.authProvider === "local";
      },
      minlength: 8,
      select: false,
    },
    authProvider: {
      type: String,
      enum: ["local", "google", "github", "apple"],
      default: "local",
    },
    profile: {
      avatar: { type: String, default: null },
      bio: { type: String, maxlength: 160, default: "" },
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["active", "blocked", "deleted"],
      default: "active",
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "admin", "moderator"],
      default: "user",
    },
    preferences: {
      theme: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "system",
      },
      notifications: { type: Boolean, default: true },
    },
    emailVerified: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);


userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Indexes for search and lookup performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ username: "text", email: "text" });

const User = mongoose.model("User", userSchema);
export default User;
