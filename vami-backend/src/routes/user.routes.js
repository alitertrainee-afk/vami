// libs imports
import express from "express";

// local controllers
import { searchUsers } from "../controllers/user.controller.js";

// local middleware
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protect, searchUsers);

export default router;
