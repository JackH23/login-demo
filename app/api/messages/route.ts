import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Message from '@/models/Message';

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
  const query = Message.find({
    $or: [
      { from: user1, to: user2 },
      { from: user2, to: user1 },
    ],
  }).select('from to type content fileName createdAt');

  if (typeof limit === 'number' && Number.isFinite(limit) && limit > 0) {
    const boundedLimit = Math.min(limit, 200);
    const recent = await query.sort({ createdAt: -1 }).limit(boundedLimit).lean();
    return NextResponse.json({ messages: recent.reverse() });
  }

  const messages = await query.sort({ createdAt: 1 }).lean();

  return NextResponse.json({ messages });
}

export async function POST(req: Request) {
  const { from, to, type, content, fileName } = await req.json();
  await dbConnect();
  const message = await Message.create({ from, to, type, content, fileName });
  return NextResponse.json({ message });
}

