const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

require("./mongodb");
// require("./models/User"); // If needed

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
});

server.listen(3001, () => {
  console.log("Backend listening on port 3001");
});
