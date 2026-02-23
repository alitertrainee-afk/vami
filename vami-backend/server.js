// libs imports
import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";

// local imports
import app from "./src/app.js";

// local configs
import { connectRedis } from "./src/config/redis.config.js";

// local middleware
import socketAuth from "./src/middleware/socket.auth.js";

// local sockets
import chatSocket from "./src/sockets/chat.socket.js";

// Create HTTP Server
const server = http.createServer(app);

// Bootstrap Server
const startServer = async () => {
  try {
    // Connect Redis
    const { pubClient, subClient } = await connectRedis();

    // Initialize Socket.IO
    const io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL,
        methods: ["GET", "POST"],
      },
      adapter: createAdapter(pubClient, subClient),
    });

    io.use(socketAuth);

    // Socket Connection
    io.on("connection", (socket) => {
      console.log(`✅ User Connected: ${socket.user.username} (${socket.id})`);

      chatSocket(io, socket);

      socket.on("disconnect", () => {
        console.log(`❌ User Disconnected: ${socket.user.username}`);
      });
    });

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`Backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server failed to start:", error);
    process.exit(1);
  }
};

startServer();
