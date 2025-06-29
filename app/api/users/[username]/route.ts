import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
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
  context: { params: { username: string } }
) {
  const { username } = await context.params;
  await dbConnect();
  const user = await User.findOne(
    { username },
    'username position age image friends online -_id'
  ).lean();
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  return NextResponse.json({ user });
}

export async function PUT(
  req: Request,
  context: { params: { username: string } }
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
  const { username, position, age, image, online } = await req.json();

  await dbConnect();

  const prev = await User.findOne({ username: target }, 'online').lean();

  // Only include fields that were provided in the update payload
  const update: Record<string, unknown> = {};
  if (username !== undefined) update.username = username;
  if (position !== undefined) update.position = position;
  if (age !== undefined) update.age = age;
  if (image !== undefined) update.image = image;
  if (online !== undefined) update.online = online;

  const user = await User.findOneAndUpdate(
    { username: target },
    update,
    { new: true, fields: 'username position age image friends online -_id' }
  ).lean();

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
  context: { params: { username: string } }
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
  await User.deleteOne({ username: target });
  return NextResponse.json({ success: true });
}
