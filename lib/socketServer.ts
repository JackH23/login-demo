import { io, Socket } from 'socket.io-client';

interface GlobalWithServerSocket {
  _serverSocket?: Socket;
}

const g = globalThis as typeof globalThis & GlobalWithServerSocket;

function getServerSocket() {
  if (!g._serverSocket) {
    const serverUrl =
      process.env.SOCKET_SERVER_URL ||
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      'http://localhost:3001';

    const socket = io(serverUrl);

    socket.on('connect_error', (error) => {
      console.error('Socket server connection error:', error);
    });

    g._serverSocket = socket;
  }

  return g._serverSocket;
}

export function emitUserOnline(username: string) {
  const socket = getServerSocket();
  socket?.emit('user-online', username);
}

export function emitUserOffline(username: string) {
  const socket = getServerSocket();
  socket?.emit('user-offline', username);
}

export function emitPostDeleted(postId: string) {
  const socket = getServerSocket();
  socket?.emit('post-deleted', { postId });
}

export function emitPostCreated(post: Record<string, unknown>) {
  const socket = getServerSocket();
  socket?.emit('post-created', { post });
}
