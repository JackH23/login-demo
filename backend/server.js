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
// Lightweight cookie parser to surface cookies on req.cookies without adding
// an extra dependency.
app.use((req, _res, next) => {
  if (req.cookies) return next();

  const raw = req.headers.cookie;
  if (!raw) {
    req.cookies = {};
    return next();
  }

  const pairs = raw.split(";").map((part) => part.trim()).filter(Boolean);
  const cookies = {};
  for (const pair of pairs) {
    const [name, ...valueParts] = pair.split("=");
    if (!name) continue;
    const value = valueParts.join("=") || "";
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  }
  req.cookies = cookies;
  next();
});
app.use("/uploads", express.static(uploadsDir));

// Ensure MongoDB is connected before handling requests so transient connection
// issues surface as a clear 503 response instead of uncaught 500 errors later.
app.use(async (_req, res, next) => {
  try {
    await dbConnect();
    next();
  } catch (error) {
    console.error("Unable to connect to MongoDB for request", error);
    res.status(503).json({ error: "Database unavailable" });
  }
});

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

const PORT = Number(process.env.PORT) || 8000;

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
