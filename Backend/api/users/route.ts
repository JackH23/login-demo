import { NextResponse } from 'next/server';
import dbConnect from '@/Backend/lib/mongodb';
import User from '@/Backend/models/User';

export async function GET() {
  await dbConnect();
  const users = await User.find({}, 'username image friends online -_id')
    .sort({ username: 1 })
    .lean();
  return NextResponse.json({ users });
}
