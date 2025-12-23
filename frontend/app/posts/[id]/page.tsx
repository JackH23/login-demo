"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import LoadingState from "@/app/components/LoadingState";
import BlogCard from "@/app/components/BlogCard";
import { useAuth } from "@/app/context/AuthContext";
import { useTheme } from "@/app/context/ThemeContext";
import { useCachedApi } from "@/app/hooks/useCachedApi";
import { normalizeUsersResponse } from "@/app/lib/users";

interface BlogPost {
  _id?: string;
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
  author: string;
  likes: number;
  dislikes: number;
  likedBy?: string[];
  dislikedBy?: string[];
}

interface AuthorData {
  username: string;
  image?: string;
  online?: boolean;
}

export default function PostDetailsPage() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const params = useParams<{ id?: string | string[] }>();

  const postId = useMemo(() => {
    const value = params?.id;
    if (Array.isArray(value)) return value[0];
    return value ?? "";
  }, [params]);

  const { data: post, loading: loadingPost } = useCachedApi<BlogPost | null>(
    postId ? `/api/posts/${encodeURIComponent(postId)}` : null,
    {
      fallback: null,
      transform: (payload) =>
        (payload as { post?: BlogPost | null })?.post ?? null,
    }
  );

  const { data: users, loading: loadingUsers } = useCachedApi<AuthorData[]>(
    user ? "/api/users" : null,
    {
      fallback: [],
      transform: normalizeUsersResponse,
    }
  );

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [loading, user, router]);

  const currentUserData = useMemo(
    () => users.find((u) => u.username === user?.username) ?? null,
    [users, user]
  );

  const postAuthor = useMemo(
    () => users.find((u) => u.username === post?.author),
    [users, post]
  );

  if (loading || loadingPost || loadingUsers || !user) {
    return (
      <LoadingState
        title="Loading post"
        subtitle="Fetching the latest details for this post."
        skeletonCount={1}
      />
    );
  }

  if (!currentUserData) {
    return (
      <LoadingState
        title="Fetching your profile"
        subtitle="We’re syncing your account details so everything looks just right."
        skeletonCount={1}
      />
    );
  }

  return (
    <div
      className={`container-fluid min-vh-100 py-4 ${
        theme === "night" ? "bg-dark text-white" : "bg-light"
      }`}
    >
      <TopBar
        title="Post details"
        active="posts"
        currentUser={{
          username: currentUserData.username,
          image: currentUserData.image,
          isAdmin: user.isAdmin,
        }}
      />

      <div className="container mt-4">
        {post ? (
          <BlogCard
            key={post._id ?? post.title}
            blog={post}
            author={
              postAuthor ?? {
                username: post.author,
              }
            }
          />
        ) : (
          <div className="card shadow-sm">
            <div className="card-body">
              <p className="mb-0">This post could not be found.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
