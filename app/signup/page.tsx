"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function SignupPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { signup } = useAuth();
  const router = useRouter();

  const handleSignup = async () => {
    if (username && password) {
      const ok = await signup(username, password);
      if (ok) {
        router.push("/signin");
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-100 to-blue-200 py-12 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">
        <h2 className="mb-8 text-center text-3xl font-bold text-gray-800">
          Sign Up
        </h2>

        <div className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>

          <button
            className="w-full rounded-md bg-green-600 py-2 text-white transition-colors hover:bg-green-700"
            onClick={handleSignup}
          >
            Create Account
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <a href="/signin" className="font-medium text-green-600 hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}