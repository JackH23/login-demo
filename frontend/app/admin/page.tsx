"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import TopBar from "../components/TopBar";
import LoadingState from "../components/LoadingState";
import BlogCard from "../components/BlogCard";
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
  content: string;
  image?: string | null;
  imageEdits?: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    grayscale?: number;
    rotation?: number;
    hue?: number;
    blur?: number;
    sepia?: number;
  } | null;
  likes: number;
  dislikes: number;
  likedBy?: string[];
  dislikedBy?: string[];
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  const shouldFetch = user?.username === ADMIN_USERNAME;

  const { data: users, loading: loadingUsers } = useCachedApi<User[]>(
    shouldFetch ? "/api/users" : null,
    {
      fallback: [],
      transform: normalizeUsersResponse,
    }
  );

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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  useEffect(() => {
    const updateIsMobile = () => {
      if (typeof window === "undefined") return;
      setIsMobile(window.innerWidth < 768);
    };

    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);

    return () => window.removeEventListener("resize", updateIsMobile);
  }, []);

  const [showAllUsers, setShowAllUsers] = useState(false);

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
    (username: string) => posts.filter((p) => p.author === username).length,
    [posts]
  );

  const sectionBorderColor = isNight ? "#2e3642" : "#e5e7eb";

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;

    const query = searchTerm.trim().toLowerCase();
    return users.filter((u) => u.username.toLowerCase().includes(query));
  }, [searchTerm, users]);

  const visibleUsers = useMemo(() => {
    if (!filteredUsers.length) return [];

    if (searchTerm) {
      return filteredUsers;
    }

    const latestUsers = filteredUsers.slice(-4);

    if (!showAllUsers) {
      return isMobile ? latestUsers.slice(-1) : latestUsers;
    }

    return filteredUsers;
  }, [filteredUsers, isMobile, searchTerm, showAllUsers]);

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
  const handleViewPost = useCallback(
    (postId: string) => {
      const postToView = posts.find((entry) => entry._id === postId) ?? null;
      if (postToView) {
        setSelectedPost(postToView);
        return;
      }

      router.push(`/posts/${encodeURIComponent(postId)}`);
    },
    [posts, router]
  );

  useEffect(() => {
    if (
      selectedPost &&
      !posts.find((entry) => entry._id === selectedPost._id)
    ) {
      setSelectedPost(null);
    }
  }, [posts, selectedPost]);

  const selectedPostAuthor = useMemo(
    () =>
      selectedPost
        ? users.find((candidate) => candidate.username === selectedPost.author)
        : undefined,
    [selectedPost, users]
  );

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
            <p
              className={`mb-1 text-uppercase fw-semibold small ${mutedTextClass}`}
            >
              {greeting}, {user.username}
            </p>
            <h1 className="h3 mb-1">📋 Admin Dashboard</h1>
            <p className={`mb-0 ${mutedTextClass} d-none d-md-block`}>
              Track user activity, highlight top contributors, and review recent
              posts in one place.
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
                  className={`badge ${
                    onlineCount ? "bg-success" : "bg-secondary"
                  }`}
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
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
                  <div className="d-flex flex-column gap-1">
                    <h2 className="h5 mb-0">User Directory</h2>
                    <p
                      className={`mb-0 small ${mutedTextClass} d-none d-md-block`}
                    >
                      Search and manage your community members.
                    </p>
                  </div>
                  <span className={`badge bg-primary align-self-start`}>
                    {users.length} members
                  </span>
                </div>
                <form
                  className="row g-2 align-items-center mb-3"
                  role="search"
                  onSubmit={(event) => event.preventDefault()}
                >
                  <div className="col-12 col-md">
                    <label
                      className="form-label visually-hidden"
                      htmlFor="user-search"
                    >
                      Search users
                    </label>
                    <div className="input-group">
                      <span className={`input-group-text ${cardThemeClass}`}>
                        🔍
                      </span>
                      <input
                        id="user-search"
                        type="search"
                        className="form-control"
                        placeholder="Search users by username"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-auto">
                    <p className={`mb-0 small ${mutedTextClass}`}>
                      {searchTerm
                        ? `Showing ${filteredUsers.length} result${
                            filteredUsers.length === 1 ? "" : "s"
                          }`
                        : isMobile && !showAllUsers && users.length > 1
                        ? "Showing the latest member on mobile"
                        : showAllUsers
                        ? "Showing all members"
                        : "Showing the latest members"}
                    </p>
                  </div>
                  {users.length > 4 && !searchTerm && (
                    <div className="col-auto">
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => setShowAllUsers((prev) => !prev)}
                      >
                        {showAllUsers ? "Show latest" : "Show all"}
                      </button>
                    </div>
                  )}
                </form>

                {users.length === 0 ? (
                  <p className={`${mutedTextClass} text-center py-4`}>
                    Invite teammates to see them listed here.
                  </p>
                ) : filteredUsers.length === 0 ? (
                  <p className={`${mutedTextClass} text-center py-4`}>
                    No users match your search.
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
                                  `/admin/users/${encodeURIComponent(
                                    u.username
                                  )}`
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
                                  <span className="badge bg-primary-subtle text-primary fw-semibold py-1 px-2 small d-none d-md-inline-flex">
                                    {postCount}{" "}
                                    {postCount === 1 ? "post" : "posts"}
                                  </span>
                                </div>
                                <div
                                  className={`d-flex align-items-center gap-2 small ${mutedTextClass}`}
                                >
                                  <span>{isOnline ? "Active" : "Idle"}</span>
                                  <span aria-hidden="true">•</span>
                                  <span>
                                    {postCount}{" "}
                                    {postCount === 1 ? "post" : "posts"}
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
                    {posts.length ? `${posts.length} total` : "Awaiting posts"}
                  </span>
                </div>

                {recentPosts.length === 0 ? (
                  <p className={`${mutedTextClass} text-center py-3 mb-0`}>
                    Posts will appear here as soon as your community starts
                    sharing.
                  </p>
                ) : isMobile ? (
                  <div className="d-flex flex-column gap-2">
                    {recentPosts.map((post) => (
                      <div
                        key={post._id}
                        className={`d-flex flex-column gap-2 rounded-3 p-3 ${cardThemeClass}`}
                        style={{ border: `1px solid ${sectionBorderColor}` }}
                      >
                        <div className="d-flex justify-content-between align-items-start gap-2">
                          <div>
                            <p
                              className={`small text-uppercase mb-1 ${mutedTextClass}`}
                            >
                              Recent post
                            </p>
                            <h3 className="h6 mb-1">{post.title}</h3>
                            <p className={`mb-0 small ${mutedTextClass}`}>
                              by{" "}
                              <span className="fw-semibold">{post.author}</span>
                            </p>
                          </div>
                          <button
                            type="button"
                            className="badge bg-primary-subtle text-primary fw-semibold align-self-start border-0"
                            onClick={() => handleViewPost(post._id)}
                          >
                            View post
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
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
                                by{" "}
                                <span className="fw-semibold">
                                  {post.author}
                                </span>
                              </p>
                            </div>
                            <button
                              type="button"
                              className="badge bg-primary-subtle text-primary fw-semibold align-self-center border-0"
                              onClick={() => handleViewPost(post._id)}
                            >
                              View post
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {selectedPost ? (
              <div className={`card shadow-sm border-0 ${cardThemeClass}`}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h2 className="h5 mb-1">Selected Post</h2>
                      <p className={`mb-0 small ${mutedTextClass}`}>
                        Viewing {selectedPost.title} by {selectedPost.author}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => setSelectedPost(null)}
                    >
                      Close
                    </button>
                  </div>
                  <BlogCard
                    blog={selectedPost}
                    author={
                      selectedPostAuthor ?? {
                        username: selectedPost.author,
                      }
                    }
                  />
                </div>
              </div>
            ) : null}

            {/* Top Contributors */}
            <div className={`card shadow-sm border-0 ${cardThemeClass}`}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h2 className="h5 mb-0">Top Contributors</h2>
                  <span
                    className={`badge bg-primary-subtle text-primary fw-semibold`}
                  >
                    Leaderboard
                  </span>
                </div>

                {topContributors.length === 0 ? (
                  <p className={`${mutedTextClass} text-center mb-0`}>
                    Contributors will appear here once posts are published.
                  </p>
                ) : isMobile ? (
                  <div className="d-flex flex-column gap-2">
                    {topContributors.map((contributor, index) => {
                      const count = getPostCount(contributor.username);
                      return (
                        <div
                          key={contributor.username}
                          className={`d-flex justify-content-between align-items-center rounded-3 p-3 ${cardThemeClass}`}
                          style={{ border: `1px solid ${sectionBorderColor}` }}
                        >
                          <div className="d-flex align-items-center gap-3">
                            <span className="badge bg-dark-subtle text-dark fw-semibold">
                              {index + 1}
                            </span>
                            <div className="d-flex flex-column gap-1">
                              <span className="fw-semibold">
                                {contributor.username}
                              </span>
                              <span className={`small ${mutedTextClass}`}>
                                Leading with {count}{" "}
                                {count === 1 ? "post" : "posts"}
                              </span>
                            </div>
                          </div>
                          <span className="badge bg-primary-subtle text-primary fw-semibold">
                            {count} {count === 1 ? "post" : "posts"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
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
                            <span className="fw-semibold">
                              {contributor.username}
                            </span>
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
