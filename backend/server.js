const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

require('./mongodb');
require('./models/User');
require('./models/Post');
require('./models/Message');
require('./models/Comment');
require('./models/Emoji');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('message', (data) => {
    io.emit('message', data);
  });
});

server.listen(3001, () => {
  console.log('Backend + Socket.IO running on port 3001');
});
