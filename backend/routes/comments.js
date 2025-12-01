const express = require('express');

const Comment = require('../models/Comment');

const router = express.Router();

const asyncHandler = (handler) =>
  (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.get('/', asyncHandler(async (req, res) => {
  const { postId } = req.query;
  if (!postId) {
    return res.status(400).json({ error: 'Missing postId' });
  }

  const comments = await Comment.find({ postId })
    .select('postId author text likes dislikes likedBy dislikedBy replies createdAt updatedAt')
    .sort({ createdAt: 1 })
    .lean();

  return res.json({ comments });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { postId, author, text } = req.body;
  try {
    const comment = await Comment.create({ postId, author, text });
    return res.json({ comment });
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

  return res.json({ comment });
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
