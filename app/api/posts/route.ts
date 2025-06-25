import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';

export async function POST(req: Request) {
  const { title, content, image, author } = await req.json();
  await dbConnect();
  try {
    const post = await Post.create({ title, content, image, author });
    return NextResponse.json({ post });
  } catch {
    return NextResponse.json({ error: 'Failed to create post' }, { status: 400 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const author = searchParams.get('author');

  await dbConnect();

  const query = author ? { author } : {};
  const posts = await Post.find(query).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ posts });
}
