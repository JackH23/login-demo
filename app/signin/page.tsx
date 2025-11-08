"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function SigninPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { signin } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  const handleSignin = async () => {
    const ok = await signin(username, password);
    if (ok) {
      router.push("/home");
    } else {
      setError("Invalid email or password.");
    }
  };

  return (
    <div
      className={`d-flex align-items-center justify-content-center min-vh-100 ${
        theme === "night" ? "bg-dark text-white" : "bg-light"
      }`}
    >
      <div className="card shadow" style={{ maxWidth: "28rem", width: "100%" }}>
        <div className="card-body">
          <h2 className="card-title h3 text-center mb-4">Sign In</h2>

          {error && (
            <div className="alert alert-danger text-center py-2" role="alert">
              {error}
            </div>
          )}

          <div className="mb-3">
            <label className="form-label">Email</label>
            <input
              type="text"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter email"
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

          <button className="btn btn-primary w-100" onClick={handleSignin}>
            Log In
          </button>

          <p className="text-center mt-3 mb-0">
            No account?{' '}
            <a href="/signup">Sign up</a>
          </p>
        </div>
      </div>
    </div>
  );
}
