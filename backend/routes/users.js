const express = require('express');
const multer = require('multer');

const User = require('../models/User');
const Message = require('../models/Message');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { emitUserOnline, emitUserOffline } = require('../socket');
const {
  MAX_IMAGE_BYTES,
  extractImagePayload,
  encodeImageToDataUrl,
} = require('./utils/image');

const ADMIN_USERNAME =
  process.env.ADMIN_USERNAME || process.env.NEXT_PUBLIC_ADMIN_USERNAME || 'Jackie';

const router = express.Router();

const asyncHandler = (handler) =>
  (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
});

function serializeUser(user) {
  const imageDataUrl =
    user?.imageData?.length
      ? encodeImageToDataUrl(user.imageData, user.imageContentType)
      : null;

  const imagePath = imageDataUrl || user?.image || null;

  return {
    username: user.username,
    image: imagePath,
    friends: user.friends ?? [],
    online: Boolean(user.online),
  };
}

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
  return res.json({ users: users.map(serializeUser) });
}));

router.get('/:username/image', asyncHandler(async (req, res) => {
  const { username } = req.params;
  const user = await User.findOne({ username }, 'image imageData imageContentType -_id')
    .lean();

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.imageData?.length) {
    res.set('Content-Type', user.imageContentType || 'application/octet-stream');
    res.set('Cache-Control', 'public, max-age=86400');
    return res.send(user.imageData);
  }

  const dataUrlMatch =
    typeof user.image === 'string'
    && /^data:([^;]+);base64,(.+)$/i.exec(user.image || '');

  if (dataUrlMatch) {
    try {
      const buffer = Buffer.from(dataUrlMatch[2], 'base64');
      res.set('Content-Type', dataUrlMatch[1] || 'application/octet-stream');
      res.set('Cache-Control', 'public, max-age=86400');
      return res.send(buffer);
    } catch (error) {
      console.error('Failed to decode inline profile image', error);
    }
  }

  return res.status(404).json({ error: 'Image not found' });
}));

router.get('/:username', asyncHandler(async (req, res) => {
  const { username } = req.params;
  const user = await User.findOne({ username }, 'username image friends online -_id').lean();

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json({ user: serializeUser(user) });
}));

router.put('/:username', upload.single('image'), asyncHandler(async (req, res) => {
  const { username: target } = req.params;
  const requester = getRequester(req);

  if (!requester) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (requester !== target && requester !== ADMIN_USERNAME) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { username, online } = req.body;

  const prev = await User.findOne(
    { username: target },
    'username online image imageData imageContentType',
  ).lean();

  if (!prev) {
    return res.status(404).json({ error: 'User not found' });
  }

  const imagePayload = extractImagePayload({
    file: req.file,
    imageString: req.body?.image,
  });

  if (imagePayload?.error === 'too_large') {
    return res.status(400).json({ error: 'Profile image must be 5MB or smaller' });
  }

  if (imagePayload?.error === 'invalid') {
    return res.status(400).json({ error: 'Invalid profile image data' });
  }

  const nextUsername = username !== undefined ? username : target;

  const update = {};
  if (username !== undefined) update.username = nextUsername;
  if (online !== undefined) update.online = online;

  if (imagePayload) {
    if (imagePayload.remove) {
      update.image = null;
      update.imageData = null;
      update.imageContentType = null;
    } else if (imagePayload.buffer) {
      update.image = encodeImageToDataUrl(
        imagePayload.buffer,
        imagePayload.contentType,
      );
      update.imageData = imagePayload.buffer;
      update.imageContentType = imagePayload.contentType;
    }
  }

  const user = await User.findOneAndUpdate({ username: target }, update, {
    new: true,
    fields: 'username image friends online -_id',
  }).lean();

  if (user && prev && online !== undefined && prev.online !== online) {
    if (user.online) emitUserOnline(user.username);
    else emitUserOffline(user.username);
  }

  return res.json({ user: serializeUser(user) });
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
