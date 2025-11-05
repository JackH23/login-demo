"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

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
  const [likes, setLikes] = useState<number>(blog.likes ?? 0);
  const [dislikes, setDislikes] = useState<number>(blog.dislikes ?? 0);
  const [hasLikedPost, setHasLikedPost] = useState<boolean>(false);
  const [hasDislikedPost, setHasDislikedPost] = useState<boolean>(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [userImages, setUserImages] = useState<Record<string, string>>({});
  const { user } = useAuth();
  const { theme } = useTheme();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCommentsExpanded, setIsCommentsExpanded] = useState(false);

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
    if (!blog._id) return;

    Promise.all([
      fetch(`/api/comments?postId=${blog._id}`).then((res) => res.json()),
      fetch("/api/users").then((res) => res.json()),
    ])
      .then(([commentsData, usersData]) => {
        const images: Record<string, string> = {};
        (usersData.users ?? []).forEach(
          (u: { username: string; image?: string }) => {
            if (u.image) images[u.username] = u.image as string;
          }
        );
        setUserImages(images);

        const list = (commentsData.comments ?? []).map(
          (c: {
            _id: string;
            text: string;
            author: string;
            likes: number;
            dislikes: number;
            replies?: { text: string; author: string }[];
          }) => ({
            _id: c._id as string,
            text: c.text as string,
            author: c.author as string,
            authorImage: images[c.author],
            likes: c.likes ?? 0,
            dislikes: c.dislikes ?? 0,
            likedBy: c.likedBy ?? [],
            dislikedBy: c.dislikedBy ?? [],
            replies: (c.replies ?? []).map(
              (r: { text: string; author: string }) => ({
                text: r.text as string,
                author: r.author as string,
                authorImage: images[r.author],
              })
            ),
            showReplyInput: false,
            newReply: "",
          })
        );
        setComments(list);
      })
      .catch(() => {
        setComments([]);
        setUserImages({});
      });
  }, [blog._id]);

  const handleCommentSubmit = async () => {
    const text = newComment.trim();
    if (!text) return;

    // Always update UI immediately
    setNewComment("");
    setIsCommentsExpanded(true);

    if (blog._id && user) {
      const res = await fetch("/api/comments", {
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
            authorImage: userImages[data.comment.author],
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
        authorImage: user ? userImages[user.username] : undefined,
        likes: 0,
        dislikes: 0,
        likedBy: [],
        dislikedBy: [],
        replies: [],
        showReplyInput: false,
        newReply: "",
      },
    ]);
    setIsCommentsExpanded(true);
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
        const res = await fetch(`/api/comments/${comment._id}`, {
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
        const res = await fetch(`/api/comments/${comment._id}`, {
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
      const res = await fetch(`/api/comments/${comment._id}`, {
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
                      authorImage: userImages[last.author as string],
                    },
                  ],
                  newReply: "",
                  showReplyInput: false,
                }
              : c
          )
        );
        setIsCommentsExpanded(true);
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
                  authorImage: user ? userImages[user.username] : undefined,
                },
              ],
              newReply: "",
              showReplyInput: false,
            }
          : c
      )
    );
    setIsCommentsExpanded(true);
  };

  const handleLikePost = async () => {
    if (!user || hasLikedPost || !blog._id) return;
    setLikes((prev) => prev + 1);
    setHasLikedPost(true);

    try {
      const res = await fetch(`/api/posts/${blog._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "like", username: user.username }),
      });

      if (!res.ok) throw new Error("Failed");

      const { post } = await res.json();
      setLikes(post.likes);
      setDislikes(post.dislikes);
    } catch (error) {
      setLikes((prev) => prev - 1);
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
        const res = await fetch(`/api/posts/${blog._id}`, {
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
      const res = await fetch(`/api/posts/${blog._id}`, { method: "DELETE" });
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

  const commentCount = comments.length;
  const limitedComments = isCommentsExpanded ? comments : comments.slice(-3);
  const offset = isCommentsExpanded ? 0 : commentCount - limitedComments.length;
  const visibleComments = limitedComments.map((comment, idx) => ({
    comment,
    originalIndex: offset + idx,
  }));
  const conversationLabel = isCommentsExpanded
    ? "Hide conversation"
    : commentCount
    ? `Conversation (${commentCount})`
    : "Start a conversation";
  const descriptionTone = theme === "night" ? "text-white-50" : "text-muted";
  const surfaceClass = theme === "night" ? "bg-dark text-white" : "bg-white";
  const authorName = author?.username ?? blog.author;
  const authorInitial = authorName.charAt(0).toUpperCase();
  const readingTime = Math.max(
    1,
    Math.round(blog.content.trim().split(/\s+/).length / 200)
  );

  const handleShare = () => {
    const shareText = `${blog.title}\n\n${blog.content}\n\nShared from Blog App`;
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator
        .share({ title: blog.title, text: shareText, url: shareUrl })
        .catch((err) => console.error("Share failed", err));
      return;
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
    }
    alert("Link copied to clipboard!");
  };

  return (
    <article
      className={`blog-card card border-0 shadow-lg h-100 overflow-hidden ${surfaceClass}`}
    >
      {blog.image ? (
        <div
          className="blog-card__media position-relative"
          role="button"
          tabIndex={0}
          onClick={() => setShowImageModal(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              setShowImageModal(true);
            }
          }}
        >
          <img
            src={blog.image}
            alt="Blog visual"
            className="w-100 h-100 object-fit-cover"
          />
          <div className="blog-card__media-overlay" />
          <div className="position-absolute top-0 start-0 p-3 d-flex flex-column gap-2">
            <span className="badge bg-dark bg-opacity-50 text-white border border-white border-opacity-25">
              Visual story
            </span>
            {author?.online && (
              <span className="badge bg-success-subtle text-success">
                <i className="bi bi-circle-fill me-1"></i>
                Online now
              </span>
            )}
          </div>
          <div className="position-absolute bottom-0 start-0 end-0 p-3 d-flex align-items-center justify-content-between">
            <span className="text-white-75 small">
              Click to open the full-size cover
            </span>
            <span className="badge bg-white text-dark rounded-pill">
              <i className="bi bi-arrows-fullscreen me-1"></i>
              Expand
            </span>
          </div>
        </div>
      ) : (
        <div className="blog-card__placeholder text-center p-5">
          <i className="bi bi-image display-6 d-block mb-2"></i>
          <p className={`mb-0 ${descriptionTone}`}>
            Add a cover image to make your story pop.
          </p>
        </div>
      )}

      <div className="card-body p-4">
        <div className="d-flex align-items-center gap-3 mb-4">
          {author?.image ? (
            <img
              src={author.image}
              alt={authorName}
              className="blog-card__avatar rounded-circle"
            />
          ) : (
            <div className="blog-card__avatar blog-card__avatar--fallback rounded-circle">
              {authorInitial}
            </div>
          )}
          <div className="flex-grow-1">
            <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
              <span className="fw-semibold">{authorName}</span>
              {author?.online && (
                <span className="badge bg-success-subtle text-success rounded-pill">
                  Active
                </span>
              )}
            </div>
            <p className={`small mb-0 ${descriptionTone}`}>
              Community storyteller • {readingTime} min read
            </p>
          </div>
          <div className="text-end">
            <span className="badge bg-primary-subtle text-primary rounded-pill">
              {likes} likes
            </span>
          </div>
        </div>

        <h3 className="h4 fw-bold mb-3">{blog.title}</h3>
        <p className={`mb-0 line-clamp-3 ${descriptionTone}`}>{blog.content}</p>
      </div>

      <div className="card-footer bg-transparent border-0 px-4 pb-4">
        <div className="d-flex flex-wrap gap-2 mb-3">
          <button
            className={`btn btn-soft-success btn-sm d-flex align-items-center gap-2 ${
              hasLikedPost ? "active" : ""
            }`}
            onClick={handleLikePost}
            disabled={hasLikedPost || !user}
            aria-pressed={hasLikedPost}
          >
            <i className="bi bi-hand-thumbs-up"></i>
            {likes}
          </button>
          <button
            className={`btn btn-soft-danger btn-sm d-flex align-items-center gap-2 ${
              hasDislikedPost ? "active" : ""
            }`}
            onClick={handleDislikePost}
            disabled={hasDislikedPost || !user}
            aria-pressed={hasDislikedPost}
          >
            <i className="bi bi-hand-thumbs-down"></i>
            {dislikes}
          </button>
          <button
            className="btn btn-soft-secondary btn-sm d-flex align-items-center gap-2"
            onClick={handleShare}
          >
            <i className="bi bi-share"></i>
            Share
          </button>
          <button
            className="btn btn-soft-secondary btn-sm d-flex align-items-center gap-2"
            onClick={() => setIsCommentsExpanded((prev) => !prev)}
            aria-expanded={isCommentsExpanded}
          >
            <i className="bi bi-chat-dots"></i>
            {conversationLabel}
          </button>
          {user && user.username === blog.author && (
            <button
              className="btn btn-soft-danger btn-sm d-flex align-items-center gap-2 ms-auto"
              onClick={() => setShowDeleteModal(true)}
            >
              <i className="bi bi-trash"></i>
              Delete
            </button>
          )}
        </div>

        {isCommentsExpanded && (
          <div
            className={`conversation-panel rounded-4 p-3 ${
              theme === "night"
                ? "bg-dark-subtle border border-secondary-subtle"
                : "bg-body-tertiary border border-light-subtle"
            }`}
          >
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div>
                <h6 className="mb-0 fw-semibold">Discussion</h6>
                <small className={descriptionTone}>
                  {commentCount
                    ? `${commentCount} ${
                        commentCount === 1 ? "comment" : "comments"
                      }`
                    : "Be the first to respond"}
                </small>
              </div>
              {commentCount > 3 && (
                <button
                  className="btn btn-link btn-sm px-0"
                  onClick={() => setShowCommentsModal(true)}
                >
                  View all
                </button>
              )}
            </div>
            {commentCount === 0 ? (
              <p className={`mb-3 ${descriptionTone}`}>
                No comments yet. Share your thoughts to start the conversation.
              </p>
            ) : (
              <ul className="list-unstyled d-flex flex-column gap-3 mb-3">
                {visibleComments.map(({ comment, originalIndex }) => (
                  <li
                    key={comment._id ?? `${comment.author}-${originalIndex}`}
                    className={`comment-bubble rounded-4 p-3 ${
                      theme === "night"
                        ? "bg-dark text-white border border-secondary-subtle"
                        : "bg-white border border-light-subtle"
                    }`}
                  >
                    <div className="d-flex gap-3 align-items-start">
                      {comment.authorImage ? (
                        <img
                          src={comment.authorImage}
                          alt={comment.author}
                          className="comment-avatar rounded-circle"
                        />
                      ) : (
                        <div className="comment-avatar comment-avatar--fallback rounded-circle">
                          {comment.author.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <span className="fw-semibold d-block">{comment.author}</span>
                            <span className={`small ${descriptionTone}`}>
                              Joined the conversation
                            </span>
                          </div>
                          <div className="d-flex flex-wrap gap-2">
                            <button
                              className="btn btn-soft-success btn-sm"
                              onClick={() => handleLikeComment(originalIndex)}
                              disabled={
                                user
                                  ? comment.likedBy?.includes(user.username) ||
                                    comment.dislikedBy?.includes(user.username)
                                  : true
                              }
                            >
                              <i className="bi bi-hand-thumbs-up me-1"></i>
                              {comment.likes}
                            </button>
                            <button
                              className="btn btn-soft-danger btn-sm"
                              onClick={() => handleDislikeComment(originalIndex)}
                              disabled={
                                user
                                  ? comment.likedBy?.includes(user.username) ||
                                    comment.dislikedBy?.includes(user.username)
                                  : true
                              }
                            >
                              <i className="bi bi-hand-thumbs-down me-1"></i>
                              {comment.dislikes}
                            </button>
                            <button
                              className="btn btn-soft-secondary btn-sm"
                              onClick={() => toggleReplyInput(originalIndex)}
                            >
                              <i className="bi bi-reply"></i>
                              Reply
                            </button>
                          </div>
                        </div>
                        <p className="mb-0">{comment.text}</p>

                        {comment.replies.length > 0 && (
                          <div className="mt-3 ps-4 border-start border-2 d-flex flex-column gap-2">
                            {comment.replies.map((reply, replyIdx) => (
                              <div
                                key={replyIdx}
                                className={`d-flex align-items-start gap-2 ${descriptionTone}`}
                              >
                                {reply.authorImage ? (
                                  <img
                                    src={reply.authorImage}
                                    alt={reply.author}
                                    className="comment-avatar comment-avatar--small rounded-circle"
                                  />
                                ) : (
                                  <div className="comment-avatar comment-avatar--small comment-avatar--fallback rounded-circle">
                                    {reply.author.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <span className="fw-semibold me-1">
                                    {reply.author}
                                  </span>
                                  {reply.text}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {comment.showReplyInput && (
                          <div className="d-flex gap-2 mt-3">
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="Write a reply..."
                              value={comment.newReply}
                              onChange={(e) =>
                                handleReplyChange(originalIndex, e.target.value)
                              }
                            />
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleReplySubmit(originalIndex)}
                            >
                              Send
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="input-group input-group-sm">
              <input
                type="text"
                className="form-control"
                placeholder="Share your perspective..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button className="btn btn-primary" onClick={handleCommentSubmit}>
                Send
              </button>
            </div>
          </div>
        )}
      </div>

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
            <div className="modal-content rounded-4 border-0">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-semibold">Delete post</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                />
              </div>
              <div className="modal-body pt-1">
                Are you sure you want to remove this post? This action cannot be
                undone.
              </div>
              <div className="modal-footer border-0 pt-0">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
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
              className={`modal-content rounded-4 border-0 ${
                theme === "night" ? "bg-dark text-white" : ""
              }`}
              style={{ height: "90vh", display: "flex", flexDirection: "column" }}
            >
              <div className="modal-header border-0">
                <h5 className="modal-title">All comments</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCommentsModal(false)}
                />
              </div>
              <div
                className="modal-body"
                style={{ overflowY: "auto", flexGrow: 1, paddingRight: "10px" }}
              >
                <div className="d-flex flex-column gap-3">
                  {comments.map((comment, idx) => (
                    <div
                      key={comment._id ?? `${comment.author}-${idx}`}
                      className={`comment-bubble rounded-4 p-3 ${
                        theme === "night"
                          ? "bg-dark text-white border border-secondary-subtle"
                          : "bg-white border border-light-subtle"
                      }`}
                    >
                      <div className="d-flex gap-3 align-items-start">
                        {comment.authorImage ? (
                          <img
                            src={comment.authorImage}
                            alt={comment.author}
                            className="comment-avatar rounded-circle"
                          />
                        ) : (
                          <div className="comment-avatar comment-avatar--fallback rounded-circle">
                            {comment.author.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <div>
                              <span className="fw-semibold d-block">{comment.author}</span>
                              <span className={`small ${descriptionTone}`}>
                                Joined the conversation
                              </span>
                            </div>
                            <div className="d-flex flex-wrap gap-2">
                              <button
                                className="btn btn-soft-success btn-sm"
                                onClick={() => handleLikeComment(idx)}
                                disabled={
                                  user
                                    ? comment.likedBy?.includes(user.username) ||
                                      comment.dislikedBy?.includes(user.username)
                                    : true
                                }
                              >
                                <i className="bi bi-hand-thumbs-up me-1"></i>
                                {comment.likes}
                              </button>
                              <button
                                className="btn btn-soft-danger btn-sm"
                                onClick={() => handleDislikeComment(idx)}
                                disabled={
                                  user
                                    ? comment.likedBy?.includes(user.username) ||
                                      comment.dislikedBy?.includes(user.username)
                                    : true
                                }
                              >
                                <i className="bi bi-hand-thumbs-down me-1"></i>
                                {comment.dislikes}
                              </button>
                            </div>
                          </div>
                          <p className="mb-0">{comment.text}</p>
                          {comment.replies.length > 0 && (
                            <div className="mt-3 ps-4 border-start border-2 d-flex flex-column gap-2">
                              {comment.replies.map((reply, replyIdx) => (
                                <div
                                  key={replyIdx}
                                  className={`d-flex align-items-start gap-2 ${descriptionTone}`}
                                >
                                  {reply.authorImage ? (
                                    <img
                                      src={reply.authorImage}
                                      alt={reply.author}
                                      className="comment-avatar comment-avatar--small rounded-circle"
                                    />
                                  ) : (
                                    <div className="comment-avatar comment-avatar--small comment-avatar--fallback rounded-circle">
                                      {reply.author.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <div>
                                    <span className="fw-semibold me-1">
                                      {reply.author}
                                    </span>
                                    {reply.text}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer border-0">
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Share your perspective..."
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

      {showImageModal && blog.image && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="modal-dialog modal-xl modal-dialog-centered"
            role="document"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content bg-dark text-white border-0 rounded-4">
              <div className="modal-header border-0">
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowImageModal(false)}
                />
              </div>
              <div className="modal-body p-0 d-flex justify-content-center align-items-center">
                <img
                  src={blog.image}
                  alt="Full blog view"
                  className="img-fluid"
                  style={{ maxHeight: "85vh", objectFit: "contain", borderRadius: "0.75rem" }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
