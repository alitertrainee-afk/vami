// libs imports
import express from "express";

// local controllers
import {
  searchUsers,
  getProfile,
  updateProfile,
  changePassword,
} from "../controllers/user.controller.js";

// local middleware
import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

// local validators
import {
  updateProfileSchema,
  changePasswordSchema,
} from "../validators/user.validator.js";

const router = express.Router();

// Profile routes (must come before /:id style routes)
router.get("/me", protect, getProfile);
router.patch("/me", protect, validate(updateProfileSchema), updateProfile);
router.patch(
  "/me/password",
  protect,
  validate(changePasswordSchema),
  changePassword,
);

// Search
router.get("/", protect, searchUsers);

export default router;
