// locals imports
import { findUserById } from "../repository/user.repository.js";
import { verifyJWTToken } from "../utils/jwt.utils.js";

const socketAuth = async (socket, next) => {
  try {
    // 1. Get token from client handshake
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    // 2. Verify Token
    const decoded = verifyJWTToken(token);

    if (!decoded) {
      return next(new Error("Authentication error: Invalid token"));
    }

    // 3. Find User & Attach to Socket
    const user = await findUserById(decoded?.id);

    if (!user) {
      return next(new Error("Authentication error: User not found"));
    }

    // Attach user to socket object so we can use it in chatSocket.js
    socket.user = user;

    next();
  } catch (error) {
    console.error("Socket Auth Error:", error.message);
    next(new Error("Authentication error: Invalid token"));
  }
};

export default socketAuth;
