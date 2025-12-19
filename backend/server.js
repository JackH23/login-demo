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
const uploadRoutes = require("./routes/uploads");
const { createSocketServer } = require("./socket");

const app = express();

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middlewares
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use("/uploads", express.static(uploadsDir));

// Health check route
app.get("/", (req, res) => {
  res.send("API is running — Connected to MongoDB.");
});

// REST API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/uploads", uploadRoutes);

// Global error handler
app.use((error, _req, res, _next) => {
  console.error("Unexpected server error", error);
  res.status(500).json({ error: "Internal server error" });
});

// Start server and attempt initial DB connection without blocking startup
const server = http.createServer(app);
const io = createSocketServer(server);
app.set("io", io);

const isProduction =
  process.env.NODE_ENV === "production" || process.env.npm_lifecycle_event === "start";
const PORT = process.env.PORT || (isProduction ? 3000 : 8000);

const startServer = async () => {
  try {
    await dbConnect();
    console.log("Connected to MongoDB.");
  } catch (error) {
    console.error("Failed to connect to MongoDB", error);
    console.warn(
      "Starting server without an active MongoDB connection. Incoming requests will retry the connection and may fail until the database is reachable."
    );
  }

  server.listen(PORT, () => {
    console.log(`API is running at http://localhost:${PORT}.`);
  });
};

void startServer();
