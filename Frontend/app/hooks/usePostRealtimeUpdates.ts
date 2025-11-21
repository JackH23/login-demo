"use client";

import { useEffect } from "react";
import type { SetStateAction } from "react";

import { useAuth } from "../context/AuthContext";

interface IdentifiablePost {
  _id?: string | null;
}

interface PostDeletedPayload {
  postId?: string | null;
}

interface PostCreatedPayload<T> {
  post?: T | null;
}

function normalizePost<T extends IdentifiablePost>(post: T): T {
  if (!post?._id) {
    return post;
  }

  const normalizedId = typeof post._id === "string" ? post._id : String(post._id);
  if (normalizedId === post._id) {
    return post;
  }

  return {
    ...post,
    _id: normalizedId,
  };
}

export function usePostRealtimeUpdates<T extends IdentifiablePost>(
  setPosts: (value: SetStateAction<T[]>) => void
) {
  const { socket } = useAuth();

  useEffect(() => {
    if (!socket) return;

    const handlePostDeleted = (payload: PostDeletedPayload | string) => {
      const postId = typeof payload === "string" ? payload : payload?.postId;
      if (!postId) return;
      setPosts((prev) => prev.filter((post) => post._id !== postId));
    };

    const handlePostCreated = (payload: PostCreatedPayload<T> | T) => {
      const post = normalizePost(
        (typeof payload === "object" && payload !== null && "post" in payload
          ? (payload as PostCreatedPayload<T>).post
          : (payload as T)) as T
      );

      if (!post || !post._id) return;

      setPosts((prev) => {
        const index = prev.findIndex((existing) => existing._id === post._id);
        if (index !== -1) {
          const next = [...prev];
          next[index] = { ...next[index], ...post };
          return next;
        }
        return [post, ...prev];
      });
    };

    socket.on("post-deleted", handlePostDeleted);
    socket.on("post-created", handlePostCreated);

    return () => {
      socket.off("post-deleted", handlePostDeleted);
      socket.off("post-created", handlePostCreated);
    };
  }, [setPosts, socket]);

}

export function usePostDeletionSubscription<T extends IdentifiablePost>(
  setPosts: (value: SetStateAction<T[]>) => void
) {
  usePostRealtimeUpdates(setPosts);
}