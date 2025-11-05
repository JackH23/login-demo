"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import TopBar from "../components/TopBar";
import BlogCard from "../components/BlogCard";

interface User {
  username: string;
  position: string;
  age: number;
  image: string;
  online?: boolean;
}

interface BlogPost {
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


export default function HomePage() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p._id !== id));
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;

    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => setUsers(data.users ?? []))
      .catch(() => setUsers([]))
      .finally(() => setIsFetching(false));
  }, [user]);

  useEffect(() => {
    fetch("/api/posts")
      .then((res) => res.json())
      .then((data) => setPosts(data.posts ?? []))
      .catch(() => setPosts([]));
  }, []);

  if (loading || !user || isFetching) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  const currentUserData = users.find((u) => u.username === user.username);
  if (!currentUserData) {
    return <div className="text-center mt-5">Loading user data...</div>;
  }

  const totalPosts = posts.length;
  const totalReactions = posts.reduce(
    (acc, post) => acc + (post.likes ?? 0) + (post.dislikes ?? 0),
    0
  );
  const activeAuthors = new Set(posts.map((post) => post.author)).size;
  const topPost = posts.reduce<BlogPost | null>((best, post) => {
    if (!best) return post;
    const bestScore = (best.likes ?? 0) - (best.dislikes ?? 0);
    const postScore = (post.likes ?? 0) - (post.dislikes ?? 0);
    return postScore > bestScore ? post : best;
  }, null);

  const highlightedUsers = users
    .filter((profile) => profile.username !== currentUserData.username)
    .slice(0, 6);

  return (
    <div
      className={`min-vh-100 ${
        theme === "night" ? "bg-black text-white" : "bg-body-tertiary"
      }`}
    >
      <TopBar
        title="Home"
        active="home"
        currentUser={{
          username: currentUserData.username,
          image: currentUserData.image,
        }}
      />

      <main className="container py-5">
        <section
          className={`home-hero rounded-4 shadow-sm mb-5 overflow-hidden position-relative ${
            theme === "night" ? "home-hero--night text-white" : "home-hero--day"
          }`}
        >
          <div className="row align-items-center g-4">
            <div className="col-12 col-lg-7 px-4 px-lg-5 py-5">
              <span className="badge bg-opacity-75 bg-white text-dark fw-semibold mb-3">
                Welcome back
              </span>
              <h1 className="display-6 fw-bold mb-3">
                Hi {currentUserData.username}, ready to share your next story?
              </h1>
              <p
                className={`lead mb-4 ${
                  theme === "night" ? "text-white-50" : "text-secondary"
                }`}
              >
                Capture your ideas, inspire your peers, and keep the community
                conversation flowing with a fresh blog post.
              </p>
              <div className="d-flex flex-wrap gap-3">
                <button
                  className={`btn btn-lg px-4 ${
                    theme === "night" ? "btn-light text-dark" : "btn-dark"
                  }`}
                  onClick={() => router.push("/create-blog")}
                >
                  <i className="bi bi-pencil-square me-2"></i>
                  Create a blog
                </button>
                <button
                  className={`btn btn-lg btn-ghost-light px-4 ${
                    theme === "night" ? "text-white" : "text-dark"
                  }`}
                  onClick={() => router.push("/posts")}
                >
                  <i className="bi bi-collection me-2"></i>
                  Explore posts
                </button>
              </div>
            </div>
            <div className="col-12 col-lg-5 d-none d-lg-block">
              <div className="h-100 d-flex align-items-center justify-content-center pe-5">
                <div className="glass-card text-center p-4 w-100">
                  <div className="avatar-xl mx-auto mb-3">
                    {currentUserData.image ? (
                      <img
                        src={currentUserData.image}
                        alt={currentUserData.username}
                        className="img-fluid rounded-circle"
                      />
                    ) : (
                      <span className="avatar-fallback display-6 fw-bold">
                        {currentUserData.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <h2 className="h4 fw-semibold mb-1">{currentUserData.username}</h2>
                  <p
                    className={`small mb-0 ${
                      theme === "night" ? "text-white-50" : "text-muted"
                    }`}
                  >
                    {currentUserData.position ?? "Community storyteller"}
                  </p>
                  <div className="d-flex justify-content-center gap-3 mt-4">
                    <div>
                      <div className="fw-semibold h4 mb-0">{totalPosts}</div>
                      <div className="small text-uppercase opacity-75">
                        Your posts
                      </div>
                    </div>
                    <div>
                      <div className="fw-semibold h4 mb-0">{totalReactions}</div>
                      <div className="small text-uppercase opacity-75 text-nowrap">
                        Reactions
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="row g-4 mb-5">
          <div className="col-12 col-lg-4">
            <div
              className={`card border-0 h-100 shadow-sm rounded-4 ${
                theme === "night" ? "bg-dark text-white" : "bg-white"
              }`}
            >
              <div className="card-body p-4">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h2 className="h5 mb-0 fw-semibold">Published posts</h2>
                  <span className="badge bg-success bg-opacity-10 text-success">
                    +{totalPosts}
                  </span>
                </div>
                <p className="display-5 fw-bolder mb-2">{totalPosts}</p>
                <p
                  className={`mb-0 ${
                    theme === "night" ? "text-white-50" : "text-muted"
                  }`}
                >
                  A snapshot of everything you and the community have shared.
                </p>
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-4">
            <div
              className={`card border-0 h-100 shadow-sm rounded-4 ${
                theme === "night" ? "bg-dark text-white" : "bg-white"
              }`}
            >
              <div className="card-body p-4">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h2 className="h5 mb-0 fw-semibold">Community energy</h2>
                  <span className="badge bg-primary bg-opacity-10 text-primary">
                    {totalReactions}
                  </span>
                </div>
                <p className="display-5 fw-bolder mb-2">{totalReactions}</p>
                <p
                  className={`mb-0 ${
                    theme === "night" ? "text-white-50" : "text-muted"
                  }`}
                >
                  Total likes and dislikes captured across the latest posts.
                </p>
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-4">
            <div
              className={`card border-0 h-100 shadow-sm rounded-4 ${
                theme === "night" ? "bg-dark text-white" : "bg-white"
              }`}
            >
              <div className="card-body p-4">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h2 className="h5 mb-0 fw-semibold">Top spotlight</h2>
                  <span className="badge bg-warning bg-opacity-10 text-warning">
                    <i className="bi bi-stars"></i>
                  </span>
                </div>
                <p className="h4 fw-bold mb-1">
                  {topPost ? topPost.title : "Share your first insight"}
                </p>
                <p
                  className={`mb-3 ${
                    theme === "night" ? "text-white-50" : "text-muted"
                  }`}
                >
                  {topPost
                    ? `By ${topPost.author} • ${topPost.likes} likes`
                    : "Posts with great reactions will appear here."}
                </p>
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-people-fill text-primary"></i>
                  <span className="small opacity-75">
                    {activeAuthors} active writers this week
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {highlightedUsers.length > 0 && (
          <section className="mb-5">
            <div className="d-flex flex-wrap align-items-end justify-content-between mb-3 gap-3">
              <div>
                <h2 className="h4 fw-bold mb-1">Your creative circle</h2>
                <p
                  className={`mb-0 ${
                    theme === "night" ? "text-white-50" : "text-muted"
                  }`}
                >
                  Stay inspired by the voices you follow closely.
                </p>
              </div>
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={() => router.push("/friend")}
              >
                Manage connections
              </button>
            </div>
            <div className="d-flex flex-wrap gap-3">
              {highlightedUsers.map((profile) => (
                <div
                  key={profile.username}
                  className={`profile-chip d-flex align-items-center gap-3 shadow-sm ${
                    theme === "night" ? "bg-dark-subtle" : "bg-white"
                  }`}
                >
                  {profile.image ? (
                    <img
                      src={profile.image}
                      alt={profile.username}
                      className="rounded-circle"
                      style={{ width: "48px", height: "48px", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      className={[
                        "rounded-circle",
                        "bg-primary bg-opacity-10 text-primary",
                        "d-flex align-items-center justify-content-center",
                      ].join(" ")}
                      style={{ width: "48px", height: "48px" }}
                    >
                      <span className="fw-semibold">
                        {profile.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <div className="fw-semibold">{profile.username}</div>
                    <div className="small opacity-75">
                      {profile.position ?? "Contributor"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
            <div>
              <h2 className="h3 fw-bold mb-1">Latest posts</h2>
              <p
                className={`mb-0 ${
                  theme === "night" ? "text-white-50" : "text-muted"
                }`}
              >
                See what the community is discussing right now.
              </p>
            </div>
            <button
              className="btn btn-outline-secondary"
              onClick={() => router.push("/posts")}
            >
              View archive
            </button>
          </div>

          {posts.length === 0 ? (
            <div
              className={`empty-state text-center rounded-4 p-5 ${
                theme === "night" ? "bg-dark text-white-50" : "bg-white"
              }`}
            >
              <div className="display-6 mb-3">📝</div>
              <h3 className="h4 fw-semibold mb-2">No posts yet</h3>
              <p className="mb-4">
                Kick off the conversation by publishing your first blog post.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => router.push("/create-blog")}
              >
                Start writing
              </button>
            </div>
          ) : (
            <div className="row g-4">
              {posts.map((post) => {
                const author = users.find((u) => u.username === post.author);
                return (
                  <div className="col-12 col-xl-6" key={post._id ?? post.title}>
                    <BlogCard
                      blog={post}
                      author={author}
                      onDelete={handleDelete}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
