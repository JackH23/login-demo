"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import TopBar from "../components/TopBar";
import LoadingState from "../components/LoadingState";
import { ADMIN_USERNAME } from "@/lib/constants";
import { useCachedApi } from "../hooks/useCachedApi";
import { normalizeUsersResponse } from "@/app/lib/users";

interface User {
  username: string;
  image?: string;
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
    transform: normalizeUsersResponse,
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

  const currentUserData =
    users.find((u) => u.username === user?.username) ?? null;

  const isNight = theme === "night";
  const cardThemeClass = isNight ? "bg-dark border-secondary text-light" : "";
  const mutedTextClass = isNight ? "text-secondary" : "text-muted";
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const getPostCount = useCallback(
    (username: string) =>
      posts.filter((p) => p.author === username).length,
    [posts]
  );

  const { topContributors, onlineCount } = useMemo(() => {
    const sortedUsers = [...users].sort(
      (a, b) => getPostCount(b.username) - getPostCount(a.username)
    );

    return {
      topContributors: sortedUsers.slice(0, 3),
      onlineCount: users.filter((u) => u.online).length,
    };
  }, [users, getPostCount]);

  const recentPosts = useMemo(() => posts.slice(0, 6), [posts]);

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

  return (
    <div
      className={`container-fluid min-vh-100 p-4 ${
        isNight ? "bg-dark text-white" : "bg-light"
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

      <div className="container mt-4" style={{ maxWidth: "1100px" }}>
        <div className="d-flex flex-column flex-md-row justify-content-between gap-3 align-items-md-center mb-4">
          <div>
            <p className={`mb-1 text-uppercase fw-semibold small ${mutedTextClass}`}>
              {greeting}, {user.username}
            </p>
            <h1 className="h3 mb-1">📋 Admin Dashboard</h1>
            <p className={`mb-0 ${mutedTextClass} d-none d-md-block`}>
              Track user activity, highlight top contributors, and review
              recent posts in one place.
            </p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-3 mb-4">
          <div className="col">
            <div className={`card shadow-sm border-0 h-100 ${cardThemeClass}`}>
              <div className="card-body d-flex flex-column gap-2">
                <p
                  className={`text-uppercase fw-semibold small mb-1 ${mutedTextClass}`}
                >
                  Total Users
                </p>
                <p className="fs-2 fw-bold mb-0">{users.length}</p>
              </div>
            </div>
          </div>

          <div className="col">
            <div className={`card shadow-sm border-0 h-100 ${cardThemeClass}`}>
              <div className="card-body d-flex flex-column gap-2">
                <p
                  className={`text-uppercase fw-semibold small mb-1 ${mutedTextClass}`}
                >
                  Total Posts
                </p>
                <p className="fs-2 fw-bold mb-0">{posts.length}</p>
              </div>
            </div>
          </div>

          <div className="col">
            <div className={`card shadow-sm border-0 h-100 ${cardThemeClass}`}>
              <div className="card-body d-flex flex-column gap-2">
                <p
                  className={`text-uppercase fw-semibold small mb-1 ${mutedTextClass}`}
                >
                  Active Users
                </p>
                <div className="d-flex align-items-center justify-content-between">
                  <p className="fs-2 fw-bold mb-0">{onlineCount}</p>
                  <span
                    className={`badge ${
                      onlineCount ? "bg-success" : "bg-secondary"
                    }`}
                  >
                    {onlineCount ? "Live now" : "No one online"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="col">
            <div className={`card shadow-sm border-0 h-100 ${cardThemeClass}`}>
              <div className="card-body d-flex flex-column gap-2">
                <p
                  className={`text-uppercase fw-semibold small mb-1 ${mutedTextClass}`}
                >
                  Top Contributor Posts
                </p>
                <p className="fs-2 fw-bold mb-0">
                  {topContributors.reduce(
                    (total, contributor) =>
                      total + getPostCount(contributor.username),
                    0
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main content row */}
        <div className="row g-4 align-items-start">
          {/* User Directory */}
          <div className="col-lg-7">
            <div className={`card shadow-sm h-100 border-0 ${cardThemeClass}`}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h2 className="h5 mb-0">User Directory</h2>
                  <span className={`badge bg-primary`}>
                    {users.length} members
                  </span>
                </div>

                {users.length === 0 ? (
                  <p className={`${mutedTextClass} text-center py-4`}>
                    Invite teammates to see them listed here.
                  </p>
                ) : (
                  <div className="row g-3">
                    {users.map((u) => {
                      const postCount = getPostCount(u.username);

                      return (
                        <div key={u.username} className="col-12 col-md-6">
                          <div
                            className={`card border-0 shadow-sm h-100 ${cardThemeClass}`}
                            role="button"
                            tabIndex={0}
                            onClick={() =>
                              router.push(
                                `/admin/users/${encodeURIComponent(u.username)}`
                              )
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                router.push(
                                  `/admin/users/${encodeURIComponent(u.username)}`
                                );
                              }
                            }}
                          >
                            <div className="card-body d-flex gap-3 align-items-center flex-wrap">
                              <img
                                src={u.image}
                                alt={`${u.username} profile picture`}
                                className="rounded-circle"
                                width={56}
                                height={56}
                                style={{ objectFit: "cover" }}
                              />
                              <div className="flex-grow-1">
                                <div className="d-flex align-items-center justify-content-between gap-2">
                                  <h3 className="h6 mb-0">{u.username}</h3>
                                  {u.online ? (
                                    <span className="badge bg-success">
                                      Online
                                    </span>
                                  ) : (
                                    <span
                                      className={`badge ${
                                        isNight
                                          ? "bg-secondary"
                                          : "bg-light text-dark"
                                      }`}
                                    >
                                      Offline
                                    </span>
                                  )}
                                </div>
                                <div className={`d-flex align-items-center gap-2 small ${mutedTextClass}`}>
                                  <span
                                    className={`badge rounded-pill ${
                                      u.online ? "bg-success-subtle text-success" : "bg-secondary-subtle text-secondary"
                                    }`}
                                  >
                                    {u.online ? "Active" : "Idle"}
                                  </span>
                                  <span aria-hidden="true">•</span>
                                  <span>{postCount} {postCount === 1 ? "post" : "posts"}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-lg-5 d-flex flex-column gap-4">
            {/* Recent Posts */}
            <div className={`card shadow-sm border-0 ${cardThemeClass}`}>
              <div className="card-body d-flex flex-column gap-3">
                <div className="d-flex justify-content-between align-items-center">
                  <h2 className="h5 mb-0">Recent Posts</h2>
                  <span
                    className={`badge ${
                      posts.length ? "bg-info" : "bg-secondary"
                    }`}
                  >
                    {posts.length
                      ? `${posts.length} total`
                      : "Awaiting posts"}
                  </span>
                </div>

                {recentPosts.length === 0 ? (
                  <p className={`${mutedTextClass} text-center py-3 mb-0`}>
                    Posts will appear here as soon as your community starts
                    sharing.
                  </p>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {recentPosts.map((post) => (
                      <div
                        key={post._id}
                        className={`card border-0 shadow-sm ${cardThemeClass}`}
                      >
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                            <div>
                              <h3 className="h6 mb-1">{post.title}</h3>
                              <p className={`mb-0 small ${mutedTextClass}`}>
                                by {" "}
                                <span className="fw-semibold">{post.author}</span>
                              </p>
                            </div>
                            <span className="badge bg-primary-subtle text-primary fw-semibold align-self-center">
                              View post
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Top Contributors */}
            <div className={`card shadow-sm border-0 ${cardThemeClass}`}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h2 className="h5 mb-0">Top Contributors</h2>
                  <span className={`badge bg-primary-subtle text-primary fw-semibold`}>
                    Leaderboard
                  </span>
                </div>

                {topContributors.length === 0 ? (
                  <p className={`${mutedTextClass} text-center mb-0`}>
                    Contributors will appear here once posts are published.
                  </p>
                ) : (
                  <ol className="list-unstyled mb-0 d-flex flex-column gap-2">
                    {topContributors.map((contributor, index) => {
                      const count = getPostCount(contributor.username);
                      return (
                        <li
                          key={contributor.username}
                          className="d-flex justify-content-between align-items-center rounded-3 px-3 py-2"
                          style={{
                            backgroundColor: isNight
                              ? "rgba(255, 255, 255, 0.04)"
                              : "rgba(15, 23, 42, 0.03)",
                          }}
                        >
                          <div className="d-flex align-items-center gap-3">
                            <span className="badge bg-dark-subtle text-dark fw-semibold">
                              {index + 1}
                            </span>
                            <span className="fw-semibold">{contributor.username}</span>
                          </div>
                          <span className="badge bg-primary-subtle text-primary fw-semibold">
                            {count} {count === 1 ? "post" : "posts"}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}