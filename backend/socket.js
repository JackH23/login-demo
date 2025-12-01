const { io } = require('socket.io-client');

const globalSocket = globalThis;

function getServerSocket() {
  if (!globalSocket._serverSocket) {
    const serverUrl =
      process.env.SOCKET_SERVER_URL ||
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      'http://localhost:3001';

    const socket = io(serverUrl);

    socket.on('connect_error', (error) => {
      console.error('Socket server connection error:', error);
    });

    globalSocket._serverSocket = socket;
  }

  return globalSocket._serverSocket;
}

function emitUserOnline(username) {
  const socket = getServerSocket();
  socket?.emit('user-online', username);
}

function emitUserOffline(username) {
  const socket = getServerSocket();
  socket?.emit('user-offline', username);
}

function emitPostDeleted(postId) {
  const socket = getServerSocket();
  socket?.emit('post-deleted', { postId });
}

function emitPostCreated(post) {
  const socket = getServerSocket();
  socket?.emit('post-created', { post });
}

module.exports = {
  emitUserOnline,
  emitUserOffline,
  emitPostDeleted,
  emitPostCreated,
};
