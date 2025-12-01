// Next.js helper for creating API route responses
import { NextResponse } from 'next/server';
// Utility to connect to MongoDB
import dbConnect from '@/backend/mongodb';
// Mongoose User model used to query the database
import User from '@/backend/models/User';
// Library used to compare hashed passwords
import bcrypt from 'bcrypt';

// Handle POST /api/auth/signin to verify a user's credentials
export async function POST(req: Request) {
  // Extract the submitted email and password from the request body
  const { email, password } = await req.json();

  // Ensure database connection is established
  await dbConnect();

  // Look up the user by email
  const user = await User.findOne({ email });

  if (user && (await bcrypt.compare(password, user.password))) {
    // Credentials are valid; respond with the username
    return NextResponse.json({ success: true, username: user.username });
  }

  // Authentication failed
  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
}
