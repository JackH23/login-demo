import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(req: Request) {
  const { username, password } = await req.json();
  await dbConnect();
  const user = await User.findOne({ username, password });
  if (user) {
    return NextResponse.json({ success: true, username: user.username });
  }
  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
}
