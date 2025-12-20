const express = require('express');

const User = require('../models/User');
const { encodeImageToDataUrl } = require('./utils/image');

const router = express.Router();

const asyncHandler = (handler) =>
  (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

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

router.get('/directory', asyncHandler(async (req, res) => {
  const { username, cursor } = req.query;
  const rawLimit = Number.parseInt(req.query?.limit, 10);
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : null;

  if (!username) {
    return res.status(400).json({ error: 'Missing username' });
  }

  const viewer = await User.findOne(
    { username },
    'username friends image imageData imageContentType online -_id'
  ).lean();

  if (!viewer) {
    return res.status(404).json({ error: 'User not found' });
  }

  const allFriends = (viewer.friends ?? []).map((name) => String(name));
  const sortedFriends = [...allFriends].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );
  const startIndex = cursor
    ? Math.max(sortedFriends.indexOf(String(cursor)) + 1, 0)
    : 0;
  const selectedUsernames = limit
    ? sortedFriends.slice(startIndex, startIndex + limit)
    : sortedFriends;

  const directory = selectedUsernames.length
    ? await User.find(
      { username: { $in: selectedUsernames } },
      'username image imageData imageContentType online friends -_id'
    ).lean()
    : [];

  const serializedFriends = directory
    .map(serializeUser)
    .sort(
      (a, b) =>
        selectedUsernames.indexOf(a.username) -
        selectedUsernames.indexOf(b.username)
    );

  const nextCursor =
    limit && startIndex + selectedUsernames.length < sortedFriends.length
      ? selectedUsernames[selectedUsernames.length - 1] ?? null
      : null;

  return res.json({
    viewer: serializeUser(viewer),
    friends: serializedFriends,
    total: sortedFriends.length,
    nextCursor,
  });
}));

module.exports = router;
