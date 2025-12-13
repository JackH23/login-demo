"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Socket } from "socket.io-client";
import { apiUrl } from "@/app/lib/api";

interface Message {
  _id: string;
  type: "text" | "image" | "file";
  content: string;
  fileName?: string;
  from: string;
  to: string;
  createdAt: string;
}

interface ChatParticipant {
  username: string;
  image?: string;
  online?: boolean;
  friends?: string[];
}

interface ChatEmoji {
  shortcode: string;
  unicode: string;
  category?: string;
  hasSkinTones?: boolean;
}

function ChatPageContent() {
  const searchParams = useSearchParams();
  const chatUser = searchParams.get("user") ?? "";
  const router = useRouter();
  const { user, socket } = useAuth();
  const { theme, setTheme } = useTheme();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const prevLengthRef = useRef(0); // Initialize ref here
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [chatOnline, setChatOnline] = useState(false);
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [emojiList, setEmojiList] = useState<ChatEmoji[]>([]);
  const [people, setPeople] = useState<ChatParticipant[]>([]);
  const [isFetchingPeople, setIsFetchingPeople] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [showChatThread, setShowChatThread] = useState(Boolean(chatUser));
  const [latestMessages, setLatestMessages] = useState<Record<string, string>>({});
  const emojiLoadedRef = useRef(false);
  const fetchingMessagesRef = useRef(false);

  useEffect(() => {
    setParticipants([]);
    setChatOnline(false);
  }, [chatUser]);

  useEffect(() => {
    if (!people.length) {
      setLatestMessages({});
    }
  }, [people.length]);

  useEffect(() => {
    const updateBreakpoint = () => {
      if (typeof window === "undefined") return;
      setIsMobile(window.matchMedia("(max-width: 768px)").matches);
    };

    updateBreakpoint();
    window.addEventListener("resize", updateBreakpoint);
    return () => window.removeEventListener("resize", updateBreakpoint);
  }, []);

  useEffect(() => {
    setShowChatThread(Boolean(chatUser));
  }, [chatUser]);

  const appendPeopleIncrementally = useCallback(
    async (users: ChatParticipant[], signal?: AbortSignal) => {
      const CHUNK_SIZE = 15;
      setIsFetchingPeople(true);
      setPeople([]);

      for (let i = 0; i < users.length; i += CHUNK_SIZE) {
        if (signal?.aborted) return;
        const slice = users.slice(i, i + CHUNK_SIZE);
        setPeople((prev) => [...prev, ...slice]);
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }

      setIsFetchingPeople(false);
    },
    []
  );

  const fetchPeople = useCallback(
    async (signal?: AbortSignal) => {
      if (!user) return;

      try {
        setIsFetchingPeople(true);
        const res = await fetch(apiUrl("/api/users"), {
          signal,
          headers: { Authorization: user.username },
        });
        if (!res.ok) throw new Error(`Failed to load users: ${res.status}`);

        const data = (await res.json()) as { users?: ChatParticipant[] };
        if (Array.isArray(data.users)) {
          await appendPeopleIncrementally(data.users, signal);
        } else {
          setPeople([]);
        }
      } catch (error) {
        if (signal?.aborted) return;
        console.error("Unable to load people", error);
      } finally {
        setIsFetchingPeople(false);
      }
    },
    [appendPeopleIncrementally, user]
  );

  useEffect(() => {
    if (!user) return;

    const controller = new AbortController();
    void fetchPeople(controller.signal);

    return () => controller.abort();
  }, [user, fetchPeople, isMobile]);

  useEffect(() => {
    if (!user || !isMobile || people.length === 0) return;

    const controller = new AbortController();
    const fetchLatestMessages = async () => {
      try {
        const previews = await Promise.all(
          people.map(async (person) => {
            const params = new URLSearchParams({
              user1: user.username,
              user2: person.username,
              limit: "1",
            });

            const res = await fetch(apiUrl(`/api/messages?${params.toString()}`), {
              signal: controller.signal,
            });

            if (!res.ok) return null;

            const data = (await res.json()) as { messages?: Message[] };
            const lastMessage = data.messages?.[data.messages.length - 1];

            if (!lastMessage) return null;

            const label =
              lastMessage.type === "text"
                ? lastMessage.content
                : lastMessage.fileName || (lastMessage.type === "image" ? "Photo" : "File");

            const preview =
              typeof label === "string" && label.length > 80
                ? `${label.slice(0, 77)}...`
                : label;

            return [person.username, preview] as const;
          })
        );

        const validPreviews = previews.filter(Boolean) as [string, string][];

        if (validPreviews.length) {
          setLatestMessages((prev) => ({ ...prev, ...Object.fromEntries(validPreviews) }));
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Unable to fetch latest messages", error);
        }
      }
    };

    void fetchLatestMessages();

    return () => controller.abort();
  }, [isMobile, people, user]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const toggleTheme = () => {
    setTheme(theme === "night" ? "brightness" : "night");
  };

  // Request browser notification permission on mount
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Use socket from AuthContext
  useEffect(() => {
    socketRef.current = socket || null;
  }, [socket]);


  // Fetch messages
  useEffect(() => {
    if (!user || !chatUser) return;

    const fetchMessages = async () => {
      if (fetchingMessagesRef.current) return;
      fetchingMessagesRef.current = true;
      try {
        const params = new URLSearchParams({
          user1: user.username,
          user2: chatUser,
          limit: "200",
        });
        const res = await fetch(apiUrl(`/api/messages?${params.toString()}`));
        if (!res.ok) {
          throw new Error(`Failed to fetch messages: ${res.status}`);
        }
        const data = (await res.json()) as {
          messages?: Message[];
          participants?: ChatParticipant[];
          emojis?: ChatEmoji[];
        };

        if (Array.isArray(data.messages)) {
          setMessages(data.messages);
        } else {
          setMessages([]);
        }

        if (Array.isArray(data.participants)) {
          setParticipants(data.participants);
          const partner = data.participants.find((p) => p.username === chatUser);
          if (partner && typeof partner.online === "boolean") {
            setChatOnline(partner.online);
          }
        }

        if (!emojiLoadedRef.current && Array.isArray(data.emojis)) {
          setEmojiList(data.emojis);
          emojiLoadedRef.current = true;
        }
      } catch (error) {
        console.error("Unable to fetch conversation", error);
        setMessages([]);
      } finally {
        fetchingMessagesRef.current = false;
      }
    };

    void fetchMessages(); // Initial load

    const interval = setInterval(() => {
      void fetchMessages();
    }, 3000); // Poll for new messages
    return () => clearInterval(interval); // Cleanup
  }, [user, chatUser]);

  // Scroll when a new message arrives or when opening the chat
  useEffect(() => {
    // Only scroll if the conversation grew since last render
    if (messages.length > prevLengthRef.current) {
      const last = messages[messages.length - 1];
      // Scroll to the bottom on initial load or when the last message is from the chat partner
      if (prevLengthRef.current === 0 || (last && last.from === chatUser)) {
        scrollToBottom();
      }
    }
    prevLengthRef.current = messages.length; // Update ref after checking
  }, [messages, chatUser]);

  useEffect(() => {
    const clearSelection = () => setSelectedMsgId(null);
    window.addEventListener("click", clearSelection);
    return () => window.removeEventListener("click", clearSelection);
  }, []);

  // Socket real-time listeners disabled
  useEffect(() => {
    setChatOnline(false);
  }, [socket, chatUser]);

  const chatPartner = participants.find((p) => p.username === chatUser);
  const emojiButtonTitle = emojiList.length
    ? `Insert emoji (${emojiList.length} available)`
    : "Add emoji";

  const currentUsername = user?.username ?? "";
    
  const openProfile = () => {
    if (!chatUser) return;
    router.push(`/user/${encodeURIComponent(chatUser)}`);
  };

  const handleSelectChat = (username: string) => {
    router.push(`/chat?user=${encodeURIComponent(username)}`);
    setShowChatThread(true);
  };

  const handleBackToList = () => {
    if (isMobile) setShowChatThread(false);
    router.replace("/chat");
  };

  const handleBackToProfile = () => {
    router.push("/friend");
  };

  const allChatPeople = useMemo(() => {
    const uniquePeople = new Map<string, ChatParticipant>();

    [...people, ...participants].forEach((person) => {
      if (person.username === user?.username) return;
      if (!uniquePeople.has(person.username)) {
        uniquePeople.set(person.username, person);
      }
    });

    if (chatUser && chatUser !== user?.username && !uniquePeople.has(chatUser)) {
      uniquePeople.set(chatUser, { username: chatUser });
    }

    return Array.from(uniquePeople.values()).sort((a, b) =>
      a.username.localeCompare(b.username)
    );
  }, [people, participants, user?.username, chatUser]);

  const filteredPeople = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();
    const baseList =
      isMobile && currentUsername
        ? allChatPeople.filter((person) =>
            Array.isArray(person.friends)
              ? person.friends.includes(currentUsername)
              : false
          )
        : allChatPeople;

    if (!normalizedTerm) return baseList;

    return baseList.filter((person) =>
      person.username.toLowerCase().includes(normalizedTerm)
    );
  }, [allChatPeople, currentUsername, isMobile, searchTerm]);

  // Show the scroll-to-bottom button when the user scrolls away from the bottom
  // or when new messages arrive while not at the bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const atBottom =
        container.scrollHeight - container.scrollTop <=
        container.clientHeight + 80;
      setShowScrollButton(!atBottom);
    };

    // Initial check in case the list overflows on first render
    handleScroll();

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
    // Re-run when messages change so the button updates if new messages push
    // content while the user is scrolled up
  }, [messages]);

  const postMessage = async (payload: Omit<Message, "_id" | "createdAt">) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticMessage: Message = {
      _id: tempId,
      createdAt: new Date().toISOString(),
      ...payload,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    scrollToBottom();

    try {
      const res = await fetch(apiUrl("/api/messages"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Failed to send message: ${res.status}`);
      }

      const data = (await res.json()) as { message: Message };
      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? data.message : m))
      );
      socketRef.current?.emit("send-message", data.message);
      scrollToBottom();
    } catch (error) {
      console.error("Unable to send message", error);
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
    }
  };

  const handleSend = async () => {
    if (!user || !chatUser || !input.trim()) return;

    const payload = {
      from: user.username,
      to: chatUser,
      type: "text" as const,
      content: input,
    };

    setInput("");

    await postMessage(payload);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !chatUser) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        console.error("Unsupported file result type", reader.result);
        return;
      }

      const isImage = file.type.startsWith("image/");
      const payload: Omit<Message, "_id" | "createdAt"> = {
        from: user.username,
        to: chatUser,
        type: isImage ? "image" : "file",
        content: reader.result,
        fileName: file.name,
      };

      void postMessage(payload);
    };
    reader.onerror = () => {
      console.error("Failed to read file", reader.error);
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(apiUrl(`/api/messages/${id}`), { method: "DELETE" });
    if (res.ok) {
      setMessages((prev) => prev.filter((m) => m._id !== id));
    }
  };

  const handleEdit = async (msg: Message) => {
    const newContent = prompt("Edit message", msg.content);
    if (newContent === null || newContent.trim() === "") return;
    const res = await fetch(apiUrl(`/api/messages/${msg._id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newContent }),
    });
    if (res.ok) {
      const data = await res.json();
      setMessages((prev) =>
        prev.map((m) => (m._id === msg._id ? data.message : m))
      );
    }
  };

  function formatDateLabel(dateStr: string) {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

    return date.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }

  let lastDateLabel = "";

  const headerContent = isMobile ? (
    <div
      className={`mobile-thread-header ${
        theme === "night"
          ? "mobile-thread-header--night"
          : "mobile-thread-header--day"
      }`}
    >
      <div className="mobile-header-actions">
        <button
          type="button"
          className="mobile-back-button"
          onClick={handleBackToList}
          aria-label="Back to conversations"
        >
          ←
        </button>
      </div>
      {chatUser ? (
        <div className="d-flex align-items-center gap-3">
          {chatPartner?.image ? (
            <img
              src={chatPartner.image}
              alt={`${chatUser}'s avatar`}
              className="mobile-thread-avatar"
            />
          ) : (
            <div className="mobile-thread-avatar mobile-thread-avatar--fallback">
              {chatUser.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="d-flex flex-column">
            <span className="mobile-thread-name">{chatUser}</span>
            <span className="mobile-thread-status">
              {chatOnline ? "Online" : "Last seen recently"}
            </span>
          </div>
        </div>
      ) : (
        <div className="d-flex align-items-center gap-2">
          <div className="mobile-thread-avatar mobile-thread-avatar--fallback">💬</div>
          <div className="d-flex flex-column">
            <span className="mobile-thread-name">PulseChat</span>
            <span className="mobile-thread-status">Pick a chat to start</span>
          </div>
        </div>
      )}
    </div>
  ) : (
    <header
      className={`chat-header ${
        theme === "night" ? "chat-header-night" : "chat-header-day"
      }`}
    >
      <div className="chat-header-brand d-flex align-items-center gap-3 flex-wrap">
        <div className="brand-badge">
          <span className="brand-icon" aria-hidden="true">
            💬
          </span>
        </div>
        <div className="d-flex flex-column flex-sm-row align-items-sm-center gap-1 gap-sm-3">
          <span className="brand-name">PulseChat</span>
          <span className="brand-tagline">Conversations that keep you close.</span>
        </div>
      </div>

      {chatUser && (
        <div className="chat-user-status d-flex align-items-center gap-3 flex-wrap">
          <div
            className="d-flex align-items-center gap-2"
            role="button"
            tabIndex={0}
            onClick={openProfile}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openProfile();
              }
            }}
          >
            {chatPartner?.image ? (
              <img
                src={chatPartner.image}
                alt={`${chatUser}'s avatar`}
                className="chat-user-avatar"
              />
            ) : (
              <div className="chat-user-avatar chat-user-avatar--fallback">
                {chatUser.charAt(0).toUpperCase()}
              </div>
            )}
            <div
              className={`status-dot ${chatOnline ? "status-dot-online" : "status-dot-offline"}`}
              aria-hidden="true"
            ></div>
            <div className="d-flex flex-column">
              <span className="status-username">{chatUser}</span>
              <span className="status-text">
                {chatOnline ? "Online now" : "Last seen moments ago"}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="chat-header-actions d-flex align-items-center gap-2">
        <button
          type="button"
          className="chat-header-action"
          aria-label="Toggle notifications"
        >
          🔔
        </button>
        <button
          type="button"
          className="chat-header-action"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "night" ? "Light" : "Dark"} Mode`}
        >
          {theme === "night" ? "🌞" : "🌙"}
        </button>
        <a href="/friend" className="chat-header-action" aria-label="Back to home">
          🏠
        </a>
      </div>
    </header>
  );

  const messagesContent = (
    <div
      ref={messagesContainerRef}
      id="chat-scroll-container"
      className={`chat-canvas flex-grow-1 overflow-auto ${
        theme === "night" ? "chat-canvas-night" : "chat-canvas-day"
      }`}
    >
      {messages.map((msg, idx) => {
        const msgDate = new Date(msg.createdAt).toDateString();
        const isSender = msg.from === user?.username;

        const showDateLabel = msgDate !== lastDateLabel;
        if (showDateLabel) lastDateLabel = msgDate;

        return (
          <div key={msg._id + idx}>
            {showDateLabel && (
              <div className="text-center text-muted small my-3">
                <span className="badge bg-secondary">
                  {formatDateLabel(msg.createdAt)}
                </span>
              </div>
            )}

            <div
              onContextMenu={(e) => {
                e.preventDefault();
                if (isSender) setSelectedMsgId(msg._id);
                else setSelectedMsgId(null);
              }}
              className={`chat-message ${
                isSender ? "chat-message--sent" : "chat-message--received"
              }`}
            >
              <div
                className={`chat-message-bubble ${
                  isSender
                    ? "chat-message-bubble--sent"
                    : theme === "night"
                    ? "chat-message-bubble--night"
                    : "chat-message-bubble--day"
                }`}
              >
                <div className="chat-message-meta">
                  {!isSender && (
                    <span className="chat-message-sender">{msg.from}</span>
                  )}
                  <time className="chat-message-time" dateTime={msg.createdAt}>
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>

                {msg.type === "text" && (
                  <p className="chat-message-text">{msg.content}</p>
                )}

                {msg.type === "image" && (
                  <div className="chat-message-media">
                    <img src={msg.content} alt="sent-img" />
                  </div>
                )}

                {msg.type === "file" && (
                  <div className="chat-message-file">
                    <div className="chat-message-file-icon" aria-hidden="true">
                      📄
                    </div>
                    <div className="chat-message-file-meta">
                      <a href={msg.content} download={msg.fileName}>
                        {msg.fileName}
                      </a>
                      <span className="chat-message-file-type">
                        {msg.fileName?.split(".").pop()?.toUpperCase()} File
                      </span>
                    </div>
                  </div>
                )}

                {isSender && selectedMsgId === msg._id && (
                  <div className="chat-message-actions">
                    {msg.type === "text" && (
                      <button
                        className="chat-message-action"
                        onClick={() => {
                          handleEdit(msg);
                          setSelectedMsgId(null);
                        }}
                      >
                        ✏️ Edit
                      </button>
                    )}
                    <button
                      className="chat-message-action chat-message-action--danger"
                      onClick={() => {
                        handleDelete(msg._id);
                        setSelectedMsgId(null);
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {showScrollButton && (
        <button
          className="scroll-to-bottom-btn"
          onClick={scrollToBottom}
          title="Scroll to latest"
        >
          ⬇
        </button>
      )}

      <div ref={bottomRef}></div>
    </div>
  );

  const composer = (
    <footer
      className={`chat-footer ${
        theme === "night" ? "chat-footer--night" : "chat-footer--day"
      }`}
    >
      <div className="chat-composer" role="group" aria-label="Message composer">
        <button
          type="button"
          className="chat-composer__icon-btn"
          aria-label="Add emoji"
          title={emojiButtonTitle}
        >
          😊
        </button>
        <div className="chat-composer__input-row">
          <input
            type="text"
            className="chat-composer__input"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button
            type="button"
            className="chat-composer__send"
            aria-label="Send message"
            onClick={handleSend}
          >
            ➤
          </button>
        </div>
        <button
          type="button"
          className="chat-composer__icon-btn"
          aria-label="Attach a file"
          onClick={() => fileInputRef.current?.click()}
        >
          📎
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          onChange={handleFile}
          hidden
        />
      </div>
    </footer>
  );

  const desktopLayout = (
    <div
      className={`container-fluid d-flex flex-column vh-100 p-0 ${
        theme === "night" ? "bg-dark text-white" : "bg-light"
      }`}
    >
      {headerContent}
      {messagesContent}
      {composer}
    </div>
  );

  const mobileListLayout = (
    <div className="chat-mobile-list-view">
      <div className="mobile-list-header">
        <button
          type="button"
          className="mobile-back-button"
          onClick={handleBackToProfile}
          aria-label="Back to user page"
        >
          ←
        </button>
        <div className="mobile-list-brand">
          <span className="mobile-list-logo">💬</span>
          <div className="d-flex flex-column">
            <span className="mobile-list-title">PulseChat</span>
            <span className="mobile-list-subtitle">Conversations</span>
          </div>
        </div>
        {user && (
          <a className="mobile-profile-pill" href="/user" aria-label="Profile">
            {user.image ? (
              <img src={user.image} alt="Your avatar" />
            ) : (
              <span>{user.username.charAt(0).toUpperCase()}</span>
            )}
          </a>
        )}
      </div>
      <div className="mobile-list-search">
        <input
          type="search"
          placeholder="Search people"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="mobile-conversation-list">
        {isFetchingPeople && people.length === 0 && (
          <>
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="mobile-conversation-row mobile-conversation-row--skeleton">
                <div className="mobile-conversation-avatar mobile-conversation-avatar--skeleton" />
                <div className="mobile-conversation-meta">
                  <span className="mobile-conversation-name mobile-conversation-name--skeleton" />
                  <span className="mobile-conversation-status mobile-conversation-status--skeleton" />
                </div>
              </div>
            ))}
          </>
        )}

        {filteredPeople.map((person) => (
          <button
            key={person.username}
            type="button"
            className="mobile-conversation-row"
            onClick={() => handleSelectChat(person.username)}
          >
            {person.image ? (
              <img
                src={person.image}
                alt={`${person.username}'s avatar`}
                className="mobile-conversation-avatar"
              />
            ) : (
              <div className="mobile-conversation-avatar mobile-conversation-avatar--fallback">
                {person.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="mobile-conversation-meta">
              <span className="mobile-conversation-name">{person.username}</span>
              <span className="mobile-conversation-status">
                {person.online ? "Online" : "Offline"}
              </span>
            </div>
            {person.online && <span className="mobile-online-dot" aria-hidden="true"></span>}
          </button>
        ))}
      </div>
    </div>
  );

  const mobileThreadLayout = (
    <div className="chat-mobile-thread-view">
      {headerContent}
      {messagesContent}
      {composer}
    </div>
  );

  if (!isMobile) return desktopLayout;

  return (
    <div className="chat-mobile-shell">
      {!showChatThread && mobileListLayout}
      {showChatThread && chatUser && mobileThreadLayout}
      {!chatUser && showChatThread && (
        <div className="chat-mobile-thread-view">
          {headerContent}
          <div className="empty-thread-message">Choose a conversation to start chatting.</div>
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading chat…</div>}>
      <ChatPageContent />
    </Suspense>
  );
}
