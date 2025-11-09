import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';
import Comment from '@/models/Comment';
import { emitPostDeleted } from '@/lib/socketServer';

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { action, username } = await req.json();
  if (!['like', 'dislike'].includes(action) || !username) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  await dbConnect();

  type LeanPost = {
    _id: string;
    likes: number;
    dislikes: number;
    likedBy?: string[];
    dislikedBy?: string[];
  };
  const existing = await Post.findById(id).lean<LeanPost | null>();
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

  const post = await Post.findByIdAndUpdate(id, update, { new: true }).lean<
    LeanPost | null
  >();

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
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await dbConnect();
  const post = await Post.findById(id);
  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }
  await Comment.deleteMany({ postId: post._id });
  await post.deleteOne();
  emitPostDeleted(id);
  return NextResponse.json({ success: true });
}