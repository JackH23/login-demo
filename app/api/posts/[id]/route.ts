import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';

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
  const post = await Post.findByIdAndUpdate(params.id, update, { new: true }).lean();
  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }
  // Only return the updated like/dislike counts along with the post ID
  return NextResponse.json({
    post: {
      _id: post._id,
      likes: post.likes,
      dislikes: post.dislikes,
    },
  });
}
