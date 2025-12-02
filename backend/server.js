const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

require("dotenv").config({ path: path.join(__dirname, ".env") });

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
// Allow slightly larger JSON bodies so profile images encoded as base64 can be processed
// without triggering a 413 Payload Too Large error during signup.
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

const uploadsDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));
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

const PORT = process.env.PORT || 3001;

dbConnect()
  .then(() => {
    console.log("Connected to MongoDB");
    server.listen(PORT, () => {
      console.log(`API is running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB", error);
  });
