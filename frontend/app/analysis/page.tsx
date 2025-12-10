"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import TopBar from "../components/TopBar";
import LoadingState from "../components/LoadingState";
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
  likes: number;
  comments: number;
}

export default function AnalysisPage() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  const {
    data: users,
    loading: loadingUsers,
  } = useCachedApi<User[]>(user ? "/api/users" : null, {
    fallback: [],
    transform: normalizeUsersResponse,
  });

  const { data: posts, loading: loadingPosts } = useCachedApi<Post[]>(
    user ? "/api/posts" : null,
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

  const isLoading = loading || !user || loadingUsers || loadingPosts;

  if (isLoading) {
    return (
      <LoadingState
        title="Analyzing your performance"
        subtitle="We’re crunching the numbers to surface your engagement metrics and highlights."
        skeletonCount={2}
      />
    );
  }

  const currentUserData = users.find((u) => u.username === user.username);
  if (!currentUserData) {
    return (
      <LoadingState
        title="Fetching your profile"
        subtitle="We’re refreshing your account information before rendering the analytics dashboard."
        skeletonCount={1}
      />
    );
  }

  const userPosts = posts.filter((p) => p.author === user.username);
  const postCount = userPosts.length;
  const totalLikes = userPosts.reduce((sum, p) => sum + (p.likes || 0), 0);
  const commentCount = userPosts.reduce((sum, p) => sum + (p.comments || 0), 0);
  const averageLikes = postCount ? Math.round(totalLikes / postCount) : 0;
  const averageComments = postCount ? Math.round(commentCount / postCount) : 0;
  const engagementScore = postCount
    ? Math.min(100, Math.round(((totalLikes + commentCount) / (postCount * 20)) * 100))
    : 0;

  const postsByLikes = [...userPosts].sort((a, b) => b.likes - a.likes);
  const spotlightPosts = postsByLikes.slice(0, 3);

  return (
    <div
      className={`container-fluid min-vh-100 p-3 p-md-4 ${
        theme === "night" ? "bg-dark text-white" : "bg-body"
      }`}
      style={
        theme === "night"
          ? {
              backgroundColor: "#0b1020",
              background:
                "radial-gradient(circle at top left, rgba(0,123,255,0.2), rgba(10,10,10,0.9))",
            }
          : {
              backgroundColor: "#f5f7fb",
              background:
                "linear-gradient(135deg, rgba(79,172,254,0.15), rgba(0,242,254,0.15))",
            }
      }
    >
      <TopBar
        title="My Analysis"
        active="analysis"
        currentUser={{
          username: currentUserData.username,
          image: currentUserData.image,
        }}
      />

      <div className="container mt-4" style={{ maxWidth: "1100px" }}>
        <div className="card border-0 shadow-lg overflow-hidden">
          <div
            className="card-body p-3 p-md-4"
            style={{
              backgroundColor: theme === "night" ? "#0f1525" : "#ffffff",
              background:
                theme === "night"
                  ? "linear-gradient(135deg, rgba(15,15,35,0.85), rgba(30,30,60,0.75))"
                  : "linear-gradient(135deg, rgba(255,255,255,0.92), rgba(245,250,255,0.86))",
            }}
          >
            <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3 gap-md-4">
              <div>
                <span className="badge bg-primary-subtle text-primary-emphasis fw-semibold mb-2">
                  Analysis Overview
                </span>
                <h2 className="fw-bold mb-2">📈 Your Blog Activity</h2>
                <p className="text-muted mb-0 d-none d-md-block">
                  Track how your writing resonates. Explore your strongest posts, see where engagement thrives,
                  and uncover opportunities to connect with readers more deeply.
                </p>
              </div>
              <div className="text-md-end w-100 w-md-auto">
                <div className="small text-muted">Engagement score</div>
                <div className="display-6 fw-semibold text-primary">{engagementScore}%</div>
                <div className="progress" style={{ height: "8px", width: "100%", maxWidth: "220px" }}>
                  <div
                    className="progress-bar bg-primary"
                    role="progressbar"
                    style={{ width: `${engagementScore}%` }}
                    aria-valuenow={engagementScore}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="d-md-none">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <h6 className="mb-1 text-uppercase text-muted">Activity Snapshot</h6>
                  <div className="text-muted small">Your latest engagement metrics</div>
                </div>
                <span className="badge bg-primary-subtle text-primary-emphasis">Live</span>
              </div>
              <div className="d-grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
                <div className="d-flex gap-2 align-items-start">
                  <span className="fs-5">📝</span>
                  <div>
                    <div className="text-uppercase text-muted small">Total Posts</div>
                    <div className="fw-bold text-primary">{postCount}</div>
                  </div>
                </div>
                <div className="d-flex gap-2 align-items-start">
                  <span className="fs-5">💬</span>
                  <div className="flex-grow-1">
                    <div className="text-uppercase text-muted small">Comments</div>
                    <div className="fw-bold text-success">{commentCount}</div>
                    <div className="progress mt-1" style={{ height: "4px" }}>
                      <div
                        className="progress-bar bg-success"
                        role="progressbar"
                        style={{ width: `${Math.min(100, averageComments * 10)}%` }}
                        aria-valuenow={averageComments}
                        aria-valuemin={0}
                        aria-valuemax={10}
                      />
                    </div>
                  </div>
                </div>
                <div className="d-flex gap-2 align-items-start">
                  <span className="fs-5">⭐</span>
                  <div className="flex-grow-1">
                    <div className="text-uppercase text-muted small">Likes</div>
                    <div className="fw-bold text-warning">{totalLikes}</div>
                    <div className="progress mt-1" style={{ height: "4px" }}>
                      <div
                        className="progress-bar bg-warning"
                        role="progressbar"
                        style={{ width: `${Math.min(100, averageLikes * 10)}%` }}
                        aria-valuenow={averageLikes}
                        aria-valuemin={0}
                        aria-valuemax={10}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-3 g-md-4 mt-1 row-cols-1 row-cols-sm-2 row-cols-md-3 analysis-stats-row d-none d-md-flex">
          <div className="col">
            <div className="card border-0 shadow-sm h-100 analysis-stat-card">
              <div className="card-body p-3 p-md-4">
                <div className="d-flex align-items-center mb-3">
                  <span className="me-2 fs-5 fs-md-3">📝</span>
                  <h6 className="mb-0 text-uppercase text-muted">Total Posts</h6>
                </div>
                <h2 className="fw-bold text-primary">{postCount}</h2>
                <p
                  className="text-muted small mb-0 d-none d-md-block"
                  style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                >
                  Keep publishing consistently to unlock deeper analytics and trend insights.
                </p>
              </div>
            </div>
          </div>
          <div className="col">
            <div className="card border-0 shadow-sm h-100 analysis-stat-card">
              <div className="card-body p-3 p-md-4">
                <div className="d-flex align-items-center mb-3">
                  <span className="me-2 fs-5 fs-md-3">💬</span>
                  <h6 className="mb-0 text-uppercase text-muted">Comments</h6>
                </div>
                <h2 className="fw-bold text-success">{commentCount}</h2>
                <p
                  className="text-muted small mb-2 d-none d-md-block"
                  style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                >
                  On average {averageComments} readers respond to each post.
                </p>
                <div className="progress" style={{ height: "6px" }}>
                  <div
                    className="progress-bar bg-success"
                    role="progressbar"
                    style={{ width: `${Math.min(100, averageComments * 10)}%` }}
                    aria-valuenow={averageComments}
                    aria-valuemin={0}
                    aria-valuemax={10}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="col">
            <div className="card border-0 shadow-sm h-100 analysis-stat-card">
              <div className="card-body p-3 p-md-4">
                <div className="d-flex align-items-center mb-3">
                  <span className="me-2 fs-5 fs-md-3">⭐</span>
                  <h6 className="mb-0 text-uppercase text-muted">Likes</h6>
                </div>
                <h2 className="fw-bold text-warning">{totalLikes}</h2>
                <p
                  className="text-muted small mb-2 d-none d-md-block"
                  style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                >
                  Average of {averageLikes} likes per post. Celebrate your most-loved stories!
                </p>
                <div className="progress" style={{ height: "6px" }}>
                  <div
                    className="progress-bar bg-warning"
                    role="progressbar"
                    style={{ width: `${Math.min(100, averageLikes * 10)}%` }}
                    aria-valuenow={averageLikes}
                    aria-valuemin={0}
                    aria-valuemax={10}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4 mt-2">
          <div className="col-lg-7">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">🔥 Spotlight Posts</h5>
                  <span className="badge bg-secondary-subtle text-secondary-emphasis">
                    Top {spotlightPosts.length || 0} performers
                  </span>
                </div>
                {spotlightPosts.length ? (
                  <div className="list-group list-group-flush">
                    {spotlightPosts.map((post, index) => (
                      <div key={post._id} className="list-group-item px-0 py-3">
                        <div className="d-flex align-items-start gap-2 gap-sm-3 flex-column flex-sm-row">
                          <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" style={{ width: "36px", height: "36px" }}>
                            #{index + 1}
                          </div>
                          <div className="flex-grow-1">
                            <h6
                              className="mb-1"
                              style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                            >
                              {post.title}
                            </h6>
                            <p
                              className="text-muted small mb-2"
                              style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                            >
                              {post.content}
                            </p>
                            <div className="d-flex flex-wrap gap-2 small text-muted">
                              <span>👍 {post.likes}</span>
                              <span>💬 {post.comments}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted py-4 py-md-5 d-flex flex-column align-items-center gap-2">
                    <p className="mb-1">You haven’t posted anything yet.</p>
                    <small>Start sharing your thoughts to see insights populate here.</small>
                    <button className="btn btn-primary">Create your first post</button>
                    <small className="text-muted">Share a quick update to unlock tailored insights.</small>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="col-lg-5 d-none d-md-block">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body d-flex flex-column">
                <h5 className="mb-3">💡 Growth Opportunities</h5>
                <ul className="list-unstyled flex-grow-1 d-grid gap-3" style={{ lineHeight: 1.6 }}>
                  <li className="d-flex gap-3 border-bottom pb-3">
                    <span className="fs-5">🎯</span>
                    <div>
                      <strong>Focus on high-performing themes.</strong>
                      <div className="text-muted small">
                        Revisit topics from your top posts to craft sequels or deep dives.
                      </div>
                    </div>
                  </li>
                  <li className="d-flex gap-3 border-bottom pb-3">
                    <span className="fs-5">🤝</span>
                    <div>
                      <strong>Boost conversation.</strong>
                      <div className="text-muted small">
                        Reply to commenters within 24 hours to keep engagement momentum high.
                      </div>
                    </div>
                  </li>
                  <li className="d-flex gap-3">
                    <span className="fs-5">📅</span>
                    <div>
                      <strong>Plan your next publish.</strong>
                      <div className="text-muted small">
                        Set a goal to post at least once a week to stay top-of-mind with readers.
                      </div>
                    </div>
                  </li>
                </ul>
                <div className="mt-3 p-3 rounded text-center"
                  style={{
                    background:
                      theme === "night"
                        ? "rgba(13,110,253,0.15)"
                        : "rgba(13,110,253,0.08)",
                  }}
                >
                  <strong>Next step:</strong> Draft a follow-up to your most-liked story while the momentum is hot.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card border-0 shadow-sm mt-4">
          <div className="card-body text-center text-muted">
            <em>More personal insights are on the way. Keep writing to unlock trend forecasts and audience badges!</em>
          </div>
        </div>
      </div>
      <style jsx global>{`
        @media (max-width: 576px) {
          .analysis-stats-row {
            display: flex;
            flex-wrap: nowrap;
            overflow-x: auto;
            gap: 0.75rem;
            padding-bottom: 0.5rem;
            margin: 0 -0.25rem;
          }

          .analysis-stats-row > .col {
            flex: 0 0 70%;
            max-width: 70%;
          }

          .analysis-stat-card .card-body {
            padding: 0.75rem;
          }

          .analysis-stat-card h2 {
            font-size: 1.5rem;
          }

          .analysis-stat-card h6 {
            font-size: 0.85rem;
          }
        }
      `}</style>
    </div>
  );
}
