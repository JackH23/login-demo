"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import TopBar from "../components/TopBar";
import LoadingState from "../components/LoadingState";
import { ADMIN_USERNAME } from "@/lib/constants";
import { useCachedApi } from "../hooks/useCachedApi";

interface User {
  username: string;
  position: string;
  age: number;
  image: string;
  online?: boolean;
}

interface Post {
  _id: string;
  author: string;
  title: string;
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  const shouldFetch = user?.username === ADMIN_USERNAME;

  const {
    data: users,
    loading: loadingUsers,
  } = useCachedApi<User[]>(shouldFetch ? "/api/users" : null, {
    fallback: [],
    transform: (payload) =>
      (payload as { users?: User[] | null })?.users ?? [],
  });

  const { data: posts, loading: loadingPosts } = useCachedApi<Post[]>(
    shouldFetch ? "/api/posts" : null,
    {
      fallback: [],
      transform: (payload) =>
        (payload as { posts?: Post[] | null })?.posts ?? [],
    }
  );

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [loading, user, router]);

  const currentUserData = users.find((u) => u.username === user?.username) ?? null;

  if (loading || loadingUsers || loadingPosts || !user) {
    return (
      <LoadingState
        title="Loading the admin dashboard"
        subtitle="We’re collecting user profiles and post summaries for your review."
        skeletonCount={2}
      />
    );
  }

  if (user.username !== ADMIN_USERNAME) {
    router.push("/home");
    return null;
  }

  const getPostCount = (username: string) =>
    posts.filter((p) => p.author === username).length;

  return (
    <div
      className={`container-fluid min-vh-100 p-4 ${
        theme === "night" ? "bg-dark text-white" : "bg-light"
      }`}
    >
      <TopBar
        title="Admin"
        active="admin"
        currentUser={{
          username: user.username,
          image: currentUserData?.image,
        }}
      />

      <div className="container mt-4" style={{ maxWidth: "900px" }}>
        <h3 className="mb-4 text-center">📋 Admin Dashboard – Users & Posts</h3>

        {users.length === 0 ? (
          <p className="text-muted text-center">No users found.</p>
        ) : (
          <div className="row g-4">
            {users.map((u) => (
              <div key={u.username} className="col-md-6">
                <div className="card shadow-sm">
                  <div className="card-body d-flex align-items-center gap-3">
                    <img
                      src={u.image}
                      alt={u.username}
                      className="rounded-circle"
                      width={60}
                      height={60}
                      style={{ objectFit: "cover" }}
                    />
                    <div>
                      <h5 className="mb-1">{u.username}</h5>
                      <p className="mb-1 text-muted small">
                        Role: {u.position} | Age: {u.age}
                      </p>
                      <span className="badge bg-primary">
                        Posts: {getPostCount(u.username)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}