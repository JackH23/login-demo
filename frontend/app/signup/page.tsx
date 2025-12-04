"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";

export default function SignupPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { signup } = useAuth();
  const router = useRouter();

  const handleSignup = async () => {
    if (!username.trim() || !email.trim() || !password) {
      setError("Username, email, and password are required.");
      return;
    }

    setSubmitting(true);

    setError("");

    try {
      const result = await signup(
        username.trim(),
        email.trim(),
        password,
        image
      );
      if (result.success) {
        router.push("/signin");
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Sign Up"
      footer={
        <p className="small text-body-secondary mb-0">
          Already have an account? <a href="/signin">Sign in</a>
        </p>
      }
    >
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
        <label className="form-label">Email</label>
        <input
          type="email"
          className="form-control"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter email address"
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

      <div className="mb-4">
        <label className="form-label">Upload Image</label>
        <input
          type="file"
          className="form-control"
          accept="image/*"
          onChange={(e) => setImage(e.target.files?.[0] || null)}
        />
      </div>

      <button
        className="btn btn-primary w-100"
        onClick={handleSignup}
        disabled={submitting}
      >
        {submitting ? (
          <>
            <span className="visually-hidden">Signing Up...</span>
            <span aria-hidden="true" className="d-inline-flex align-items-center gap-1">
              <span>Signing Up</span>
              <span className="animated-ellipsis">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </span>
            </span>
          </>
        ) : (
          "Create Account"
        )}
      </button>
    </AuthLayout>
  );
}
