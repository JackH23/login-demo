"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import TopBar from "../components/TopBar";
import BlogCard from "../components/BlogCard";
import { useConfirmDialog } from "../components/useConfirmDialog";
import { useCachedApi } from "../hooks/useCachedApi";

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
  image?: string | null;
  author: string;
  likes: number;
  dislikes: number;
  likedBy?: string[];
  dislikedBy?: string[];
}

export default function PostsPage() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  const {
    data: users,
    loading: loadingUsers,
  } = useCachedApi<User[]>(user ? "/api/users" : null, {
    fallback: [],
    transform: (payload) =>
      (payload as { users?: User[] | null })?.users ?? [],
  });

  const {
    data: posts,
    loading: loadingPosts,
    setData: setPosts,
  } = useCachedApi<BlogPost[]>(
    user ? `/api/posts?author=${encodeURIComponent(user.username)}` : null,
    {
      fallback: [],
      transform: (payload) =>
        (payload as { posts?: BlogPost[] | null })?.posts ?? [],
    }
  );
  const { confirm: showConfirm, dialog: confirmDialog } = useConfirmDialog();
  const handleDelete = async (id: string) => {
    const targetPost = posts.find((p) => p._id === id);
    const confirmed = await showConfirm({
      title: "Remove this story?",
      message: targetPost ? (
        <div>
          <p className="mb-1">
            <span className="fw-semibold">“{targetPost.title}”</span> will be permanently removed from your posts.
          </p>
          <small className="text-muted">
            Your readers won’t be able to access it anymore.
          </small>
        </div>
      ) : (
        "This post will be permanently removed from your list."
      ),
      confirmText: "Delete post",
      cancelText: "Go back",
      confirmVariant: "danger",
    });
    if (!confirmed) return;
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

  const isLoading = loading || !user || loadingUsers || loadingPosts;

  if (isLoading) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  const currentUserData = users.find((u) => u.username === user.username);
  if (!currentUserData) {
    return <div className="text-center mt-5">Loading user data...</div>;
  }

  return (
    <div
      className={`container-fluid min-vh-100 py-4 ${
        theme === "night" ? "bg-dark text-white" : "bg-light"
      }`}
    >
      {confirmDialog}
      <TopBar
        title="Posts"
        active="posts"
        currentUser={{
          username: currentUserData.username,
          image: currentUserData.image,
        }}
      />

      {/* Create Blog Button */}
      <div
        className={`text-end py-3 px-4 position-sticky top-0 z-2 ${
          theme === "night" ? "bg-dark text-white" : "bg-white"
        }`}
        style={{ borderBottom: "1px solid #dee2e6" }}
      >
        <button
          className="btn btn-success"
          onClick={() => router.push("/create-blog")}
        >
          + Create Blog
        </button>
      </div>

      <div className="container mt-4">
        {posts.length === 0 ? (
          <div className="card text-center">
            <div className="card-body">
              <p className="text-muted mb-0">No posts found.</p>
            </div>
          </div>
        ) : (
          posts.map((post) => {
            const author = users.find((u) => u.username === post.author);
            return (
              <BlogCard
                key={post._id ?? post.title}
                blog={post}
                author={author}
                onDelete={handleDelete}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
