const express = require('express');

const User = require('../models/User');
const Message = require('../models/Message');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { emitUserOnline, emitUserOffline } = require('../socket');

const ADMIN_USERNAME =
  process.env.ADMIN_USERNAME || process.env.NEXT_PUBLIC_ADMIN_USERNAME || 'Jackie';

const router = express.Router();

const asyncHandler = (handler) =>
  (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

function getRequester(req) {
  const headerUser =
    req.get('x-user') || req.get('x-username') || req.get('authorization');

  if (headerUser) {
    return headerUser.replace(/^Bearer\s+/i, '');
  }
  return null;
}

router.get('/', asyncHandler(async (_req, res) => {
  const users = await User.find({}, 'username image friends online -_id')
    .sort({ username: 1 })
    .lean();
  return res.json({ users });
}));

router.get('/:username', asyncHandler(async (req, res) => {
  const { username } = req.params;
  const user = await User.findOne({ username }, 'username image friends online -_id').lean();

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json({ user });
}));

router.put('/:username', asyncHandler(async (req, res) => {
  const { username: target } = req.params;
  const requester = getRequester(req);

  if (!requester) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (requester !== target && requester !== ADMIN_USERNAME) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { username, image, online } = req.body;

  const prev = await User.findOne({ username: target }, 'online').lean();

  const update = {};
  if (username !== undefined) update.username = username;
  if (image !== undefined) update.image = image;
  if (online !== undefined) update.online = online;

  const user = await User.findOneAndUpdate({ username: target }, update, {
    new: true,
    fields: 'username image friends online -_id',
  }).lean();

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user && prev && online !== undefined && prev.online !== online) {
    if (user.online) emitUserOnline(user.username);
    else emitUserOffline(user.username);
  }

  return res.json({ user });
}));

router.delete('/:username', asyncHandler(async (req, res) => {
  const { username: target } = req.params;
  const requester = getRequester(req);

  if (!requester) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (requester !== target && requester !== ADMIN_USERNAME) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const userPosts = await Post.find({ author: target }, '_id').lean();
  const postIds = userPosts.map((post) => post._id);
  const commentQuery = postIds.length
    ? { $or: [{ author: target }, { postId: { $in: postIds } }] }
    : { author: target };

  await Promise.all([
    User.deleteOne({ username: target }),
    Message.deleteMany({ $or: [{ from: target }, { to: target }] }),
    Post.deleteMany({ author: target }),
    Comment.deleteMany(commentQuery),
    Comment.updateMany({ 'replies.author': target }, { $pull: { replies: { author: target } } }),
  ]);

  return res.json({ success: true });
}));

module.exports = router;
