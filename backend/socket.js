const { Server } = require('socket.io');

const Message = require('./models/Message');

let ioInstance = null;

function normalizeMessage(message, clientMessageId) {
  const normalized = message?.toObject ? message.toObject() : message;

  return {
    _id: normalized?._id?.toString() ?? clientMessageId ?? '',
    from: normalized?.from ?? '',
    to: normalized?.to ?? '',
    type: normalized?.type ?? 'text',
    content: normalized?.content ?? '',
    fileName: normalized?.fileName,
    createdAt: normalized?.createdAt ?? new Date(),
    clientMessageId,
  };
}

function buildThreadRoom(userA, userB) {
  if (!userA || !userB) return null;
  return ['thread', userA, userB].sort().join(':');
}

function createSocketServer(server) {
  ioInstance = new Server(server, {
    cors: {
      origin: 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  ioInstance.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('chat:join', ({ user, partner }) => {
      const room = buildThreadRoom(user, partner);
      if (room) socket.join(room);
    });

    socket.on('chat:leave', ({ user, partner }) => {
      const room = buildThreadRoom(user, partner);
      if (room) socket.leave(room);
    });

    socket.on('chat:send', async (payload, callback) => {
      try {
        const { from, to, type, content, fileName, clientMessageId } =
          payload || {};

        if (!from || !to || !type || !content) {
          callback?.({ ok: false, error: 'Invalid message payload' });
          return;
        }

        const message = await Message.create({ from, to, type, content, fileName });
        const normalized = normalizeMessage(message, clientMessageId);

        callback?.({ ok: true, message: normalized });

        const room = buildThreadRoom(from, to);
        if (room) {
          socket.join(room);
          socket.to(room).emit('chat:message', normalized);
        } else {
          socket.broadcast.emit('chat:message', normalized);
        }
      } catch (error) {
        console.error('Unable to persist socket message', error);
        callback?.({ ok: false, error: 'Failed to send message' });
      }
    });

    socket.on('user-online', (username) => {
      socket.broadcast.emit('user-online', username);
    });

    socket.on('user-offline', (username) => {
      socket.broadcast.emit('user-offline', username);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
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
