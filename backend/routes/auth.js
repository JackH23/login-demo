const express = require('express');
const bcrypt = require('bcrypt');

const User = require('../models/User');

const router = express.Router();

const asyncHandler = (handler) =>
  (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

// SIGN UP
const signupController = async (req, res) => {
  const { username, email, password, image } = req.body;

  if (typeof username !== 'string' || !username.trim()) {
    return res.status(400).json({ error: 'Username is required' });
  }

  if (typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: 'Email is required' });
  }

  if (typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  const trimmedUsername = username.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ error: 'A valid email is required' });
  }

  const [existingUser, existingEmail] = await Promise.all([
    User.findOne({ username: trimmedUsername }),
    User.findOne({ email: normalizedEmail }),
  ]);

  if (existingUser) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  if (existingEmail) {
    return res.status(409).json({ error: 'Email already in use' });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const userDoc = {
      username: trimmedUsername,
      email: normalizedEmail,
      password: hashed,
    };

    if (typeof image === 'string' && image.trim()) {
      userDoc.image = image;
    }

    await User.create(userDoc);
    return res.json({ success: true });
  } catch (error) {
    console.error('Failed to create user', error);
    return res
      .status(500)
      .json({ error: 'User creation failed. Please try again later.' });
  }
};

// SIGN IN
const signinController = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await bcrypt.compare(password, user.password))) {
    return res.json({ success: true, username: user.username });
  }

  return res.status(401).json({ error: 'Invalid credentials' });
};

router.post('/signup', asyncHandler(signupController));
router.post('/signin', asyncHandler(signinController));

module.exports = router;