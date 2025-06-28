import { Server } from 'socket.io';
import { createServer } from 'http';

// Global type to avoid recreating the server on hot reloads
interface GlobalWithIo extends NodeJS.Global {
  _io?: Server;
}

const g = global as GlobalWithIo;

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

export function emitUserOnline(username: string) {
  const io = initSocketServer();
  io.emit('user-online', username);
}

export function emitUserOffline(username: string) {
  const io = initSocketServer();
  io.emit('user-offline', username);
}

// Start the server automatically when executed directly
if (require.main === module) {
  initSocketServer();
}
