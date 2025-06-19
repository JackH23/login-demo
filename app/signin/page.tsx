"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function SigninPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { signin } = useAuth();
  const router = useRouter();

  const handleSignin = async () => {
    const ok = await signin(username, password);
    if (ok) {
      router.push("/home");
    } else {
      setError("Invalid username or password.");
    }
  };

  return (
    <div className="container d-flex align-items-center justify-content-center vh-100">
      <div className="card shadow p-4" style={{ maxWidth: "400px", width: "100%" }}>
        <h2 className="text-center mb-4">Sign In</h2>

        {error && <div className="alert alert-danger">{error}</div>}

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

        <button className="btn btn-primary w-100" onClick={handleSignin}>
          Log In
        </button>

        <div className="text-center mt-3">
          <small>
            No account? <a href="/signup">Sign up</a>
          </small>
        </div>
      </div>
    </div>
  );
}
