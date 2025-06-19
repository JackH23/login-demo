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
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
      <div className="card shadow w-100" style={{ maxWidth: "28rem" }}>
        <div className="card-body text-center">
          <h2 className="card-title h4 mb-2">Welcome, {user.username} 👋</h2>
          <p className="text-muted mb-4">
            You are now logged in to the system.
          </p>
          {users.length > 0 && (
            <ul className="list-group mb-4 text-start">
              {users.map((name) => (
                <li key={name} className="list-group-item py-1">
                  {name}
                </li>
              ))}
            </ul>
          )}
          <a href="/logout" className="btn btn-danger">
            Log Out
          </a>
        </div>
      </div>
    </div>
  );
}
