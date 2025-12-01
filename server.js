const { createServer } = require("http");
const { Server } = require("socket.io");

const PORT = Number(process.env.SOCKET_PORT || process.env.PORT || 3001);
const ALLOWED_ORIGIN = process.env.SOCKET_ORIGIN || "http://localhost:3000";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGIN,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Socket server started on port ${PORT}`);
});