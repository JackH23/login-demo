// Next.js helper for sending responses
import { NextResponse } from 'next/server';
// Database connection utility
import dbConnect from '@/lib/mongodb';
// Mongoose model for persisting users
import User from '@/models/User';

// Handle POST /api/auth/signup to create a new user account
export async function POST(req: Request) {
  // Get all provided fields from the request body
  const { username, password, position, age, image } = await req.json();

  // Connect to the database before creating the user
  await dbConnect();

  try {
    // Insert the new user document with additional details
    await User.create({ username, password, position, age, image });
    return NextResponse.json({ success: true });
  } catch {
    // Likely a duplicate username or validation error
    return NextResponse.json({ error: 'User creation failed' }, { status: 400 });
  }
}
