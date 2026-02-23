// libs imports
import express from "express";

// local controllers
import {
    loginUser,
    registerUser,
    refreshToken,
    logoutUser,
} from "../controllers/auth.controller.js";

// local validators
import { loginSchema, registerSchema } from "../validators/auth.validator.js";

// local middleware
import { validate } from "../middleware/validate.middleware.js";
import { authLimiter } from "../middleware/ratelimit.middleware.js";

// intialize router
const router = express.Router();

router.post("/register", authLimiter, validate(registerSchema), registerUser);
router.post("/login", authLimiter, validate(loginSchema), loginUser);
router.post("/refresh", refreshToken);
router.post("/logout", logoutUser);

export default router;
