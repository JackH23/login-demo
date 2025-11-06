import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Message from '@/models/Message';
import User from '@/models/User';
import Emoji from '@/models/Emoji';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const user1 = searchParams.get('user1');
  const user2 = searchParams.get('user2');
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;

  if (!user1 || !user2) {
    return NextResponse.json({ error: 'Missing users' }, { status: 400 });
  }

  await dbConnect();

  const filter = {
    $or: [
      { from: user1, to: user2 },
      { from: user2, to: user1 },
    ],
  } as const;

  const boundedLimit =
    typeof limit === 'number' && Number.isFinite(limit) && limit > 0
      ? Math.min(limit, 200)
      : null;

  const fetchMessages = async () => {
    const baseQuery = Message.find(filter).select(
      'from to type content fileName createdAt'
    );

    if (boundedLimit) {
      const recent = await baseQuery
        .sort({ createdAt: -1 })
        .limit(boundedLimit)
        .lean();
      return recent.reverse();
    }

    return baseQuery.sort({ createdAt: 1 }).lean();
  };

  const [messages, participants, emojis] = await Promise.all([
    fetchMessages(),
    User.find({ username: { $in: [user1, user2] } })
      .select('username image online -_id')
      .lean(),
    Emoji.find({}, 'shortcode unicode category sortOrder hasSkinTones -_id')
      .sort({ sortOrder: 1, unicode: 1 })
      .limit(200)
      .lean(),
  ]);

  return NextResponse.json({ messages, participants, emojis });
}

export async function POST(req: Request) {
  const { from, to, type, content, fileName } = await req.json();
  await dbConnect();
  const message = await Message.create({ from, to, type, content, fileName });
  return NextResponse.json({ message });
}

