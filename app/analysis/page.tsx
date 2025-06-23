"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

interface User {
  username: string;
  position: string;
  age: number;
  image: string;
}

export default function AnalysisPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;

    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => setUsers(data.users ?? []))
      .catch(() => setUsers([]))
      .finally(() => setIsFetching(false));
  }, [user]);

  if (loading || isFetching || !user) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  const currentUserData = users.find((u) => u.username === user.username);
  if (!currentUserData) {
    return <div className="text-center mt-5">Loading user data...</div>;
  }

  return (
    <div className="container-fluid min-vh-100 bg-light p-4">
      {/* Sticky Top Bar and Menu */}
      <div
        className="position-sticky top-0 z-3 bg-white"
        style={{ borderBottom: "1px solid #dee2e6" }}
      >
        {/* Top Bar */}
        <div className="d-flex justify-content-between align-items-center px-4 pt-3 pb-2">
          <h2 className="mb-0">Analysis</h2>
          <div className="d-flex align-items-center gap-3">
            {currentUserData.image && (
              <img
                src={currentUserData.image}
                alt="Your Profile"
                className="rounded-circle"
                style={{ width: "40px", height: "40px", objectFit: "cover" }}
              />
            )}
            <span className="fw-semibold">{currentUserData.username}</span>
            <a href="/logout" className="btn btn-sm btn-outline-danger">
              Log Out
            </a>
          </div>
        </div>

        {/* Menu Bar */}
        <div className="px-4 pb-3">
          <ul className="nav nav-pills gap-2">
            <li className="nav-item">
              <a className="nav-link" href="/home">Home</a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="/posts">All Post</a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="/user">User</a>
            </li>
            <li className="nav-item">
              <a className="nav-link active" href="/analysis">Analysis</a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="/setting">Setting</a>
            </li>
          </ul>
        </div>
      </div>

      {/* Content */}
      <div className="card shadow-sm w-100 mx-auto" style={{ maxWidth: "100%", top: "10px" }}>
        <div className="card-body">
          <h5 className="text-muted text-center">Analysis page coming soon.</h5>
        </div>
      </div>
    </div>
  );
}