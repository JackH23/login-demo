// Next.js helper for creating API route responses
import { NextResponse } from 'next/server';
// Utility to connect to MongoDB
import dbConnect from '@/lib/mongodb';
// Mongoose User model used to query the database
import User from '@/models/User';

// Handle POST /api/auth/signin to verify a user's credentials
export async function POST(req: Request) {
  // Extract the submitted username and password from the request body
  const { username, password } = await req.json();

  // Ensure database connection is established
  await dbConnect();

  // Look for a user document matching the credentials
  const user = await User.findOne({ username, password });

  if (user) {
    // Credentials are valid; respond with the username
    return NextResponse.json({ success: true, username: user.username });
  }

  // Authentication failed
  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
}
