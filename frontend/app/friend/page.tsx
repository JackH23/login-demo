"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import TopBar from "../components/TopBar";
import LoadingState from "../components/LoadingState";
import { useCachedApi } from "../hooks/useCachedApi";
import { apiUrl } from "@/app/lib/api";

interface User {
  username: string;
  image: string;
  friends?: string[];
  online?: boolean;
}

interface LastMessage {
  type: "text" | "image" | "file";
  content: string;
  fileName?: string;
}

export default function FriendPage() {
  const { user, loading, socket } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const {
    data: users,
    setData: setUsers,
    loading: loadingUsers,
  } = useCachedApi<User[]>(user ? "/api/users" : null, {
    fallback: [],
    transform: (payload) =>
      (payload as { users?: User[] | null })?.users ?? [],
  });
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
          fetch(apiUrl("/api/users")),
          fetch(apiUrl(`/api/friends?username=${user.username}`)),
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
  }, [setUsers, user]);

  useEffect(() => {
    // Socket listeners disabled; relying on API responses for status
  }, [setUsers, socket]);

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
              apiUrl(`/api/messages?user1=${user.username}&user2=${friend}&limit=1`)
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

  if (loading || isFetching || loadingMessages || loadingUsers || !user) {
    return (
      <LoadingState
        title="Loading your conversations"
        subtitle="We’re syncing your friends list and the most recent messages."
        skeletonCount={3}
      />
    );
  }

  const currentUserData = users.find((u) => u.username === user.username);
  if (!currentUserData) {
    return (
      <LoadingState
        title="Syncing your profile"
        subtitle="We’re loading your account so we can show the right contacts."
        skeletonCount={1}
      />
    );
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
            <ul className="user-directory" role="list">
              {friendUsers.map((f) => {
                const last = lastMessages[f.username];
                let preview = "";
                if (last) {
                  if (last.type === "text") preview = last.content;
                  else if (last.type === "image") preview = "[Image]";
                  else preview = last.fileName ? `[File] ${last.fileName}` : "[File]";
                }
                const presenceClass = f.online
                  ? "user-card-presence user-card-presence--online"
                  : "user-card-presence user-card-presence--offline";
                const initials = f.username.charAt(0).toUpperCase();
                return (
                  <li
                    key={f.username}
                    className="user-card user-card--friend"
                    role="listitem"
                  >
                    <div className="user-card-main">
                      <div className="user-card-avatar">
                        {f.image ? (
                          <img
                            src={f.image}
                            alt={`${f.username} profile`}
                            className="user-card-avatar-img"
                          />
                        ) : (
                          <span
                            className="user-card-avatar-placeholder"
                            aria-hidden="true"
                          >
                            {initials}
                          </span>
                        )}
                        <span className={presenceClass} aria-hidden="true"></span>
                        <span className="visually-hidden">
                          {f.online ? "Online" : "Offline"}
                        </span>
                      </div>
                      <div className="user-card-body">
                        <div className="user-card-header">
                          <span className="user-card-name">{f.username}</span>
                          <span className={presenceClass} data-variant="label">
                            {f.online ? "Online" : "Offline"}
                          </span>
                        </div>
                        {preview && (
                          <p className="user-card-preview mb-0" title={preview}>
                            {preview}
                          </p>
                        )}
                      </div>
                    </div>
                    <div
                      className="user-card-actions"
                      role="group"
                      aria-label={`Message ${f.username}`}
                    >
                      <button
                        type="button"
                        className="user-card-action user-card-action--secondary"
                        onClick={() => router.push(`/chat?user=${f.username}`)}
                      >
                        <i className="bi bi-chat-dots" aria-hidden="true"></i>
                        Message
                      </button>
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
