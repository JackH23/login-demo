import { NextResponse } from 'next/server';
import dbConnect from '@/backend/mongodb';
import Comment from '@/backend/models/Comment';

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { author, text } = await req.json();
  await dbConnect();
  const comment = await Comment.findByIdAndUpdate(
    id,
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
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { action, username } = await req.json();
  if (!['like', 'dislike'].includes(action) || !username) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
  await dbConnect();
  type LeanComment = {
    _id: string;
    likes: number;
    dislikes: number;
    likedBy?: string[];
    dislikedBy?: string[];
  };
  const existing = await Comment.findById(id).lean<LeanComment | null>();
  if (!existing) {
    return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
  }

  const alreadyLiked = existing.likedBy?.includes(username);
  const alreadyDisliked = existing.dislikedBy?.includes(username);

  if (alreadyLiked || alreadyDisliked) {
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

  const comment = await Comment.findByIdAndUpdate(id, update, {
    new: true,
  }).lean<LeanComment | null>();

  return NextResponse.json({
    comment: {
      _id: comment!._id,
      likes: comment!.likes,
      dislikes: comment!.dislikes,
    },
  });
}

