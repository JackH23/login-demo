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

export function usePostDeletionSubscription<T extends IdentifiablePost>(
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

    socket.on("post-deleted", handlePostDeleted);

    return () => {
      socket.off("post-deleted", handlePostDeleted);
    };
  }, [setPosts, socket]);
}