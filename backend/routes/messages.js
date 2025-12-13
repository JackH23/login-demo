const express = require('express');

const Message = require('../models/Message');
const User = require('../models/User');
const Emoji = require('../models/Emoji');

const router = express.Router();

const asyncHandler = (handler) =>
  (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.get('/', asyncHandler(async (req, res) => {
  const { user1, user2, limit: limitParam } = req.query;
  const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;

  if (!user1 || !user2) {
    return res.status(400).json({ error: 'Missing users' });
  }

  const filter = {
    $or: [
      { from: user1, to: user2 },
      { from: user2, to: user1 },
    ],
  };

  const boundedLimit =
    typeof limit === 'number' && Number.isFinite(limit) && limit > 0
      ? Math.min(limit, 200)
      : null;

  const fetchMessages = async () => {
    if (boundedLimit) {
      // Ensure sorting happens in the database instead of relying on reversing client-side
      return Message.aggregate([
        { $match: filter },
        { $sort: { createdAt: -1 } },
        { $limit: boundedLimit },
        { $sort: { createdAt: 1 } },
        { $project: { from: 1, to: 1, type: 1, content: 1, fileName: 1, createdAt: 1 } },
      ]);
    }

    return Message.find(filter)
      .select('from to type content fileName createdAt')
      .sort({ createdAt: 1 })
      .lean();
  };

  const [messages, participants, emojis] = await Promise.all([
    fetchMessages(),
    User.find({ username: { $in: [user1, user2] } })
      .select('username image online -_id')
      .lean(),
    Emoji.find({}, 'shortcode unicode category sortOrder hasSkinTones -_id')
      .sort({ sortOrder: 1, unicode: 1 })
      .limit(200)
      .lean(),
  ]);

  return res.json({ messages, participants, emojis });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { from, to, type, content, fileName } = req.body;
  const message = await Message.create({ from, to, type, content, fileName });
  return res.json({ message });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const message = await Message.findByIdAndDelete(id);
  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }
  return res.json({ success: true });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  const message = await Message.findByIdAndUpdate(id, { content }, { new: true }).lean();
  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }

  return res.json({ message });
}));

module.exports = router;
