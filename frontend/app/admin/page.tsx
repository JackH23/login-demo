"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateIsMobile = () => {
      if (typeof window === "undefined") return;
      setIsMobile(window.innerWidth < 768);
    };

    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);

    return () => window.removeEventListener("resize", updateIsMobile);
  }, []);

  const [showAllMobileUsers, setShowAllMobileUsers] = useState(false);

  const isNight = theme === "night";
  const cardThemeClass = isNight ? "bg-dark border-secondary text-light" : "";
  const mutedTextClass = isNight ? "text-secondary" : "text-muted";
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const metricCardStyle = {
    background: "#1e2530",
    borderRadius: "12px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
  } as const;

  const metricBodyStyle = {
    padding: "12px 16px",
  } as const;

  const metricLabelStyle = {
    marginBottom: "4px",
    fontSize: "0.8rem",
    opacity: 0.7,
  } as const;

  const metricValueStyle = {
    fontSize: "1.5rem",
    fontWeight: 600,
  } as const;

  const getPostCount = useCallback(
    (username: string) =>
      posts.filter((p) => p.author === username).length,
    [posts]
  );

  const visibleUsers = useMemo(() => {
    if (!users.length) return [];

    if (isMobile && !showAllMobileUsers) {
      return users.slice(-1);
    }

    return users;
  }, [isMobile, showAllMobileUsers, users]);

  const { topContributors, onlineCount } = useMemo(() => {
    const sortedUsers = [...users].sort(
      (a, b) => getPostCount(b.username) - getPostCount(a.username)
    );

    return {
      topContributors: sortedUsers.slice(0, 3),
      onlineCount: users.filter((u) => u.online).length,
    };
  }, [users, getPostCount]);

  const topContributor = topContributors[0];

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
        <div className="d-md-none mb-4">
          <div
            className={`rounded-4 overflow-hidden shadow-sm ${cardThemeClass}`}
            style={{
              border: isNight ? "1px solid #2e3642" : "1px solid #e5e7eb",
            }}
          >
            <div
              className="d-flex justify-content-between align-items-center px-3 py-3 border-bottom"
              style={{ borderColor: isNight ? "#2e3642" : "#e5e7eb" }}
            >
              <span className="fw-semibold">Total Users</span>
              <span className="fw-bold">{users.length}</span>
            </div>
            <div
              className="d-flex justify-content-between align-items-center px-3 py-3 border-bottom"
              style={{ borderColor: isNight ? "#2e3642" : "#e5e7eb" }}
            >
              <span className="fw-semibold">Total Posts</span>
              <span className="fw-bold">{posts.length}</span>
            </div>
            <div
              className="d-flex justify-content-between align-items-center px-3 py-3 border-bottom"
              style={{ borderColor: isNight ? "#2e3642" : "#e5e7eb" }}
            >
              <span className="fw-semibold">Active Users</span>
              <div className="d-flex align-items-center gap-2">
                <span className="fw-bold">{onlineCount}</span>
                <span
                  className={`badge ${onlineCount ? "bg-success" : "bg-secondary"}`}
                >
                  {onlineCount ? "Live" : "Offline"}
                </span>
              </div>
            </div>
            <div className="d-flex justify-content-between align-items-center px-3 py-3">
              <span className="fw-semibold">Top Contributor</span>
              <span className="fw-bold">
                {topContributor ? topContributor.username : "None yet"}
              </span>
            </div>
          </div>
        </div>

        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-3 mb-4 d-none d-md-flex">
          <div className="col">
            <div
              className="card h-100 border-0 text-white"
              style={metricCardStyle}
            >
              <div
                className="card-body d-flex flex-column"
                style={metricBodyStyle}
              >
                <p
                  className={`text-uppercase fw-semibold mb-0 ${mutedTextClass}`}
                  style={metricLabelStyle}
                >
                  Total Users
                </p>
                <p className="mb-0" style={metricValueStyle}>
                  {users.length}
                </p>
              </div>
            </div>
          </div>

          <div className="col">
            <div
              className="card h-100 border-0 text-white"
              style={metricCardStyle}
            >
              <div
                className="card-body d-flex flex-column"
                style={metricBodyStyle}
              >
                <p
                  className={`text-uppercase fw-semibold mb-0 ${mutedTextClass}`}
                  style={metricLabelStyle}
                >
                  Total Posts
                </p>
                <p className="mb-0" style={metricValueStyle}>
                  {posts.length}
                </p>
              </div>
            </div>
          </div>

          <div className="col">
            <div
              className="card h-100 border-0 text-white"
              style={metricCardStyle}
            >
              <div
                className="card-body d-flex flex-column"
                style={metricBodyStyle}
              >
                <p
                  className={`text-uppercase fw-semibold mb-0 ${mutedTextClass}`}
                  style={metricLabelStyle}
                >
                  Active Users
                </p>
                <div className="d-flex align-items-center gap-2">
                  <p className="mb-0" style={metricValueStyle}>
                    {onlineCount}
                  </p>
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
            <div
              className="card h-100 border-0 text-white"
              style={metricCardStyle}
            >
              <div
                className="card-body d-flex flex-column"
                style={metricBodyStyle}
              >
                <p
                  className={`text-uppercase fw-semibold mb-0 ${mutedTextClass}`}
                  style={metricLabelStyle}
                >
                  Top Contributor Posts
                </p>
                <p className="mb-0" style={metricValueStyle}>
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
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <p className={`mb-0 small ${mutedTextClass}`}>
                    {isMobile && !showAllMobileUsers && users.length > 1
                      ? "Showing the latest member on mobile"
                      : "Browse your members"}
                  </p>
                  {users.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm d-md-none"
                      onClick={() => setShowAllMobileUsers((prev) => !prev)}
                    >
                      {showAllMobileUsers ? "Show latest" : "Show all"}
                    </button>
                  )}
                </div>

                {users.length === 0 ? (
                  <p className={`${mutedTextClass} text-center py-4`}>
                    Invite teammates to see them listed here.
                  </p>
                ) : (
                  <div className="row g-3">
                    {visibleUsers.map((u) => {
                      const postCount = getPostCount(u.username);
                      const isOnline = Boolean(u.online);

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
                            <div className="card-body d-flex gap-3 align-items-center p-3">
                              <img
                                src={u.image}
                                alt={`${u.username} profile picture`}
                                className="rounded-circle"
                                width={56}
                                width={52}
                                height={52}
                              />
                              <div className="flex-grow-1 d-flex flex-column gap-1">
                                <div className="d-flex align-items-start justify-content-between gap-2">
                                  <div className="d-flex flex-column gap-1">
                                    <h3 className="h6 mb-0">{u.username}</h3>
                                    <div
                                      className={`d-flex align-items-center gap-2 small ${mutedTextClass}`}
                                    >
                                      <span
                                        className="rounded-circle"
                                        style={{
                                          width: 10,
                                          height: 10,
                                          backgroundColor: isOnline
                                            ? "#22c55e"
                                            : isNight
                                              ? "#6b7280"
                                              : "#9ca3af",
                                          display: "inline-block",
                                        }}
                                        aria-hidden="true"
                                      />
                                      <span className="fw-semibold">
                                        {isOnline ? "Online" : "Offline"}
                                      </span>
                                    </div>
                                  </div>
                                  <span
                                    className="badge bg-primary-subtle text-primary fw-semibold py-1 px-2 small d-none d-md-inline-flex"
                                  >
                                    {postCount} {postCount === 1 ? "post" : "posts"}
                                  </span>
                                  </div>
                                <div
                                  className={`d-flex align-items-center gap-2 small ${mutedTextClass}`}
                                >
                                  <span>{isOnline ? "Active" : "Idle"}</span>
                                  <span aria-hidden="true">•</span>
                                  <span>
                                    {postCount} {postCount === 1 ? "post" : "posts"}
                                  </span>
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