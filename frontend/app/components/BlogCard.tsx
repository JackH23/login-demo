"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, CSSProperties, useCallback } from "react";
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

interface Comment {
  _id?: string;
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
  const { user } = useAuth();
  const { theme } = useTheme();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [replySubmittingId, setReplySubmittingId] = useState<string | null>(
    null
  );

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
      _id: string;
      text: string;
      author: string;
      authorImage?: string;
      likes: number;
      dislikes: number;
      likedBy?: string[];
      dislikedBy?: string[];
      replies?: { text: string; author: string; authorImage?: string }[];
    }): Comment => ({
      _id: c._id as string,
      text: c.text as string,
      author: c.author as string,
      authorImage: resolveAvatar(c.authorImage, c.author),
      likes: c.likes ?? 0,
      dislikes: c.dislikes ?? 0,
      likedBy: c.likedBy ?? [],
      dislikedBy: c.dislikedBy ?? [],
      replies: (c.replies ?? []).map(mapReplyFromApi),
      showReplyInput: false,
      newReply: "",
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

  const openAuthorProfile = () => {
    if (!displayAuthor) return;
    router.push(`/user/${encodeURIComponent(displayAuthor)}`);
  };

  const openUserProfile = (username?: string) => {
    if (!username) return;
    router.push(`/user/${encodeURIComponent(username)}`);
  };

  // Count total number of comments for the blog post
  const totalComments = comments.length;

  const isContentLong = (blog.content ?? "").length > 240;
  const collapsedLines = isMobile ? 3 : 5;
  const collapsedMaxHeight = `${(1.65 * collapsedLines).toFixed(1)}em`;
  const actionButtonPadding = isMobile ? "px-2 py-1" : "px-3 py-2";

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
    if (!blog._id) return;
    let isMounted = true;

    const fetchComments = async () => {
      try {
        const res = await fetch(apiUrl(`/api/comments?postId=${blog._id}`));
        const data = await res.json();
        if (!isMounted) return;
        const list = resolveCommentAvatars(
          (data.comments ?? []).map(mapCommentFromApi)
        );
        setComments(list);
      } catch {
        if (!isMounted) return;
        setComments([]);
      }
    };

    fetchComments();

    return () => {
      isMounted = false;
    };
  }, [blog._id, mapCommentFromApi]);

  useEffect(() => {
    setComments((prev) => resolveCommentAvatars(prev));
  }, [resolveCommentAvatars]);

  const handleCommentSubmit = async () => {
    const text = newComment.trim();
    if (!text || !user || isSubmittingComment) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticComment: Comment = {
      _id: tempId,
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
      isPending: true,
    };

    setNewComment("");
    setIsSubmittingComment(true);
    setComments((prev) => [...prev, optimisticComment]);

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
        setComments((prev) =>
          prev.map((comment) =>
            comment._id === tempId
              ? { ...mapCommentFromApi(data.comment), isPending: false }
              : comment
          )
        );
        isSaved = true;
      } catch (error) {
        console.error("Unable to submit comment", error);
      }
    }

    if (!isSaved) {
      setComments((prev) => prev.filter((comment) => comment._id !== tempId));
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
    setComments((prev) =>
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
          setComments((prev) =>
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
        setComments((prev) =>
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
    setComments((prev) =>
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
          setComments((prev) =>
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
        setComments((prev) =>
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

  const toggleReplyInput = (index: number) => {
    setComments((prev) =>
      prev.map((c, i) =>
        i === index ? { ...c, showReplyInput: !c.showReplyInput } : c
      )
    );
  };

  const handleReplyChange = (index: number, value: string) => {
    setComments((prev) =>
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
    setComments((prev) =>
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
      setComments((prev) =>
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
    } catch (error) {
      console.error("Unable to submit reply", error);
      setComments((prev) =>
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
            aspectRatio: isMobile ? "3 / 4" : "16 / 9", // Keeps a predictable viewport without forcing the image to stretch
            maxHeight: isMobile ? "200px" : "360px",
            backgroundColor: isNight ? "#0f172a" : "#f8fafc",
            borderBottomLeftRadius: "0px",
            borderBottomRightRadius: "0px",
          }}
        >
          {/* Image container section with clickable behavior */}
          <img
            src={blog.image}
            alt="Blog Visual"
            className="card-img-top"
            style={{
              width: "100%",
              height: "100%",
              display: "block", // Removes inline-gap artifacts so the image fills the wrapper cleanly
              objectFit: "cover", // Preserves aspect ratio without distortion while filling the frame
              objectPosition: "center",
              filter: isNight ? "brightness(0.9)" : "saturate(1.05)",
            }}
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
        style={{ padding: isMobile ? "0.75rem 0.9rem" : "1rem 1.25rem" }}
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
            <div className="w-100 d-flex flex-column gap-2">
              <div className="blog-card__actions-mobile d-flex flex-wrap gap-2">
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

                {user && user.username === blog.author && (
                  <button
                    className="btn btn-sm btn-outline-danger rounded-pill d-flex align-items-center gap-2 px-3"
                    onClick={() => setShowDeleteModal(true)}
                    style={{ fontSize: "0.95rem" }}
                  >
                    <span>🗑️</span>
                    <span>Delete</span>
                  </button>
                )}
              </div>

              <div className="blog-card__comments-action w-100">
                <button
                  className={`btn btn-sm rounded-pill d-flex align-items-center gap-2 ${actionButtonPadding} ${
                    isNight ? "btn-outline-light" : "btn-outline-secondary"
                  } w-100 justify-content-center`}
                  onClick={() => setShowConversation((prev) => !prev)}
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
                  onClick={() => setShowConversation((prev) => !prev)}
                  style={{ fontSize: isMobile ? "0.9rem" : undefined }}
                  aria-pressed={showConversation}
                >
                  <span>💬</span>
                  <span>{showConversation ? "Hide chat" : "Comments"}</span>
                </button>
              </div>

              {user && user.username === blog.author && (
                <button
                  className="btn btn-sm btn-outline-danger rounded-pill px-3"
                  onClick={() => setShowDeleteModal(true)}
                >
                  🗑️ Delete
                </button>
              )}
            </>
          )}
        </div>

        {showConversation && (
          /* Comments Section */
          <div
            className={`conversation-card mt-5 rounded-4 p-md-4 p-3 ${
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
                  className="btn btn-sm btn-outline-primary rounded-pill"
                  onClick={() => setShowCommentsModal(true)}
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
                                    👍 <span className="reaction-count">{comment.likes}</span>
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
                                    👎 <span className="reaction-count">{comment.dislikes}</span>
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
                                      <div className="conversation-reply__text conversation-reply__bubble text-muted">
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
                            <div className="d-flex gap-2 mt-2 align-items-center reply-input-row">
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
          style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
          onClick={() => setShowCommentsModal(false)}
        >
          <div
            className="modal-dialog modal-fullscreen-sm-down modal-dialog-centered"
            role="document"
            style={{ width: "94%", maxWidth: "900px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`modal-content ${
                theme === "night" ? "bg-dark text-white" : ""
              }`}
              style={{ borderRadius: "16px" }}
            >
              <div className="modal-header border-0 pb-2">
                <h5 className="modal-title">All Comments</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCommentsModal(false)}
                />
              </div>

              <div className="modal-body pt-2 pb-3 px-3 px-sm-4">
                <ul className="conversation-comment-list list-unstyled mb-3">
                  {comments.map((comment, idx) => {
                    const commentAvatar = resolveAvatar(
                      comment.authorImage,
                      comment.author
                    );
                    const replyKey = comment._id ?? `local-${idx}`;
                    const isCommentPending = comment.isPending || !comment._id;
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
                                onClick={() => openUserProfile(comment.author)}
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
                                    {comment.author?.charAt(0)?.toUpperCase() ||
                                      "?"}
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
                                  theme === "night" ? "text-light" : "text-body"
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
                                    comment.likedBy?.includes(user.username) ||
                                    comment.dislikedBy?.includes(user.username)
                                  }
                                >
                                  👍 <span className="reaction-count">{comment.likes}</span>
                                </button>
                                <button
                                  type="button"
                                  className="reaction-button"
                                  onClick={() => handleDislikeComment(idx)}
                                  disabled={
                                    !user ||
                                    isCommentPending ||
                                    comment.likedBy?.includes(user.username) ||
                                    comment.dislikedBy?.includes(user.username)
                                  }
                                >
                                  👎 <span className="reaction-count">{comment.dislikes}</span>
                                </button>
                                <button
                                  type="button"
                                  className="reaction-button"
                                  onClick={() => toggleReplyInput(idx)}
                                  disabled={
                                    !user || isCommentPending || isReplySending
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
                                    <div className="conversation-reply__text conversation-reply__bubble text-muted">
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
                          <div className="d-flex gap-2 mt-2 align-items-center reply-input-row">
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

                <div className="comment-input-panel">
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
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="modal-dialog modal-fullscreen"
            role="document"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content bg-black text-white border-0">
              <div className="modal-header border-0">
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowImageModal(false)}
                />
              </div>
              <div className="modal-body p-0 position-relative bg-black d-flex justify-content-center align-items-center">
                <img
                  src={blog.image}
                  alt="Full Blog View"
                  className="w-100 h-100"
                  style={{
                    objectFit: "contain",
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
          box-shadow: 0 10px 25px ${
            isNight ? "rgba(0,0,0,0.3)" : "rgba(15,23,42,0.08)"
          };
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
          background: ${isNight
            ? "rgba(255,255,255,0.04)"
            : "#f8fafc"};
          border: 1px solid ${isNight
            ? "rgba(255,255,255,0.06)"
            : "#e2e8f0"};
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
          background-color: ${isNight
            ? "rgba(255,255,255,0.05)"
            : "#f8fafc"};
          padding: 0.6rem 0.75rem;
          border-radius: 12px;
          display: block;
          width: auto;
          max-width: 100%;
          border: 1px solid ${isNight
            ? "rgba(255,255,255,0.08)"
            : "#e2e8f0"};
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
          background: ${isNight ? "rgba(148,163,184,0.35)" : "rgba(148,163,184,0.55)"};
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
          border-top: 1px solid ${isNight ? "rgba(255,255,255,0.08)" : "#e5e7eb"};
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

          .blog-card__actions-mobile {
            gap: 0.25rem !important;
            margin-bottom: 0.25rem !important;
          }

          .blog-card__comments-action {
            margin-top: 0.1rem !important;
          }

          /* Buttons smaller */
          .blog-card__footer .btn,
          .blog-card__actions-mobile .btn,
          .blog-card__comments-action .btn {
            padding: 0.25rem 0.55rem !important;
            font-size: 0.75rem !important;
            min-height: 32px !important;
            border-radius: 14px !important;
          }

          .blog-card__actions-mobile .btn span,
          .blog-card__footer .btn span {
            font-size: 0.85rem !important;
          }

          .blog-card__actions-mobile .badge,
          .blog-card__footer .badge {
            font-size: 0.7rem !important;
            padding: 0.15rem 0.45rem !important;
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

          /* ----------------------------------
          Conversation Comments Layout
          -----------------------------------*/
          .conversation-comment-wrapper {
            max-height: none;
            overflow: visible;
            padding-right: 0;
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
            gap: 0.55rem !important;
            min-width: 0;
            max-width: 100%;
          }

          .conversation-comment__avatar,
          .conversation-comment__avatar-image,
          .conversation-comment__avatar-fallback {
            width: 40px !important;
            height: 40px !important;
            flex: 0 0 40px !important;
          }

          .conversation-comment__body {
            max-width: calc(100% - 48px);
            min-width: 0;
            flex: 1;
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
            font-size: 0.85rem !important;
            line-height: 1.45 !important;
            margin-left: 0 !important;
            width: 100%;
            overflow-wrap: anywhere;
            padding: 0.55rem 0.7rem !important;
            border-radius: 11px;
          }

          .conversation-comment__actions {
            width: 100%;
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: flex-start;
            gap: 0.3rem;
            flex-wrap: wrap;
          }

          .reaction-button {
            font-size: 0.8rem;
            padding: 0.3rem 0.45rem;
            min-height: 34px;
          }

          .conversation-reply {
            align-items: flex-start !important;
            gap: 0.45rem;
            margin-left: 0.15rem;
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
            padding: 0.55rem 0.65rem;
          }

          .conversation-reply-list {
            border-left: 0 !important;
            padding-left: 0.65rem !important;
          }

          .reply-input-row {
            margin-left: 1.75rem;
          }

          .comment-input-panel {
            padding-top: 0.5rem;
          }

          .comment-input-group {
            grid-template-columns: 1fr;
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
