import { io } from "socket.io-client";

class SocketClient {
  constructor() {
    this.socket = null;
  }

  connect(token) {
    if (this.socket?.connected) return;

    const SOCKET_URL =
      import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    this.socket.on("connect", () => {
      console.log("[Socket] Connection ID:", this.socket.id);
    });

    this.socket.on("connect_error", (error) => {
      console.error("[Socket] Connection Error:", error.message);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log("[Socket] Disconnected");
    }
  }


  on(event, callback) {
    if (!this.socket) return;
    // Remove existing listener to prevent duplicate triggers (memory leak prevention)
    this.socket.off(event);
    this.socket.on(event, callback);
  }

  off(event) {
    if (!this.socket) return;
    this.socket.off(event);
  }

  emit(event, data) {
    if (!this.socket) {
      console.warn("[Socket] Attempted to emit without connection");
      return;
    }
    this.socket.emit(event, data);
  }
}

// Export as a Singleton
export const socketClient = new SocketClient();
