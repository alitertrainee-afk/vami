// libs imports
import express from "express";

// local imports
import { loginUser, registerUser } from "../controllers/auth.controller.js";
import { authLimiter } from "../middleware/ratelimit.middleware.js";
import { loginSchema, registerSchema } from "../validators/auth.validator.js";
import { validate } from "../middleware/validate.middleware.js";

// intialize router
const router = express.Router();

router.post("/register", authLimiter, validate(registerSchema), registerUser);
router.post("/login", authLimiter, validate(loginSchema), loginUser);

export default router;
