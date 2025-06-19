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
    <div className="container d-flex flex-column align-items-center justify-content-center vh-100">
      <div className="card text-center p-4 shadow-sm" style={{ maxWidth: "400px", width: "100%" }}>
        <h2 className="card-title mb-3">Welcome, {user.username} 👋</h2>
        <p className="card-text">You are now logged in to the system.</p>
        {users.length > 0 && (
          <ul className="list-group mb-3">
            {users.map((name) => (
              <li key={name} className="list-group-item">
                {name}
              </li>
            ))}
          </ul>
        )}
        <a href="/logout" className="btn btn-danger mt-3">
          Log Out
        </a>
      </div>
    </div>
  );
}
