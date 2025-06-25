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
  const { action, username } = await req.json();
  if (!['like', 'dislike'].includes(action) || !username) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
  await dbConnect();
  const existing = await Comment.findById(params.id).lean();
  if (!existing) {
    return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
  }

  const alreadyLiked = existing.likedBy?.includes(username);
  const alreadyDisliked = existing.dislikedBy?.includes(username);

  if ((action === 'like' && alreadyLiked) || (action === 'dislike' && alreadyDisliked)) {
    return NextResponse.json({
      comment: {
        _id: existing._id,
        likes: existing.likes,
        dislikes: existing.dislikes,
      },
    });
  }

  const update =
    action === 'like'
      ? { $addToSet: { likedBy: username }, $inc: { likes: 1 } }
      : { $addToSet: { dislikedBy: username }, $inc: { dislikes: 1 } };

  const comment = await Comment.findByIdAndUpdate(params.id, update, { new: true }).lean();

  return NextResponse.json({
    comment: {
      _id: comment!._id,
      likes: comment!.likes,
      dislikes: comment!.dislikes,
    },
  });
}

