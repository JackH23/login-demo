const express = require('express');

const Comment = require('../models/Comment');
const User = require('../models/User');

const router = express.Router();

const asyncHandler = (handler) =>
  (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

const buildImageMap = async (comments) => {
  const usernames = new Set();

  comments.forEach((comment) => {
    if (comment.author) usernames.add(comment.author);
    (comment.replies || []).forEach((reply) => {
      if (reply.author) usernames.add(reply.author);
    });
  });

  if (!usernames.size) return {};

  const users = await User.find(
    { username: { $in: Array.from(usernames) } },
    'username image'
  ).lean();

  return users.reduce((acc, user) => {
    acc[user.username] = user.image;
    return acc;
  }, {});
};

const attachAvatars = async (comments) => {
  const imageMap = await buildImageMap(comments);

  return comments.map((comment) => ({
    ...comment,
    authorImage: imageMap[comment.author],
    replies: (comment.replies || []).map((reply) => ({
      ...reply,
      authorImage: imageMap[reply.author],
    })),
  }));
};

router.get('/', asyncHandler(async (req, res) => {
  const { postId } = req.query;
  if (!postId) {
    return res.status(400).json({ error: 'Missing postId' });
  }

  const rawComments = await Comment.find({ postId })
    .select('postId author text likes dislikes likedBy dislikedBy replies createdAt updatedAt')
    .sort({ createdAt: 1 })
    .lean();

  const comments = await attachAvatars(rawComments);

  return res.json({ comments });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { postId, author, text } = req.body;
  try {
    const comment = await Comment.create({ postId, author, text });
    const authorProfile = await User.findOne({ username: author }, 'image').lean();

    return res.json({
      comment: {
        ...comment.toObject(),
        authorImage: authorProfile?.image,
      },
    });
  } catch (error) {
    console.error('Failed to create comment', error);
    return res.status(400).json({ error: 'Failed to create comment' });
  }
}));

router.post('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { author, text } = req.body;

  const comment = await Comment.findByIdAndUpdate(
    id,
    { $push: { replies: { author, text } } },
    { new: true }
  ).lean();

  if (!comment) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  const [withAvatars] = await attachAvatars([comment]);

  return res.json({ comment: withAvatars });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action, username } = req.body;

  if (!['like', 'dislike'].includes(action) || !username) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  const existing = await Comment.findById(id).lean();
  if (!existing) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  const alreadyLiked = existing.likedBy?.includes(username);
  const alreadyDisliked = existing.dislikedBy?.includes(username);

  if (alreadyLiked || alreadyDisliked) {
    return res.json({
      comment: {
        _id: existing._id,
        likes: existing.likes,
        dislikes: existing.dislikes,
      },
    });
  }

  const update =
    action === 'like'
      ? { $addToSet: { likedBy: username }, $inc: { likes: 1 } }
      : { $addToSet: { dislikedBy: username }, $inc: { dislikes: 1 } };

  const comment = await Comment.findByIdAndUpdate(id, update, { new: true }).lean();

  return res.json({
    comment: {
      _id: comment._id,
      likes: comment.likes,
      dislikes: comment.dislikes,
    },
  });
}));

module.exports = router;
