"use client";

import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import "bootstrap-icons/font/bootstrap-icons.css";
import { useTheme } from "../context/ThemeContext";
import TopBar from "../components/TopBar";
import LoadingState from "../components/LoadingState";
import { ADMIN_USERNAME } from "@/lib/constants";
import { useConfirmDialog } from "../components/useConfirmDialog";
import { usePromptDialog } from "../components/usePromptDialog";
import { useCachedApi } from "../hooks/useCachedApi";
import { apiUrl } from "@/app/lib/api";

export default function UserPage() {
  const { user, loading, socket, updateUser } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  interface User {
    username: string;
    image: string;
    friends?: string[];
    online?: boolean;
  }

  const {
    data: users,
    setData: setUsers,
    loading: usersLoading,
  } = useCachedApi<User[]>(user ? "/api/users" : null, {
    fallback: [],
    transform: (payload) =>
      (payload as { users?: User[] | null })?.users ?? [],
  });
  const [searchTerm, setSearchTerm] = useState("");
  const { confirm: showConfirm, dialog: confirmDialog } = useConfirmDialog();
  const { prompt: showPrompt, dialog: promptDialog } = usePromptDialog();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [loading, user, router]);

  useEffect(() => {
    // Socket listeners disabled; rely on API data
  }, [setUsers, socket]);

  if (loading || usersLoading || !user) {
    return (
      <LoadingState
        title="Preparing your profile"
        subtitle="We’re loading your connections and preferences so everything is ready."
        skeletonCount={2}
      />
    );
  }

  const isAdmin = user.username === ADMIN_USERNAME;

  const currentUserData = users.find((u) => u.username === user.username);
  if (!currentUserData) {
    return (
      <LoadingState
        title="Syncing your profile"
        subtitle="We’re refreshing your account information so your profile looks great."
        skeletonCount={1}
      />
    );
  }

  // Admin operations require the current username in the Authorization header
  const handleDelete = async (username: string) => {
    const confirmed = await showConfirm({
      title: "Remove user account",
      message: (
        <div>
          <p className="mb-1">
            Are you sure you want to delete
            {" "}
            <span className="fw-semibold">{username}</span>’s profile?
          </p>
          <small className="text-muted">
            This will revoke their access and remove their activity history.
          </small>
        </div>
      ),
      confirmText: "Delete user",
      cancelText: "Cancel",
      confirmVariant: "danger",
    });
    if (!confirmed) return;
    const res = await fetch(apiUrl(`/api/users/${username}`), {
      method: "DELETE",
      headers: { Authorization: user.username },
    });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.username !== username));
    }
  };

  const handleImageChange = async (u: User) => {
    const newImage = await new Promise<string | null>((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      };
      input.click();
    });
    if (!newImage) return;
    const res = await fetch(apiUrl(`/api/users/${u.username}`), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: user.username,
      },
      body: JSON.stringify({ image: newImage }),
    });
    if (res.ok) {
      const data = await res.json();
      setUsers((prev) =>
        prev.map((item) => (item.username === u.username ? data.user : item))
      );
    }
  };

  const formatValue = (value: string | null | undefined): ReactNode => {
    if (value === undefined || value === null || value === "") {
      return <span className="text-muted fst-italic">Not set</span>;
    }
    return <span className="fw-semibold text-body">{value}</span>;
  };

  const handleEdit = async (u: User) => {
    const result = await showPrompt({
      contextLabel: "Profile edit",
      title: `Edit ${u.username}'s profile`,
      description: (
        <>
          <p className="mb-2">
            Craft a friendlier snapshot of <span className="fw-semibold">{u.username}</span>
            ’s profile so teammates know who they are meeting.
          </p>
          <p className="mb-0 text-muted small">
            Fields marked with an asterisk are required. You can review every change before saving.
          </p>
        </>
      ),
      confirmText: "Review updates",
      cancelText: "Keep current info",
      confirmVariant: "edit",
      icon: <span aria-hidden="true">📝</span>,
      confirmIcon: <span aria-hidden="true">✨</span>,
      fields: [
        {
          name: "username",
          label: "Display name",
          defaultValue: u.username,
          required: true,
          autoFocus: true,
          helperText: "Visible to everyone across the platform.",
        },
      ],
    });

    if (!result) return;

    const username = result.username?.trim();
    if (!username) return;

    const changes: { label: string; from: ReactNode; to: ReactNode }[] = [];
    if (username !== u.username)
      changes.push({
        label: "Username",
        from: formatValue(u.username),
        to: formatValue(username),
      });

    if (changes.length === 0) {
      alert("No changes detected.");
      return;
    }

    const confirmed = await showConfirm({
      contextLabel: "Profile edit",
      title: `Apply updates for ${u.username}?`,
      message: (
        <>
          <p className="mb-2">
            Review what will change before sharing the polished profile update
            with everyone.
          </p>
          <div className="confirm-dialog-summary" role="list">
            {changes.map((change) => {
              const labelId = `confirm-change-${change.label
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")}`;
              return (
                <article
                  key={change.label}
                  className="confirm-dialog-summary-item"
                  role="listitem"
                  aria-labelledby={labelId}
                >
                  <div className="confirm-dialog-diff-header">
                    <span id={labelId} className="confirm-dialog-diff-label">
                      {change.label}
                    </span>
                    <span className="confirm-dialog-diff-pill">Updated</span>
                  </div>
                  <div className="confirm-dialog-diff-values" role="presentation">
                    <div className="confirm-dialog-diff-value confirm-dialog-diff-value-from">
                      <span className="confirm-dialog-diff-chip">Before</span>
                      <span className="confirm-dialog-diff-value-text">
                        {change.from}
                      </span>
                    </div>
                    <div className="confirm-dialog-diff-arrow" aria-hidden="true">
                      →
                    </div>
                    <div className="confirm-dialog-diff-value confirm-dialog-diff-value-to">
                      <span className="confirm-dialog-diff-chip">After</span>
                      <span className="confirm-dialog-diff-value-text">
                        {change.to}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      ),
      confirmText: "Apply changes",
      cancelText: "Review again",
      confirmVariant: "edit",
      confirmIcon: <span aria-hidden="true">✏️</span>,
    });
    if (!confirmed) return;

    const res = await fetch(apiUrl(`/api/users/${u.username}`), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: user.username,
      },
      body: JSON.stringify({
        username,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setUsers((prev) =>
        prev.map((item) => (item.username === u.username ? data.user : item))
      );

      if (user.username === u.username && username !== u.username) {
        updateUser({ username });
      }
    }
  };

  const handleAddFriend = async (friend: string) => {
    if (!user) return;
    const friendUser = users.find((item) => item.username === friend);

    const confirmed = await showConfirm({
      contextLabel: "Add friend",
      title: `Send a friend invite to ${friend}?`,
      message: (
        <>
          <p className="mb-2">
            {friendUser ? (
              <>
                We’ll send <span className="fw-semibold">{friendUser.username}</span> a
                friendly nudge to connect.
              </>
            ) : (
              <>We’ll let them know you’d like to stay in touch.</>
            )}
          </p>
          <ul className="confirm-dialog-highlight mb-0">
            <li>They’ll see your invite instantly.</li>
            <li>Chat unlocks as soon as they accept.</li>
          </ul>
        </>
      ),
      confirmText: "Send invite",
      cancelText: "Not now",
      confirmVariant: "friend",
      confirmIcon: <span aria-hidden="true">📨</span>,
    });
    if (!confirmed) return;

    const res = await fetch(apiUrl('/api/friends'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: user.username, friend }),
    });
    if (res.ok) {
      setUsers((prev) =>
        prev.map((item) =>
          item.username === user.username
            ? { ...item, friends: [...(item.friends ?? []), friend] }
            : item
        )
      );
    }
  };

  const filteredUsers = users
    .filter((u) => u.username !== user.username)
    .filter((u) => u.username.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div
      className={`container-fluid min-vh-100 p-4 ${
        theme === "night" ? "bg-dark text-white" : "bg-light"
      }`}
    >
      {promptDialog}
      {confirmDialog}
      {/* Sticky Top Bar and Menu */}
      <TopBar
        title="Home"
        active="user"
        currentUser={{
          username: currentUserData.username,
          image: currentUserData.image,
        }}
      />

      {/* Search input */}
      {/* Sticky Search Bar */}
      <div
        className="input-group position-sticky z-2"
        style={{
          top: "75px", // adjust based on your sticky header height
          maxWidth: "400px",
          marginBottom: "1rem",
          paddingTop: "0.5rem",
        }}
      >
        <input
          type="text"
          className="form-control"
          placeholder="Search users by username..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Main content card */}
      <div
        className="card shadow-sm w-100 mx-auto"
        style={{ maxWidth: "100%" }}
      >
        <div className="card-body">
          <p className="text-muted text-center mb-4">
            Registered users (excluding yourself):
          </p>

          {filteredUsers.length > 0 ? (
            <>
              <ul className="user-directory" role="list">
                {filteredUsers.map((u) => {
                  const isFriend = currentUserData.friends?.includes(u.username);
                  const presenceClass = u.online
                    ? "user-card-presence user-card-presence--online"
                    : "user-card-presence user-card-presence--offline";
                  const initials = u.username.charAt(0).toUpperCase();
                  return (
                    <li key={u.username} className="user-card" role="listitem">
                      <div className="user-card-main">
                        <div className="user-card-avatar">
                          {u.image ? (
                            isAdmin ? (
                              <button
                                type="button"
                                className="user-card-avatar-button"
                                onClick={() => handleImageChange(u)}
                                title={`Update ${u.username}'s profile picture`}
                                aria-label={`Update ${u.username}'s profile picture`}
                              >
                                <img
                                  src={u.image}
                                  alt={`${u.username} profile`}
                                  className="user-card-avatar-img"
                                />
                              </button>
                            ) : (
                              <img
                                src={u.image}
                                alt={`${u.username} profile`}
                                className="user-card-avatar-img"
                              />
                            )
                          ) : isAdmin ? (
                            <button
                              type="button"
                              className="user-card-avatar-button"
                              onClick={() => handleImageChange(u)}
                              title={`Add a profile picture for ${u.username}`}
                              aria-label={`Add a profile picture for ${u.username}`}
                            >
                              <span
                                className="user-card-avatar-placeholder"
                                aria-hidden="true"
                              >
                                {initials}
                              </span>
                            </button>
                          ) : (
                            <span
                              className="user-card-avatar-placeholder"
                              aria-hidden="true"
                            >
                              {initials}
                            </span>
                          )}
                          <span
                            className={presenceClass}
                            aria-hidden="true"
                          ></span>
                          <span className="visually-hidden">
                            {u.online ? "Online" : "Offline"}
                          </span>
                        </div>
                        <div className="user-card-body">
                          <div className="user-card-header">
                            <span className="user-card-name">{u.username}</span>
                            <span className={presenceClass} data-variant="label">
                              {u.online ? "Online" : "Offline"}
                            </span>
                          </div>
                          <div className="user-card-meta">
                            {isFriend && (
                              <span className="user-card-chip user-card-chip--success">
                                Friend
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="user-card-actions" role="group" aria-label={`Actions for ${u.username}`}>
                        <button
                          type="button"
                          className={`user-card-action user-card-action--friend${
                            isFriend ? " is-disabled" : ""
                          }`}
                          disabled={isFriend}
                          onClick={() => handleAddFriend(u.username)}
                        >
                          <i className="bi bi-person-plus" aria-hidden="true"></i>
                          {isFriend ? "Friend" : "Add Friend"}
                        </button>
                        <button
                          type="button"
                          className="user-card-action user-card-action--secondary"
                          onClick={() => router.push(`/chat?user=${u.username}`)}
                        >
                          <i className="bi bi-chat-dots" aria-hidden="true"></i>
                          Message
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              className="user-card-action user-card-action--edit"
                              onClick={() => handleEdit(u)}
                            >
                              <i className="bi bi-pencil-square" aria-hidden="true"></i>
                              Edit
                            </button>
                            <button
                              type="button"
                              className="user-card-action user-card-action--danger"
                              onClick={() => handleDelete(u.username)}
                            >
                              <i className="bi bi-trash" aria-hidden="true"></i>
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="text-muted text-center">No users found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
