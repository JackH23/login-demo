"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import "bootstrap-icons/font/bootstrap-icons.css";
import { useTheme } from "../context/ThemeContext";
import TopBar from "../components/TopBar";
import { ADMIN_USERNAME } from "@/lib/constants";

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
    if (!confirm("Delete this user?")) return;
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

  const handleEdit = async (u: User) => {
    const username = prompt("Enter new username", u.username);
    if (!username || username.trim() === "") return;
    const position = prompt("Enter position", u.position ?? "");
    if (position === null) return;
    const ageStr = prompt("Enter age", u.age?.toString() ?? "");
    if (ageStr === null) return;
    const age = Number(ageStr);
    if (Number.isNaN(age)) return;

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
