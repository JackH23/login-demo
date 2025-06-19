"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      router.push("/signin");
    } else {
      fetch("/api/users")
        .then((res) => res.json())
        .then((data) => setUsers(data.users ?? []))
        .catch(() => setUsers([]));
    }
  }, [user]);

  if (!user) return <div className="text-center mt-5">Loading...</div>;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow text-center">
        <h2 className="text-2xl font-semibold mb-2">Welcome, {user.username} 👋</h2>
        <p className="text-gray-600 mb-4">You are now logged in to the system.</p>
        {users.length > 0 && (
          <ul className="mb-4 space-y-1 text-left">
            {users.map((name) => (
              <li
                key={name}
                className="border border-gray-200 rounded px-3 py-1 text-sm"
              >
                {name}
              </li>
            ))}
          </ul>
        )}
        <a
          href="/logout"
          className="inline-block bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
        >
          Log Out
        </a>
      </div>
    </div>
  );
}
