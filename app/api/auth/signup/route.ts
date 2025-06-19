// Next.js helper for sending responses
import { NextResponse } from 'next/server';
// Database connection utility
import dbConnect from '@/lib/mongodb';
// Mongoose model for persisting users
import User from '@/models/User';

// Handle POST /api/auth/signup to create a new user account
export async function POST(req: Request) {
  // Get the desired username and password from the request body
  const { username, password } = await req.json();

  // Connect to the database before creating the user
  await dbConnect();

  try {
    // Insert the new user document
    await User.create({ username, password });
    return NextResponse.json({ success: true });
  } catch {
    // Likely a duplicate username or validation error
    return NextResponse.json({ error: 'User creation failed' }, { status: 400 });
  }
}
