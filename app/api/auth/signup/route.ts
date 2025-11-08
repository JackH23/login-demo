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
  const { email, password, age, image } = await req.json();

  if (typeof email !== 'string' || !email.trim()) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  if (typeof password !== 'string' || !password) {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 });
  }

  // Connect to the database before creating the user
  await dbConnect();

  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
  }

  try {
    // Hash the provided password before saving
    const hashed = await bcrypt.hash(password, 10);

    const userDoc: Record<string, unknown> = {
      username: normalizedEmail,
      email: normalizedEmail,
      password: hashed,
    };

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
