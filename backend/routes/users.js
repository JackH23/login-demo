const express = require("express");
const multer = require("multer");

const User = require("../models/User");
const Message = require("../models/Message");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const { emitUserOnline, emitUserOffline } = require("../socket");
const {
  MAX_IMAGE_BYTES,
  extractImagePayload,
  encodeImageToDataUrl,
} = require("./utils/image");
const authMiddleware = require("../middleware/auth");

const ADMIN_USERNAME =
  process.env.ADMIN_USERNAME ||
  process.env.NEXT_PUBLIC_ADMIN_USERNAME ||
  "Jackie";

const router = express.Router();

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
});

// Only engage multer for multipart/form-data requests to avoid throwing errors
// on JSON requests (e.g., status updates that don't include a file upload).
const maybeHandleUpload = (req, res, next) => {
  if (req.is("multipart/form-data")) {
    return upload.single("image")(req, res, next);
  }

  return next();
};

function serializeUser(user) {
  const imageDataUrl = user?.imageData?.length
    ? encodeImageToDataUrl(user.imageData, user.imageContentType)
    : null;

  const imagePath = imageDataUrl || user?.image || null;
  const isAdmin = Boolean(user?.isAdmin) || user?.username === ADMIN_USERNAME;

  return {
    username: user.username,
    image: imagePath,
    friends: user.friends ?? [],
    online: Boolean(user.online),
    isAdmin,
  };
}

function getRequester(req) {
  const headerUser =
    req.get("x-user") || req.get("x-username") || req.get("authorization");

  if (headerUser) {
    return headerUser.replace(/^Bearer\s+/i, "");
  }
  return null;
}

async function isAdminUser(username) {
  if (!username) return false;
  if (username === ADMIN_USERNAME) return true;

  const record = await User.findOne({ username }, "isAdmin").lean();
  return Boolean(record?.isAdmin);
}

async function updateAdminStatus(req, res) {
  const requester = getRequester(req);
  if (!requester) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const requesterIsAdmin = await isAdminUser(requester);
  if (!requesterIsAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { isAdmin } = req.body ?? {};
  if (typeof isAdmin !== "boolean") {
    return res.status(400).json({ error: "isAdmin must be a boolean" });
  }

  const target = req.params.username;
  const nextIsAdmin = target === ADMIN_USERNAME ? true : isAdmin;

  const user = await User.findOneAndUpdate(
    { username: target },
    { isAdmin: nextIsAdmin },
    {
      new: true,
      fields:
        "username image imageData imageContentType friends online isAdmin -_id",
    }
  ).lean();

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.json({ user: serializeUser(user) });
}

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const users = await User.find({}, "-password -__v")
      .sort({ username: 1 })
      .lean();

    return res.json({ users });
  })
);

router.get(
  "/:username/image",
  asyncHandler(async (req, res) => {
    const { username } = req.params;
    const user = await User.findOne(
      { username },
      "image imageData imageContentType -_id"
    ).lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.imageData?.length) {
      res.set(
        "Content-Type",
        user.imageContentType || "application/octet-stream"
      );
      res.set("Cache-Control", "public, max-age=86400");
      return res.send(user.imageData);
    }

    const dataUrlMatch =
      typeof user.image === "string" &&
      /^data:([^;]+);base64,(.+)$/i.exec(user.image || "");

    if (dataUrlMatch) {
      try {
        const buffer = Buffer.from(dataUrlMatch[2], "base64");
        res.set("Content-Type", dataUrlMatch[1] || "application/octet-stream");
        res.set("Cache-Control", "public, max-age=86400");
        return res.send(buffer);
      } catch (error) {
        console.error("Failed to decode inline profile image", error);
      }
    }

    return res.status(404).json({ error: "Image not found" });
  })
);

router.get(
  "/:username",
  asyncHandler(async (req, res) => {
    const { username } = req.params;
    const user = await User.findOne(
      { username },
      "username image friends online isAdmin -_id"
    ).lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ user: serializeUser(user) });
  })
);

router.patch("/:username/admin", asyncHandler(updateAdminStatus));
router.post("/:username/admin", asyncHandler(updateAdminStatus));

router.patch(
  "/status",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { online } = req.body ?? {};

    if (typeof online !== "boolean") {
      return res.status(400).json({ message: "Invalid online value" });
    }

    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { online },
      { new: true }
    ).lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (online) emitUserOnline(user.username);
    else emitUserOffline(user.username);

    res.json({ success: true, online: user.online });
  })
);

router.put(
  "/:username",
  maybeHandleUpload,
  asyncHandler(async (req, res) => {
    const { username: target } = req.params;
    const requester = getRequester(req);

    if (!requester) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const requesterIsAdmin = await isAdminUser(requester);

    if (target === ADMIN_USERNAME && requester !== ADMIN_USERNAME) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (requester !== target && !requesterIsAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { username, online } = req.body;

    const prev = await User.findOne(
      { username: target },
      "username online image imageData imageContentType isAdmin"
    ).lean();

    if (!prev) {
      return res.status(404).json({ error: "User not found" });
    }

    const imagePayload = extractImagePayload({
      file: req.file,
      imageString: req.body?.image,
    });

    if (imagePayload?.error === "too_large") {
      return res
        .status(400)
        .json({ error: "Profile image must be 5MB or smaller" });
    }

    if (imagePayload?.error === "invalid") {
      return res.status(400).json({ error: "Invalid profile image data" });
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
          imagePayload.contentType
        );
        update.imageData = imagePayload.buffer;
        update.imageContentType = imagePayload.contentType;
      }
    }

    const user = await User.findOneAndUpdate({ username: target }, update, {
      new: true,
      fields:
        "username image imageData imageContentType friends online isAdmin -_id",
    }).lean();

    if (user && prev && online !== undefined && prev.online !== online) {
      if (user.online) emitUserOnline(user.username);
      else emitUserOffline(user.username);
    }

    return res.json({ user: serializeUser(user) });
  })
);

router.delete(
  "/:username",
  asyncHandler(async (req, res) => {
    const { username: target } = req.params;
    const requester = getRequester(req);

    if (!requester) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const requesterIsAdmin = await isAdminUser(requester);

    if (target === ADMIN_USERNAME && requester !== ADMIN_USERNAME) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (requester !== target && !requesterIsAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const userPosts = await Post.find({ author: target }, "_id").lean();
    const postIds = userPosts.map((post) => post._id);
    const commentQuery = postIds.length
      ? { $or: [{ author: target }, { postId: { $in: postIds } }] }
      : { author: target };

    await Promise.all([
      User.deleteOne({ username: target }),
      Message.deleteMany({ $or: [{ from: target }, { to: target }] }),
      Post.deleteMany({ author: target }),
      Comment.deleteMany(commentQuery),
      Comment.updateMany(
        { "replies.author": target },
        { $pull: { replies: { author: target } } }
      ),
    ]);

    return res.json({ success: true });
  })
);

module.exports = router;
