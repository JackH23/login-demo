import { Server } from 'socket.io';
import { createServer } from 'http';

// Global type to avoid recreating the server on hot reloads
interface GlobalWithIo {
  _io?: Server;
  _httpServer?: ReturnType<typeof createServer>;
}

const g = globalThis as typeof globalThis & GlobalWithIo;

export function initSocketServer(port?: number) {
  // Render provides process.env.PORT — fall back to 3001 locally
  const resolvedPort =
    port ?? Number(process.env.PORT || process.env.SOCKET_PORT || 3001);

  // Create server only once
  if (!g._io) {
    const httpServer = createServer();
    const io = new Server(httpServer, {
      cors: { origin: '*' },
    });

    httpServer.listen(resolvedPort, '0.0.0.0', () => {
      console.log(`✅ Socket.IO server running on port ${resolvedPort}`);
    });

    g._io = io;
    g._httpServer = httpServer;
  }

  return g._io!;
}

// Utility functions to emit events
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

// Only start automatically when executed directly (not imported)
if (require.main === module) {
  initSocketServer();
}