import { NextResponse } from 'next/server';
import dbConnect from '@/backend/mongodb';
import User from '@/backend/models/User';

export async function GET() {
  await dbConnect();
  const users = await User.find({}, 'username image friends online -_id')
    .sort({ username: 1 })
    .lean();
  return NextResponse.json({ users });
}
