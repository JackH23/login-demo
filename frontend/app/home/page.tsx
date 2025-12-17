"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { useTheme } from "@/app/context/ThemeContext";
import BlogCard from "@/app/components/BlogCard";
import LoadingState from "@/app/components/LoadingState";
import TopBar from "@/app/components/TopBar";
import { useConfirmDialog } from "@/app/components/useConfirmDialog";
import { useCachedApi } from "@/app/hooks/useCachedApi";
import { usePostRealtimeUpdates } from "@/app/hooks/usePostRealtimeUpdates";
import { apiUrl } from "@/app/lib/api";
import { normalizeUsersResponse } from "@/app/lib/users";

interface User {
  username: string;
  image?: string;
  online?: boolean;
}

interface BlogPost {
  _id?: string;
  title: string;
  content: string;
  image: string | null;
  imageEdites?: {
    brightness?: number;
    contrast?: number;  
    saturation?: number;
    grayscale?: number;
    rotation?: number;
    hue?: number;
    blur?: number;
    sepia?: number;
  } | null;
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

  const {
    data: users,
    loading: loadingUsers,
  } = useCachedApi<User[]>(user ? "/api/users" : null, {
    fallback: [],
    transform: normalizeUsersResponse,
  });

  const {
    data: posts,
    loading: loadingPosts,
    setData: setPosts,
  } = useCachedApi<BlogPost[]>(user ? "/api/posts" : null, {
    fallback: [],
    transform: (payload) =>
      (payload as { posts?: BlogPost[] | null })?.posts ?? [],
  });
  usePostRealtimeUpdates(setPosts);
  const { confirm: showConfirm, dialog: confirmDialog } = useConfirmDialog();
  const handleDelete = async (id: string) => {
    const targetPost = posts.find((p) => p._id === id);
    const confirmed = await showConfirm({
      title: "Delete this post?",
      message: targetPost ? (
        <div>
          <p className="mb-1">
            You’re about to permanently remove
            {" "}
            <span className="fw-semibold">“{targetPost.title}”</span>.
          </p>
          <small className="text-muted">
            This action cannot be undone and the conversation will disappear for
            everyone.
          </small>
        </div>
      ) : (
        "You’re about to permanently delete this post. This action cannot be undone."
      ),
      confirmText: "Yes, delete it",
      cancelText: "Keep post",
      confirmVariant: "danger",
    });
    if (!confirmed) return;
    const res = await fetch(apiUrl(`/api/posts/${id}`), { method: "DELETE" });
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
    return (
      <LoadingState
        title="Loading your personalized feed"
        subtitle="We’re gathering the newest posts and activity from your community."
        skeletonCount={3}
      />
    );
  }

  const currentUserData = users.find((u) => u.username === user.username);
  if (!currentUserData) {
    return (
      <LoadingState
        title="Syncing your profile"
        subtitle="We’re refreshing your account details to keep everything up to date."
        skeletonCount={1}
      />
    );
  }


  return (
    <div
      className={`container-fluid min-vh-100 p-4 ${
        theme === "night" ? "bg-dark text-white" : "bg-light"
      }`}
    >
      {confirmDialog}
      {/* Sticky Top Bar and Menu */}
      <TopBar
        title="Home"
        active="home"
        currentUser={{ username: currentUserData.username, image: currentUserData.image }}
      />

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
