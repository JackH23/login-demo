"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { prefetchCachedApi } from "../hooks/useCachedApi";
import { normalizeUsersResponse } from "../lib/users";

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
      const result = await signin(email, password);
      if (result.success) {
        const warmUsers = prefetchCachedApi<PrefetchUser[]>("/api/users", {
          transform: normalizeUsersResponse,
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
        setError(result.message);
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
            {submitting ? (
              <>
                <span className="visually-hidden">Signing In...</span>
                <span
                  aria-hidden="true"
                  className="d-inline-flex align-items-center gap-1"
                >
                  <span>Signing In</span>
                  <span className="animated-ellipsis">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </span>
                </span>
              </>
            ) : (
              "Log In"
            )}
          </button>

          <p className="text-center mt-3 mb-0">
            No account?{' '}
            <a href="/signup">Sign up</a>
          </p>
        </div>
      </div>
      <style jsx>{`
        .animated-ellipsis {
          display: inline-flex;
          justify-content: space-between;
          align-items: flex-end;
          width: 1.5rem;
        }

        .animated-ellipsis .dot {
          display: inline-block;
          width: 0.25rem;
          height: 0.25rem;
          border-radius: 50%;
          background-color: currentColor;
          opacity: 0.35;
          animation: signing-ellipsis 0.9s infinite ease-in-out;
        }

        .animated-ellipsis .dot:nth-child(2) {
          animation-delay: 0.15s;
        }

        .animated-ellipsis .dot:nth-child(3) {
          animation-delay: 0.3s;
        }

        @keyframes signing-ellipsis {
          0%,
          80%,
          100% {
            transform: translateY(0);
            opacity: 0.35;
          }

          40% {
            transform: translateY(-0.25rem);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
