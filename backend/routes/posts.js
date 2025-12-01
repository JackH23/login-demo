const express = require('express');

const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { emitPostCreated, emitPostDeleted } = require('../socket');

const router = express.Router();

const asyncHandler = (handler) =>
  (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.post('/', asyncHandler(async (req, res) => {
  const { title, content, image, author } = req.body;

  try {
    const post = await Post.create({ title, content, image, author });
    const plainPost = post.toObject({ versionKey: false });

    if (plainPost._id) {
      plainPost._id = plainPost._id.toString();
    }

    if (plainPost.createdAt instanceof Date) {
      plainPost.createdAt = plainPost.createdAt.toISOString();
    }

    if (plainPost.updatedAt instanceof Date) {
      plainPost.updatedAt = plainPost.updatedAt.toISOString();
    }

    emitPostCreated(plainPost);
    return res.json({ post: plainPost });
  } catch (error) {
    console.error('Failed to create post', error);
    return res.status(400).json({ error: 'Failed to create post' });
  }
}));

router.get('/', asyncHandler(async (req, res) => {
  const { author, limit: limitParam, skip: skipParam } = req.query;

  const query = author ? { author } : {};
  let finder = Post.find(query)
    .select('title content image author likes dislikes likedBy dislikedBy createdAt updatedAt')
    .sort({ createdAt: -1 });

  const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
  if (typeof limit === 'number' && Number.isFinite(limit) && limit > 0) {
    finder = finder.limit(Math.min(limit, 100));
  }

  const skip = skipParam ? Number.parseInt(skipParam, 10) : undefined;
  if (typeof skip === 'number' && Number.isFinite(skip) && skip > 0) {
    finder = finder.skip(skip);
  }

  const posts = await finder.lean();
  return res.json({ posts });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action, username } = req.body;

  if (!['like', 'dislike'].includes(action) || !username) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  const existing = await Post.findById(id).lean();
  if (!existing) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const alreadyLiked = existing.likedBy?.includes(username);
  const alreadyDisliked = existing.dislikedBy?.includes(username);

  if ((action === 'like' && alreadyLiked) || (action === 'dislike' && alreadyDisliked)) {
    return res.json({
      post: {
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

  const post = await Post.findByIdAndUpdate(id, update, { new: true }).lean();

  return res.json({
    post: {
      _id: post._id,
      likes: post.likes,
      dislikes: post.dislikes,
    },
  });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const post = await Post.findById(id);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }
  await Comment.deleteMany({ postId: post._id });
  await post.deleteOne();
  emitPostDeleted(id);
  return res.json({ success: true });
}));

module.exports = router;
