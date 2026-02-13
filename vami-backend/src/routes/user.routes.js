// libs imports
import express from "express";

// local imports
import { searchUsers } from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protect, searchUsers);

export default router;
