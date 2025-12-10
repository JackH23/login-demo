"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import TopBar from "../components/TopBar";
import LoadingState from "../components/LoadingState";
import { useCachedApi } from "../hooks/useCachedApi";
import { apiUrl } from "@/app/lib/api";
import { normalizeUsersResponse } from "@/app/lib/users";

interface User {
  username: string;
  image?: string;
  friends?: string[];
  online?: boolean;
}

interface LastMessage {
  type: "text" | "image" | "file";
  content: string;
  fileName?: string;
}

function FriendListSkeleton({ theme }: { theme: string }) {
  const baseClasses =
    theme === "night"
      ? "bg-dark text-white border border-primary-subtle"
      : "bg-light";

  return (
    <div className={`friend-page-shell container-fluid min-vh-100 p-4 ${baseClasses}`}>
      <div className="friend-skeleton-topbar rounded-4 shadow-sm mb-3" />
      <div className="friend-panel card border-0 shadow-sm">
        <div className="card-body">
          <div className="friend-panel-header d-flex align-items-center justify-content-between mb-3">
            <div className="placeholder-wave w-50">
              <span className="placeholder col-8" />
            </div>
            <div className="placeholder-wave w-25 text-end">
              <span className="placeholder col-6" />
            </div>
          </div>
          <ul className="friend-list" role="list">
            {Array.from({ length: 4 }).map((_, index) => (
              <li key={index} className="friend-row is-loading" aria-hidden="true">
                <div className="friend-row-main" role="presentation">
                  <div className="friend-avatar">
                    <span className="placeholder rounded-circle" />
                    <span className="user-card-presence user-card-presence--offline" />
                  </div>
                  <div className="friend-row-content">
                    <div className="placeholder-wave mb-2">
                      <span className="placeholder col-7" />
                    </div>
                    <div className="placeholder-wave">
                      <span className="placeholder col-10" />
                    </div>
                  </div>
                </div>
                <div className="friend-row-actions">
                  <div className="friend-message-btn placeholder rounded-pill" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
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
    transform: normalizeUsersResponse,
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
        setUsers(normalizeUsersResponse(usersData));
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

  const isBootstrapping = loading || isFetching || loadingUsers || !user;

  if (isBootstrapping) {
    return <FriendListSkeleton theme={theme} />;
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

  const openProfile = (username: string) => {
    router.push(`/user/${encodeURIComponent(username)}`);
  };

  return (
    <div
      className={`friend-page-shell container-fluid min-vh-100 p-4 ${
        theme === "night" ? "bg-dark text-white" : "bg-light"
      }`}
    >
      <TopBar
        title="Friend"
        active="friend"
        currentUser={{ username: currentUserData.username, image: currentUserData.image }}
      />

      <section className="friend-panel card border-0 shadow-sm">
        <div className="card-body">
          <div className="friend-panel-header d-flex align-items-center justify-content-between">
            <div>
              <p className="text-uppercase small fw-semibold text-secondary mb-1">
                People you follow
              </p>
              <h3 className="h5 mb-0">Friends ({friendUsers.length})</h3>
            </div>
            <span className="text-muted small">Tap to message • Hold for options</span>
          </div>

          {friendUsers.length > 0 ? (
            <ul className="friend-list" role="list">
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
                  <li key={f.username} className="friend-row" role="listitem">
                    <div
                      className="friend-row-main"
                      role="button"
                      tabIndex={0}
                      onClick={() => openProfile(f.username)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openProfile(f.username);
                        }
                      }}
                    >
                      <div className="friend-avatar" title={f.online ? "Online" : "Offline"}>
                        {f.image ? (
                          <img
                            src={f.image}
                            alt={`${f.username} profile`}
                            className="user-card-avatar-img"
                          />
                        ) : (
                          <span className="user-card-avatar-placeholder" aria-hidden="true">
                            {initials}
                          </span>
                        )}
                        <span className={presenceClass} aria-hidden="true" />
                        <span className="visually-hidden">
                          {f.online ? "Online" : "Offline"}
                        </span>
                      </div>

                      <div className="friend-row-content">
                        <div className="friend-row-top">
                          <span className="friend-name">{f.username}</span>
                          <span
                            className={`friend-status ${
                              f.online ? "friend-status--online" : "friend-status--offline"
                            }`}
                          >
                            <span className="friend-status-dot" aria-hidden="true" />
                            {f.online ? "Online" : "Offline"}
                          </span>
                        </div>
                        <p
                          className={`friend-preview mb-0 ${loadingMessages ? "is-loading" : ""}`}
                          title={preview || (loadingMessages ? undefined : "No recent messages yet")}
                        >
                          {loadingMessages
                            ? "Loading last message..."
                            : preview || "No recent messages yet"}
                        </p>
                      </div>
                    </div>

                    <div className="friend-row-actions">
                      <button
                        type="button"
                        className="friend-message-btn"
                        onClick={() => router.push(`/chat?user=${f.username}`)}
                      >
                        <i className="bi bi-chat-dots" aria-hidden="true" />
                        <span>Message</span>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="friend-empty-state text-center">
              <div className="friend-empty-visual" aria-hidden="true">
                <i className="bi bi-people" />
              </div>
              <h3 className="h5">No friends yet</h3>
              <p className="text-muted mb-3">
                Start building your circle. Search for people you know or invite them to chat.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => router.push("/home")}
              >
                Find friends
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
