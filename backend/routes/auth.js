const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const dbConnect = require("../mongodb");
const User = require("../models/User");

const router = express.Router();

const ADMIN_USERNAME =
  process.env.ADMIN_USERNAME || process.env.NEXT_PUBLIC_ADMIN_USERNAME || "Jackie";

const uploadsDir = path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({ storage });

const asyncHandler = (handler) =>
  (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.post(
  "/signup",
  upload.single("image"),
  asyncHandler(async (req, res) => {
    await dbConnect();

    const { username, email, password } = req.body ?? {};

    const normalizedUsername = typeof username === "string" ? username.trim() : "";
    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";
    const normalizedPassword = typeof password === "string" ? password : "";
    const imagePath = req.file
      ? path.relative(path.join(__dirname, ".."), req.file.path).replace(/\\+/g, "/")
      : undefined;

    if (!normalizedUsername || !normalizedEmail || !normalizedPassword) {
      return res
        .status(400)
        .json({ error: "Username, email, and password are required" });
    }

    const existingUser = await User.findOne({
      $or: [
        { username: normalizedUsername },
        { email: normalizedEmail },
      ],
    }).lean();

    if (existingUser) {
      return res.status(409).json({ error: "Username or email already in use" });
    }

    const hashedPassword = await bcrypt.hash(normalizedPassword, 10);

    try {
      const user = await User.create({
        username: normalizedUsername,
        email: normalizedEmail,
        password: hashedPassword,
        image: imagePath,
      });

      return res.status(201).json({
        message: "User created successfully",
        user: {
          username: user.username,
          email: user.email,
          image: user.image ?? null,
          isAdmin: user.username === ADMIN_USERNAME,
        },
      });
    } catch (error) {
      if (error?.code === 11000) {
        return res
          .status(409)
          .json({ error: "Username or email already in use" });
      }
      throw error;
    }
  })
);

const handleSignin = asyncHandler(async (req, res) => {
  await dbConnect();

  const { email, password } = req.body ?? {};

  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  const normalizedPassword = typeof password === "string" ? password : "";

  if (!normalizedEmail || !normalizedPassword) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = await User.findOne({ email: normalizedEmail }).lean();

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const passwordMatches = await bcrypt.compare(normalizedPassword, user.password);

  if (!passwordMatches) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET || "secretkey123",
    { expiresIn: "7d" }
  );

  const isAdmin = user.username === ADMIN_USERNAME;

  return res.json({
    user: {
      username: user.username,
      email: user.email,
      image: user.image ?? null,
      isAdmin,
    },
    token,
  });
});

router.post("/signin", handleSignin);
router.post("/login", handleSignin);

module.exports = router;
