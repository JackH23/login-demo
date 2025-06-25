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
    'username position age image friends -_id'
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
  // Extract potential updates from the request body
  const { username, position, age, image } = await req.json();

  await dbConnect();

  // Only include fields that were provided in the update payload
  const update: Record<string, unknown> = {};
  if (username !== undefined) update.username = username;
  if (position !== undefined) update.position = position;
  if (age !== undefined) update.age = age;
  if (image !== undefined) update.image = image;

  const user = await User.findOneAndUpdate(
    { username: params.username },
    update,
    { new: true, fields: 'username position age image friends -_id' }
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
