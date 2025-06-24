import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Comment from '@/models/Comment';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { author, text } = await req.json();
  await dbConnect();
  const comment = await Comment.findByIdAndUpdate(
    params.id,
    { $push: { replies: { author, text } } },
    { new: true }
  ).lean();
  if (!comment) {
    return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
  }
  return NextResponse.json({ comment });
}

