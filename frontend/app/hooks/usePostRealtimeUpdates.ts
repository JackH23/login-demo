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
    // Realtime post updates disabled
    return undefined;
  }, [setPosts, socket]);

}

export function usePostDeletionSubscription<T extends IdentifiablePost>(
  setPosts: (value: SetStateAction<T[]>) => void
) {
  usePostRealtimeUpdates(setPosts);
}