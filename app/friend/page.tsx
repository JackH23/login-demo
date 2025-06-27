"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import TopBar from "../components/TopBar";

interface User {
  username: string;
  position: string;
  age: number;
  image: string;
  friends?: string[];
}

interface LastMessage {
  type: "text" | "image" | "file";
  content: string;
  fileName?: string;
}

export default function FriendPage() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [lastMessages, setLastMessages] = useState<Record<string, LastMessage | null>>({});
  const [loadingMessages, setLoadingMessages] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const [usersRes, friendsRes] = await Promise.all([
          fetch("/api/users"),
          fetch(`/api/friends?username=${user.username}`),
        ]);
        const usersData = await usersRes.json();
        const friendsData = await friendsRes.json();
        setUsers(usersData.users ?? []);
        setFriends(friendsData.friends ?? []);
      } catch {
        setUsers([]);
        setFriends([]);
      } finally {
        setIsFetching(false);
      }
    };

    fetchData();
  }, [user]);

  useEffect(() => {
    const fetchLastMessages = async () => {
      if (!user || friends.length === 0) {
        setLastMessages({});
        setLoadingMessages(false);
        return;
      }

      try {
        const results = await Promise.all(
          friends.map(async (friend) => {
            const res = await fetch(
              `/api/messages?user1=${user.username}&user2=${friend}`
            );
            const data = await res.json();
            const msgs = data.messages ?? [];
            return { friend, msg: msgs[msgs.length - 1] as LastMessage | undefined };
          })
        );

        const map: Record<string, LastMessage | null> = {};
        results.forEach(({ friend, msg }) => {
          map[friend] = msg ?? null;
        });
        setLastMessages(map);
      } catch {
        setLastMessages({});
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchLastMessages();
  }, [user, friends]);

  if (loading || isFetching || loadingMessages || !user) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  const currentUserData = users.find((u) => u.username === user.username);
  if (!currentUserData) {
    return <div className="text-center mt-5">Loading user data...</div>;
  }

  const friendUsers = users.filter((u) => friends.includes(u.username));

  return (
    <div
      className={`container-fluid min-vh-100 p-4 ${
        theme === "night" ? "bg-dark text-white" : "bg-light"
      }`}
    >
      {/* Sticky Top Bar and Menu */}
      <TopBar
        title="Friend"
        active="friend"
        currentUser={{ username: currentUserData.username, image: currentUserData.image }}
      />

      {/* Content */}
      <div className="card shadow-sm w-100 mx-auto" style={{ maxWidth: "100%", top: "10px" }}>
        <div className="card-body">
          {friendUsers.length > 0 ? (
            <ul className="list-group">
              {friendUsers.map((f) => {
                const last = lastMessages[f.username];
                let preview = "";
                if (last) {
                  if (last.type === "text") preview = last.content;
                  else if (last.type === "image") preview = "[Image]";
                  else preview = last.fileName ? `[File] ${last.fileName}` : "[File]";
                }
                return (
                  <li key={f.username} className="list-group-item list-group-item-light">
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center">
                        {f.image && (
                          <img
                            src={f.image}
                            alt={`${f.username} profile`}
                            className="rounded-circle me-3"
                            style={{ width: "50px", height: "50px", objectFit: "cover" }}
                          />
                        )}
                        <div>
                          <div className="fw-bold">{f.username}</div>
                          {f.position && (
                            <div className="text-muted">Position: {f.position}</div>
                          )}
                          {preview && (
                            <div className="text-muted small" style={{ maxWidth: "200px" }}>
                              {preview}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="btn-group">
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => router.push(`/chat?user=${f.username}`)}
                        >
                          <i className="bi bi-chat-dots me-1"></i> Message
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-muted text-center">You have no friends added.</p>
          )}
        </div>
      </div>
    </div>
  );
}
