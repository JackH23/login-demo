import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function GET() {
  await dbConnect();
  const users = await User.find(
    {},
    'username position age image friends online -_id'
  ).lean();
  return NextResponse.json({ users });
}
