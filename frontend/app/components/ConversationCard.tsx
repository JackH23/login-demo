"use client";

import type { MutableRefObject } from "react";

export interface Reply {
  text: string;
  author: string;
  authorImage?: string;
  tempId?: string;
  isPending?: boolean;
}

export interface Comment {
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

interface ConversationCardProps {
  comments: Comment[];
  showAllComments: boolean;
  isMobile: boolean;
  isNight: boolean;
  mutedTextClass: string;
  totalComments: number;
  user: { username: string; image?: string } | null;
  replySubmittingId: string | null;
  newComment: string;
  isSubmittingComment: boolean;
  theme: string;
  resolveAvatar: (raw?: string | null, username?: string) => string | undefined;
  prefetchComments: () => void;
  setShowCommentsModal: (isOpen: boolean) => void;
  handleLikeComment: (index: number) => void;
  handleDislikeComment: (index: number) => void;
  toggleReplyInput: (index: number) => void;
  setReplyInputVisibility: (index: number, shouldOpen: boolean) => void;
  openUserProfile: (username?: string) => void;
  handleReplyChange: (index: number, value: string) => void;
  handleReplySubmit: (index: number) => void;
  onNewCommentChange: (value: string) => void;
  handleCommentSubmit: () => void;
  replyInputRefs: MutableRefObject<Record<string, HTMLDivElement | null>>;
}

export default function ConversationCard({
  comments,
  showAllComments,
  isMobile,
  isNight,
  mutedTextClass,
  totalComments,
  user,
  replySubmittingId,
  newComment,
  isSubmittingComment,
  theme,
  resolveAvatar,
  prefetchComments,
  setShowCommentsModal,
  handleLikeComment,
  handleDislikeComment,
  toggleReplyInput,
  setReplyInputVisibility,
  openUserProfile,
  handleReplyChange,
  handleReplySubmit,
  onNewCommentChange,
  handleCommentSubmit,
  replyInputRefs,
}: ConversationCardProps) {
  return (
    <div
      className={`conversation-card ${isMobile ? "mt-3" : "mt-5"} rounded-4 p-md-4 p-3 ${
        isNight ? "bg-secondary bg-opacity-25" : "bg-light"
      }`}
    >
      <div className="conversation-header d-flex flex-column flex-md-row gap-2 justify-content-between align-items-start align-items-md-center mb-3">
        <div>
          <h5 className="mb-1 d-flex align-items-center gap-2">
            <span>💬</span>
            <span>Conversation</span>
          </h5>
          <p className={`community-subtitle mb-0 small ${mutedTextClass}`}>
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
              isNight
                ? "rgba(255,255,255,0.25)"
                : "rgba(59,130,246,0.35)"
            }`,
          }}
        >
          <p className="mb-0">No comments yet. Share your thoughts below!</p>
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
                const isCommentPending = comment.isPending || !comment._id;
                const isReplySending = replySubmittingId === replyKey;
                const canSendReply = Boolean(
                  user && comment._id && comment.newReply.trim() && !isReplySending
                );

                return (
                  <li
                    key={comment._id ?? idx}
                    className={`conversation-comment-item rounded-4 shadow-sm ${
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
                                {comment.author?.charAt(0)?.toUpperCase() || "?"}
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
                              disabled={!user || isCommentPending || isReplySending}
                            >
                              💬 Reply
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

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
                                theme === "night" ? "text-light" : "text-muted"
                              } small mb-2`}
                            >
                              <button
                                type="button"
                                className="conversation-reply__avatar p-0 border-0 bg-transparent"
                                onClick={() => openUserProfile(reply.author)}
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
                                    {reply.author?.charAt(0)?.toUpperCase() || "?"}
                                  </span>
                                )}
                              </button>

                              <div className="conversation-reply__body">
                                <div className="conversation-reply__header">
                                  <button
                                    type="button"
                                    className="fw-semibold p-0 border-0 bg-transparent text-start conversation-reply__author"
                                    onClick={() => openUserProfile(reply.author)}
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
                                  onClick={() => setReplyInputVisibility(idx, true)}
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
                          onChange={(e) => handleReplyChange(idx, e.target.value)}
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

      <div className="comment-input-panel">
        <label className="form-label mb-2 fw-semibold text-muted small d-none d-md-block">
          Join the conversation
        </label>
        <div className="comment-input-group">
          <input
            type="text"
            className="form-control comment-input"
            placeholder={
              user ? "Write a comment..." : "Sign in to join the conversation"
            }
            value={newComment}
            onChange={(e) => onNewCommentChange(e.target.value)}
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
  );
}
