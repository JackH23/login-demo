"use client";

import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import "bootstrap-icons/font/bootstrap-icons.css";
import { useTheme } from "../context/ThemeContext";
import TopBar from "../components/TopBar";
import { ADMIN_USERNAME } from "@/lib/constants";
import { useConfirmDialog } from "../components/useConfirmDialog";

export default function UserPage() {
  const { user, loading, socket } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  interface User {
    username: string;
    position: string;
    age: number;
    image: string;
    friends?: string[];
    online?: boolean;
  }

  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { confirm: showConfirm, dialog: confirmDialog } = useConfirmDialog();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users");
        const data = await res.json();
        setUsers(data.users ?? []);
      } catch {
        setUsers([]);
      }
    };
    fetchUsers();
  }, [user]);

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
  }, [socket]);

  if (loading || !user)
    return <div className="text-center mt-5">Loading...</div>;

  const isAdmin = user.username === ADMIN_USERNAME;

  const currentUserData = users.find((u) => u.username === user.username);
  if (!currentUserData) {
    return <div className="text-center mt-5">Loading user data...</div>;
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
    const username = prompt("Enter new username", u.username);
    if (!username || username.trim() === "") return;
    const position = prompt("Enter position", u.position ?? "");
    if (position === null) return;
    const ageStr = prompt("Enter age", u.age?.toString() ?? "");
    if (ageStr === null) return;
    const age = Number(ageStr);
    if (Number.isNaN(age)) return;

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
    if (age !== u.age)
      changes.push({
        label: "Age",
        from: formatValue(u.age),
        to: formatValue(age),
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
            Review the updates before saving them to the community.
          </p>
          <div className="confirm-dialog-summary">
            {changes.map((change) => (
              <div key={change.label} className="confirm-dialog-summary-item">
                <div className="confirm-dialog-diff-label">{change.label}</div>
                <div className="confirm-dialog-diff-values">
                  <span>{change.from}</span>
                  <span className="confirm-dialog-diff-arrow" aria-hidden="true">
                    →
                  </span>
                  <span>{change.to}</span>
                </div>
              </div>
            ))}
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
      body: JSON.stringify({ username, position, age }),
    });
    if (res.ok) {
      const data = await res.json();
      setUsers((prev) =>
        prev.map((item) => (item.username === u.username ? data.user : item))
      );

      if (user.username === u.username && username !== u.username) {
        localStorage.setItem("user", JSON.stringify({ username }));
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
      alert(`Friend request sent to ${friend}`);
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
              <ul className="list-group">
                {filteredUsers.map((u) => (
                  <li
                    key={u.username}
                    className="list-group-item list-group-item-light"
                  >
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center">
                        {u.image && (
                          <img
                            src={u.image}
                            alt={`${u.username} profile`}
                            className="rounded-circle me-3"
                            style={{
                              width: "50px",
                              height: "50px",
                              objectFit: "cover",
                              ...(isAdmin ? { cursor: "pointer" } : {}),
                            }}
                            onClick={
                              isAdmin ? () => handleImageChange(u) : undefined
                            }
                          />
                        )}
                        <div>
                          <div className="fw-bold">
                            {u.username}{" "}
                            {u.online ? (
                              <span className="badge bg-success ms-1">Online</span>
                            ) : (
                              <span className="badge bg-secondary ms-1">Offline</span>
                            )}
                          </div>
                          {u.position && (
                            <div className="text-muted">
                              Position: {u.position}
                            </div>
                          )}
                          {typeof u.age === "number" && (
                            <div className="text-muted">Age: {u.age}</div>
                          )}
                        </div>
                      </div>
                      <div className="btn-group">
                        <button
                          className="btn btn-sm btn-outline-success"
                          disabled={currentUserData.friends?.includes(u.username)}
                          onClick={() => handleAddFriend(u.username)}
                        >
                          <i className="bi bi-person-plus me-1"></i>{" "}
                          {currentUserData.friends?.includes(u.username)
                            ? "Friend"
                            : "Add Friend"}
                        </button>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() =>
                            router.push(`/chat?user=${u.username}`)
                          }
                        >
                          <i className="bi bi-chat-dots me-1"></i> Message
                        </button>
                        {isAdmin && (
                          <>
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
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
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
