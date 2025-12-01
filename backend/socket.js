const { Server } = require('socket.io');

let ioInstance = null;

function createSocketServer(server) {
  ioInstance = new Server(server, {
    cors: {
      origin: 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  ioInstance.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('user-online', (username) => {
      socket.broadcast.emit('user-online', username);
    });

    socket.on('user-offline', (username) => {
      socket.broadcast.emit('user-offline', username);
    });
  });

  return ioInstance;
}

function emitUserOnline(username) {
  ioInstance?.emit('user-online', username);
}

function emitUserOffline(username) {
  ioInstance?.emit('user-offline', username);
}

function emitPostCreated(post) {
  ioInstance?.emit('post-created', { post });
}

function emitPostDeleted(postId) {
  ioInstance?.emit('post-deleted', { postId });
}

module.exports = {
  createSocketServer,
  emitUserOnline,
  emitUserOffline,
  emitPostCreated,
  emitPostDeleted,
};
