const express = require('express');

const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { emitPostCreated, emitPostDeleted } = require('../socket');
const {
  MAX_IMAGE_BYTES,
  extractImagePayload,
  encodeImageToDataUrl,
} = require('./utils/image');

const router = express.Router();

const asyncHandler = (handler) =>
  (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

function serializePost(post) {
  const plain = typeof post.toObject === 'function'
    ? post.toObject({ versionKey: false })
    : { ...post };

  const image = plain?.imageData?.length
    ? encodeImageToDataUrl(plain.imageData, plain.imageContentType)
    : plain?.image || null;

  if (plain._id) {
    plain._id = plain._id.toString();
  }

  if (plain.createdAt instanceof Date) {
    plain.createdAt = plain.createdAt.toISOString();
  }

  if (plain.updatedAt instanceof Date) {
    plain.updatedAt = plain.updatedAt.toISOString();
  }

  delete plain.imageData;
  delete plain.imageContentType;

  return { ...plain, image };
}

router.post('/', asyncHandler(async (req, res) => {
  const { title, content, image, author } = req.body;

  const imagePayload = extractImagePayload({ file: req.file, imageString: image });

  if (imagePayload?.error === 'too_large') {
    return res.status(400).json({ error: `Image must be ${MAX_IMAGE_BYTES / (1024 * 1024)}MB or smaller` });
  }

  if (imagePayload?.error === 'invalid') {
    return res.status(400).json({ error: 'Invalid image data' });
  }

  try {
    const imageFields = imagePayload?.buffer
      ? {
          imageData: imagePayload.buffer,
          imageContentType: imagePayload.contentType,
          image: encodeImageToDataUrl(imagePayload.buffer, imagePayload.contentType),
        }
      : {};

    const post = await Post.create({ title, content, author, ...imageFields });
    const serialized = serializePost(post);

    emitPostCreated(serialized);
    return res.json({ post: serialized });
  } catch (error) {
    console.error('Failed to create post', error);
    return res.status(400).json({ error: 'Failed to create post' });
  }
}));

router.get('/', asyncHandler(async (req, res) => {
  const { author, limit: limitParam, skip: skipParam } = req.query;

  const query = author ? { author } : {};
  let finder = Post.find(query)
    .select('title content image imageData imageContentType author likes dislikes likedBy dislikedBy createdAt updatedAt')
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
  return res.json({ posts: posts.map(serializePost) });
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
