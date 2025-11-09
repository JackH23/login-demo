import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Message from '@/models/Message';
import Post from '@/models/Post';
import Comment from '@/models/Comment';
import { ADMIN_USERNAME } from '@/lib/constants';
import { emitUserOnline, emitUserOffline } from '@/lib/socketServer';

// Helper to get the username of the requester from headers/cookies
function getRequester(req: Request): string | null {
  const headerUser =
    req.headers.get('x-user') ||
    req.headers.get('x-username') ||
    req.headers.get('authorization');
  if (headerUser) {
    // Strip Bearer prefix if provided
    return headerUser.replace(/^Bearer\s+/i, '');
  }
  return null;
}

export async function GET(
  req: Request,
  context: { params: Promise<{ username: string }> }
) {
  const { username } = await context.params;
  await dbConnect();
  const user = await User.findOne(
    { username },
    'username image friends online -_id'
  ).lean();
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  return NextResponse.json({ user });
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ username: string }> }
) {
  const { username: target } = await context.params;
  const requester = getRequester(req);
  if (!requester) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (requester !== target && requester !== ADMIN_USERNAME) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Extract potential updates from the request body
  const { username, image, online } = await req.json();

  await dbConnect();

  type LeanUser = {
    username: string;
    image?: string;
    friends?: string[];
    online?: boolean;
  };

  const prev = await User.findOne({ username: target }, 'online').lean<
    Pick<LeanUser, 'online'> | null
  >();

  // Only include fields that were provided in the update payload
  const update: Record<string, unknown> = {};
  if (username !== undefined) update.username = username;
  if (image !== undefined) update.image = image;
  if (online !== undefined) update.online = online;

  const user = await User.findOneAndUpdate(
    { username: target },
    update,
    { new: true, fields: 'username image friends online -_id' }
  ).lean<LeanUser | null>();

  if (user && prev && online !== undefined && prev.online !== online) {
    if (user.online) emitUserOnline(user.username);
    else emitUserOffline(user.username);
  }

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ username: string }> }
) {
  const { username: target } = await context.params;
  const requester = getRequester(req);
  if (!requester) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (requester !== target && requester !== ADMIN_USERNAME) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await dbConnect();

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
    Comment.updateMany(
      { 'replies.author': target },
      { $pull: { replies: { author: target } } }
    ),
  ]);

  return NextResponse.json({ success: true });
}
