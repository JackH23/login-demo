const express = require("express");
const http = require("http");
const cors = require("cors");

require("dotenv").config();

const dbConnect = require("./mongodb");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const postRoutes = require("./routes/posts");
const commentRoutes = require("./routes/comments");
const messageRoutes = require("./routes/messages");
const friendRoutes = require("./routes/friends");
const { createSocketServer } = require("./socket");

const app = express();
app.use(cors());
app.use(express.json());
app.use(async (_req, _res, next) => {
  try {
    await dbConnect();
    next();
  } catch (error) {
    next(error);
  }
});

// Expose authentication routes under /api/auth to align with frontend calls.
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/friends", friendRoutes);

app.use((error, _req, res, _next) => {
  console.error("Unexpected server error", error);
  res.status(500).json({ error: "Internal server error" });
});

const server = http.createServer(app);
const io = createSocketServer(server);
app.set("io", io);

dbConnect().catch((error) => {
  console.error("Failed to connect to MongoDB", error);
});

server.listen(3001, () => {
  console.log("Backend running at http://localhost:3001");
});
