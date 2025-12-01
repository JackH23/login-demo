const express = require("express");
const bcrypt = require("bcrypt");

const User = require("../models/User");

const router = express.Router();

const asyncHandler = (handler) =>
  (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const { username, email, password, image } = req.body ?? {};

    const normalizedUsername = typeof username === "string" ? username.trim() : "";
    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";
    const normalizedPassword = typeof password === "string" ? password : "";

    if (!normalizedUsername || !normalizedEmail || !normalizedPassword) {
      return res
        .status(400)
        .json({ error: "Username, email, and password are required" });
    }

    const existingUser = await User.findOne({
      $or: [{ username: normalizedUsername }, { email: normalizedEmail }],
    }).lean();

    if (existingUser) {
      return res.status(409).json({ error: "Username or email already in use" });
    }

    const hashedPassword = await bcrypt.hash(normalizedPassword, 10);

    await User.create({
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashedPassword,
      image: typeof image === "string" && image.trim() ? image : undefined,
    });

    return res.status(201).json({ username: normalizedUsername });
  })
);

router.post(
  "/signin",
  asyncHandler(async (req, res) => {
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

    return res.json({ username: user.username });
  })
);

module.exports = router;
