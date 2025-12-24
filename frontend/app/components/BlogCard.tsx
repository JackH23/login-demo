"use client";

import { useRouter } from "next/navigation";
import {
  useState,
  useEffect,
  CSSProperties,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useCachedApi } from "../hooks/useCachedApi";
import { apiUrl, resolveImageUrl } from "@/app/lib/api";
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

interface Reply {
  text: string;
  author: string;
  authorImage?: string;
  tempId?: string;
  isPending?: boolean;
}

type ImageEditState = {
  brightness: number;
  contrast: number;
  saturation: number;
  grayscale: number;
  rotation: number;
  hue: number;
  blur: number;
  sepia: number;
};

const DEFAULT_IMAGE_EDITS: ImageEditState = {
  brightness: 100,
  contrast: 102,
  saturation: 110,
  grayscale: 0,
  rotation: 0,
  hue: 0,
  blur: 0,
  sepia: 0,
};

const buildImageStyle = (
  edits?: BlogPost["imageEdits"],
  additionalStyles?: CSSProperties
): CSSProperties => {
  const merged: ImageEditState = {
    ...DEFAULT_IMAGE_EDITS,
    ...(edits ?? {}),
  } as ImageEditState;

  const filter = [
    `brightness(${merged.brightness}%)`,
    `contrast(${merged.contrast}%)`,
    `saturate(${merged.saturation}%)`,
    `grayscale(${merged.grayscale}%)`,
    `sepia(${merged.sepia}%)`,
    `hue-rotate(${merged.hue}deg)`,
    `blur(${merged.blur}px)`,
  ].join(" ");

  return {
    filter,
    transform: `rotate(${merged.rotation}deg)`,
    transition: "filter 0.2s ease, transform 0.2s ease",
    ...additionalStyles,
  };
};

interface Comment {
  _id?: string;
  postId?: string;
  text: string;
  author: string;
  authorImage?: string;
  likes: number;
  dislikes: number;
  likedBy?: string[];
  dislikedBy?: string[];
  replies: Reply[];
  showReplyInput: boolean;
  newReply: string;
  createdAt?: string;
  isPending?: boolean;
}

export default function BlogCard({
  blog,
  author,
  onDelete,
}: {
  blog: BlogPost;
  author?: AuthorData;
  onDelete?: (id: string) => void;
}) {
  const router = useRouter();
  const [likes, setLikes] = useState<number>(blog.likes ?? 0);
  const [dislikes, setDislikes] = useState<number>(blog.dislikes ?? 0);
  const [hasLikedPost, setHasLikedPost] = useState<boolean>(false);
  const [hasDislikedPost, setHasDislikedPost] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [showAllComments] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showConversation, setShowConversation] = useState(false);
  const [userImages, setUserImages] = useState<Record<string, string>>({});
  const { user, socket } = useAuth();
  const { theme } = useTheme();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [replySubmittingId, setReplySubmittingId] = useState<string | null>(
    null
  );
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [useBottomSheet, setUseBottomSheet] = useState(false);
  const canManagePost = user?.username === blog.author;
  const replyInputRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuDropdownRef = useRef<HTMLDivElement | null>(null);
  const lastCommentFetchRef = useRef<number>(0);

  const { data: knownUsers } = useCachedApi<AuthorData[]>(
    user ? "/api/users" : null,
    {
      fallback: [],
      transform: normalizeUsersResponse,
    }
  );

  // Check if the current theme is "night"
  const isNight = theme === "night";

  // Set header background gradient based on the theme
  const headerGradient = isNight
    ? "linear-gradient(135deg, rgba(17,24,39,0.95), rgba(30,64,175,0.85))" // Dark gradient for night mode
    : "linear-gradient(135deg, rgba(59,130,246,0.95), rgba(129,140,248,0.85))"; // Bright blue gradient for day mode

  // Define border color for cards depending on theme
  const cardBorderColor = isNight
    ? "rgba(96,165,250,0.35)" // Light blue border for dark background
    : "rgba(59,130,246,0.2)"; // Soft blue border for light mode

  // Apply text color class for muted or less prominent text
  const mutedTextClass = isNight ? "text-light text-opacity-75" : "text-muted";

  // Define badge (pill) style used for statistics like likes/comments
  const statBadgeClass = `badge rounded-pill ${
    isNight
      ? "bg-dark bg-opacity-75 text-light border border-primary border-opacity-50" // Semi-transparent dark background for night
      : "bg-white text-primary border border-primary border-opacity-25" // Light background for day mode
  }`;

  // Determine which author name to display
  // Priority: author.username → blog.author → empty string
  const displayAuthor = author?.username ?? blog.author ?? "";

  // Extract the first character from author name (used as fallback avatar initial)
  const authorInitial = displayAuthor.charAt(0).toUpperCase() || "?";

  const isProfileNavigable = Boolean(displayAuthor);

  const resolveAvatar = useCallback(
    (raw?: string | null, username?: string) => {
      const knownUserImage = username ? userImages[username] : undefined;
      return knownUserImage ?? resolveImageUrl(raw);
    },
    [userImages]
  );

  const mapReplyFromApi = useCallback(
    (reply: { text: string; author: string; authorImage?: string }) => ({
      text: reply.text as string,
      author: reply.author as string,
      authorImage: resolveAvatar(reply.authorImage, reply.author),
    }),
    [resolveAvatar]
  );

  const mapCommentFromApi = useCallback(
    (c: {
      _id?: string | null;
      postId?: string | null;
      text: string;
      author: string;
      authorImage?: string | null;
      likes: number;
      dislikes: number;
      likedBy?: string[];
      dislikedBy?: string[];
      replies?: { text: string; author: string; authorImage?: string | null }[];
      createdAt?: string;
    }): Comment => ({
      _id:
        typeof c._id === "string" ? c._id : c._id ? String(c._id) : undefined,
      postId:
        typeof c.postId === "string"
          ? c.postId
          : c.postId
          ? String(c.postId)
          : undefined,
      text: c.text as string,
      author: c.author as string,
      authorImage: resolveAvatar(c.authorImage ?? undefined, c.author),
      likes: c.likes ?? 0,
      dislikes: c.dislikes ?? 0,
      likedBy: c.likedBy ?? [],
      dislikedBy: c.dislikedBy ?? [],
      replies: (c.replies ?? []).map(mapReplyFromApi),
      showReplyInput: false,
      newReply: "",
      createdAt: c.createdAt,
    }),
    [mapReplyFromApi, resolveAvatar]
  );

  const resolveCommentAvatars = useCallback(
    (list: Comment[]) =>
      list.map((comment) => ({
        ...comment,
        authorImage: resolveAvatar(comment.authorImage, comment.author),
        replies: comment.replies.map((reply) => ({
          ...reply,
          authorImage: resolveAvatar(reply.authorImage, reply.author),
        })),
      })),
    [resolveAvatar]
  );

  const mapCommentsResponse = useCallback(
    (payload: { comments?: unknown[] }) =>
      resolveCommentAvatars(
        (payload.comments ?? []).map((comment) =>
          mapCommentFromApi(comment as Record<string, unknown>)
        )
      ),
    [mapCommentFromApi, resolveCommentAvatars]
  );
  const {
    data: cachedComments,
    refresh: refreshComments,
    setData: setCachedComments,
  } = useCachedApi<Comment[]>(
    blog._id ? `/api/comments?postId=${blog._id}` : null,
    {
      fallback: [],
      transform: mapCommentsResponse,
      staleTime: 15_000,
    }
  );
  const updateComments = useCallback(
    (updater: Parameters<typeof setComments>[0]) => {
      setComments(updater);
      setCachedComments(updater);
    },
    [setCachedComments]
  );

  const openAuthorProfile = () => {
    if (!displayAuthor) return;
    router.push(`/user/${encodeURIComponent(displayAuthor)}`);
  };

  const openUserProfile = (username?: string) => {
    if (!username) return;
    router.push(`/user/${encodeURIComponent(username)}`);
  };

  const prefetchComments = useCallback(() => {
    if (!blog._id) return;

    const now = Date.now();
    const timeSinceLastFetch = now - lastCommentFetchRef.current;
    if (timeSinceLastFetch < 4000) return;

    lastCommentFetchRef.current = now;
    void refreshComments();
  }, [blog._id, refreshComments]);

  // Count total number of comments for the blog post
  const totalComments = comments.length;

  const isContentLong = (blog.content ?? "").length > 240;
  const collapsedLines = isMobile ? 3 : 5;
  const collapsedMaxHeight = `${(1.65 * collapsedLines).toFixed(1)}em`;
  const actionButtonPadding = isMobile ? "px-2 py-1" : "px-3 py-2";

  const coverImageBaseStyle = useMemo(
    () => buildImageStyle(blog.imageEdits),
    [blog.imageEdits]
  );

  const coverImageStyle = useMemo(
    () => ({
      ...coverImageBaseStyle,
      width: "100%",
      height: "100%",
      maxWidth: "100%",
      maxHeight: "100%",
      display: "block",
      objectFit: isMobile ? "cover" : "contain",
      objectPosition: "center",
      filter: `${coverImageBaseStyle.filter ?? ""} ${
        isNight ? "brightness(0.95)" : "saturate(1.05)"
      }`.trim(),
    }),
    [coverImageBaseStyle, isMobile, isNight]
  );

  const contentStyle: CSSProperties = {
    fontSize: isMobile ? "0.95rem" : undefined,
    lineHeight: isMobile ? 1.6 : 1.7,
    letterSpacing: "0.01em",
    wordBreak: "break-word",
    transition: "max-height 0.3s ease",
    cursor: isContentLong ? "pointer" : "default",
    display: isContentExpanded ? "block" : "-webkit-box",
    WebkitLineClamp: isContentExpanded ? undefined : collapsedLines,
    WebkitBoxOrient: isContentExpanded ? undefined : "vertical",
    overflow: isContentExpanded ? "visible" : "hidden",
    maxHeight: isContentExpanded ? undefined : collapsedMaxHeight,
  };

  const handleToggleContent = () => {
    if (!isContentLong) return;
    setIsContentExpanded((prev) => !prev);
  };

  useEffect(() => {
    setLikes(blog.likes ?? 0);
    setDislikes(blog.dislikes ?? 0);
  }, [blog.likes, blog.dislikes]);

  useEffect(() => {
    const updateIsMobile = () => setIsMobile(window.innerWidth <= 576);
    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);
    return () => window.removeEventListener("resize", updateIsMobile);
  }, []);

  useEffect(() => {
    if (!user) {
      setHasLikedPost(false);
      setHasDislikedPost(false);
      return;
    }
    setHasLikedPost((blog.likedBy ?? []).includes(user.username));
    setHasDislikedPost((blog.dislikedBy ?? []).includes(user.username));
  }, [blog.likedBy, blog.dislikedBy, user]);

  useEffect(() => {
    const images: Record<string, string> = {};
    knownUsers.forEach((u) => {
      const resolved = resolveImageUrl(u.image);
      if (resolved) images[u.username] = resolved;
    });
    setUserImages(images);
  }, [knownUsers]);

  useEffect(() => {
    setComments(cachedComments);
  }, [cachedComments]);

  useEffect(() => {
    updateComments((prev) => resolveCommentAvatars(prev));
  }, [resolveCommentAvatars, updateComments]);

  useEffect(() => {
    prefetchComments();
  }, [blog._id, prefetchComments]);

  useEffect(() => {
    if (!showConversation) return;
    prefetchComments();
  }, [prefetchComments, showConversation]);

  useEffect(() => {
    setShowActionsMenu(false);
  }, [blog._id, user?.username]);

  useEffect(() => {
    if (!socket || !blog._id) return;

    const handleCommentCreated = (payload: { comment?: Comment }) => {
      if (!payload?.comment || payload.comment.postId !== blog._id) return;

      const mapped = mapCommentFromApi(payload.comment);

      updateComments((prev) => {
        const exists = mapped._id
          ? prev.some((comment) => comment._id === mapped._id)
          : false;
        if (exists) return prev;

        return [...prev, mapped].sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return aTime - bTime;
        });
      });
    };

    const handleCommentUpdated = (payload: { comment?: Comment }) => {
      if (!payload?.comment || payload.comment.postId !== blog._id) return;
      const mapped = mapCommentFromApi(payload.comment);

      updateComments((prev) => {
        const existingIndex = mapped._id
          ? prev.findIndex((comment) => comment._id === mapped._id)
          : -1;
        if (existingIndex === -1) return prev;

        const next = [...prev];
        next[existingIndex] = {
          ...mapped,
          showReplyInput: false,
          newReply: "",
        };
        return next;
      });
    };

    socket.on("comment-created", handleCommentCreated);
    socket.on("comment-updated", handleCommentUpdated);

    return () => {
      socket.off("comment-created", handleCommentCreated);
      socket.off("comment-updated", handleCommentUpdated);
    };
  }, [blog._id, mapCommentFromApi, socket, updateComments]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        showActionsMenu &&
        menuDropdownRef.current &&
        menuButtonRef.current &&
        !menuDropdownRef.current.contains(target) &&
        !menuButtonRef.current.contains(target)
      ) {
        setShowActionsMenu(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowActionsMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showActionsMenu]);

  useEffect(() => {
    if (!showActionsMenu || !isMobile) {
      setUseBottomSheet(false);
      return;
    }

    const updatePlacement = () => {
      const buttonRect = menuButtonRef.current?.getBoundingClientRect();
      const dropdownRect = menuDropdownRef.current?.getBoundingClientRect();

      if (!buttonRect || !dropdownRect) return;

      const viewportHeight = window.innerHeight;
      const dropdownBottom = buttonRect.bottom + dropdownRect.height + 24;
      const isNearBottom = buttonRect.bottom > viewportHeight - 120;
      const wouldOverflow = dropdownBottom > viewportHeight;

      setUseBottomSheet(isNearBottom || wouldOverflow);
    };

    requestAnimationFrame(updatePlacement);
    window.addEventListener("resize", updatePlacement);

    return () => {
      window.removeEventListener("resize", updatePlacement);
    };
  }, [isMobile, showActionsMenu]);

  const handleCommentSubmit = async () => {
    const text = newComment.trim();
    if (!text || !user || isSubmittingComment) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticComment: Comment = {
      _id: tempId,
      postId: blog._id,
      text,
      author: user.username,
      authorImage: resolveAvatar(user.image, user.username),
      likes: 0,
      dislikes: 0,
      likedBy: [],
      dislikedBy: [],
      replies: [],
      showReplyInput: false,
      newReply: "",
      createdAt: new Date().toISOString(),
      isPending: true,
    };

    setNewComment("");
    setIsSubmittingComment(true);
    updateComments((prev) => [...prev, optimisticComment]);

    let isSaved = false;

    if (blog._id) {
      try {
        const res = await fetch(apiUrl("/api/comments"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postId: blog._id,
            author: user.username,
            text,
          }),
        });

        if (!res.ok) throw new Error("Failed to submit comment");

        const data = await res.json();
        updateComments((prev) =>
          prev.map((comment) =>
            comment._id === tempId
              ? { ...mapCommentFromApi(data.comment), isPending: false }
              : comment
          )
        );
        void refreshComments();
        isSaved = true;
      } catch (error) {
        console.error("Unable to submit comment", error);
      }
    }

    if (!isSaved) {
      updateComments((prev) =>
        prev.filter((comment) => comment._id !== tempId)
      );
      setNewComment(text);
    }

    setIsSubmittingComment(false);
  };

  const handleLikeComment = async (index: number) => {
    const comment = comments[index];
    if (
      !user ||
      comment.likedBy?.includes(user.username) ||
      comment.dislikedBy?.includes(user.username)
    )
      return;
    updateComments((prev) =>
      prev.map((c, i) =>
        i === index
          ? {
              ...c,
              likes: c.likes + 1,
              likedBy: [...(c.likedBy ?? []), user.username],
            }
          : c
      )
    );
    if (comment._id) {
      try {
        const res = await fetch(apiUrl(`/api/comments/${comment._id}`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "like", username: user.username }),
        });
        if (res.ok) {
          const data = await res.json();
          updateComments((prev) =>
            prev.map((c, i) =>
              i === index
                ? {
                    ...c,
                    likes: data.comment.likes,
                    dislikes: data.comment.dislikes,
                  }
                : c
            )
          );
        }
      } catch {
        updateComments((prev) =>
          prev.map((c, i) =>
            i === index
              ? {
                  ...c,
                  likes: c.likes - 1,
                  likedBy: c.likedBy?.filter((u) => u !== user.username),
                }
              : c
          )
        );
      }
    }
  };

  const handleDislikeComment = async (index: number) => {
    const comment = comments[index];
    if (
      !user ||
      comment.dislikedBy?.includes(user.username) ||
      comment.likedBy?.includes(user.username)
    )
      return;
    updateComments((prev) =>
      prev.map((c, i) =>
        i === index
          ? {
              ...c,
              dislikes: c.dislikes + 1,
              dislikedBy: [...(c.dislikedBy ?? []), user.username],
            }
          : c
      )
    );
    if (comment._id) {
      try {
        const res = await fetch(apiUrl(`/api/comments/${comment._id}`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "dislike", username: user.username }),
        });
        if (res.ok) {
          const data = await res.json();
          updateComments((prev) =>
            prev.map((c, i) =>
              i === index
                ? {
                    ...c,
                    likes: data.comment.likes,
                    dislikes: data.comment.dislikes,
                  }
                : c
            )
          );
        }
      } catch {
        updateComments((prev) =>
          prev.map((c, i) =>
            i === index
              ? {
                  ...c,
                  dislikes: c.dislikes - 1,
                  dislikedBy: c.dislikedBy?.filter((u) => u !== user.username),
                }
              : c
          )
        );
      }
    }
  };

  const scrollToReplyInput = (key: string) => {
    const target = replyInputRefs.current[key];
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      const input = target.querySelector("input");
      if (input instanceof HTMLInputElement) {
        input.focus();
      }
    }
  };

  const setReplyInputVisibility = (index: number, shouldOpen: boolean) => {
    const comment = comments[index];
    if (!comment) return;

    const replyKey = comment._id ?? `local-${index}`;

    updateComments((prev) =>
      prev.map((c, i) => {
        if (i === index) {
          return { ...c, showReplyInput: shouldOpen };
        }

        return c.showReplyInput ? { ...c, showReplyInput: false } : c;
      })
    );

    if (shouldOpen) {
      requestAnimationFrame(() => scrollToReplyInput(replyKey));
    }
  };

  const toggleReplyInput = (index: number) => {
    const comment = comments[index];
    if (!comment) return;
    setReplyInputVisibility(index, !comment.showReplyInput);
  };

  const handleReplyChange = (index: number, value: string) => {
    updateComments((prev) =>
      prev.map((c, i) => (i === index ? { ...c, newReply: value } : c))
    );
  };

  const handleReplySubmit = async (index: number) => {
    const comment = comments[index];
    const text = comment.newReply.trim();
    if (!text || !user || !comment._id) return;
    const replyKey = comment._id ?? `local-${index}`;
    if (replySubmittingId === replyKey) return;

    const tempReplyId = `temp-reply-${Date.now()}`;
    const optimisticReply: Reply = {
      text,
      author: user.username,
      authorImage: resolveAvatar(user.image, user.username),
      tempId: tempReplyId,
      isPending: true,
    };

    setReplySubmittingId(replyKey);
    updateComments((prev) =>
      prev.map((c, i) =>
        i === index
          ? {
              ...c,
              replies: [...c.replies, optimisticReply],
              newReply: "",
              showReplyInput: false,
            }
          : c
      )
    );

    try {
      const res = await fetch(apiUrl(`/api/comments/${comment._id}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: user.username, text }),
      });

      if (!res.ok) throw new Error("Failed to submit reply");

      const data = await res.json();
      updateComments((prev) =>
        prev.map((c, i) =>
          i === index
            ? {
                ...mapCommentFromApi(data.comment),
                showReplyInput: false,
                newReply: "",
              }
            : c
        )
      );
      void refreshComments();
    } catch (error) {
      console.error("Unable to submit reply", error);
      updateComments((prev) =>
        prev.map((c, i) =>
          i === index
            ? {
                ...c,
                replies: c.replies.filter(
                  (reply) => reply.tempId !== tempReplyId
                ),
                newReply: text,
                showReplyInput: true,
              }
            : c
        )
      );
    } finally {
      setReplySubmittingId(null);
    }
  };

  const handleLikePost = async () => {
    if (!user || hasLikedPost || !blog._id) return;
    setLikes((prev) => prev + 1);
    setHasLikedPost(true);

    try {
      const res = await fetch(apiUrl(`/api/posts/${blog._id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "like", username: user.username }),
      });

      if (!res.ok) throw new Error("Failed");

      const { post } = await res.json();
      setLikes(post.likes);
      setDislikes(post.dislikes);
    } catch (error) {
      setLikes((prev) => prev - 1); // Revert on error
      setHasLikedPost(false);
      console.error("Failed to like post", error);
    }
  };

  const handleDislikePost = async () => {
    if (!user || hasDislikedPost || !blog._id) return;
    setDislikes((prev) => prev + 1);
    setHasDislikedPost(true);
    if (blog._id) {
      try {
        const res = await fetch(apiUrl(`/api/posts/${blog._id}`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "dislike", username: user.username }),
        });
        if (res.ok) {
          const data = await res.json();
          setLikes(data.post.likes);
          setDislikes(data.post.dislikes);
        } else {
          setDislikes((prev) => prev - 1);
          setHasDislikedPost(false);
        }
      } catch {
        setDislikes((prev) => prev - 1);
        setHasDislikedPost(false);
      }
    }
  };

  const handleDeletePost = async () => {
    if (!blog._id || !user) return;

    setIsDeleting(true);

    try {
      const res = await fetch(apiUrl(`/api/posts/${blog._id}`), {
        method: "DELETE",
      });
      if (res.ok) {
        onDelete?.(blog._id);
      } else {
        alert("Failed to delete the post. Please try again.");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete the post. Please try again.");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div
      className={`blog-card card border-0 shadow-lg w-100 mx-auto mb-4 position-relative ${
        isNight ? "bg-dark text-light" : "bg-white"
      }`}
      style={{
        maxWidth: "960px", // Keeps the card at a more compact width
        borderRadius: isMobile ? "16px" : "20px", // Slightly tighter rounding for a smaller footprint
        overflow: "hidden", // Prevents content from overflowing outside card edges
        border: `1px solid ${cardBorderColor}`, // Dynamic border color based on theme
      }}
    >
      {/* Header section with background gradient and author info */}
      <div
        className="blog-card__hero position-relative text-white"
        style={{
          background: headerGradient, // Dynamic background based on theme
          padding: isMobile ? "0.65rem 0.9rem" : "1.1rem 1.35rem",
        }}
      >
        <div className="blog-card__menu position-absolute top-0 end-0 m-2 m-md-3">
          {/* MENU-DOTS */}
          <button
            type="button"
            ref={menuButtonRef}
            className={`blog-card__menu-dots border-0 ${
              canManagePost ? "" : "blog-card__menu-dots--muted"
            }`}
            aria-label="Post actions"
            aria-haspopup="menu"
            aria-expanded={showActionsMenu}
            aria-controls={`blog-card-menu-${blog._id ?? "new"}`}
            onClick={() => setShowActionsMenu((prev) => !prev)}
          >
            <span className="blog-card__menu-icon" aria-hidden={true}>
              &#8942;
            </span>
            <span className="visually-hidden">Toggle actions menu</span>
          </button>

          {showActionsMenu && (
            <>
              <button
                type="button"
                className="blog-card__menu-backdrop"
                aria-label="Close actions menu"
                onClick={() => setShowActionsMenu(false)}
              />
              <div
                ref={menuDropdownRef}
                role="menu"
                id={`blog-card-menu-${blog._id ?? "new"}`}
                className={`blog-card__menu-dropdown ${
                  isMobile
                    ? useBottomSheet
                      ? "blog-card__menu-dropdown--mobile-sheet"
                      : "blog-card__menu-dropdown--mobile"
                    : "blog-card__menu-dropdown--desktop"
                } ${isNight ? "is-dark" : "is-light"}`}
                data-open={showActionsMenu}
              >
                {/* DELETE POST */}
                <div className="blog-card__menu-list" role="none">
                  <button
                    type="button"
                    className="blog-card__menu-item blog-card__menu-item--danger"
                    role="menuitem"
                    onClick={() => {
                      setShowActionsMenu(false);
                      setShowDeleteModal(true);
                    }}
                  >
                    <span
                      aria-hidden={true}
                      className="blog-card__menu-item-icon"
                    >
                      🗑️
                    </span>
                    <div className="blog-card__menu-item-copy">
                      <span className="blog-card__menu-item-title">
                        Delete post
                      </span>
                      <span className="blog-card__menu-item-subtitle">
                        Permanently remove this post
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        {/* Row: author avatar + title + author name */}
        <div
          className="blog-card__header d-flex flex-column gap-2 gap-md-3 align-items-start text-start"
          style={{
            gap: isMobile ? "0.55rem" : "0.9rem",
          }}
        >
          <div className="blog-card__author-row d-flex align-items-center w-100 gap-3 flex-wrap">
            <div className="blog-card__author-info d-flex align-items-center gap-3">
              {/* If author has an image, display it */}
              <button
                className="blog-card__avatar p-0 border-0 bg-transparent"
                aria-label={
                  isProfileNavigable
                    ? `View ${displayAuthor}'s profile`
                    : undefined
                }
                onClick={isProfileNavigable ? openAuthorProfile : undefined}
                disabled={!isProfileNavigable}
                style={{ cursor: isProfileNavigable ? "pointer" : "default" }}
                disabled={!displayAuthor}
              >
                {author?.image ? (
                  <img
                    src={author.image}
                    alt={author.username}
                    className="rounded-circle border border-3 border-white"
                    style={{
                      width: isMobile ? "40px" : "48px", // Avatar width
                      height: isMobile ? "40px" : "48px", // Avatar height
                      objectFit: "cover", // Ensures image fills the circle without distortion
                    }}
                  />
                ) : (
                  <div
                    className="rounded-circle bg-white text-primary fw-semibold d-flex align-items-center justify-content-center"
                    style={{
                      width: isMobile ? "40px" : "48px",
                      height: isMobile ? "40px" : "48px",
                    }}
                  >
                    {authorInitial}
                  </div>
                )}
              </button>

              <div className="blog-card__author-meta d-flex align-items-center gap-2 text-start">
                <span className="small text-white-50">By</span>
                <button
                  type="button"
                  className="btn btn-link p-0 align-baseline fw-semibold text-white text-start"
                  onClick={openAuthorProfile}
                  disabled={!displayAuthor}
                >
                  {displayAuthor || "Unknown"}
                </button>
              </div>
            </div>
          </div>

          {/* Blog title and author name section */}
          <div className="blog-card__title w-100">
            {/* Blog title */}
            <h3
              className="mb-1 fw-bold"
              style={{
                fontSize: isMobile ? "1.05rem" : undefined,
                lineHeight: 1.15,
              }}
            >
              {blog.title}
            </h3>
          </div>

          {!isMobile && (
            <div className="blog-card__stats d-flex flex-wrap align-items-center justify-content-center gap-2 mt-2 mt-md-0">
              {/* Display like count */}
              <span className={statBadgeClass}>❤️ {likes}</span>
              {/* Display dislike count */}
              <span className={statBadgeClass}>👎 {dislikes}</span>
              {/* Display comment count */}
              <span className={statBadgeClass}>💬 {totalComments}</span>
            </div>
          )}
        </div>
      </div>

      {blog.image && (
        <div
          className="blog-card__media position-relative overflow-hidden"
          style={{
            cursor: "pointer",
            width: "100%",
            maxHeight: isMobile ? "320px" : "360px",
            minHeight: isMobile ? "280px" : undefined,
            aspectRatio: isMobile ? "4 / 3" : "16 / 9",
            backgroundColor: isNight ? "#0f172a" : "#f8fafc",
            borderBottomLeftRadius: "0px",
            borderBottomRightRadius: "0px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Image container section with clickable behavior */}
          <img
            src={blog.image}
            alt="Blog Visual"
            className="card-img-top"
            style={coverImageStyle}
            onClick={() => setShowImageModal(true)}
          />

          {/* Transparent gradient overlay for visual depth */}
          <div
            className="position-absolute top-0 start-0 w-100 h-100"
            style={{
              pointerEvents: "none",
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.35) 100%)",
            }}
          />

          {/* Bottom-right floating badge prompting user interaction */}
          {!isMobile && (
            <button
              type="button"
              className="blog-card__expand position-absolute bottom-0 end-0 m-2 m-md-3 border-0 bg-transparent p-0"
              onClick={() => setShowImageModal(true)}
              aria-label="Expand image"
            >
              <span className="badge bg-dark bg-opacity-75 text-white rounded-pill px-2 py-1 px-md-3 py-md-2 d-flex align-items-center gap-2">
                <span className="tap-to-expand" aria-hidden="true">
                  🔍
                </span>
                <span className="tap-to-expand">Tap to expand</span>
              </span>
            </button>
          )}
        </div>
      )}

      {blog.image && isMobile && (
        <div className="px-3 pb-3">
          <button
            type="button"
            className="blog-card__expand w-100 border-0 bg-transparent p-0"
            onClick={() => setShowImageModal(true)}
            aria-label="Expand image"
          >
            <span className="badge bg-dark bg-opacity-75 text-white rounded-pill px-3 py-2 w-100 d-flex align-items-center justify-content-center gap-2">
              <span className="tap-to-expand" aria-hidden="true">
                🔍
              </span>
              <span className="tap-to-expand">Tap to expand</span>
            </span>
          </button>
        </div>
      )}

      <div
        className="blog-card__body card-body p-3"
        style={{
          padding: isMobile
            ? blog.image
              ? "0.5rem 0.9rem 0.95rem"
              : "0.75rem 0.9rem"
            : "1rem 1.25rem",
        }}
      >
        <p
          className="card-text fs-6 mb-2"
          style={contentStyle}
          onClick={handleToggleContent}
          onKeyDown={(event) => {
            if (!isContentLong) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleToggleContent();
            }
          }}
          role={isContentLong ? "button" : undefined}
          tabIndex={isContentLong ? 0 : undefined}
          aria-expanded={isContentLong ? isContentExpanded : undefined}
          aria-label={
            isContentLong
              ? isContentExpanded
                ? "Collapse blog content"
                : "Expand blog content"
              : undefined
          }
          title={
            isContentLong
              ? isContentExpanded
                ? "Click to collapse"
                : "Click to read more"
              : undefined
          }
        >
          {blog.content}
        </p>
        {isContentLong && (
          <small
            className={`d-inline-block ${mutedTextClass}`}
            role="presentation"
            aria-hidden="true"
          >
            {isContentExpanded ? "Show less" : "Show more"}
          </small>
        )}

        <div className="blog-card__footer d-flex flex-column flex-md-row gap-3 mt-4 align-items-start align-items-md-center w-100">
          {isMobile ? (
            <div className="blog-card__mobile-cta w-100">
              <div className="blog-card__mobile-actions-grid">
                <button
                  className={`btn btn-sm btn-success rounded-pill d-flex align-items-center gap-2 ${actionButtonPadding}`}
                  onClick={handleLikePost}
                  disabled={hasLikedPost || !user}
                  style={{ fontSize: "0.95rem" }}
                >
                  <span>👍</span>
                  <span className="badge bg-white text-success ms-1">
                    {likes}
                  </span>
                </button>

                <button
                  className={`btn btn-sm btn-outline-danger rounded-pill d-flex align-items-center gap-2 ${actionButtonPadding}`}
                  onClick={handleDislikePost}
                  disabled={hasDislikedPost || !user}
                  style={{ fontSize: "0.95rem" }}
                >
                  <span>👎</span>
                  <span className="badge bg-light text-danger ms-1">
                    {dislikes}
                  </span>
                </button>

                <button
                  className={`btn btn-sm rounded-pill d-flex align-items-center gap-2 ${actionButtonPadding} ${
                    isNight ? "btn-outline-light" : "btn-outline-secondary"
                  }`}
                  onClick={() => {
                    const shareText = `${blog.title}\n\n${blog.content}\n\nShared from Blog App`;
                    const shareUrl = window.location.href;
                    if (navigator.share) {
                      navigator
                        .share({
                          title: blog.title,
                          text: shareText,
                          url: shareUrl,
                        })
                        .catch((err) => console.error("Share failed", err));
                    } else {
                      navigator.clipboard.writeText(
                        `${shareText}\n\n${shareUrl}`
                      );
                      alert("Link copied to clipboard!");
                    }
                  }}
                  style={{ fontSize: "0.95rem" }}
                >
                  <span>⤴</span>
                  <span>Share</span>
                </button>

                <button
                  className={`btn btn-sm rounded-pill d-flex align-items-center gap-2 ${actionButtonPadding} ${
                    isNight ? "btn-outline-light" : "btn-outline-secondary"
                  }`}
                  onClick={() => {
                    if (!showConversation) prefetchComments();
                    setShowConversation((prev) => !prev);
                  }}
                  onMouseEnter={prefetchComments}
                  onFocus={prefetchComments}
                  style={{ fontSize: "0.95rem" }}
                  aria-pressed={showConversation}
                >
                  <span>💬</span>
                  <span>{showConversation ? "Hide chat" : "Comments"}</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="blog-card__actions d-flex flex-wrap gap-2 align-items-center">
                <button
                  className={`btn btn-sm btn-success rounded-pill d-flex align-items-center gap-2 ${actionButtonPadding}`}
                  onClick={handleLikePost}
                  disabled={hasLikedPost || !user}
                  style={{ fontSize: isMobile ? "0.9rem" : undefined }}
                >
                  <span>👍</span>
                  <span className="badge bg-white text-success ms-1">
                    {likes}
                  </span>
                </button>

                <button
                  className={`btn btn-sm btn-outline-danger rounded-pill d-flex align-items-center gap-2 ${actionButtonPadding}`}
                  onClick={handleDislikePost}
                  disabled={hasDislikedPost || !user}
                  style={{ fontSize: isMobile ? "0.9rem" : undefined }}
                >
                  <span>👎</span>
                  <span className="badge bg-light text-danger ms-1">
                    {dislikes}
                  </span>
                </button>
                <button
                  className={`btn btn-sm rounded-pill d-flex align-items-center gap-2 ${actionButtonPadding} ${
                    isNight ? "btn-outline-light" : "btn-outline-secondary"
                  }`}
                  onClick={() => {
                    const shareText = `${blog.title}\n\n${blog.content}\n\nShared from Blog App`;
                    const shareUrl = window.location.href;
                    if (navigator.share) {
                      navigator
                        .share({
                          title: blog.title,
                          text: shareText,
                          url: shareUrl,
                        })
                        .catch((err) => console.error("Share failed", err));
                    } else {
                      navigator.clipboard.writeText(
                        `${shareText}\n\n${shareUrl}`
                      );
                      alert("Link copied to clipboard!");
                    }
                  }}
                  style={{ fontSize: isMobile ? "0.9rem" : undefined }}
                >
                  <span>⤴</span>
                  <span>Share</span>
                </button>

                <button
                  className={`btn btn-sm rounded-pill d-flex align-items-center gap-2 ${actionButtonPadding} ${
                    isNight ? "btn-outline-light" : "btn-outline-secondary"
                  }`}
                  onClick={() => {
                    if (!showConversation) prefetchComments();
                    setShowConversation((prev) => !prev);
                  }}
                  onMouseEnter={prefetchComments}
                  onFocus={prefetchComments}
                  style={{ fontSize: isMobile ? "0.9rem" : undefined }}
                  aria-pressed={showConversation}
                >
                  <span>💬</span>
                  <span>{showConversation ? "Hide chat" : "Comments"}</span>
                </button>
              </div>
            </>
          )}
        </div>

        {showConversation && (
          /* Comments Section */
          <div
            className={`conversation-card ${
              isMobile ? "mt-3" : "mt-5"
            } rounded-4 p-md-4 p-3 ${
              isNight ? "bg-secondary bg-opacity-25" : "bg-light"
            }`}
          >
            <div className="conversation-header d-flex flex-column flex-md-row gap-2 justify-content-between align-items-start align-items-md-center mb-3">
              <div>
                <h5 className="mb-1 d-flex align-items-center gap-2">
                  <span>💬</span>
                  <span>Conversation</span>
                </h5>
                <p
                  className={`community-subtitle mb-0 small ${mutedTextClass}`}
                >
                  {totalComments === 0
                    ? "Be the first to start the discussion."
                    : `Join ${totalComments} ${
                        totalComments === 1 ? "comment" : "comments"
                      } from the community.`}
                </p>
              </div>
              {totalComments > 0 && (
                <button
                  className="btn btn-sm btn-outline-primary rounded-pill view-all-btn"
                  onClick={() => {
                    prefetchComments();
                    setShowCommentsModal(true);
                  }}
                  onMouseEnter={prefetchComments}
                  onFocus={prefetchComments}
                >
                  View all
                </button>
              )}
            </div>

            {comments.length === 0 ? (
              <div
                className={`p-4 rounded-4 text-center ${mutedTextClass}`}
                style={{
                  border: `2px dashed ${
                    isNight ? "rgba(255,255,255,0.25)" : "rgba(59,130,246,0.35)"
                  }`,
                }}
              >
                <p className="mb-0">
                  No comments yet. Share your thoughts below!
                </p>
              </div>
            ) : (
              <div className="conversation-comment-wrapper mb-3">
                <ul className="conversation-comment-list list-unstyled mb-0">
                  {(showAllComments ? comments : comments.slice(-3)).map(
                    (comment, idx) => {
                      const commentAvatar = resolveAvatar(
                        comment.authorImage,
                        comment.author
                      );
                      const replyKey = comment._id ?? `local-${idx}`;
                      const isCommentPending =
                        comment.isPending || !comment._id;
                      const isReplySending = replySubmittingId === replyKey;
                      const canSendReply = Boolean(
                        user &&
                          comment._id &&
                          comment.newReply.trim() &&
                          !isReplySending
                      );

                      return (
                        <li
                          key={comment._id ?? idx}
                          className={`conversation-comment-item rounded-4 shadow-sm ${
                            isNight
                              ? "bg-dark bg-opacity-75 text-white"
                              : "bg-white"
                          }`}
                        >
                          <div className="conversation-comment">
                            <div className="conversation-comment__main">
                              <div className="conversation-comment__avatar">
                                <button
                                  type="button"
                                  className="p-0 border-0 bg-transparent"
                                  onClick={() =>
                                    openUserProfile(comment.author)
                                  }
                                  aria-label={`View ${comment.author}'s profile`}
                                >
                                  {commentAvatar ? (
                                    <img
                                      src={commentAvatar}
                                      alt={`${comment.author}'s avatar`}
                                      className="conversation-comment__avatar-image"
                                    />
                                  ) : (
                                    <span
                                      className={`conversation-comment__avatar-fallback ${
                                        isNight
                                          ? "bg-secondary text-white"
                                          : "bg-primary bg-opacity-10 text-primary"
                                      }`}
                                    >
                                      {comment.author
                                        ?.charAt(0)
                                        ?.toUpperCase() || "?"}
                                    </span>
                                  )}
                                </button>
                              </div>

                              <div className="conversation-comment__body">
                                <div className="conversation-comment__meta">
                                  <span
                                    className={`conversation-comment__author ${
                                      isNight
                                        ? "text-primary text-opacity-75"
                                        : "text-primary"
                                    }`}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() =>
                                      openUserProfile(comment.author)
                                    }
                                    onKeyDown={(event) => {
                                      if (
                                        event.key === "Enter" ||
                                        event.key === " "
                                      ) {
                                        event.preventDefault();
                                        openUserProfile(comment.author);
                                      }
                                    }}
                                  >
                                    {comment.author}
                                  </span>
                                </div>

                                <p
                                  className={`conversation-comment__text ${
                                    isNight ? "text-light" : "text-body"
                                  }`}
                                >
                                  {comment.text}
                                </p>

                                <div className="conversation-comment__actions">
                                  <button
                                    type="button"
                                    className="reaction-button"
                                    onClick={() => handleLikeComment(idx)}
                                    disabled={
                                      !user ||
                                      isCommentPending ||
                                      comment.likedBy?.includes(
                                        user.username
                                      ) ||
                                      comment.dislikedBy?.includes(
                                        user.username
                                      )
                                    }
                                  >
                                    👍{" "}
                                    <span className="reaction-count">
                                      {comment.likes}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    className="reaction-button"
                                    onClick={() => handleDislikeComment(idx)}
                                    disabled={
                                      !user ||
                                      isCommentPending ||
                                      comment.likedBy?.includes(
                                        user.username
                                      ) ||
                                      comment.dislikedBy?.includes(
                                        user.username
                                      )
                                    }
                                  >
                                    👎{" "}
                                    <span className="reaction-count">
                                      {comment.dislikes}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    className="reaction-button"
                                    onClick={() => toggleReplyInput(idx)}
                                    disabled={
                                      !user ||
                                      isCommentPending ||
                                      isReplySending
                                    }
                                  >
                                    💬 Reply
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Replies */}
                          {comment.replies.length > 0 && (
                            <ul className="mt-2 ps-3 list-unstyled conversation-reply-list">
                              {comment.replies.map((reply, rIdx) => {
                                const replyAvatar = resolveAvatar(
                                  reply.authorImage,
                                  reply.author
                                );

                                return (
                                  <li
                                    key={reply.tempId ?? rIdx}
                                    className={`conversation-reply d-flex align-items-start gap-2 ${
                                      theme === "night"
                                        ? "text-light"
                                        : "text-muted"
                                    } small mb-2`}
                                  >
                                    <button
                                      type="button"
                                      className="conversation-reply__avatar p-0 border-0 bg-transparent"
                                      onClick={() =>
                                        openUserProfile(reply.author)
                                      }
                                      aria-label={`View ${reply.author}'s profile`}
                                    >
                                      {replyAvatar ? (
                                        <img
                                          src={replyAvatar}
                                          alt={`${reply.author}'s avatar`}
                                          className="rounded-circle conversation-reply__avatar-image"
                                        />
                                      ) : (
                                        <span
                                          className={`conversation-reply__avatar-fallback d-inline-flex align-items-center justify-content-center rounded-circle ${
                                            isNight
                                              ? "bg-secondary text-white"
                                              : "bg-primary bg-opacity-10 text-primary"
                                          }`}
                                        >
                                          {reply.author
                                            ?.charAt(0)
                                            ?.toUpperCase() || "?"}
                                        </span>
                                      )}
                                    </button>

                                    <div className="conversation-reply__body">
                                      <div className="conversation-reply__header">
                                        <button
                                          type="button"
                                          className="fw-semibold p-0 border-0 bg-transparent text-start conversation-reply__author"
                                          onClick={() =>
                                            openUserProfile(reply.author)
                                          }
                                          onKeyDown={(event) => {
                                            if (
                                              event.key === "Enter" ||
                                              event.key === " "
                                            ) {
                                              event.preventDefault();
                                              openUserProfile(reply.author);
                                            }
                                          }}
                                          aria-label={`View ${reply.author}'s profile`}
                                        >
                                          {reply.author}
                                        </button>
                                      </div>
                                      <div
                                        className="conversation-reply__text conversation-reply__bubble text-muted"
                                        role="button"
                                        tabIndex={0}
                                        onClick={() =>
                                          setReplyInputVisibility(idx, true)
                                        }
                                        onKeyDown={(event) => {
                                          if (
                                            event.key === "Enter" ||
                                            event.key === " "
                                          ) {
                                            event.preventDefault();
                                            setReplyInputVisibility(idx, true);
                                          }
                                        }}
                                      >
                                        {reply.text}
                                      </div>
                                      {reply.isPending && (
                                        <span className="badge bg-secondary bg-opacity-25 text-secondary ms-auto">
                                          Sending...
                                        </span>
                                      )}
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          )}

                          {/* Reply Input */}
                          {comment.showReplyInput && (
                            <div
                              className="d-flex gap-2 mt-2 align-items-center reply-input-row"
                              ref={(el) => {
                                const key = comment._id ?? `local-${idx}`;
                                replyInputRefs.current[key] = el;
                              }}
                            >
                              <input
                                type="text"
                                className="form-control form-control-sm reply-inline-input"
                                placeholder={
                                  user
                                    ? "Write a reply..."
                                    : "Sign in to reply to this comment"
                                }
                                value={comment.newReply}
                                onChange={(e) =>
                                  handleReplyChange(idx, e.target.value)
                                }
                                disabled={isReplySending || !user}
                              />
                              <button
                                className="btn btn-sm btn-primary reply-inline-send"
                                onClick={() => handleReplySubmit(idx)}
                                disabled={!canSendReply}
                              >
                                {isReplySending ? "Sending..." : "Send"}
                              </button>
                            </div>
                          )}
                        </li>
                      );
                    }
                  )}
                </ul>
              </div>
            )}

            {/* Add Comment Input */}
            <div className="comment-input-panel">
              <label className="form-label mb-2 fw-semibold text-muted small d-none d-md-block">
                Join the conversation
              </label>
              <div className="comment-input-group">
                <input
                  type="text"
                  className="form-control comment-input"
                  placeholder={
                    user
                      ? "Write a comment..."
                      : "Sign in to join the conversation"
                  }
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={isSubmittingComment || !user}
                />
                <button
                  className="btn btn-primary comment-send-btn"
                  onClick={handleCommentSubmit}
                  disabled={!newComment.trim() || !user || isSubmittingComment}
                >
                  {isSubmittingComment ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* showDeleteModal */}
      {showDeleteModal && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => !isDeleting && setShowDeleteModal(false)}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            role="document"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Delete</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                />
              </div>
              <div className="modal-body">
                Are you sure you want to delete this post?
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDeletePost}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                      ></span>
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* showCommentsModal */}
      {showCommentsModal && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
          onClick={() => setShowCommentsModal(false)}
        >
          <div
            className="modal-dialog modal-fullscreen-sm-down modal-dialog-centered comments-modal__dialog"
            role="document"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`modal-content comments-modal__shell ${
                theme === "night" ? "bg-dark text-white" : ""
              }`}
            >
              <div className="modal-header border-0 pb-2 comments-modal__header">
                <div className="d-flex flex-column gap-1">
                  <h5 className="modal-title mb-0">All Comments</h5>
                  <p className="comments-modal__subtle mb-0">
                    {totalComments} comment{totalComments === 1 ? "" : "s"} ·
                    Tap a comment to reply
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCommentsModal(false)}
                  aria-label="Close"
                />
              </div>

              <div className="modal-body comments-modal__body">
                <div className="comments-modal__scroll">
                  <ul className="conversation-comment-list list-unstyled mb-0">
                    {comments.map((comment, idx) => {
                      const commentAvatar = resolveAvatar(
                        comment.authorImage,
                        comment.author
                      );
                      const replyKey = comment._id ?? `local-${idx}`;
                      const isCommentPending =
                        comment.isPending || !comment._id;
                      const isReplySending = replySubmittingId === replyKey;
                      const canSendReply = Boolean(
                        user &&
                          comment._id &&
                          comment.newReply.trim() &&
                          !isReplySending
                      );

                      return (
                        <li
                          key={comment._id ?? idx}
                          className={`conversation-comment-item rounded-4 shadow-sm ${
                            theme === "night"
                              ? "bg-dark bg-opacity-75 text-white"
                              : "bg-white"
                          }`}
                        >
                          <div className="conversation-comment">
                            <div className="conversation-comment__main">
                              <div className="conversation-comment__avatar">
                                <button
                                  type="button"
                                  className="p-0 border-0 bg-transparent"
                                  onClick={() =>
                                    openUserProfile(comment.author)
                                  }
                                  aria-label={`View ${comment.author}'s profile`}
                                >
                                  {commentAvatar ? (
                                    <img
                                      src={commentAvatar}
                                      alt={`${comment.author}'s avatar`}
                                      className="conversation-comment__avatar-image"
                                    />
                                  ) : (
                                    <span
                                      className={`conversation-comment__avatar-fallback ${
                                        theme === "night"
                                          ? "bg-secondary text-white"
                                          : "bg-primary bg-opacity-10 text-primary"
                                      }`}
                                    >
                                      {comment.author
                                        ?.charAt(0)
                                        ?.toUpperCase() || "?"}
                                    </span>
                                  )}
                                </button>
                              </div>
                              <div className="conversation-comment__body">
                                <div className="conversation-comment__meta">
                                  <span
                                    className={`conversation-comment__author ${
                                      theme === "night"
                                        ? "text-primary text-opacity-75"
                                        : "text-primary"
                                    }`}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() =>
                                      openUserProfile(comment.author)
                                    }
                                    onKeyDown={(event) => {
                                      if (
                                        event.key === "Enter" ||
                                        event.key === " "
                                      ) {
                                        event.preventDefault();
                                        openUserProfile(comment.author);
                                      }
                                    }}
                                  >
                                    {comment.author}
                                  </span>
                                </div>
                                <p
                                  className={`conversation-comment__text ${
                                    theme === "night"
                                      ? "text-light"
                                      : "text-body"
                                  }`}
                                >
                                  {comment.text}
                                </p>
                                <div className="conversation-comment__actions">
                                  <button
                                    type="button"
                                    className="reaction-button"
                                    onClick={() => handleLikeComment(idx)}
                                    disabled={
                                      !user ||
                                      isCommentPending ||
                                      comment.likedBy?.includes(
                                        user.username
                                      ) ||
                                      comment.dislikedBy?.includes(
                                        user.username
                                      )
                                    }
                                  >
                                    👍{" "}
                                    <span className="reaction-count">
                                      {comment.likes}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    className="reaction-button"
                                    onClick={() => handleDislikeComment(idx)}
                                    disabled={
                                      !user ||
                                      isCommentPending ||
                                      comment.likedBy?.includes(
                                        user.username
                                      ) ||
                                      comment.dislikedBy?.includes(
                                        user.username
                                      )
                                    }
                                  >
                                    👎{" "}
                                    <span className="reaction-count">
                                      {comment.dislikes}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    className="reaction-button"
                                    onClick={() => toggleReplyInput(idx)}
                                    disabled={
                                      !user ||
                                      isCommentPending ||
                                      isReplySending
                                    }
                                  >
                                    💬 Reply
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Replies */}
                          {comment.replies.length > 0 && (
                            <ul className="mt-2 ps-3 list-unstyled conversation-reply-list">
                              {comment.replies.map((reply, rIdx) => {
                                const replyAvatar = resolveAvatar(
                                  reply.authorImage,
                                  reply.author
                                );

                                return (
                                  <li
                                    key={reply.tempId ?? rIdx}
                                    className={`conversation-reply d-flex align-items-start gap-2 ${
                                      theme === "night"
                                        ? "text-light"
                                        : "text-muted"
                                    } small mb-2`}
                                  >
                                    <button
                                      type="button"
                                      className="conversation-reply__avatar p-0 border-0 bg-transparent"
                                      onClick={() =>
                                        openUserProfile(reply.author)
                                      }
                                      aria-label={`View ${reply.author}'s profile`}
                                    >
                                      {replyAvatar ? (
                                        <img
                                          src={replyAvatar}
                                          alt={`${reply.author}'s avatar`}
                                          className="rounded-circle conversation-reply__avatar-image"
                                        />
                                      ) : (
                                        <span
                                          className={`conversation-reply__avatar-fallback d-inline-flex align-items-center justify-content-center rounded-circle ${
                                            theme === "night"
                                              ? "bg-secondary text-white"
                                              : "bg-primary bg-opacity-10 text-primary"
                                          }`}
                                        >
                                          {reply.author
                                            ?.charAt(0)
                                            ?.toUpperCase() || "?"}
                                        </span>
                                      )}
                                    </button>

                                    <div className="conversation-reply__body">
                                      <div className="conversation-reply__header">
                                        <button
                                          type="button"
                                          className="fw-semibold p-0 border-0 bg-transparent text-start conversation-reply__author"
                                          onClick={() =>
                                            openUserProfile(reply.author)
                                          }
                                          onKeyDown={(event) => {
                                            if (
                                              event.key === "Enter" ||
                                              event.key === " "
                                            ) {
                                              event.preventDefault();
                                              openUserProfile(reply.author);
                                            }
                                          }}
                                          aria-label={`View ${reply.author}'s profile`}
                                        >
                                          {reply.author}
                                        </button>
                                      </div>
                                      <div
                                        className="conversation-reply__text conversation-reply__bubble text-muted"
                                        role="button"
                                        tabIndex={0}
                                        onClick={() =>
                                          setReplyInputVisibility(idx, true)
                                        }
                                        onKeyDown={(event) => {
                                          if (
                                            event.key === "Enter" ||
                                            event.key === " "
                                          ) {
                                            event.preventDefault();
                                            setReplyInputVisibility(idx, true);
                                          }
                                        }}
                                      >
                                        {reply.text}
                                      </div>
                                      {reply.isPending && (
                                        <span className="badge bg-secondary bg-opacity-25 text-secondary ms-auto">
                                          Sending...
                                        </span>
                                      )}
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          )}

                          {/* Reply Input */}
                          {comment.showReplyInput && (
                            <div
                              className="d-flex gap-2 mt-2 align-items-center reply-input-row"
                              ref={(el) => {
                                const key = comment._id ?? `local-${idx}`;
                                replyInputRefs.current[key] = el;
                              }}
                            >
                              <input
                                type="text"
                                className="form-control form-control-sm reply-inline-input"
                                placeholder={
                                  user
                                    ? "Write a reply..."
                                    : "Sign in to reply to this comment"
                                }
                                value={comment.newReply}
                                onChange={(e) =>
                                  handleReplyChange(idx, e.target.value)
                                }
                                disabled={isReplySending || !user}
                              />
                              <button
                                className="btn btn-sm btn-primary reply-inline-send"
                                onClick={() => handleReplySubmit(idx)}
                                disabled={!canSendReply}
                              >
                                {isReplySending ? "Sending..." : "Send"}
                              </button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="comment-input-panel comments-modal__composer">
                  <label className="form-label mb-2 fw-semibold text-muted small">
                    Join the conversation
                  </label>
                  <div className="comment-input-group">
                    <input
                      type="text"
                      className="form-control comment-input"
                      placeholder={
                        user
                          ? "Write a comment..."
                          : "Sign in to join the conversation"
                      }
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      disabled={isSubmittingComment || !user}
                    />
                    <button
                      className="btn btn-primary comment-send-btn"
                      onClick={handleCommentSubmit}
                      disabled={
                        !newComment.trim() || !user || isSubmittingComment
                      }
                    >
                      {isSubmittingComment ? "Sending..." : "Send"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && blog.image && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
          aria-modal="true"
          aria-labelledby="expanded-image-title"
          onClick={() => setShowImageModal(false)}
        >
          <div className="modal-dialog modal-fullscreen" role="document">
            <div className="modal-content bg-black text-white border-0">
              <div className="modal-header border-0 align-items-start gap-3 px-4 px-md-5 pt-4 pb-0">
                <div className="d-flex flex-column gap-1">
                  <h2
                    id="expanded-image-title"
                    className="h5 mb-0 text-white"
                    style={{ lineHeight: 1.35 }}
                  >
                    {blog.title}
                  </h2>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white ms-auto"
                  onClick={() => setShowImageModal(false)}
                  aria-label="Close expanded image"
                />
              </div>
              <div className="modal-body p-0 position-relative bg-black d-flex justify-content-center align-items-center">
                <img
                  src={blog.image}
                  alt={blog.title || "Full Blog View"}
                  className="expanded-image"
                  style={{
                    ...coverImageBaseStyle,
                    objectFit: "contain",
                    width: "100%",
                    height: "100%",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`
        .blog-card__header {
          width: 100%;
        }

        .blog-card__author-row {
          width: 100%;
        }

        .blog-card__author-info {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
        }

        .blog-card__author-meta button {
          text-decoration: none;
        }

        .blog-card__stats span {
          font-size: 0.95rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          min-height: 36px;
        }

        .blog-card__menu {
          z-index: 2;
          position: relative;
        }

        .blog-card__menu-dots {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
          color: ${isNight ? "#e2e8f0" : "#0f172a"};
          background: transparent;
          border: none;
          padding: 0.25rem;
          min-height: auto;
          min-width: auto;
          cursor: pointer;
          box-shadow: none;
          transition: transform 120ms ease, box-shadow 120ms ease,
            background 120ms ease, border-color 120ms ease;
        }

        .blog-card__menu-dots:hover,
        .blog-card__menu-dots:focus-visible {
          background: transparent;
          border-color: transparent;
          transform: translateY(-1px) scale(1.02);
          outline: none;
          box-shadow: none;
        }

        .blog-card__menu-dots:active {
          transform: translateY(0);
        }

        .blog-card__menu-dots--muted {
          opacity: 0.85;
        }

        .blog-card__menu-icon {
          font-size: 1.25rem;
          letter-spacing: 0.1em;
        }

        .blog-card__menu-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.3);
          border: none;
          padding: 0;
          margin: 0;
          z-index: 2;
          cursor: pointer;
        }

        .blog-card__menu-dropdown {
          position: absolute;
          inset-inline-end: 0;
          top: calc(100% + 0.4rem);
          min-width: 230px;
          max-width: min(320px, calc(100vw - 1.5rem));
          border-radius: 12px;
          padding: 1rem 1.15rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 120, 150, 0.25);
          opacity: 0;
          transform: translateY(-6px) scale(0.95);
          transform-origin: top right;
          transition: opacity 180ms ease, transform 180ms ease;
          z-index: 2;
          background-clip: padding-box;
        }

        .blog-card__menu-dropdown[data-open="true"] {
          opacity: 1;
        }

        .blog-card__menu-dropdown.is-light {
          background: #ffffff;
          color: #0f172a;
        }

        .blog-card__menu-dropdown.is-dark {
          background: linear-gradient(
            135deg,
            rgba(30, 41, 59, 0.96),
            rgba(15, 23, 42, 0.96)
          );
          color: #e2e8f0;
        }

        .blog-card__menu-dropdown--desktop[data-open="true"] {
          transform: translateY(0) scale(1);
        }

        .blog-card__menu-dropdown--mobile {
          position: absolute;
          right: 0;
          top: 0;
          transform: translate(-4px, 48px) scale(0.95);
          max-width: min(260px, calc(100vw - 1.5rem));
          width: max-content;
          padding: 0.85rem 1rem;
          border-radius: 12px;
          transform-origin: top right;
        }

        .blog-card__menu-dropdown--mobile[data-open="true"] {
          transform: translate(-4px, 48px) scale(1);
        }

        .blog-card__menu-dropdown--mobile-sheet {
          position: fixed;
          right: auto;
          left: 50%;
          bottom: 1.25rem;
          top: auto;
          transform: translate(-50%, 16px) scale(0.95);
          width: min(520px, calc(100vw - 1.5rem));
          margin-top: 0;
          border-radius: 16px;
          padding: 1.15rem 1.25rem;
          transform-origin: center bottom;
        }

        .blog-card__menu-dropdown--mobile-sheet[data-open="true"] {
          transform: translate(-50%, 0) scale(1);
        }

        .blog-card__menu-list {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .blog-card__menu-item {
          width: 100%;
          display: flex;
          align-items: flex-start;
          gap: 0.7rem;
          padding: 0.95rem 1.05rem;
          border-radius: 12px;
          border: 1px solid transparent;
          background: ${isNight ? "rgba(255,255,255,0.05)" : "#f8fafc"};
          color: inherit;
          text-align: left;
          cursor: pointer;
          min-height: 60px;
          transition: background 120ms ease, border-color 120ms ease,
            transform 120ms ease;
        }

        .blog-card__menu-item:hover,
        .blog-card__menu-item:focus-visible {
          outline: none;
          background: ${isNight ? "rgba(255,255,255,0.09)" : "#eef2ff"};
          border-color: ${isNight ? "rgba(148,163,184,0.35)" : "#cbd5e1"};
          transform: translateY(-1px);
        }

        .blog-card__menu-item--danger {
          background: ${isNight ? "rgba(190,24,93,0.08)" : "#fff1f2"};
          color: ${isNight ? "#fecdd3" : "#b91c1c"};
          border-color: ${isNight ? "rgba(248,113,113,0.35)" : "#fecdd3"};
        }

        .blog-card__menu-item--danger:hover,
        .blog-card__menu-item--danger:focus-visible {
          background: ${isNight ? "rgba(248,113,113,0.16)" : "#ffe4e6"};
          border-color: ${isNight ? "rgba(248,113,113,0.55)" : "#fca5a5"};
          color: ${isNight ? "#fecdd3" : "#991b1b"};
        }

        .blog-card__menu-item--muted {
          background: ${isNight ? "rgba(255,255,255,0.04)" : "#f8fafc"};
          border-color: ${isNight ? "rgba(148,163,184,0.25)" : "#e2e8f0"};
          color: ${isNight ? "#cbd5e1" : "#475569"};
          cursor: default;
        }

        .blog-card__menu-item--muted:hover,
        .blog-card__menu-item--muted:focus-visible {
          transform: none;
          background: ${isNight ? "rgba(255,255,255,0.05)" : "#eef2ff"};
          border-color: ${isNight ? "rgba(148,163,184,0.35)" : "#cbd5e1"};
        }

        .blog-card__menu-item-icon {
          font-size: 1.125rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 1.75rem;
          height: 1.75rem;
          line-height: 1;
          margin-top: 0.05rem;
        }

        .blog-card__menu-item-copy {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .blog-card__menu-item-title {
          font-weight: 700;
          font-size: 1rem;
        }

        .blog-card__menu-item-subtitle {
          font-size: 0.9rem;
          color: ${isNight ? "#cbd5e1" : "#475569"};
        }

        .visually-hidden {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          border: 0;
          white-space: nowrap;
        }

        .expanded-image {
          width: 100%;
          height: 100%;
          max-height: calc(100vh - 160px);
          background-color: #000;
        }

        .expanded-image__caption {
          position: absolute;
          inset: auto 0 0 0;
          background: linear-gradient(
            180deg,
            rgba(0, 0, 0, 0) 0%,
            rgba(0, 0, 0, 0.75) 60%
          );
          padding: 1rem 1.25rem 1.5rem;
          display: flex;
          justify-content: center;
        }

        .expanded-image__caption-inner {
          width: min(1040px, 100%);
          color: #e2e8f0;
          text-align: center;
          letter-spacing: 0.02em;
        }

        .expanded-image__hint {
          color: #e2e8f0;
          letter-spacing: 0.05em;
          opacity: 0.85;
        }

        @media (min-width: 577px) {
          .blog-card__menu-dropdown--mobile {
            position: absolute;
            left: auto;
            right: 0;
            top: 0%;
            bottom: auto;
            transform: translate(-4px, 48px) scale(0.95);
            width: auto;
            padding: 0.85rem 1rem;
            border-radius: 12px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .blog-card__menu-dots,
          .blog-card__menu-dropdown,
          .blog-card__menu-dropdown--mobile,
          .blog-card__menu-dropdown--mobile-sheet,
          .blog-card__menu-item {
            transition: none;
            transform: none;
          }
        }

        .comments-modal__dialog {
          width: 94%;
          max-width: 900px;
        }

        .comments-modal__shell {
          border-radius: 16px;
          overflow: hidden;
        }

        .comments-modal__header {
          position: sticky;
          top: 0;
          z-index: 2;
          background: ${isNight
            ? "rgba(15,23,42,0.9)"
            : "rgba(255,255,255,0.95)"};
          border-bottom: 1px solid
            ${isNight ? "rgba(255,255,255,0.08)" : "#e5e7eb"};
          backdrop-filter: blur(6px);
        }

        .comments-modal__subtle {
          font-size: 0.92rem;
          color: ${isNight ? "#cbd5e1" : "#475569"};
        }

        .comments-modal__body {
          background: ${isNight
            ? "linear-gradient(180deg, rgba(15,23,42,0.85), rgba(30,41,59,0.95))"
            : "#f8fafc"};
          padding: 0.75rem 0.85rem 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .comments-modal__scroll {
          max-height: 60vh;
          overflow-y: auto;
          padding: 0.25rem 0.25rem 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .comments-modal__composer {
          position: sticky;
          bottom: 0;
          border-top: none;
          margin-top: 0;
          background: ${isNight ? "rgba(15,23,42,0.95)" : "#ffffff"};
          border: 1px solid ${isNight ? "rgba(255,255,255,0.08)" : "#e2e8f0"};
          box-shadow: 0 12px 32px
            ${isNight ? "rgba(0,0,0,0.35)" : "rgba(15,23,42,0.08)"};
          border-radius: 14px;
          padding: 0.85rem 0.9rem 0.75rem;
        }

        .conversation-comment-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .conversation-comment-item {
          padding: 0.85rem 1rem;
          border: 1px solid ${isNight ? "rgba(255,255,255,0.08)" : "#e5e7eb"};
          background: ${isNight ? "rgba(17,24,39,0.6)" : "#fbfdff"};
          transition: transform 0.15s ease, box-shadow 0.2s ease;
        }

        .conversation-comment-item:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 25px
            ${isNight ? "rgba(0,0,0,0.3)" : "rgba(15,23,42,0.08)"};
        }

        .conversation-comment {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 0.85rem;
          min-width: 0;
          width: 100%;
          max-width: 100%;
          margin-inline: auto;
        }

        .conversation-comment__main {
          display: flex;
          align-items: flex-start;
          gap: 0.85rem;
          min-width: 0;
          width: 100%;
          max-width: 100%;
        }

        .conversation-comment__avatar {
          flex-shrink: 0;
        }

        .conversation-comment__body {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex: 1;
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .conversation-comment__meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          min-width: 0;
          width: 100%;
          flex-wrap: wrap;
        }

        .conversation-comment__avatar-image,
        .conversation-comment__avatar-fallback {
          width: 44px;
          height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .conversation-comment__text {
          margin: 0;
          padding: 0.6rem 0.75rem;
          line-height: 1.6;
          word-break: break-word;
          overflow-wrap: anywhere;
          width: 100%;
          max-width: none;
          border-radius: 12px;
          background: ${isNight ? "rgba(255,255,255,0.04)" : "#f8fafc"};
          border: 1px solid ${isNight ? "rgba(255,255,255,0.06)" : "#e2e8f0"};
        }

        .conversation-comment__actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          align-items: center;
        }

        .reaction-button {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.35rem 0.55rem;
          font-size: 0.82rem;
          line-height: 1.2;
          border-radius: 999px;
          border: 1px solid ${isNight ? "#334155" : "#d1d5db"};
          background: ${isNight ? "rgba(255,255,255,0.03)" : "#f8fafc"};
          color: inherit;
          min-height: 36px;
          min-width: 0;
        }

        .reaction-button:disabled {
          opacity: 0.55;
        }

        .reaction-count {
          min-width: 0.9rem;
          text-align: right;
        }

        .conversation-reply {
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          padding: 0.25rem 0.25rem 0.25rem 0.4rem;
          border-radius: 12px;
          width: 100%;
        }

        .conversation-reply__avatar {
          width: 30px;
          height: 30px;
          flex: 0 0 30px;
          margin-top: 3px;
        }

        .conversation-reply__avatar-image,
        .conversation-reply__avatar-fallback {
          width: 30px;
          height: 30px;
          object-fit: cover;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .conversation-reply__arrow {
          color: ${isNight ? "#94a3b8" : "#94a3b8"};
          line-height: 1.4;
          margin-top: 8px;
          flex-shrink: 0;
        }

        .conversation-reply__body {
          min-width: 0;
          flex: 1 1 auto;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.35rem;
        }

        .conversation-reply__header {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          flex-wrap: wrap;
          min-width: 0;
        }

        .conversation-reply__author {
          color: inherit;
          text-decoration: none;
        }

        .conversation-reply__text {
          flex: 1 1 auto;
          min-width: 0;
          word-break: break-word;
          line-height: 1.5;
          height: auto;
        }

        .conversation-reply__bubble {
          background-color: ${isNight ? "rgba(255,255,255,0.05)" : "#f8fafc"};
          padding: 0.6rem 0.75rem;
          border-radius: 12px;
          display: block;
          width: auto;
          max-width: 100%;
          border: 1px solid ${isNight ? "rgba(255,255,255,0.08)" : "#e2e8f0"};
        }

        .conversation-reply-list {
          position: relative;
          border-left: 2px solid ${isNight ? "#334155" : "#e5e7eb"};
          margin-left: 0.15rem;
          padding-left: 1.1rem !important;
          gap: 0.5rem;
          display: flex;
          flex-direction: column;
        }

        .conversation-reply-list::before {
          content: "";
          position: absolute;
          left: -2px;
          top: 6px;
          bottom: 6px;
          width: 2px;
          background: ${isNight
            ? "rgba(148,163,184,0.35)"
            : "rgba(148,163,184,0.55)"};
        }

        .reply-inline-input {
          min-height: 38px;
        }

        .reply-inline-send {
          min-height: 38px;
          padding-inline: 0.85rem;
        }

        .reply-input-row {
          margin-left: 2.6rem;
        }

        .comment-input-panel {
          border-top: 1px solid
            ${isNight ? "rgba(255,255,255,0.08)" : "#e5e7eb"};
          padding-top: 0.75rem;
          margin-top: 0.75rem;
        }

        .comment-input-group {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 0.55rem;
          align-items: center;
        }

        .comment-input {
          min-height: 42px;
          padding: 0.5rem 0.75rem;
          border-radius: 10px;
        }

        .comment-send-btn {
          min-height: 42px;
          padding: 0.5rem 1rem;
          border-radius: 10px;
        }

        /* 📱 MOBILE STYLES */
        @media (max-width: 576px) {
          /* ----------------------------------
          Conversation Header
          -----------------------------------*/
          .conversation-card .conversation-header {
            display: flex !important;
            justify-content: flex-end !important; /* View all to the right */
            align-items: center !important;
            padding: 0 0 0 0 !important; /* top right bottom left */
            width: 100%;
          }

          /* Hide both Conversation icon + text */
          .conversation-card .conversation-header h5 {
            display: none !important;
          }

          /* Hide "Join comments..." subtitle */
          .conversation-card .community-subtitle {
            display: none !important;
          }

          /* Clean "View all" style */
          .conversation-card .view-all-btn,
          .conversation-card button.btn-outline-primary {
            border: none !important;
            background: transparent !important;
            padding: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            font-size: 0.85rem !important;
            font-weight: 500 !important;
            color: #3b82f6 !important;
          }

          .conversation-card .conversation-header .view-all-btn {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
            line-height: 1.1 !important;
          }

          /* ----------------------------------
          Blog Card Spacing
          -----------------------------------*/
          .blog-card__media,
          .blog-card__media img {
            margin-bottom: 0.25rem !important;
            padding-bottom: 0 !important;
            display: block !important;
          }

          .blog-card__body {
            padding-top: 0.1rem !important;
            padding-bottom: 0.1rem !important;
          }

          .blog-card__body .card-text {
            margin-top: 0 !important;
            margin-bottom: 0.15rem !important;
            font-size: 0.82rem !important;
            line-height: 1.55 !important;
          }

          .blog-card__body small {
            margin-top: -4px !important;
          }

          .blog-card__footer {
            margin-top: 0.2rem !important;
            gap: 0.4rem !important;
          }

          .blog-card__mobile-cta {
            gap: 0.35rem !important;
          }

          .blog-card__mobile-actions-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.35rem !important;
            width: 100%;
          }

          .blog-card__mobile-actions-grid .btn {
            width: 100%;
            justify-content: center;
            padding: 0.3rem 0.65rem !important;
            font-size: 0.8rem !important;
            min-height: 36px !important;
            border-radius: 14px !important;
            box-shadow: 0 10px 18px
                ${isNight ? "rgba(0,0,0,0.28)" : "rgba(15,23,42,0.08)"},
              inset 0 0 0 1px
                ${isNight ? "rgba(255,255,255,0.08)" : "rgba(59,130,246,0.15)"};
          }

          .blog-card__mobile-actions-grid .btn span {
            font-size: 0.9rem !important;
          }

          .blog-card__mobile-actions-grid .badge {
            font-size: 0.72rem !important;
            padding: 0.15rem 0.5rem !important;
            min-width: 42px;
          }

          .blog-card__mobile-hint {
            padding-inline: 0.1rem;
          }

          .blog-card__footer .btn {
            padding: 0.3rem 0.65rem !important;
            font-size: 0.8rem !important;
            min-height: 36px !important;
            border-radius: 14px !important;
          }

          .blog-card__footer .btn span {
            font-size: 0.9rem !important;
          }

          .blog-card__footer .badge {
            font-size: 0.72rem !important;
            padding: 0.15rem 0.5rem !important;
          }

          /* ----------------------------------
          Author + Stats
          -----------------------------------*/
          .blog-card__hero .blog-card__header {
            align-items: flex-start;
            text-align: left;
          }

          .blog-card__author-row {
            align-items: center;
            gap: 0.65rem;
            flex-wrap: nowrap !important;
            min-width: 0;
          }

          .blog-card__author-info {
            display: inline-flex;
            align-items: center;
            gap: 0.65rem;
            flex-wrap: nowrap;
            min-width: 0;
            flex-shrink: 0;
          }

          .blog-card__author-meta {
            gap: clamp(0.35rem, 2vw, 0.55rem);
            min-width: 0;
            display: inline-flex;
            align-items: center;
            flex: 1 1 auto;
            justify-content: flex-start;
          }

          .blog-card__author-meta button {
            white-space: nowrap;
            min-width: 0;
          }

          .blog-card__author-meta span {
            white-space: nowrap;
            flex-shrink: 0;
          }

          .blog-card__title h3 {
            font-size: 1.05rem;
            line-height: 1.2;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            text-overflow: ellipsis;
            word-break: break-word;
          }

          .blog-card__stats {
            width: 100%;
            justify-content: space-between;
            gap: 0.4rem;
          }

          .blog-card__stats span {
            font-size: 0.85rem;
            padding: 0.35rem 0.7rem;
            flex: 1;
            min-height: 32px;
          }

          .comments-modal__dialog {
            width: 100% !important;
            max-width: none;
            margin: 0;
            height: 100%;
            display: flex;
            align-items: flex-end;
          }

          .comments-modal__shell {
            border-radius: 20px 20px 0 0;
          }

          .comments-modal__header {
            padding: 0.85rem 1rem 0.65rem;
          }

          .comments-modal__body {
            padding: 0.45rem 0.6rem 0.35rem;
          }

          .comments-modal__scroll {
            max-height: calc(100vh - 230px);
            padding-inline: 0.05rem;
          }

          .comments-modal__composer {
            margin: 0 -0.1rem -0.1rem;
            box-shadow: 0 -12px 32px ${isNight ? "rgba(0,0,0,0.55)" : "rgba(15,23,42,0.12)"};
          }

          /* ----------------------------------
          Conversation Comments Layout
          -----------------------------------*/
          .conversation-comment-wrapper {
            max-height: 260px;
            overflow-y: auto;
          }

          .conversation-comment-list {
            width: 100%;
            gap: 0.75rem;
          }

          .conversation-comment-item {
            width: 100%;
            padding: 0.65rem 0.75rem;
          }

          .conversation-comment {
            display: flex !important;
            flex-direction: column !important;
            gap: 0.65rem !important;
            width: 100%;
          }

          .conversation-comment__main {
            display: flex !important;
            flex-direction: row !important;
            align-items: flex-start !important;
            width: 100%;
            gap: 0.45rem !important;
            min-width: 0;
            max-width: 100%;
          }

          .conversation-comment__avatar,
          .conversation-comment__avatar-image,
          .conversation-comment__avatar-fallback {
            width: 32px !important;
            height: 32px !important;
            flex: 0 0 32px !important;
          }

          .conversation-comment__body {
            max-width: 100%;
            min-width: 0;
            flex: 1 1 auto;
            width: 100%;
          }

          .conversation-comment__meta {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            gap: 0.35rem !important;
            flex-wrap: wrap !important;
            width: 100%;
            min-width: 0;
          }

          .conversation-comment__text {
            font-size: 0.84rem !important;
            line-height: 1.4 !important;
            margin-left: 0 !important;
            width: 100%;
            overflow-wrap: anywhere;
            padding: 0.45rem 0.6rem !important;
            border-radius: 10px;
          }

          .conversation-comment__actions {
            width: 100%;
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: flex-start;
            gap: 0.25rem;
            flex-wrap: wrap;
          }

          .reaction-button {
            font-size: 0.78rem;
            padding: 0.25rem 0.4rem;
            min-height: 30px;
          }

          .conversation-reply {
            align-items: flex-start !important;
            gap: 0.4rem;
            margin-left: 0.1rem;
          }

          .conversation-reply__avatar,
          .conversation-reply__avatar-image,
          .conversation-reply__avatar-fallback {
            width: 28px !important;
            height: 28px !important;
            flex-basis: 28px !important;
          }

          .conversation-reply__body {
            flex: 1;
            min-width: 0;
            word-break: break-word;
            align-items: flex-start;
            gap: 0.35rem;
            flex-wrap: wrap;
          }

          .conversation-reply__header {
            gap: 0.35rem !important;
            flex-wrap: wrap !important;
            min-width: 0;
            flex-shrink: 1;
          }

          .conversation-reply__text {
            flex: 1 1 100%;
            min-width: 0;
            font-size: 0.82rem !important;
            line-height: 1.4;
          }

          .conversation-reply__bubble {
            width: 100%;
            max-width: 100%;
            line-height: 1.4;
            padding: 0.45rem 0.6rem;
          }

          .conversation-reply-list {
            border-left: 1px solid ${isNight ? "#334155" : "#cbd5e1"} !important;
            padding-left: 0.55rem !important;
            margin-left: 0.05rem;
          }

          .reply-input-row {
            margin-left: 1.2rem;
          }

          .comment-input-panel {
            padding-top: 0.35rem;
          }

          .comment-input-group {
            grid-template-columns: 1fr auto;
            align-items: center;
            gap: 0.4rem;
          }

          .comment-input {
            min-height: 38px;
            padding: 0.45rem 0.65rem;
          }

          .comment-send-btn {
            min-height: 38px;
            padding: 0.45rem 0.85rem;
          }

          .conversation-card h5 {
            font-size: 1rem;
          }

          .conversation-card p,
          .conversation-card button {
            font-size: 0.9rem;
          }

          /* Hide tap-to-expand */
          .tap-to-expand {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
