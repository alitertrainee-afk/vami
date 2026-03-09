/**
 * Thin singleton wrapper around the Socket.IO server instance.
 *
 * Call `initSocketEmitter(io)` once during server startup, then use
 * `emitToRoom` / `emitToUser` anywhere in the application without
 * importing `io` directly (which would create circular dependencies).
 */

let _io = null;

/** Store the io instance after it is initialised in server.js. */
export const initSocketEmitter = (io) => {
  _io = io;
};

/** Emit an event to all sockets that have joined a named room. */
export const emitToRoom = (room, event, data) => {
  if (!_io) return;
  _io.to(room.toString()).emit(event, data);
};

/** Emit an event to a single user's personal room (userId-keyed room). */
export const emitToUser = (userId, event, data) => {
  if (!_io) return;
  _io.to(userId.toString()).emit(event, data);
};
