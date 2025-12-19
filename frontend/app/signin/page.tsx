"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";
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
  const router = useRouter();

  const warmHomeData = useCallback(() => {
    const warmUsers = prefetchCachedApi<PrefetchUser[]>("/api/users", {
      fallback: [],
      transform: normalizeUsersResponse,
    });
    const warmPosts = prefetchCachedApi<PrefetchPost[]>("/api/posts", {
      fallback: [],
      transform: (payload) =>
        (payload as { posts?: PrefetchPost[] | null })?.posts ?? [],
    });

    return Promise.all([warmUsers, warmPosts]);
  }, []);

  const homeWarmupRef = useRef<Promise<[PrefetchUser[], PrefetchPost[]]> | null>(
    null
  );

  const ensureHomeWarmup = useCallback(() => {
    if (!homeWarmupRef.current) {
      homeWarmupRef.current = warmHomeData().catch((error) => {
        homeWarmupRef.current = null;
        throw error;
      });
    }
    return homeWarmupRef.current;
  }, [warmHomeData]);

  useEffect(() => {
    void router.prefetch("/home");
  const warmup = ensureHomeWarmup();
    void warmup.catch((prefetchError) => {
      console.error("Failed to prefetch home data", prefetchError);
    });
  }, [ensureHomeWarmup, router]);

  const handleSignin = async () => {
    setError("");
    setSubmitting(true);
    try {
      const result = await signin(email, password);
      if (result.success) {
        const warmup = ensureHomeWarmup();
        router.replace("/home");
        void warmup.catch((prefetchError) => {
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
    <AuthLayout
      title="Sign In"
      footer={
        <p className="small text-body-secondary mb-0">
          No account? <a href="/signup">Sign up</a>
        </p>
      }
    >
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
            <span aria-hidden="true" className="d-inline-flex align-items-center justify-content-center gap-2">
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
              <span className="d-inline-flex align-items-center gap-1">
                <span>Signing In</span>
                <span className="animated-ellipsis">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </span>
              </span>
            </span>
          </>
        ) : (
          "Log In"
        )}
      </button>
    </AuthLayout>
  );
}
