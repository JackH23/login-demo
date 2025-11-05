"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
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
  const confirmDialog = useConfirmDialog();

  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const handleDelete = async (id: string) => {
    const confirmed = await confirmDialog({
      title: "Delete this post?",
      description:
        "Removing this post will permanently erase it for everyone. This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Keep post",
      tone: "danger",
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


  return (
    <div
      className={`container-fluid min-vh-100 p-4 ${
        theme === "night" ? "bg-dark text-white" : "bg-light"
      }`}
    >
      {/* Sticky Top Bar and Menu */}
      <TopBar
        title="Home"
        active="home"
        currentUser={{ username: currentUserData.username, image: currentUserData.image }}
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

      {/* Blog Section */}
      <div className="mt-4">
        {posts.length === 0 ? (
          <div className="card shadow-sm w-100 mx-auto">
            <div className="card-body text-center text-muted">
              <p>No blog post found. Create a new one!</p>
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
