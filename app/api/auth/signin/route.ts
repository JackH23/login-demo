// Next.js helper for creating API route responses
import { NextResponse } from 'next/server';
// Utility to connect to MongoDB
import dbConnect from '@/lib/mongodb';
// Mongoose User model used to query the database
import User from '@/models/User';
// Library used to compare hashed passwords
import bcrypt from 'bcrypt';

// Handle POST /api/auth/signin to verify a user's credentials
export async function POST(req: Request) {
  // Extract the submitted email and password from the request body
  const { email, password } = await req.json();

  if (typeof email !== 'string' || !email.trim()) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  if (typeof password !== 'string' || !password.trim()) {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPassword = password.trim();

  // Ensure database connection is established
  await dbConnect();

  // Look up the user by email
  const user = await User.findOne({ email: normalizedEmail }).select(
    'username email password'
  );

  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const isPasswordMatch = await bcrypt.compare(normalizedPassword, user.password);

  if (!isPasswordMatch) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // Credentials are valid; respond with the username and normalized email
  return NextResponse.json({
    success: true,
    username: user.username,
    email: user.email,
  });
}
