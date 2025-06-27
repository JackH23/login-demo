// Next.js helper for sending responses
import { NextResponse } from 'next/server';
// Database connection utility
import dbConnect from '@/lib/mongodb';
// Mongoose model for persisting users
import User from '@/models/User';
// Library for hashing passwords
import bcrypt from 'bcrypt';

// Handle POST /api/auth/signup to create a new user account
export async function POST(req: Request) {
  // Get all provided fields from the request body
  const { username, password, position, age, image } = await req.json();

  // Connect to the database before creating the user
  await dbConnect();

  try {
    // Hash the provided password before saving
    const hashed = await bcrypt.hash(password, 10);
    // Insert the new user document with additional details
    await User.create({ username, password: hashed, position, age, image });
    return NextResponse.json({ success: true });
  } catch {
    // Likely a duplicate username or validation error
    return NextResponse.json({ error: 'User creation failed' }, { status: 400 });
  }
}
