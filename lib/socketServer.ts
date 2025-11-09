import { Server } from 'socket.io';
import { createServer } from 'http';

// Global type to avoid recreating the server on hot reloads
interface GlobalWithIo {
  _io?: Server;
}

const g = globalThis as typeof globalThis & GlobalWithIo;

// Initialize the Socket.IO server if it hasn't been created yet
export function initSocketServer(port: number = Number(process.env.SOCKET_PORT) || 3001) {
  if (!g._io) {
    const httpServer = createServer();
    g._io = new Server(httpServer, {
      cors: { origin: '*' },
    });
    httpServer.listen(port, () => {
      console.log(`Socket.IO server running on port ${port}`);
    });
  }
  return g._io!;
}

// In a traditional Node.js runtime we want the Socket.IO server to be ready
// as soon as the module is imported so client connections do not immediately
// fail while waiting for the first API handler to emit an event. Guard the
// call so it does not run in edge runtimes or during client-side bundling.
if (
  typeof process !== 'undefined' &&
  process.release?.name === 'node' &&
  process.env.NODE_ENV !== 'production'
) {
  initSocketServer();
}

export function emitUserOnline(username: string) {
  const io = initSocketServer();
  io.emit('user-online', username);
}

export function emitUserOffline(username: string) {
  const io = initSocketServer();
  io.emit('user-offline', username);
}

export function emitPostDeleted(postId: string) {
  const io = initSocketServer();
  io.emit('post-deleted', { postId });
}

export function emitPostCreated(post: Record<string, unknown>) {
  const io = initSocketServer();
  io.emit('post-created', { post });
}

// Start the server automatically when executed directly
if (require.main === module) {
  initSocketServer();
}
