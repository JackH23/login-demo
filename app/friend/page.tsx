"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import TopBar from "../components/TopBar";
import LoadingState from "../components/LoadingState";
import { useCachedApi } from "../hooks/useCachedApi";

interface User {
  username: string;
  position: string;
  age: number;
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
  }, [setUsers, user]);

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
              `/api/messages?user1=${user.username}&user2=${friend}&limit=1`
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
  const totalFriends = friendUsers.length;
  const onlineFriends = friendUsers.filter((f) => f.online).length;
  const chatReadyFriends = friendUsers.filter((f) => lastMessages[f.username]).length;

  return (
    <div
      className={`profile-shell ${
        theme === "night" ? "profile-shell--night" : "profile-shell--day"
      }`}
    >
      <TopBar
        title="Friends"
        active="friend"
        currentUser={{ username: currentUserData.username, image: currentUserData.image }}
      />

      <main className="profile-layout container-xxl">
        <section
          aria-labelledby="friends-hero-heading"
          className={`profile-hero card ${
            theme === "night" ? "profile-hero--night" : "profile-hero--day"
          }`}
        >
          <div className="profile-hero__body">
            <div className="profile-hero__identity profile-hero__identity--compact">
              <div>
                <p className="profile-hero__eyebrow">Connections</p>
                <h1 id="friends-hero-heading" className="profile-hero__title">
                  Stay close to your team
                </h1>
                <p className="profile-hero__subtitle">
                  Pick a conversation to jump back into or keep exploring new teammates to
                  collaborate with.
                </p>
              </div>
            </div>
            <ul className="profile-stats" aria-label="Friendship insights">
              <li className="profile-stat">
                <span className="profile-stat__label">Connections</span>
                <span className="profile-stat__value">{totalFriends}</span>
                <span className="profile-stat__hint">Total friends added</span>
              </li>
              <li className="profile-stat">
                <span className="profile-stat__label">Active now</span>
                <span className="profile-stat__value">{onlineFriends}</span>
                <span className="profile-stat__hint">Friends currently online</span>
              </li>
              <li className="profile-stat">
                <span className="profile-stat__label">Chats with updates</span>
                <span className="profile-stat__value">{chatReadyFriends}</span>
                <span className="profile-stat__hint">Recent messages waiting</span>
              </li>
            </ul>
          </div>
        </section>

        <section className="card friend-directory">
          <div className="card-body">
            <header className="friend-directory__header">
              <div>
                <h2 className="profile-card__title mb-1">Your friends</h2>
                <p className="friend-directory__description mb-0">
                  Start a conversation, celebrate wins, or share files with the people you
                  collaborate with most.
                </p>
              </div>
            </header>

            {friendUsers.length > 0 ? (
              <ul className="friend-grid list-unstyled" role="list">
                {friendUsers.map((f) => {
                  const last = lastMessages[f.username];
                  let preview = "";
                  if (last) {
                    if (last.type === "text") preview = last.content;
                    else if (last.type === "image") preview = "[Image]";
                    else preview = last.fileName ? `[File] ${last.fileName}` : "[File]";
                  }

                  return (
                    <li key={f.username} className="friend-grid__item" role="listitem">
                      <article
                        className={`friend-card ${
                          f.online ? "friend-card--online" : "friend-card--offline"
                        }`}
                      >
                        <div className="friend-card__identity">
                          {f.image && (
                            <img
                              src={f.image}
                              alt={`${f.username} profile`}
                              className="friend-card__avatar"
                            />
                          )}
                          <div>
                            <div className="friend-card__name-row">
                              <h3 className="friend-card__name">{f.username}</h3>
                              <span className="friend-card__status">
                                <span
                                  className="friend-card__status-indicator"
                                  aria-hidden="true"
                                ></span>
                                {f.online ? "Online" : "Offline"}
                              </span>
                            </div>
                            {f.position && (
                              <p className="friend-card__meta">{f.position}</p>
                            )}
                            <p className="friend-card__preview">
                              {preview || "No messages yet — be the first to say hi!"}
                            </p>
                          </div>
                        </div>
                        <div className="friend-card__actions">
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => router.push(`/chat?user=${f.username}`)}
                          >
                            <i className="bi bi-chat-dots me-1"></i>
                            Open chat
                          </button>
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="friend-directory__empty">
                <h3>Build your circle</h3>
                <p>
                  Add teammates from the profile directory to see their status, exchange
                  messages, and collaborate faster.
                </p>
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={() => router.push("/user")}
                >
                  Browse the directory
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
