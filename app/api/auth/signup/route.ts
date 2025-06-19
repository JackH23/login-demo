import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(req: Request) {
  const { username, password } = await req.json();
  await dbConnect();
  try {
    await User.create({ username, password });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'User creation failed' }, { status: 400 });
  }
}
