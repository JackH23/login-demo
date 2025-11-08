"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { prefetchCachedApi } from "../hooks/useCachedApi";

interface PrefetchUser {
  username: string;
  image: string;
  online?: boolean;
}

interface PrefetchPost {
  _id?: string;
  title: string;
  content: string;
  image: string | null;
  author: string;
  likes: number;
  dislikes: number;
  likedBy?: string[];
  dislikedBy?: string[];
}

export default function SigninPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { signin } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    void router.prefetch("/home");
  }, [router]);

  const handleSignin = async () => {
    setError("");
    setSubmitting(true);
    try {
      const ok = await signin(email, password);
      if (ok) {
        const warmUsers = prefetchCachedApi<PrefetchUser[]>("/api/users", {
          transform: (payload) =>
            (payload as { users?: PrefetchUser[] | null })?.users ?? [],
        });
        const warmPosts = prefetchCachedApi<PrefetchPost[]>("/api/posts", {
          transform: (payload) =>
            (payload as { posts?: PrefetchPost[] | null })?.posts ?? [],
        });
        router.push("/home");
        void Promise.all([warmUsers, warmPosts]).catch((prefetchError) => {
          console.error("Failed to prefetch home data", prefetchError);
        });
      } else {
        setError("Invalid email or password.");
      }
    } catch (err) {
      console.error("Signin failed", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

          <button
            className="btn btn-primary w-100"
            onClick={handleSignin}
            disabled={submitting}
          >
            {submitting ? "Signing In..." : "Log In"}
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
