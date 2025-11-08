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
  const { username, email, password, position, age, image } = await req.json();

  if (typeof username !== 'string' || !username.trim()) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  if (typeof email !== 'string' || !email.trim()) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  if (typeof password !== 'string' || !password.trim()) {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 });
  }

  const sanitizedPassword = password.trim();

  // Connect to the database before creating the user
  await dbConnect();

  const existingUser = await User.findOne({ username: username.trim() });
  if (existingUser) {
    return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
  }

  const existingEmail = await User.findOne({ email: email.trim().toLowerCase() });
  if (existingEmail) {
    return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
  }

  try {
    // Hash the provided password before saving
    const hashed = await bcrypt.hash(sanitizedPassword, 10);

    const userDoc: Record<string, unknown> = {
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: hashed,
    };

    if (typeof position === 'string' && position.trim()) {
      userDoc.position = position.trim();
    }

    const parsedAge = Number(age);
    if (!Number.isNaN(parsedAge) && parsedAge > 0) {
      userDoc.age = parsedAge;
    }

    if (typeof image === 'string' && image.trim()) {
      userDoc.image = image;
    }

    // Insert the new user document with additional details
    await User.create(userDoc);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to create user', error);
    return NextResponse.json(
      { error: 'User creation failed. Please try again later.' },
      { status: 500 }
    );
  }
}
