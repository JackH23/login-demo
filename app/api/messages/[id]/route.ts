import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Message from '@/models/Message';

export async function DELETE(
  req: Request,
  context: { params: { id: string } }
) {
  const { id } = await context.params;
  await dbConnect();
  const message = await Message.findByIdAndDelete(id);
  if (!message) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}

export async function PUT(
  req: Request,
  context: { params: { id: string } }
) {
  const { id } = await context.params;
  const { content } = await req.json();
  await dbConnect();
  const message = await Message.findByIdAndUpdate(
    id,
    { content },
    { new: true }
  ).lean();
  if (!message) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  }
  return NextResponse.json({ message });
}

