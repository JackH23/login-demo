const express = require("express");
const mongoose = require("mongoose");

const Post = require("../models/Post");
const Comment = require("../models/Comment");
const { emitPostCreated, emitPostDeleted } = require("../socket");
const {
  MAX_IMAGE_BYTES,
  extractImagePayload,
  encodeImageToDataUrl,
} = require("./utils/image");

const router = express.Router();

const DEFAULT_IMAGE_EDITS = {
  brightness: 100,
  contrast: 102,
  saturation: 110,
  grayscale: 0,
  rotation: 0,
  hue: 0,
  blur: 0,
  sepia: 0,
};

const parseImageEdits = (value) => {
  if (!value || typeof value !== "object") return undefined;

  return Object.entries(DEFAULT_IMAGE_EDITS).reduce(
    (acc, [key, defaultValue]) => {
      const numericValue = Number(value[key]);
      if (Number.isFinite(numericValue)) {
        acc[key] = numericValue;
      } else if (value[key] === 0) {
        acc[key] = 0;
      } else if (defaultValue !== undefined && value[key] === undefined) {
        acc[key] = defaultValue;
      }
      return acc;
    },
    {}
  );
};

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const normalizeId = (value) =>
  typeof value === "string" ? value.trim() : value;

async function findPostByIdFlexible(id, projection) {
  const normalizedId = normalizeId(id);
  if (!normalizedId) return null;

  const post = await Post.findById(normalizedId)
    .select(projection ?? undefined)
    .lean();

  if (post) return post;

  const fallback = await Post.collection.findOne(
    { _id: normalizedId },
    projection ? { projection } : undefined
  );

  if (fallback) return fallback;

  if (mongoose.isValidObjectId(normalizedId)) {
    const objectId = new mongoose.Types.ObjectId(normalizedId);
    return Post.collection.findOne(
      { _id: objectId },
      projection ? { projection } : undefined
    );
  }

  return null;
}

async function updatePostByIdFlexible(id, update, projection) {
  const normalizedId = normalizeId(id);
  if (!normalizedId) return null;

  const updated = await Post.findByIdAndUpdate(normalizedId, update, {
    new: true,
    lean: true,
    projection: projection ?? undefined,
  });

  if (updated) return updated;

  const result = await Post.collection.findOneAndUpdate(
    { _id: normalizedId },
    update,
    {
      returnDocument: "after",
      projection,
    }
  );

  if (result?.value) return result.value;

  if (mongoose.isValidObjectId(normalizedId)) {
    const objectId = new mongoose.Types.ObjectId(normalizedId);

    const fallbackResult = await Post.collection.findOneAndUpdate(
      { _id: objectId },
      update,
      {
        returnDocument: "after",
        projection,
      }
    );

    return fallbackResult?.value ?? null;
  }

  return null;
}

async function deletePostByIdFlexible(id) {
  const normalizedId = normalizeId(id);
  if (!normalizedId) return false;

  const deletion = await Post.deleteOne({ _id: normalizedId });
  if (deletion.deletedCount) return true;

  const directDeletion = await Post.collection.deleteOne({ _id: normalizedId });
  if (directDeletion.deletedCount) return true;

  if (mongoose.isValidObjectId(normalizedId)) {
    const objectId = new mongoose.Types.ObjectId(normalizedId);
    const fallbackDeletion = await Post.collection.deleteOne({ _id: objectId });
    return fallbackDeletion.deletedCount > 0;
  }

  return false;
}

function serializePost(post) {
  const plain =
    typeof post.toObject === "function"
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

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { title, content, image, author, imageEdits } = req.body;

    const imagePayload = extractImagePayload({
      file: req.file,
      imageString: image,
    });

    if (imagePayload?.error === "too_large") {
      return res
        .status(400)
        .json({
          error: `Image must be ${
            MAX_IMAGE_BYTES / (1024 * 1024)
          }MB or smaller`,
        });
    }

    if (imagePayload?.error === "invalid") {
      return res.status(400).json({ error: "Invalid image data" });
    }

    try {
      const imageFields = imagePayload?.buffer
        ? {
            imageData: imagePayload.buffer,
            imageContentType: imagePayload.contentType,
            image: encodeImageToDataUrl(
              imagePayload.buffer,
              imagePayload.contentType
            ),
          }
        : {};

      const post = await Post.create({
        title,
        content,
        author,
        imageEdits: parseImageEdits(imageEdits),
        ...imageFields,
      });
      const serialized = serializePost(post);

      emitPostCreated(serialized);
      return res.json({ post: serialized });
    } catch (error) {
      console.error("Failed to create post", error);
      return res.status(400).json({ error: "Failed to create post" });
    }
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { author, limit: limitParam, skip: skipParam } = req.query;

    const query = author ? { author } : {};
    let finder = Post.find(query)
      .select(
        "title content image imageData imageContentType imageEdits author likes dislikes likedBy dislikedBy createdAt updatedAt"
      )
      .sort({ createdAt: -1 });

    const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
    if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
      finder = finder.limit(Math.min(limit, 100));
    }

    const skip = skipParam ? Number.parseInt(skipParam, 10) : undefined;
    if (typeof skip === "number" && Number.isFinite(skip) && skip > 0) {
      finder = finder.skip(skip);
    }

    const posts = await finder.lean();
    return res.json({ posts: posts.map(serializePost) });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const post = await findPostByIdFlexible(id, {
      title: 1,
      content: 1,
      image: 1,
      imageData: 1,
      imageContentType: 1,
      imageEdits: 1,
      author: 1,
      likes: 1,
      dislikes: 1,
      likedBy: 1,
      dislikedBy: 1,
      createdAt: 1,
      updatedAt: 1,
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    return res.json({ post: serializePost(post) });
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { action, username } = req.body;

    if (!["like", "dislike"].includes(action) || !username) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const existing = await findPostByIdFlexible(id, {
      _id: 1,
      likes: 1,
      dislikes: 1,
      likedBy: 1,
      dislikedBy: 1,
    });
    if (!existing) {
      return res.status(404).json({ error: "Post not found" });
    }

    const alreadyLiked = existing.likedBy?.includes(username);
    const alreadyDisliked = existing.dislikedBy?.includes(username);

    if (
      (action === "like" && alreadyLiked) ||
      (action === "dislike" && alreadyDisliked)
    ) {
      return res.json({
        post: {
          _id: existing._id,
          likes: existing.likes,
          dislikes: existing.dislikes,
        },
      });
    }

    const update =
      action === "like"
        ? { $addToSet: { likedBy: username }, $inc: { likes: 1 } }
        : { $addToSet: { dislikedBy: username }, $inc: { dislikes: 1 } };

    const post = await updatePostByIdFlexible(id, update, {
      _id: 1,
      likes: 1,
      dislikes: 1,
    });

    return res.json({
      post: {
        _id: post._id,
        likes: post.likes,
        dislikes: post.dislikes,
      },
    });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const post = await findPostByIdFlexible(id, { _id: 1 });
    if (!post?._id) {
      return res.status(404).json({ error: "Post not found" });
    }
    await Comment.deleteMany({ postId: post._id });
    await deletePostByIdFlexible(id);
    emitPostDeleted(id);
    return res.json({ success: true });
  })
);

module.exports = router;
