const express = require('express');

const User = require('../models/User');

const router = express.Router();

const asyncHandler = (handler) =>
  (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.post('/', asyncHandler(async (req, res) => {
  const { user, friend } = req.body;
  if (!user || !friend) {
    return res.status(400).json({ error: 'Missing user or friend' });
  }

  if (user === friend) {
    return res.status(400).json({ error: 'Cannot add yourself' });
  }

  const [u, f] = await Promise.all([
    User.findOne({ username: user }),
    User.findOne({ username: friend }),
  ]);

  if (!u || !f) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!u.friends.includes(friend)) {
    u.friends.push(friend);
    await u.save();
  }
  if (!f.friends.includes(user)) {
    f.friends.push(user);
    await f.save();
  }

  return res.json({ success: true });
}));

router.get('/', asyncHandler(async (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ error: 'Missing username' });
  }

  const user = await User.findOne({ username }, 'friends -_id').lean();
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json({ friends: user.friends ?? [] });
}));

module.exports = router;
