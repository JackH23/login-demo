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

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { action } = await req.json();
  if (!['like', 'dislike'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
  await dbConnect();
  const update = action === 'like' ? { $inc: { likes: 1 } } : { $inc: { dislikes: 1 } };
  const comment = await Comment.findByIdAndUpdate(params.id, update, { new: true }).lean();
  if (!comment) {
    return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
  }
  return NextResponse.json({ comment });
}

