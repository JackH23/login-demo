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
          <ul className="user-directory" role="list">
            {Array.from({ length: 4 }).map((_, index) => (
              <li key={index} className="user-card" aria-hidden="true">
                <div className="user-card-main">
                  <div className="user-card-avatar">
                    <span className="placeholder rounded-circle d-block w-100 h-100" />
                    <span className="user-card-presence user-card-presence--offline" />
                  </div>
                  <div className="user-card-body">
                    <div className="placeholder-wave mb-2">
                      <span className="placeholder col-6" />
                    </div>
                    <div className="placeholder-wave mb-1">
                      <span className="placeholder col-8" />
                    </div>
                    <div className="placeholder-wave">
                      <span className="placeholder col-4" />
                    </div>
                  </div>
                </div>
                <div className="user-card-actions user-card-actions--stacked" aria-hidden="true">
                  <div className="placeholder rounded-pill w-100 mb-2" style={{ height: "44px" }} />
                  <div className="placeholder rounded-pill w-100" style={{ height: "44px" }} />
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
  const {
    data: friends,
    loading: loadingFriends,
  } = useCachedApi<string[]>(user ? `/api/friends?username=${user.username}` : null, {
    fallback: [],
    transform: (payload) => (payload as { friends?: string[] }).friends ?? [],
  });
  const [lastMessages, setLastMessages] = useState<Record<string, LastMessage | null>>({});
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [isCompactLayout, setIsCompactLayout] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [loading, user, router]);

  useEffect(() => {
    // Socket listeners disabled; relying on API responses for status
  }, [setUsers, socket]);

  useEffect(() => {
    const updateLayoutMetrics = () => {
      setIsCompactLayout(window.innerWidth < 768);
    };

    updateLayoutMetrics();
    window.addEventListener("resize", updateLayoutMetrics);
    return () => window.removeEventListener("resize", updateLayoutMetrics);
  }, []);

  useEffect(() => {
    if (loadingFriends) {
      setLoadingMessages(true);
      return;
    }

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
  }, [user, friends, loadingFriends]);

  const isBootstrapping = loading || loadingUsers || loadingFriends || !user;

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
                const subtitle = loadingMessages
                  ? "Loading last message..."
                  : preview || (f.online ? "Available to chat" : "Offline for now");

                return (
                  <li key={f.username} className="user-card user-card--friend" role="listitem">
                    <div className="user-card-main">
                      <div
                        className="user-card-avatar user-card-avatar--focusable"
                        role="presentation"
                        onClick={() => openProfile(f.username)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openProfile(f.username);
                          }
                        }}
                        tabIndex={0}
                        style={{ cursor: "pointer" }}
                      >
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
                        <span className={presenceClass} aria-hidden="true"></span>
                        <span className="visually-hidden">
                          {f.online ? "Online" : "Offline"}
                        </span>
                      </div>

                      <div
                        className="user-card-body"
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
                        <div className="user-card-header">
                          <span className="user-card-name">{f.username}</span>
                        </div>
                        <div className="user-card-status-row">
                          <span className={presenceClass} data-variant="label">
                            {f.online ? "Online" : "Offline"}
                          </span>
                          <span className="user-card-substatus">{subtitle}</span>
                        </div>
                        <div className="user-card-meta">
                          <span className="user-card-chip user-card-chip--success">Friend</span>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`user-card-actions ${
                        isCompactLayout ? "user-card-actions--stacked" : ""
                      }`}
                      role="group"
                      aria-label={`Actions for ${f.username}`}
                    >
                      <button
                        type="button"
                        className="user-card-action user-card-action--secondary"
                        onClick={() => openProfile(f.username)}
                      >
                        <i className="bi bi-person" aria-hidden="true"></i>
                        View profile
                      </button>
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
