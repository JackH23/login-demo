import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Comment from '@/models/Comment';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const postId = searchParams.get('postId');
  if (!postId) {
    return NextResponse.json({ error: 'Missing postId' }, { status: 400 });
  }

  await dbConnect();
  const comments = await Comment.find({ postId })
    .select(
      'postId author text likes dislikes likedBy dislikedBy replies createdAt updatedAt'
    )
    .sort({ createdAt: 1 })
    .lean();
  return NextResponse.json({ comments });
}

export async function POST(req: Request) {
  const { postId, author, text } = await req.json();
  await dbConnect();
  try {
    const comment = await Comment.create({ postId, author, text });
    return NextResponse.json({ comment });
  } catch {
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 400 });
  }
}

