"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, CSSProperties } from "react";
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

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [showAllComments] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [userImages, setUserImages] = useState<Record<string, string>>({});
  const { user } = useAuth();
  const { theme } = useTheme();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isContentExpanded, setIsContentExpanded] = useState(false);

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
      : "bg-white text-primary border border-primary border-opacity-25"           // Light background for day mode
  }`;

  // Determine which author name to display
  // Priority: author.username → blog.author → empty string
  const displayAuthor = author?.username ?? blog.author ?? "";

  // Extract the first character from author name (used as fallback avatar initial)
  const authorInitial = displayAuthor.charAt(0).toUpperCase() || "?";

  const isProfileNavigable = Boolean(displayAuthor);

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
  const collapsedLines = 5;
  const collapsedMaxHeight = `${(1.7 * collapsedLines).toFixed(1)}em`;

  const contentStyle: CSSProperties = {
    lineHeight: 1.7,
    letterSpacing: "0.01em",
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

    const resolveAvatar = (raw?: string | null, username?: string) =>
      resolveImageUrl(raw) ?? (username ? userImages[username] : undefined);

    const fetchComments = async () => {
      try {
        const res = await fetch(apiUrl(`/api/comments?postId=${blog._id}`));
        const data = await res.json();
        if (!isMounted) return;
        const list = (data.comments ?? []).map(
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
          }) => ({
            _id: c._id as string,
            text: c.text as string,
            author: c.author as string,
            authorImage: resolveAvatar(c.authorImage, c.author),
            likes: c.likes ?? 0,
            dislikes: c.dislikes ?? 0,
            likedBy: c.likedBy ?? [],
            dislikedBy: c.dislikedBy ?? [],
            replies: (c.replies ?? []).map(
              (r: { text: string; author: string; authorImage?: string }) => ({
                text: r.text as string,
                author: r.author as string,
                authorImage: resolveAvatar(r.authorImage, r.author),
              })
            ),
            showReplyInput: false,
            newReply: "",
          })
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
  }, [blog._id]);

  useEffect(() => {
    setComments((prev) =>
      prev.map((comment) => ({
        ...comment,
        authorImage:
          comment.authorImage ?? resolveImageUrl(userImages[comment.author]) ?? userImages[comment.author],
        replies: comment.replies.map((reply) => ({
          ...reply,
          authorImage:
            reply.authorImage ?? resolveImageUrl(userImages[reply.author]) ?? userImages[reply.author],
        })),
      }))
    );
  }, [userImages]);

  const handleCommentSubmit = async () => {
    const text = newComment.trim();
    if (!text) return;

    // Always update UI immediately
    setNewComment("");

    if (blog._id && user) {
      const res = await fetch(apiUrl("/api/comments"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: blog._id,
          author: user.username,
          text,
        }),
      });

        if (res.ok) {
          const data = await res.json();
          setComments((prev) => [
            ...prev,
            {
              _id: data.comment._id as string,
              text: data.comment.text,
              author: data.comment.author,
              authorImage:
                resolveImageUrl(data.comment.authorImage) ??
                resolveImageUrl(userImages[data.comment.author]) ??
                userImages[data.comment.author],
              likes: data.comment.likes,
              dislikes: data.comment.dislikes,
              likedBy: [],
            dislikedBy: [],
            replies: [],
            showReplyInput: false,
            newReply: "",
          },
        ]);
        return;
      }
    }

    // Fallback: just add locally if request failed or missing info
    setComments((prev) => [
      ...prev,
      {
        _id: undefined,
        text,
        author: user?.username ?? "",
        authorImage:
          user
            ? resolveImageUrl(userImages[user.username]) ?? userImages[user.username]
            : undefined,
        likes: 0,
        dislikes: 0,
        likedBy: [],
        dislikedBy: [],
        replies: [],
        showReplyInput: false,
        newReply: "",
      },
    ]);
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
    if (!text) return;

    if (comment._id && user) {
      const res = await fetch(apiUrl(`/api/comments/${comment._id}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: user.username, text }),
      });
      if (res.ok) {
        const data = await res.json();
        const last = data.comment.replies[data.comment.replies.length - 1];
        setComments((prev) =>
          prev.map((c, i) =>
            i === index
              ? {
                  ...c,
                  replies: [
                    ...c.replies,
                    {
                      text: last.text as string,
                      author: last.author as string,
                      authorImage:
                        resolveImageUrl(last.authorImage as string | undefined) ??
                        resolveImageUrl(userImages[last.author as string]) ??
                        userImages[last.author as string],
                    },
                  ],
                  newReply: "",
                  showReplyInput: false,
                }
              : c
          )
        );
        return;
      }
    }

    // fallback: update UI only
    setComments((prev) =>
      prev.map((c, i) =>
        i === index
          ? {
              ...c,
              replies: [
                ...c.replies,
                {
                  text,
                  author: user?.username ?? "",
                  authorImage:
                    user
                      ? resolveImageUrl(userImages[user.username]) ??
                        userImages[user.username]
                      : undefined,
                },
              ],
              newReply: "",
              showReplyInput: false,
            }
          : c
      )
    );
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
      const res = await fetch(apiUrl(`/api/posts/${blog._id}`), { method: "DELETE" });
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
      className={`card border-0 shadow-lg w-100 mx-auto mb-4 ${
        isNight ? "bg-dark text-light" : "bg-white"
      }`}
      style={{
        maxWidth: "960px",               // Keeps the card at a more compact width
        borderRadius: "20px",            // Slightly tighter rounding for a smaller footprint
        overflow: "hidden",              // Prevents content from overflowing outside card edges
        border: `1px solid ${cardBorderColor}`, // Dynamic border color based on theme
      }}
    >
      {/* Header section with background gradient and author info */}
      <div
        className="position-relative p-3 text-white"
        style={{
          background: headerGradient, // Dynamic background based on theme
        }}
      >
        {/* Row: author avatar + title + author name */}
        <div className="d-flex align-items-center gap-3">
          {/* If author has an image, display it */}
          <button
            type="button"
            className="p-0 border-0 bg-transparent"
            aria-label={isProfileNavigable ? `View ${displayAuthor}'s profile` : undefined}
            onClick={isProfileNavigable ? openAuthorProfile : undefined}
            disabled={!isProfileNavigable}
            style={{ cursor: isProfileNavigable ? "pointer" : "default" }}
          >
            {author?.image ? (
              <img
                src={author.image}
                alt={author.username}
                className="rounded-circle border border-3 border-white"
                style={{
                  width: "48px",                      // Avatar width
                  height: "48px",                     // Avatar height
                  objectFit: "cover",                 // Ensures image fills the circle without distortion
                }}
              />
            ) : (
              <div
                className="rounded-circle bg-white text-primary fw-semibold d-flex align-items-center justify-content-center"
                style={{ width: "48px", height: "48px" }}
              >
                {authorInitial}
              </div>
            )}
          </button>

          {/* Blog title and author name section */}
          <div className="flex-grow-1">

            {/* Blog title */}
            <h3 className="mb-1 fw-bold">{blog.title}</h3>

            {/* Author name line */}
            <p className="mb-0 small text-white-50">
              By
              <button
                type="button"
                className="btn btn-link p-0 ps-1 align-baseline fw-semibold text-white"
                onClick={openAuthorProfile}
                disabled={!displayAuthor}
              >
                {displayAuthor || "Unknown"}
              </button>
            </p>
          </div>
        </div>

        {/* Blog statistics (likes, dislikes, comments) */}
        <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
          {/* Display like count */}
          <span className={statBadgeClass}>❤️ {likes}</span>
          {/* Display dislike count */}
          <span className={statBadgeClass}>👎 {dislikes}</span>
          {/* Display comment count */}
          <span className={statBadgeClass}>💬 {totalComments}</span>
        </div>
      </div>

      {blog.image && (
      <div
            className="position-relative overflow-hidden"
            style={{
              cursor: "pointer",
            aspectRatio: "16 / 10", // Keeps a predictable viewport without forcing the image to stretch
            maxHeight: "360px",
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
          <button
            type="button"
            className="position-absolute bottom-0 end-0 m-3 border-0 bg-transparent p-0"
            onClick={() => setShowImageModal(true)}
            aria-label="Expand image"
          >
            <span className="badge bg-dark bg-opacity-75 text-white rounded-pill px-3 py-2 d-flex align-items-center gap-2">
              <span>🔍</span>
              <span>Tap to expand</span>
            </span>
          </button>
        </div>
      )}

      <div className="card-body p-3">
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

        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mt-4">
          <div className="d-flex flex-wrap gap-2">
            <button
              className="btn btn-sm btn-success rounded-pill d-flex align-items-center gap-2 px-3"
              onClick={handleLikePost}
              disabled={hasLikedPost || !user}
            >
              <span>👍</span>
              <span>Appreciate</span>
              <span className="badge bg-white text-success ms-1">{likes}</span>
            </button>

            <button
              className="btn btn-sm btn-outline-danger rounded-pill d-flex align-items-center gap-2 px-3"
              onClick={handleDislikePost}
              disabled={hasDislikedPost || !user}
            >
              <span>👎</span>
              <span>Not for me</span>
              <span className="badge bg-light text-danger ms-1">{dislikes}</span>
            </button>
            <button
              className={`btn btn-sm rounded-pill d-flex align-items-center gap-2 px-3 ${
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
                  navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
                  alert("Link copied to clipboard!");
                }
              }}
            >
              <span>🔗</span>
              <span>Share</span>
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
        </div>

        {/* Comments Section */}
        <div
          className={`mt-5 p-4 rounded-4 ${
            isNight ? "bg-secondary bg-opacity-25" : "bg-light"
          }`}
        >
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <div>
              <h5 className="mb-1 d-flex align-items-center gap-2">
                <span>💬</span>
                <span>Conversation</span>
              </h5>
              <p className={`mb-0 small ${mutedTextClass}`}>
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
              <p className="mb-0">No comments yet. Share your thoughts below!</p>
            </div>
          ) : (
            <div
              style={{
                maxHeight: "280px",
                overflowY: "auto",
                paddingRight: "10px",
              }}
              className="mb-3"
            >
              <ul className="list-unstyled mb-0">
                {(showAllComments ? comments : comments.slice(-3)).map(
                  (comment, idx) => (
                    <li
                      key={idx}
                      className={`p-3 mb-3 rounded-4 shadow-sm ${
                        isNight ? "bg-dark bg-opacity-75 text-white" : "bg-white"
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
                              {comment.authorImage ? (
                                <img
                                  src={comment.authorImage}
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
                                  {comment.author?.charAt(0)?.toUpperCase() || "?"}
                                </span>
                              )}
                            </button>
                          </div>
                          <div className="conversation-comment__meta">
                            <span
                              className={`conversation-comment__author text-uppercase ${
                                isNight ? "text-primary text-opacity-75" : "text-primary"
                              }`}
                              role="button"
                              tabIndex={0}
                              onClick={() => openUserProfile(comment.author)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  openUserProfile(comment.author);
                                }
                              }}
                            >
                              {comment.author}
                            </span>
                            <p
                              className={`conversation-comment__text ${
                                isNight ? "text-light" : "text-body"
                              }`}
                            >
                              {comment.text}
                            </p>
                          </div>
                        </div>

                        <div className="conversation-comment__actions">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success"
                            onClick={() => handleLikeComment(idx)}
                            disabled={
                              user
                                ? comment.likedBy?.includes(user.username) ||
                                  comment.dislikedBy?.includes(user.username)
                                : true
                            }
                          >
                            👍 {comment.likes}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDislikeComment(idx)}
                            disabled={
                              user
                                ? comment.likedBy?.includes(user.username) ||
                                  comment.dislikedBy?.includes(user.username)
                                : true
                            }
                          >
                            👎 {comment.dislikes}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => toggleReplyInput(idx)}
                          >
                            💬 Reply
                          </button>
                        </div>
                      </div>

                        {/* Replies */}
                      {comment.replies.length > 0 && (
                        <ul className="mt-3 ps-4 list-unstyled">
                          {comment.replies.map((reply, rIdx) => (
                            <li
                              key={rIdx}
                              className={`d-flex align-items-center gap-2 ${
                                theme === "night" ? "text-light" : "text-muted"
                              } small mb-2`}
                            >
                              {reply.authorImage && (
                                <button
                                  type="button"
                                  className="p-0 border-0 bg-transparent"
                                  onClick={() => openUserProfile(reply.author)}
                                  aria-label={`View ${reply.author}'s profile`}
                                >
                                  <img
                                    src={reply.authorImage}
                                    alt={reply.author}
                                    className="rounded-circle"
                                    style={{
                                      width: "28px",
                                      height: "28px",
                                      objectFit: "cover",
                                    }}
                                  />
                                </button>
                              )}
                              ↪{" "}
                              <button
                                type="button"
                                className="fw-semibold p-0 border-0 bg-transparent text-start"
                                onClick={() => openUserProfile(reply.author)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    openUserProfile(reply.author);
                                  }
                                }}
                              >
                                {reply.author}
                              </button>
                              : {reply.text}
                            </li>
                          ))}
                        </ul>
                      )}

              {/* Reply Input */}
                      {comment.showReplyInput && (
                        <div className="d-flex gap-2 mt-3">
                          <input
                            type="text"
                            className="form-control form-control-sm rounded-pill"
                            placeholder="Write a reply..."
                            value={comment.newReply}
                            onChange={(e) => handleReplyChange(idx, e.target.value)}
                          />
                          <button
                            className="btn btn-sm btn-primary rounded-pill px-3"
                            onClick={() => handleReplySubmit(idx)}
                          >
                            Send
                          </button>
                        </div>
                      )}
                    </li>
                  )
                )}
              </ul>
            </div>
          )}

          {/* Add Comment Input */}
          <div className="d-flex flex-column flex-sm-row gap-2 align-items-stretch align-items-sm-center">
            <input
              type="text"
              className="form-control rounded-pill px-4 py-2"
              placeholder="Share your perspective..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <button
              className="btn btn-primary rounded-pill px-4"
              onClick={handleCommentSubmit}
            >
              Send
            </button>
          </div>
        </div>
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
            className="modal-dialog modal-xl modal-dialog-centered"
            role="document"
            style={{ width: "90%", maxWidth: "none" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`modal-content ${
                theme === "night" ? "bg-dark text-white" : ""
              }`}
              style={{
                height: "90vh",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div className="modal-header">
                <h5 className="modal-title">All Comments</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCommentsModal(false)}
                />
              </div>

              {/* Scrollable Comments */}
              <div
                className="modal-body"
                style={{ overflowY: "auto", flexGrow: 1, paddingRight: "10px" }}
              >
                <ul className="list-group">
                  {comments.map((comment, idx) => (
                    <li
                      key={idx}
                      className={`list-group-item mb-3 rounded shadow-sm ${
                        theme === "night" ? "bg-dark text-white" : "bg-white"
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
                              {comment.authorImage ? (
                                <img
                                  src={comment.authorImage}
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
                                  {comment.author?.charAt(0)?.toUpperCase() || "?"}
                                </span>
                              )}
                            </button>
                          </div>
                          <div className="conversation-comment__meta">
                            <span
                              className={`conversation-comment__author text-uppercase ${
                                theme === "night"
                                  ? "text-primary text-opacity-75"
                                  : "text-primary"
                              }`}
                              role="button"
                              tabIndex={0}
                              onClick={() => openUserProfile(comment.author)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  openUserProfile(comment.author);
                                }
                              }}
                            >
                              {comment.author}
                            </span>
                            <p
                              className={`conversation-comment__text ${
                                theme === "night" ? "text-light" : "text-body"
                              }`}
                            >
                              {comment.text}
                            </p>
                          </div>
                        </div>
                        <div className="conversation-comment__actions">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success"
                            onClick={() => handleLikeComment(idx)}
                            disabled={
                              user
                                ? comment.likedBy?.includes(user.username) ||
                                  comment.dislikedBy?.includes(user.username)
                                : true
                            }
                          >
                            👍 {comment.likes}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDislikeComment(idx)}
                            disabled={
                              user
                                ? comment.likedBy?.includes(user.username) ||
                                  comment.dislikedBy?.includes(user.username)
                                : true
                            }
                          >
                            👎 {comment.dislikes}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => toggleReplyInput(idx)}
                          >
                            💬 Reply
                          </button>
                        </div>
                      </div>

                      {/* Replies */}
                      {comment.replies.length > 0 && (
                        <ul className="mt-2 ps-3 list-unstyled">
                          {comment.replies.map((reply, rIdx) => (
                            <li
                              key={rIdx}
                              className={`d-flex align-items-center gap-2 ${
                                theme === "night" ? "text-light" : "text-muted"
                              } small mb-2`}
                            >
                              {reply.authorImage && (
                                <button
                                  type="button"
                                  className="p-0 border-0 bg-transparent"
                                  onClick={() => openUserProfile(reply.author)}
                                  aria-label={`View ${reply.author}'s profile`}
                                >
                                  <img
                                    src={reply.authorImage}
                                    alt={reply.author}
                                    className="rounded-circle"
                                    style={{
                                      width: "24px",
                                      height: "24px",
                                      objectFit: "cover",
                                    }}
                                  />
                                </button>
                              )}
                              ↪{" "}
                              <button
                                type="button"
                                className="fw-semibold p-0 border-0 bg-transparent text-start"
                                onClick={() => openUserProfile(reply.author)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    openUserProfile(reply.author);
                                  }
                                }}
                              >
                                {reply.author}
                              </button>
                              : {reply.text}
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Reply Input */}
                      {comment.showReplyInput && (
                        <div className="d-flex gap-2 mt-2">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Write a reply..."
                            value={comment.newReply}
                            onChange={(e) =>
                              handleReplyChange(idx, e.target.value)
                            }
                          />
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleReplySubmit(idx)}
                          >
                            Send
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Comment Input */}
              <div className="modal-footer">
                <div className="d-flex gap-2 w-100">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleCommentSubmit}
                  >
                    Send
                  </button>
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
    </div>
  );
}
