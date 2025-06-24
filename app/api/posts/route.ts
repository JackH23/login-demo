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

export async function GET() {
  await dbConnect();
  const posts = await Post.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json({ posts });
}
