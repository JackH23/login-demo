import { NextResponse } from 'next/server';
import dbConnect from '@/backend/mongodb';
import User from '@/backend/models/User';

export async function POST(req: Request) {
  const { user, friend } = await req.json();
  if (!user || !friend) {
    return NextResponse.json({ error: 'Missing user or friend' }, { status: 400 });
  }
  if (user === friend) {
    return NextResponse.json({ error: 'Cannot add yourself' }, { status: 400 });
  }

  await dbConnect();

  const [u, f] = await Promise.all([
    User.findOne({ username: user }),
    User.findOne({ username: friend }),
  ]);

  if (!u || !f) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (!u.friends.includes(friend)) {
    u.friends.push(friend);
    await u.save();
  }
  if (!f.friends.includes(user)) {
    f.friends.push(user);
    await f.save();
  }

  return NextResponse.json({ success: true });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');
  if (!username) {
    return NextResponse.json({ error: 'Missing username' }, { status: 400 });
  }

  await dbConnect();
  const user = await User.findOne({ username }, 'friends -_id').lean<
    { friends?: string[] } | null
  >();
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  return NextResponse.json({ friends: user.friends ?? [] });
}
