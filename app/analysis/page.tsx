"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function AnalysisPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [loading, user, router]);

  if (loading || !user) return <div className="text-center mt-5">Loading...</div>;

  return (
    <div className="container-fluid min-vh-100 bg-light p-4">
      {/* Top bar */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Analysis</h2>
        <div className="d-flex align-items-center gap-3">
          <span className="fw-semibold">{user.username}</span>
          <a href="/logout" className="btn btn-sm btn-outline-danger">
            Log Out
          </a>
        </div>
      </div>

      {/* Menu bar */}
      <div className="mb-4">
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

      {/* Content */}
      <div className="card shadow-sm w-100 mx-auto" style={{ maxWidth: "100%" }}>
        <div className="card-body">
          <p className="text-muted text-center">Analysis page coming soon.</p>
        </div>
      </div>
    </div>
  );
}
