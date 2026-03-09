// libs import
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

// local configs
import connectDB from "./config/database.config.js";

// local middleware
import errorHandler from "./middleware/error.middleware.js";
import { apiLimiter } from "./middleware/ratelimit.middleware.js";

// routes imports
import authRoutes    from "./routes/auth.routes.js";
import userRoutes    from "./routes/user.routes.js";
import chatRoutes    from "./routes/chat.routes.js";
import messageRoutes from "./routes/message.routes.js";
import uploadRoutes  from "./routes/upload.routes.js";
import statusRoutes  from "./routes/status.routes.js";
import pushRoutes    from "./routes/push.routes.js";

// initialize express
const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

app.use(express.json());
app.use(helmet());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(apiLimiter);

// Connect Database
connectDB();

// routes use
app.use("/api/v1/auth",     authRoutes);
app.use("/api/v1/users",    userRoutes);
app.use("/api/v1/chats",    chatRoutes);
app.use("/api/v1/messages", messageRoutes);
app.use("/api/v1/uploads",  uploadRoutes);
app.use("/api/v1/statuses", statusRoutes);
app.use("/api/v1/push",     pushRoutes);

// Health Check (optional but recommended)
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "OK" });
});

// Error Handler (should be last middleware)
app.use(errorHandler);

export default app;
