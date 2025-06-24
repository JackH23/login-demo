"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

interface BlogPost {
  _id?: string;
  title: string;
  content: string;
  image: string | null;
  author: string;
}

interface AuthorData {
  username: string;
  image?: string;
}

interface Comment {
  text: string;
  likes: number;
  dislikes: number;
  replies: string[];
  showReplyInput: boolean;
  newReply: string;
}

export default function BlogCard({
  blog,
  author,
}: {
  blog: BlogPost;
  author?: AuthorData;
}) {
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [showAllComments, setShowAllComments] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!blog._id) return;

    fetch(`/api/comments?postId=${blog._id}`)
      .then((res) => res.json())
      .then((data) => {
        const list = (data.comments ?? []).map((c: any) => ({
          text: c.text as string,
          likes: c.likes as number,
          dislikes: c.dislikes as number,
          replies: (c.replies ?? []).map((r: any) => r.text as string),
          showReplyInput: false,
          newReply: "",
        }));
        setComments(list);
      })
      .catch(() => setComments([]));
  }, [blog._id]);

  const handleCommentSubmit = async () => {
    const text = newComment.trim();
    if (!text) return;

    // Always update UI immediately
    setNewComment("");

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
            text: data.comment.text,
            likes: data.comment.likes,
            dislikes: data.comment.dislikes,
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
        text,
        likes: 0,
        dislikes: 0,
        replies: [],
        showReplyInput: false,
        newReply: "",
      },
    ]);
  };

  const handleLikeComment = (index: number) => {
    setComments((prev) =>
      prev.map((c, i) => (i === index ? { ...c, likes: c.likes + 1 } : c))
    );
  };

  const handleDislikeComment = (index: number) => {
    setComments((prev) =>
      prev.map((c, i) => (i === index ? { ...c, dislikes: c.dislikes + 1 } : c))
    );
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

  const handleReplySubmit = (index: number) => {
    setComments((prev) =>
      prev.map((c, i) =>
        i === index && c.newReply.trim()
          ? {
              ...c,
              replies: [...c.replies, c.newReply.trim()],
              newReply: "",
              showReplyInput: false,
            }
          : c
      )
    );
  };

  return (
    <div className="card shadow-sm w-100 mx-auto mb-4" style={{ maxWidth: "100%" }}>
      <div className="card-header bg-primary text-white d-flex align-items-center gap-3">
        {author?.image && (
          <img
            src={author.image}
            alt={author.username}
            className="rounded-circle"
            style={{ width: "40px", height: "40px", objectFit: "cover" }}
          />
        )}
        <div>
          <h4 className="mb-0">{blog.title}</h4>
          <small>{author?.username}</small>
        </div>
      </div>

      {blog.image && (
        <img
          src={blog.image}
          alt="Blog Visual"
          className="card-img-top"
          style={{ objectFit: "cover", maxHeight: "500px", cursor: "pointer" }}
          onClick={() => setShowImageModal(true)}
        />
      )}

      <div className="card-body">
        <p className="card-text">{blog.content}</p>

        <div className="d-flex gap-3 align-items-center mt-3">
          <button
            className="btn btn-outline-success"
            onClick={() => setLikes(likes + 1)}
          >
            👍 {likes}
          </button>
          <button
            className="btn btn-outline-danger"
            onClick={() => setDislikes(dislikes + 1)}
          >
            👎 {dislikes}
          </button>
          <button
            className="btn btn-outline-secondary"
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
            🔗 Share
          </button>
        </div>

        {/* Comments Section */}
        <div className="mt-4">
          <h5>Comments</h5>

          {comments.length === 0 ? (
            <p className="text-muted">No comments yet.</p>
          ) : (
            <>
              <div
                style={{ maxHeight: "300px", overflowY: "auto", paddingRight: "10px" }}
                className="mb-3"
              >
                <ul className="list-group">
                  {(showAllComments ? comments : comments.slice(-3)).map((comment, idx) => (
                    <li key={idx} className="list-group-item mb-3 rounded shadow-sm bg-white">
                      <div className="d-flex justify-content-between align-items-center">
                        <span>{comment.text}</span>
                        <div className="btn-group btn-group-sm">
                          <button className="btn btn-outline-success" onClick={() => handleLikeComment(idx)}>
                            👍 {comment.likes}
                          </button>
                          <button className="btn btn-outline-danger" onClick={() => handleDislikeComment(idx)}>
                            👎 {comment.dislikes}
                          </button>
                          <button className="btn btn-outline-primary" onClick={() => toggleReplyInput(idx)}>
                            💬 Reply
                          </button>
                        </div>
                      </div>

                      {/* Replies */}
                      {comment.replies.length > 0 && (
                        <ul className="mt-2 ps-3 list-unstyled">
                          {comment.replies.map((reply, rIdx) => (
                            <li key={rIdx} className="text-muted small mb-2">
                              ↪ {reply}
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
                            onChange={(e) => handleReplyChange(idx, e.target.value)}
                          />
                          <button className="btn btn-sm btn-primary" onClick={() => handleReplySubmit(idx)}>
                            Send
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {comments.length > 3 && (
                <div className="text-center mb-3">
                  <button className="btn btn-link btn-sm" onClick={() => setShowCommentsModal(true)}>
                    View all comments
                  </button>
                </div>
              )}
            </>
          )}

          {/* Add Comment Input */}
          <div className="d-flex gap-2">
            <input
              type="text"
              className="form-control"
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <button className="btn btn-primary" onClick={handleCommentSubmit}>
              Send
            </button>
          </div>
        </div>
      </div>

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
            <div className="modal-content" style={{ height: "90vh", display: "flex", flexDirection: "column" }}>
              <div className="modal-header">
                <h5 className="modal-title">All Comments</h5>
                <button type="button" className="btn-close" onClick={() => setShowCommentsModal(false)} />
              </div>

              {/* Scrollable Comments */}
              <div className="modal-body" style={{ overflowY: "auto", flexGrow: 1, paddingRight: "10px" }}>
                <ul className="list-group">
                  {comments.map((comment, idx) => (
                    <li key={idx} className="list-group-item mb-3 rounded shadow-sm bg-white">
                      <div className="d-flex justify-content-between align-items-center">
                        <span>{comment.text}</span>
                        <div className="btn-group btn-group-sm">
                          <button className="btn btn-outline-success" onClick={() => handleLikeComment(idx)}>
                            👍 {comment.likes}
                          </button>
                          <button className="btn btn-outline-danger" onClick={() => handleDislikeComment(idx)}>
                            👎 {comment.dislikes}
                          </button>
                          <button className="btn btn-outline-primary" onClick={() => toggleReplyInput(idx)}>
                            💬 Reply
                          </button>
                        </div>
                      </div>

                      {/* Replies */}
                      {comment.replies.length > 0 && (
                        <ul className="mt-2 ps-3 list-unstyled">
                          {comment.replies.map((reply, rIdx) => (
                            <li key={rIdx} className="text-muted small mb-2">
                              ↪ {reply}
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
                            onChange={(e) => handleReplyChange(idx, e.target.value)}
                          />
                          <button className="btn btn-sm btn-primary" onClick={() => handleReplySubmit(idx)}>
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
                  <button className="btn btn-primary" onClick={handleCommentSubmit}>
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
          <div className="modal-dialog modal-xl modal-dialog-centered" role="document" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content bg-dark text-white border-0">
              <div className="modal-header border-0">
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowImageModal(false)} />
              </div>
              <div className="modal-body p-0 d-flex justify-content-center align-items-center">
                <img
                  src={blog.image}
                  alt="Full Blog View"
                  className="img-fluid"
                  style={{ maxHeight: "85vh", objectFit: "contain", borderRadius: "0.5rem" }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
