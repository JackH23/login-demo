import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Message from '@/models/Message';

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  await dbConnect();
  const message = await Message.findByIdAndDelete(params.id);
  if (!message) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}

