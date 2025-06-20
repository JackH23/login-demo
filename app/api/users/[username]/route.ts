import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(
  req: Request,
  { params }: { params: { username: string } }
) {
  await dbConnect();
  const user = await User.findOne(
    { username: params.username },
    'username position age image -_id'
  ).lean();
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  return NextResponse.json({ user });
}

export async function PUT(
  req: Request,
  { params }: { params: { username: string } }
) {
  const { position, age } = await req.json();
  await dbConnect();
  const user = await User.findOneAndUpdate(
    { username: params.username },
    { position, age },
    { new: true, fields: 'username position age image -_id' }
  ).lean();
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  return NextResponse.json({ user });
}

export async function DELETE(
  req: Request,
  { params }: { params: { username: string } }
) {
  await dbConnect();
  await User.deleteOne({ username: params.username });
  return NextResponse.json({ success: true });
}
