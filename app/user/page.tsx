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

export default function UserPage() {
  const { user, loading, socket, updateUser } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  interface User {
    username: string;
    position?: string;
    age?: number;
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
    if (!socket) return;
    const handleOnline = (username: string) => {
      setUsers((prev) =>
        prev.map((u) => (u.username === username ? { ...u, online: true } : u))
      );
    };
    const handleOffline = (username: string) => {
      setUsers((prev) =>
        prev.map((u) =>
          u.username === username ? { ...u, online: false } : u
        )
      );
    };
    socket.on("user-online", handleOnline);
    socket.on("user-offline", handleOffline);
    return () => {
      socket.off("user-online", handleOnline);
      socket.off("user-offline", handleOffline);
    };
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
    const res = await fetch(`/api/users/${username}`, {
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
    const res = await fetch(`/api/users/${u.username}`, {
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

  const formatValue = (value: unknown): ReactNode => {
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
        {
          name: "position",
          label: "Role or focus",
          defaultValue: u.position ?? "",
          placeholder: "e.g. Product Designer",
          helperText: "Give teammates a hint about what you do.",
        },
        {
          name: "age",
          label: "Age",
          type: "number",
          defaultValue: typeof u.age === "number" ? u.age.toString() : "",
          helperText: "Optional — numbers only.",
        },
      ],
    });

    if (!result) return;

    const username = result.username?.trim();
    if (!username) return;
    const position = result.position?.trim() ?? "";
    const ageInput = result.age?.trim() ?? "";
    const parsedAge = ageInput === "" ? null : Number(ageInput);
    if (parsedAge !== null && Number.isNaN(parsedAge)) {
      alert("Please enter a valid number for age.");
      return;
    }

    const changes: { label: string; from: ReactNode; to: ReactNode }[] = [];
    if (username !== u.username)
      changes.push({
        label: "Username",
        from: formatValue(u.username),
        to: formatValue(username),
      });
    if ((position ?? "") !== (u.position ?? ""))
      changes.push({
        label: "Position",
        from: formatValue(u.position ?? ""),
        to: formatValue(position ?? ""),
      });
    const currentAge = typeof u.age === "number" ? u.age : null;
    if (parsedAge !== currentAge)
      changes.push({
        label: "Age",
        from: formatValue(u.age),
        to: formatValue(parsedAge),
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

    const res = await fetch(`/api/users/${u.username}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: user.username,
      },
      body: JSON.stringify({
        username,
        position,
        age: parsedAge,
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
          {friendUser?.position && (
            <div className="confirm-dialog-summary">
              <div className="confirm-dialog-summary-item">
                <div className="confirm-dialog-diff-label">Role snapshot</div>
                <div className="fw-semibold">{friendUser.position}</div>
              </div>
            </div>
          )}
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

    const res = await fetch('/api/friends', {
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

  const totalConnections = currentUserData.friends?.length ?? 0;
  const activeConnections = users.filter(
    (u) => u.username !== user.username && u.online
  ).length;
  const discoverablePeople = users.filter((u) => u.username !== user.username).length;
  const friendPreview = (currentUserData.friends ?? []).slice(0, 6);
  const hasMoreFriends = (currentUserData.friends?.length ?? 0) > friendPreview.length;

  return (
    <div
      className={`profile-shell ${
        theme === "night" ? "profile-shell--night" : "profile-shell--day"
      }`}
    >
      {promptDialog}
      {confirmDialog}
      <TopBar
        title="Profile"
        active="user"
        currentUser={{
          username: currentUserData.username,
          image: currentUserData.image,
        }}
      />

      <main className="profile-layout container-xxl">
        <section
          aria-labelledby="profile-hero-heading"
          className={`profile-hero card ${
            theme === "night" ? "profile-hero--night" : "profile-hero--day"
          }`}
        >
          <div className="profile-hero__body">
            <div className="profile-hero__identity">
              {currentUserData.image && (
                <div
                  className={`profile-hero__avatar ${
                    isAdmin ? "profile-hero__avatar--interactive" : ""
                  }`}
                >
                  <img
                    src={currentUserData.image}
                    alt={`${currentUserData.username} profile`}
                    onClick={
                      isAdmin ? () => handleImageChange(currentUserData) : undefined
                    }
                  />
                  {isAdmin && (
                    <span className="profile-hero__avatar-hint">Update photo</span>
                  )}
                </div>
              )}
              <div>
                <p className="profile-hero__eyebrow">Welcome back</p>
                <h1 id="profile-hero-heading" className="profile-hero__title">
                  {currentUserData.username}
                </h1>
                <p className="profile-hero__subtitle">
                  {currentUserData.position
                    ? currentUserData.position
                    : "Add your role to let teammates know how to collaborate with you."}
                </p>
                <div className="profile-hero__meta">
                  {typeof currentUserData.age === "number" && (
                    <span className="profile-hero__meta-item">Age {currentUserData.age}</span>
                  )}
                  <span className="profile-hero__meta-item">
                    {totalConnections} {totalConnections === 1 ? "connection" : "connections"}
                  </span>
                  <span className="profile-hero__meta-item">{discoverablePeople} people in your workspace</span>
                </div>
              </div>
            </div>
            <ul className="profile-stats" aria-label="Profile quick stats">
              <li className="profile-stat">
                <span className="profile-stat__label">Active now</span>
                <span className="profile-stat__value">{activeConnections}</span>
                <span className="profile-stat__hint">Friends who are online</span>
              </li>
              <li className="profile-stat">
                <span className="profile-stat__label">Discover</span>
                <span className="profile-stat__value">{filteredUsers.length}</span>
                <span className="profile-stat__hint">Matching teammates</span>
              </li>
              <li className="profile-stat">
                <span className="profile-stat__label">Invites sent</span>
                <span className="profile-stat__value">{totalConnections}</span>
                <span className="profile-stat__hint">People already connected</span>
              </li>
            </ul>
          </div>
          {isAdmin && (
            <div className="profile-admin-callout" role="note">
              <strong>Admin tools enabled.</strong> You can edit profiles, update
              avatars, and remove accounts directly from the directory below.
            </div>
          )}
        </section>

        <div className="row g-4 profile-columns">
          <aside className="col-lg-4">
            <section className="card profile-card">
              <div className="card-body">
                <h2 className="profile-card__title">About you</h2>
                <p className="profile-card__description">
                  Keep your profile sharp so teammates instantly know how to work with
                  you.
                </p>
                <dl className="profile-attributes">
                  <div className="profile-attribute">
                    <dt>Display name</dt>
                    <dd>{formatValue(currentUserData.username)}</dd>
                  </div>
                  <div className="profile-attribute">
                    <dt>Role or focus</dt>
                    <dd>{formatValue(currentUserData.position)}</dd>
                  </div>
                  <div className="profile-attribute">
                    <dt>Age</dt>
                    <dd>{formatValue(currentUserData.age)}</dd>
                  </div>
                </dl>
                <div className="profile-friends">
                  <h3 className="profile-friends__title">Friend highlights</h3>
                  {friendPreview.length > 0 ? (
                    <div className="profile-friends__chips" role="list">
                      {friendPreview.map((friend) => (
                        <span key={friend} role="listitem" className="profile-friend-chip">
                          <span aria-hidden="true">👋</span> {friend}
                        </span>
                      ))}
                      {hasMoreFriends && (
                        <span className="profile-friend-chip profile-friend-chip--more">
                          +{(currentUserData.friends?.length ?? 0) - friendPreview.length} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="profile-friends__empty">
                      You haven’t added any friends yet. Invite teammates from the directory
                      to unlock fast chat shortcuts.
                    </p>
                  )}
                  <button
                    type="button"
                    className="btn btn-outline-primary w-100 mt-3"
                    onClick={() => router.push("/friend")}
                  >
                    View friend dashboard
                  </button>
                </div>
              </div>
            </section>
          </aside>

          <section className="col-lg-8">
            <div className="card profile-directory">
              <div className="card-body">
                <header className="profile-directory__header">
                  <div>
                    <h2 className="profile-card__title mb-1">People directory</h2>
                    <p className="profile-directory__description mb-0">
                      Search across everyone in your workspace and grow your network.
                    </p>
                  </div>
                  <div className="profile-directory__search">
                    <label htmlFor="user-search" className="visually-hidden">
                      Search users by username
                    </label>
                    <i className="bi bi-search"></i>
                    <input
                      id="user-search"
                      type="text"
                      placeholder="Search by username"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </header>

                {filteredUsers.length > 0 ? (
                  <ul className="people-grid list-unstyled" role="list">
                    {filteredUsers.map((u) => (
                      <li key={u.username} className="people-grid__item" role="listitem">
                        <article
                          className={`person-card ${
                            u.online ? "person-card--online" : "person-card--offline"
                          }`}
                        >
                          <div className="person-card__identity">
                            {u.image && (
                              <img
                                src={u.image}
                                alt={`${u.username} profile`}
                                className={`person-card__avatar ${
                                  isAdmin ? "person-card__avatar--interactive" : ""
                                }`}
                                onClick={
                                  isAdmin ? () => handleImageChange(u) : undefined
                                }
                              />
                            )}
                            <div>
                              <div className="person-card__name-row">
                                <h3 className="person-card__name">{u.username}</h3>
                                <span className="person-card__status">
                                  <span className="person-card__status-indicator" aria-hidden="true"></span>
                                  {u.online ? "Online" : "Offline"}
                                </span>
                              </div>
                              {u.position && (
                                <p className="person-card__meta">{u.position}</p>
                              )}
                              {typeof u.age === "number" && (
                                <p className="person-card__meta">Age {u.age}</p>
                              )}
                            </div>
                          </div>
                          <div className="person-card__actions">
                            <button
                              className="btn btn-sm btn-success"
                              disabled={currentUserData.friends?.includes(u.username)}
                              onClick={() => handleAddFriend(u.username)}
                            >
                              <i className="bi bi-person-plus me-1"></i>
                              {currentUserData.friends?.includes(u.username)
                                ? "Friend"
                                : "Add Friend"}
                            </button>
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => router.push(`/chat?user=${u.username}`)}
                            >
                              <i className="bi bi-chat-dots me-1"></i>
                              Message
                            </button>
                            {isAdmin && (
                              <div className="person-card__admin-actions">
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => handleEdit(u)}
                                >
                                  Edit
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleDelete(u.username)}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </article>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="profile-directory__empty">
                    <h3>No matches found</h3>
                    <p>
                      Try a different search term or invite a teammate to join the workspace.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
