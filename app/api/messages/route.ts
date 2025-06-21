import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Message from '@/models/Message';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const user1 = searchParams.get('user1');
  const user2 = searchParams.get('user2');

  if (!user1 || !user2) {
    return NextResponse.json({ error: 'Missing users' }, { status: 400 });
  }

  await dbConnect();
  const messages = await Message.find({
    $or: [
      { from: user1, to: user2 },
      { from: user2, to: user1 },
    ],
  })
    .sort({ createdAt: 1 })
    .lean();

  return NextResponse.json({ messages });
}

export async function POST(req: Request) {
  const { from, to, type, content, fileName } = await req.json();
  await dbConnect();
  const message = await Message.create({ from, to, type, content, fileName });
  return NextResponse.json({ message });
}

