import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';

export async function PATCH(
  req: Request,
  context: { params: { id: string } }
) {
  const { id } = await context.params;
  const { action, username } = await req.json();
  if (!['like', 'dislike'].includes(action) || !username) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  await dbConnect();

  const existing = await Post.findById(id).lean();
  if (!existing) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  const alreadyLiked = existing.likedBy?.includes(username);
  const alreadyDisliked = existing.dislikedBy?.includes(username);

  if ((action === 'like' && alreadyLiked) || (action === 'dislike' && alreadyDisliked)) {
    return NextResponse.json({
      post: {
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

  const post = await Post.findByIdAndUpdate(id, update, { new: true }).lean();

  return NextResponse.json({
    post: {
      _id: post!._id,
      likes: post!.likes,
      dislikes: post!.dislikes,
    },
  });
}

export async function DELETE(
  req: Request,
  context: { params: { id: string } }
) {
  const { id } = await context.params;
  await dbConnect();
  const post = await Post.findByIdAndDelete(id);
  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
