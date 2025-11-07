import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';
import { emitPostCreated } from '@/lib/socketServer';

export async function POST(req: Request) {
  const { title, content, image, author } = await req.json();
  await dbConnect();
  try {
    const post = await Post.create({ title, content, image, author });
    const plainPost = post.toObject({ versionKey: false });

    if (plainPost._id) {
      plainPost._id = plainPost._id.toString();
    }

    if (plainPost.createdAt instanceof Date) {
      plainPost.createdAt = plainPost.createdAt.toISOString();
    }

    if (plainPost.updatedAt instanceof Date) {
      plainPost.updatedAt = plainPost.updatedAt.toISOString();
    }

    emitPostCreated(plainPost);

    return NextResponse.json({ post: plainPost });
  } catch {
    return NextResponse.json({ error: 'Failed to create post' }, { status: 400 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const author = searchParams.get('author');
  const limitParam = searchParams.get('limit');
  const skipParam = searchParams.get('skip');

  await dbConnect();

  const query = author ? { author } : {};
  let finder = Post.find(query)
    .select(
      'title content image author likes dislikes likedBy dislikedBy createdAt updatedAt'
    )
    .sort({ createdAt: -1 });

  const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
  if (typeof limit === 'number' && Number.isFinite(limit) && limit > 0) {
    finder = finder.limit(Math.min(limit, 100));
  }

  const skip = skipParam ? Number.parseInt(skipParam, 10) : undefined;
  if (typeof skip === 'number' && Number.isFinite(skip) && skip > 0) {
    finder = finder.skip(skip);
  }

  const posts = await finder.lean();
  return NextResponse.json({ posts });
}
