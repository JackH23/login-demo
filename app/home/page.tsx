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
    <div className="container d-flex align-items-center justify-content-center min-vh-100 bg-light">
      <div className="card shadow-lg w-100" style={{ maxWidth: "30rem" }}>
        <div className="card-body">
          <h2 className="card-title text-center mb-3">
            Welcome, <span className="text-primary">{user.username}</span> 👋
          </h2>
          <p className="text-muted text-center mb-4">
            You are now logged in to the system.
          </p>

          {users.length > 0 && (
            <>
              <h5 className="text-start">Registered Users:</h5>
              <ul className="list-group mb-4">
                {users.map((name) => (
                  <li
                    key={name}
                    className="list-group-item list-group-item-light"
                  >
                    {name}
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="d-grid">
            <a href="/logout" className="btn btn-danger">
              Log Out
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}