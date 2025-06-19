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
    <div className="container d-flex align-items-center justify-content-center vh-100">
      <div className="card shadow p-4" style={{ maxWidth: "400px", width: "100%" }}>
        <h2 className="text-center mb-4">Sign Up</h2>

        <div className="mb-3">
          <label className="form-label">Username</label>
          <input
            type="text"
            className="form-control"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Enter username"
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Password</label>
          <input
            type="password"
            className="form-control"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter password"
          />
        </div>

        <button className="btn btn-success w-100" onClick={handleSignup}>
          Create Account
        </button>

        <div className="text-center mt-3">
          <small>
            Already have an account? <a href="/signin">Sign in</a>
          </small>
        </div>
      </div>
    </div>
  );
}