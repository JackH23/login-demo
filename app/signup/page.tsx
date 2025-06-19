"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function SignupPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { signup } = useAuth();
  const router = useRouter();

  const handleSignup = async () => {
    if (!username || !password) return;
    const ok = await signup(username, password);
    if (ok) {
      router.push("/signin");
    } else {
      setError("Account creation failed.");
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
      <div className="card shadow" style={{ maxWidth: "28rem", width: "100%" }}>
        <div className="card-body">
          <h2 className="card-title h3 text-center mb-4">Sign Up</h2>

          {error && (
            <div className="alert alert-danger text-center py-2" role="alert">
              {error}
            </div>
          )}

          <div className="mb-3">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>

          <button className="btn btn-primary w-100" onClick={handleSignup}>
            Create Account
          </button>

          <p className="text-center mt-3 mb-0">
            Already have an account?{' '}
            <a href="/signin">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}