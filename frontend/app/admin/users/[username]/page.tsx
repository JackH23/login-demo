"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import LoadingState from "@/app/components/LoadingState";
import { useAuth } from "@/app/context/AuthContext";
import { useTheme } from "@/app/context/ThemeContext";
import { ADMIN_USERNAME } from "@/lib/constants";
import { useCachedApi } from "@/app/hooks/useCachedApi";
import { normalizeUserResponse } from "@/app/lib/users";

interface UserProfile {
  username: string;
  image?: string | null;
  friends?: string[];
  online?: boolean;
}

interface Post {
  _id: string;
  title: string;
  content: string;
  image?: string | null;
  createdAt?: string;
}

export default function AdminUserProfilePage() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const params = useParams();

  const paramUsername = useMemo(() => {
    const raw = params?.username;
    if (!raw) return null;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && user && user.username !== ADMIN_USERNAME) {
      router.push("/home");
    }
  }, [loading, user, router]);

  const shouldFetch = Boolean(
    user && paramUsername && user.username === ADMIN_USERNAME
  );

  const {
    data: profile,
    loading: loadingProfile,
  } = useCachedApi<UserProfile | null>(
    shouldFetch && paramUsername
      ? `/api/users/${encodeURIComponent(paramUsername)}`
      : null,
    {
      fallback: null,
      transform: normalizeUserResponse,
    }
  );

  const { data: posts, loading: loadingPosts } = useCachedApi<Post[]>(
    shouldFetch && paramUsername
      ? `/api/posts?author=${encodeURIComponent(paramUsername)}`
      : null,
    {
      fallback: [],
      transform: (payload) => (payload as { posts?: Post[] | null })?.posts ?? [],
    }
  );

  const isNight = theme === "night";
  const cardThemeClass = isNight ? "bg-dark border-secondary text-light" : "";
  const mutedTextClass = isNight ? "text-secondary" : "text-muted";

  if (loading || loadingProfile || loadingPosts || !user) {
    return (
      <LoadingState
        title="Loading user profile"
        subtitle="Retrieving profile details and authored posts."
        skeletonCount={2}
      />
    );
  }

  if (!profile) {
    return (
      <LoadingState
        title="User not found"
        subtitle="We couldn’t locate that user profile."
        skeletonCount={1}
      />
    );
  }

  return (
    <div
      className={`container-fluid min-vh-100 p-4 ${
        isNight ? "bg-dark text-white" : "bg-light"
      }`}
    >
      <TopBar
        title="Admin"
        active="admin"
        currentUser={{ username: user.username, image: user.image }}
      />

      <div className="container mt-4" style={{ maxWidth: "1100px" }}>
        <button
          type="button"
          className="btn btn-link px-0 d-inline-flex align-items-center gap-2"
          onClick={() => router.push("/admin")}
        >
          ← Back to dashboard
        </button>

        <div className="d-flex flex-column flex-md-row justify-content-between gap-3 align-items-md-center mb-4 mt-2">
          <div>
            <h1 className="h3 mb-1">{profile.username}</h1>
            <p className={`mb-0 ${mutedTextClass} d-none d-md-block`}>
              Viewing full profile and posts created by this user.
            </p>
          </div>
          <div className="d-none d-md-flex align-items-center gap-2">
            <span
              className={`badge ${
                profile.online ? "bg-success" : "bg-secondary"
              }`}
            >
              {profile.online ? "Online" : "Offline"}
            </span>
            <span className="badge bg-primary-subtle text-primary fw-semibold">
              {profile.friends?.length ?? 0} friends
            </span>
          </div>
        </div>

        <div className="d-md-none mb-3">
          <div className="row g-2">
            <div className="col-12 col-sm-6">
              <div className={`card shadow-sm border-0 h-100 ${cardThemeClass}`}>
                <div className="card-body d-flex justify-content-between align-items-center py-3">
                  <div>
                    <p className={`mb-1 small ${mutedTextClass}`}>Status</p>
                    <span
                      className={`badge ${
                        profile.online ? "bg-success" : "bg-secondary"
                      }`}
                    >
                      {profile.online ? "Online" : "Offline"}
                    </span>
                  </div>
                  <span className={`fw-semibold ${mutedTextClass}`}>
                    {profile.online ? "Live" : "Away"}
                  </span>
                </div>
              </div>
            </div>
            <div className="col-12 col-sm-6">
              <div className={`card shadow-sm border-0 h-100 ${cardThemeClass}`}>
                <div className="card-body d-flex justify-content-between align-items-center py-3">
                  <div>
                    <p className={`mb-1 small ${mutedTextClass} d-none d-md-block`}>Connections</p>
                    <span className="badge bg-primary-subtle text-primary fw-semibold">
                      {profile.friends?.length ?? 0} friends
                    </span>
                  </div>
                  <span className={`fw-semibold ${mutedTextClass}`}>
                    Keep growing
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-lg-4">
            <div className={`card shadow-sm border-0 ${cardThemeClass}`}>
              <div className="card-body text-center">
                <img
                  src={profile.image ?? undefined}
                  alt={`${profile.username} profile picture`}
                  className="rounded-circle mb-3"
                  width={110}
                  height={110}
                  style={{ objectFit: "cover" }}
                />
                <h2 className="h5 mb-1">{profile.username}</h2>
                <p className={`mb-3 ${mutedTextClass}`}>
                  {profile.online ? "Currently active" : "Last seen recently"}
                </p>
                <div className="text-start">
                  <p className="mb-2 fw-semibold">Connections</p>
                  {profile.friends && profile.friends.length > 0 ? (
                    <div className="d-flex flex-wrap gap-2">
                      {profile.friends.map((friend) => (
                        <span
                          key={friend}
                          className="badge bg-light text-dark border"
                        >
                          {friend}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className={mutedTextClass}>No friends added yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-8">
            <div className={`card shadow-sm border-0 ${cardThemeClass}`}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h3 className="h5 mb-0">Posts by {profile.username}</h3>
                  <span className={`badge ${posts.length ? "bg-info" : "bg-secondary"}`}>
                    {posts.length ? `${posts.length} posts` : "No posts yet"}
                  </span>
                </div>

                {posts.length === 0 ? (
                  <p className={`${mutedTextClass} text-center py-4`}>
                    This user hasn’t published any posts yet.
                  </p>
                ) : (
                  <ul className="list-group list-group-flush">
                    {posts.map((post) => (
                      <li
                        key={post._id}
                        className={`list-group-item border-0 px-0 ${
                          isNight ? "bg-dark text-white" : ""
                        }`}
                      >
                        <h4 className="h6 mb-1">{post.title}</h4>
                        <p className={`mb-1 ${mutedTextClass}`}>
                          {post.createdAt
                            ? new Date(post.createdAt).toLocaleString()
                            : "Recently created"}
                        </p>
                        <p className={`mb-0 ${mutedTextClass}`}>
                          {post.content.length > 140
                            ? `${post.content.slice(0, 140)}...`
                            : post.content}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
