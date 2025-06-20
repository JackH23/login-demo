"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<string[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/signin");
    } else {
      fetch("/api/users")
        .then((res) => res.json())
        .then((data) => setUsers(data.users ?? []))
        .catch(() => setUsers([]));
    }
  }, [user, loading]);

  if (loading || !user)
    return <div className="text-center mt-5">Loading...</div>;

  return (
    <div className="container-fluid min-vh-100 bg-light p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">
          Welcome, <span className="text-primary">{user.username}</span> 👋
        </h2>
        <a href="/logout" className="btn btn-outline-danger">
          Log Out
        </a>
      </div>

      <div className="card shadow-sm w-100 mx-auto" style={{ maxWidth: "100%" }}>
        <div className="card-body">
          <p className="text-muted text-center mb-4">
            You are now logged in to the system.
          </p>

          {users.length > 0 && (
            <>
              <h5 className="text-start">Registered Users:</h5>
              <ul className="list-group mb-3">
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
        </div>
      </div>
    </div>
  );
}
