"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import TopBar from "../components/TopBar";
import LoadingState from "../components/LoadingState";
import { useCachedApi } from "../hooks/useCachedApi";
import { resolveApiUrl } from "@/app/lib/api";
import { normalizeDirectoryResponse } from "@/app/lib/users";

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

interface LatestMessageResponse extends LastMessage {
  partner: string;
  createdAt: string;
}

interface FriendDirectory {
  viewer: User | null;
  friends: User[];
  total: number;
  nextCursor: string | null;
}

const DIRECTORY_STALE_TIME = 5 * 60 * 1000;

export default function FriendPage() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const directoryFallback = useMemo(
    () =>
      user
        ? {
            viewer: { ...user, image: user.image ?? undefined },
            friends: [],
            total: 0,
            nextCursor: null,
          }
        : { viewer: null, friends: [], total: 0, nextCursor: null },
    [user]
  );
  const {
    data: directory,
    loading: loadingDirectory,
    error: directoryError,
  } = useCachedApi<FriendDirectory>(
    user ? `/api/friends/directory?username=${user.username}` : null,
    {
      staleTime: DIRECTORY_STALE_TIME,
      fallback: directoryFallback,
      transform: normalizeDirectoryResponse,
    }
  );
  const isUserDataLoading = loading || loadingDirectory;
  const [lastMessages, setLastMessages] = useState<
    Record<string, LastMessage | null>
  >({});
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [stickyOffset, setStickyOffset] = useState(88);
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [loading, user, router]);

  useEffect(() => {
    const updateLayoutMetrics = () => {
      const topbar = document.querySelector(
        ".topbar-wrapper"
      ) as HTMLElement | null;
      const topbarHeight = topbar?.getBoundingClientRect().height ?? 0;
      setStickyOffset(topbarHeight + 12);
      setIsCompactLayout(window.innerWidth < 768);
    };

    updateLayoutMetrics();
    window.addEventListener("resize", updateLayoutMetrics);
    return () => window.removeEventListener("resize", updateLayoutMetrics);
  }, []);

  const friendUsers = directory.friends;
  const friendUsernames = useMemo(
    () => friendUsers.map((f) => f.username),
    [friendUsers]
  );

  useEffect(() => {
    if (loadingDirectory) {
      setLoadingMessages(true);
      return;
    }

    const controller = new AbortController();
    setLoadingMessages(true);

    const fetchLastMessages = async () => {
      if (!user || !friendUsernames || friendUsernames.length === 0) {
        setLastMessages({});
        setLoadingMessages(false);
        return;
      }

      try {
        const BATCH_SIZE = 40;
        const chunkedTargets: string[][] = [];

        for (let i = 0; i < friendUsernames.length; i += BATCH_SIZE) {
          chunkedTargets.push(friendUsernames.slice(i, i + BATCH_SIZE));
        }

        const fetchBatchLatest = async (targets: string[]) => {
          const params = new URLSearchParams({
            user: user.username,
            targets: targets.join(","),
          });

          const res = await fetch(
            resolveApiUrl(`/api/messages/latest?${params.toString()}`),
            { signal: controller.signal }
          );

          if (!res.ok) return [];

          const data = await res.json();
          const latest = (data.latest ?? []) as LatestMessageResponse[];

          return latest.map((item): [string, LastMessage] => [
            item.partner,
            {
              type: item.type,
              content: item.content,
              fileName: item.fileName,
            },
          ]);
        };

        const batchResults = await Promise.allSettled(
          chunkedTargets.map((targets) => fetchBatchLatest(targets))
        );
        if (controller.signal.aborted) return;

        batchResults.forEach((result) => {
          if (result.status === "rejected" && !controller.signal.aborted) {
            console.error(
              "Failed to fetch latest messages batch",
              result.reason
            );
          }
        });

        const latestEntries = batchResults.flatMap((result) =>
          result.status === "fulfilled" ? result.value : []
        );

        const map: Record<string, LastMessage | null> = {};
        friendUsernames.forEach((friend) => {
          map[friend] = null;
        });

        latestEntries.forEach(([friend, msg]) => {
          map[friend] = msg;
        });

        setLastMessages(map);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Unable to fetch latest messages", error);
        }
        setLastMessages({});
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchLastMessages().catch((error) => {
      if (controller.signal.aborted) return;
      console.error("Failed to fetch latest messages", error);
      setLastMessages({});
      setLoadingMessages(false);
    });

    return () => controller.abort();
  }, [user, friendUsernames, loadingDirectory]);

  if (isUserDataLoading || !user) {
    return (
      <LoadingState
        title="Preparing your profile"
        subtitle="We’re loading your connections and preferences so everything is ready."
        skeletonCount={2}
      />
    );
  }

  const currentUserData = directory.viewer ?? user;
  if (directoryError && !currentUserData) {
    return (
      <LoadingState
        title="Syncing your profile"
        subtitle="We’re loading your account so we can show the right contacts."
        skeletonCount={1}
      />
    );
  }

  const filteredFriendUsers = friendUsers.filter((u) =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalFriends = directory.total ?? friendUsers.length;

  const openProfile = (username: string) => {
    setOpenActionMenu(null);
    router.push(`/user/${encodeURIComponent(username)}`);
  };

  const toggleActionMenu = (username: string) => {
    setOpenActionMenu((prev) => (prev === username ? null : username));
  };

  return (
    <div
      className={`friend-page-shell container-fluid min-vh-100 px-4 py-3 ${
        theme === "night" ? "bg-dark text-white" : "bg-light"
      }`}
    >
      <TopBar
        title="Friend"
        active="friend"
        currentUser={{
          username: currentUserData.username,
          image: currentUserData.image,
          isAdmin: currentUserData?.isAdmin ?? user?.isAdmin,
        }}
      />

      <section className="friend-panel card border-0 shadow-sm">
        <div className="card-body">
          <div className="friend-panel-header d-flex align-items-center justify-content-between">
            <div>
              <p className="text-uppercase small fw-semibold text-secondary mb-1 d-none d-md-block">
                People you follow
              </p>
              <h3 className="h5 mb-0">Friends ({totalFriends})</h3>
            </div>
            <span className="text-muted small d-none d-md-block">
              Tap to message • Hold for options
            </span>
          </div>

          {friendUsers.length > 0 ? (
            <>
              <div
                className="input-group position-sticky z-2 user-directory-search"
                style={{
                  top: stickyOffset,
                  maxWidth: isCompactLayout ? "100%" : "520px",
                  margin: "1rem 0 1.5rem",
                  paddingTop: "0.25rem",
                }}
              >
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search friends by username..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  aria-label="Search friends by username"
                />
              </div>

              {filteredFriendUsers.length > 0 ? (
                <ul className="user-directory" role="list">
                  {filteredFriendUsers.map((f) => {
                    const last = lastMessages[f.username];
                    let preview = "";
                    if (last) {
                      if (last.type === "text") preview = last.content;
                      else if (last.type === "image") preview = "[Image]";
                      else
                        preview = last.fileName
                          ? `[File] ${last.fileName}`
                          : "[File]";
                    }

                    const presenceClass = f.online
                      ? "user-card-presence user-card-presence--online"
                      : "user-card-presence user-card-presence--offline";
                    const initials = f.username.charAt(0).toUpperCase();
                    const subtitle = loadingMessages
                      ? "Loading last message..."
                      : preview ||
                        (f.online ? "Available to chat" : "Offline for now");

                    return (
                      <li
                        key={f.username}
                        className="user-card user-card--friend user-card--compact"
                        role="listitem"
                      >
                        <div
                          className="user-card-main"
                          role={isCompactLayout ? "button" : undefined}
                          tabIndex={isCompactLayout ? 0 : undefined}
                          onClick={() => {
                            if (isCompactLayout) {
                              router.push(`/chat?user=${f.username}`);
                            }
                          }}
                          onKeyDown={(event) => {
                            if (!isCompactLayout) return;
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              router.push(`/chat?user=${f.username}`);
                            }
                          }}
                        >
                          <div
                            className="user-card-avatar user-card-avatar--focusable"
                            role="presentation"
                            onClick={(event) => {
                              event.stopPropagation();
                              openProfile(f.username);
                            }}
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
                              {f.online ? "Online" : "Offline"}
                            </span>
                          </div>

                          <div
                            className="user-card-body"
                            role="button"
                            tabIndex={0}
                            onClick={(event) => {
                              if (isCompactLayout) {
                                event.stopPropagation();
                                router.push(`/chat?user=${f.username}`);
                                return;
                              }
                              openProfile(f.username);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                if (isCompactLayout) {
                                  router.push(`/chat?user=${f.username}`);
                                  return;
                                }
                              }
                            }}
                          >
                            <div className="user-card-header">
                              <span className="user-card-name">
                                {f.username}
                              </span>
                            </div>
                            <div className="user-card-status-row">
                              <div className="user-card-status-badges d-none d-md-block">
                                <span
                                  className={presenceClass}
                                  data-variant="label"
                                >
                                  {f.online ? "Online" : "Offline"}
                                </span>
                              </div>
                              <span className="user-card-substatus">
                                {subtitle}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div
                          className={`user-card-actions ${
                            isCompactLayout
                              ? "user-card-actions--inline-mobile user-card-actions--mobile-stack"
                              : ""
                          }`}
                          role="group"
                          aria-label={`Actions for ${f.username}`}
                        >
                          {isCompactLayout ? (
                            <>
                              <button
                                type="button"
                                className="user-card-action user-card-action--primary"
                                onClick={() => openProfile(f.username)}
                              >
                                <i
                                  className="bi bi-person"
                                  aria-hidden="true"
                                ></i>
                                View profile
                              </button>
                              <div className="user-card-more">
                                <button
                                  type="button"
                                  className="user-card-action user-card-action--secondary user-card-action--more"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    toggleActionMenu(f.username);
                                  }}
                                  aria-expanded={openActionMenu === f.username}
                                  aria-controls={`friend-actions-${f.username}`}
                                >
                                  <i
                                    className="bi bi-three-dots"
                                    aria-hidden="true"
                                  ></i>
                                  More actions
                                </button>
                                {openActionMenu === f.username && (
                                  <div
                                    id={`friend-actions-${f.username}`}
                                    className="user-card-more-menu"
                                  >
                                    <button
                                      type="button"
                                      className="user-card-action user-card-action--secondary"
                                      onClick={() => {
                                        setOpenActionMenu(null);
                                        router.push(`/chat?user=${f.username}`);
                                      }}
                                    >
                                      <i
                                        className="bi bi-chat-dots"
                                        aria-hidden="true"
                                      ></i>
                                      Message
                                    </button>
                                  </div>
                                )}
                              </div>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="user-card-action user-card-action--secondary"
                                onClick={() => openProfile(f.username)}
                              >
                                <i
                                  className="bi bi-person"
                                  aria-hidden="true"
                                ></i>
                                View profile
                              </button>
                              <button
                                type="button"
                                className="user-card-action user-card-action--secondary"
                                onClick={() =>
                                  router.push(`/chat?user=${f.username}`)
                                }
                              >
                                <i
                                  className="bi bi-chat-dots"
                                  aria-hidden="true"
                                ></i>
                                Message
                              </button>
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="user-card-empty text-center py-5">
                  <p className="text-muted mb-2">
                    No friends match your search right now.
                  </p>
                  <p className="text-muted mb-3">
                    Try a different name or explore the directory to find more
                    people.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => router.push("/user")}
                  >
                    Find friends
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="friend-empty-state text-center">
              <div className="friend-empty-visual" aria-hidden="true">
                <i className="bi bi-people" />
              </div>
              <h3 className="h5">No friends yet</h3>
              <p className="text-muted mb-3">
                Start building your circle. Search for people you know or invite
                them to chat.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => router.push("/user")}
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
