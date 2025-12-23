const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");

const dbConnect = require("../mongodb");
const User = require("../models/User");
const {
  MAX_IMAGE_BYTES,
  extractImagePayload,
  encodeImageToDataUrl,
} = require("./utils/image");

const ADMIN_USERNAME =
  process.env.ADMIN_USERNAME ||
  process.env.NEXT_PUBLIC_ADMIN_USERNAME ||
  "Jackie";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
});

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

router.post(
  "/signup",
  upload.single("image"),
  asyncHandler(async (req, res) => {
    await dbConnect();

    const { username, email, password } = req.body ?? {};

    const normalizedUsername =
      typeof username === "string" ? username.trim() : "";
    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";
    const normalizedPassword = typeof password === "string" ? password : "";
    const imagePayload = extractImagePayload({
      file: req.file,
      imageString: req.body?.image,
    });

    if (imagePayload?.error === "too_large") {
      return res
        .status(400)
        .json({ error: "Profile image must be 5MB or smaller" });
    }

    if (imagePayload?.error === "invalid") {
      return res.status(400).json({ error: "Invalid profile image data" });
    }

    if (!normalizedUsername || !normalizedEmail || !normalizedPassword) {
      return res
        .status(400)
        .json({ error: "Username, email, and password are required" });
    }

    const existingUser = await User.findOne({
      $or: [{ username: normalizedUsername }, { email: normalizedEmail }],
    }).lean();

    if (existingUser) {
      return res
        .status(409)
        .json({ error: "Username or email already in use" });
    }

    const hashedPassword = await bcrypt.hash(normalizedPassword, 10);

    try {
      const imageDataUrl =
        imagePayload && imagePayload.buffer
          ? encodeImageToDataUrl(imagePayload.buffer, imagePayload.contentType)
          : null;

      const imageFields =
        imagePayload && !imagePayload.remove && !imagePayload.error
          ? {
              imageData: imagePayload.buffer,
              imageContentType: imagePayload.contentType,
              image: imageDataUrl,
            }
          : {};

      const user = await User.create({
        username: normalizedUsername,
        email: normalizedEmail,
        password: hashedPassword,
        isAdmin: normalizedUsername === ADMIN_USERNAME,
        ...imageFields,
      });

      return res.status(201).json({
        message: "User created successfully",
        user: {
          username: user.username,
          email: user.email,
          image: imageFields.image ?? null,
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

  const passwordMatches = await bcrypt.compare(
    normalizedPassword,
    user.password
  );

  if (!passwordMatches) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET || "secretkey123",
    { expiresIn: "7d" }
  );

  const isAdmin = Boolean(user.isAdmin) || user.username === ADMIN_USERNAME;
  if (isAdmin && !user.isAdmin && user.username === ADMIN_USERNAME) {
    await User.updateOne({ _id: user._id }, { isAdmin: true });
  }

  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  const image = user.imageData
    ? encodeImageToDataUrl(user.imageData, user.imageContentType)
    : user.image ?? null;

  return res.json({
    user: {
      username: user.username,
      email: user.email,
      image: image ?? null,
      isAdmin,
    },
    token,
  });
});

router.post("/signin", handleSignin);
router.post("/login", handleSignin);

module.exports = router;
