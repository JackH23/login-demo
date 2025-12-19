"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Socket } from "socket.io-client";
import { apiUrl } from "@/app/lib/api";
import { prefetchCachedApi, useCachedApi } from "../hooks/useCachedApi";

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

interface ChatData {
  messages: Message[];
  participants: ChatParticipant[];
  emojis: ChatEmoji[];
}

function ChatPageContent() {
  const searchParams = useSearchParams();
  const chatUser = searchParams.get("user") ?? "";
  const router = useRouter();
  const { user, socket } = useAuth();
  const { theme, setTheme } = useTheme();

  const [messages, setMessages] = useState<Message[]>([]);
  const [lastFetchTime, setLastFetchTime] = useState<number>(() => Date.now());
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerNodeRef = useRef<HTMLDivElement | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const prevLengthRef = useRef(0); // Initialize ref here
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [chatOnline, setChatOnline] = useState(false);
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [emojiList, setEmojiList] = useState<ChatEmoji[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const emojiLoadedRef = useRef(false);

  const POLL_INTERVAL_MS = 1_000;

  const chatDataUrl = useMemo(() => {
    if (!user || !chatUser) return null;
    return `/api/messages?${new URLSearchParams({
      user1: user.username,
      user2: chatUser,
      limit: "200",
    }).toString()}`;
  }, [chatUser, user]);
  const messagesContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      messagesContainerNodeRef.current = node;
      if (node && chatDataUrl) {
        void prefetchCachedApi<ChatData>(chatDataUrl).catch((error) => {
          console.warn("Failed to prefetch chat data", error);
        });
      }
    },
    [chatDataUrl]
  );
  const {
    data: chatData,
    setData: setChatData,
    refresh: refreshChatData,
  } = useCachedApi<ChatData>(chatDataUrl, {
    fallback: { messages: [], participants: [], emojis: [] },
    transform: (payload) => {
      const raw = payload as Partial<ChatData>;
      return {
        messages: Array.isArray(raw.messages) ? raw.messages : [],
        participants: Array.isArray(raw.participants) ? raw.participants : [],
        emojis: Array.isArray(raw.emojis) ? raw.emojis : [],
      };
    },
  });

  useEffect(() => {
    setParticipants([]);
    setChatOnline(false);
  }, [chatUser]);

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
    router.prefetch("/friend");
  }, [router]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const toggleTheme = () => {
    setTheme(theme === "night" ? "brightness" : "night");
  };

  const handleBackNavigation = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/friend");
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

  // Sync conversation data from cached API and refresh periodically
  useEffect(() => {
    if (!user || !chatUser) {
      setMessages([]);
      setParticipants([]);
      return;
    }

    const normalized: ChatData = {
      messages: chatData.messages ?? [],
      participants: chatData.participants ?? [],
      emojis: chatData.emojis ?? [],
    };

    setLastFetchTime(Date.now());
    setMessages((prev) => {
      const optimisticMessages = prev.filter(
        (msg) =>
          msg._id.startsWith("temp-") &&
          msg.from === user.username &&
          msg.to === chatUser
      );

      const merged = [...normalized.messages];

      for (const optimistic of optimisticMessages) {
        if (!merged.some((msg) => msg._id === optimistic._id)) {
          merged.push(optimistic);
        }
      }

      return merged;
    });
    setParticipants(normalized.participants);

    const partner = normalized.participants.find(
      (p) => p.username === chatUser
    );
    if (partner && typeof partner.online === "boolean") {
      setChatOnline(partner.online);
    }

    if (!emojiLoadedRef.current && normalized.emojis.length) {
      setEmojiList(normalized.emojis);
      emojiLoadedRef.current = true;
    }
  }, [chatData, chatUser, user]);

  useEffect(() => {
    if (!user || !chatUser) return;

    void refreshChatData();

    const interval = setInterval(() => {
      void refreshChatData();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [POLL_INTERVAL_MS, chatUser, refreshChatData, user]);

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

  // Show the scroll-to-bottom button when the user scrolls away from the bottom
  // or when new messages arrive while not at the bottom
  useEffect(() => {
    const container = messagesContainerNodeRef.current;
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
    const encodePayload = () => {
      const params = new URLSearchParams();
      params.set("from", payload.from);
      params.set("to", payload.to);
      params.set("type", payload.type);
      params.set("content", payload.content);
      if (payload.fileName) {
        params.set("fileName", payload.fileName);
      }
      return params;
    };
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticMessage: Message = {
      _id: tempId,
      createdAt: new Date().toISOString(),
      ...payload,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setChatData((prev) => ({
      ...prev,
      messages: [...prev.messages, optimisticMessage],
    }));
    scrollToBottom();

    try {
      const res = await fetch(apiUrl("/api/messages"), {
        method: "POST",
        // Use form encoding to avoid CORS preflight and shave latency off the
        // message send path.
        body: encodePayload(),
        keepalive: true,
      });

      if (!res.ok) {
        throw new Error(`Failed to send message: ${res.status}`);
      }

      const data = (await res.json()) as { message: Message };
      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? data.message : m))
      );
      setChatData((prev) => ({
        ...prev,
        messages: prev.messages.map((m) =>
          m._id === tempId ? data.message : m
        ),
      }));
      socketRef.current?.emit("send-message", data.message);
      scrollToBottom();
    } catch (error) {
      console.error("Unable to send message", error);
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      setChatData((prev) => ({
        ...prev,
        messages: prev.messages.filter((m) => m._id !== tempId),
      }));
    }
  };

  const handleSend = () => {
    if (!user || !chatUser || !input.trim()) return;

    const messageContent = input.trim();

    const payload = {
      from: user.username,
      to: chatUser,
      type: "text" as const,
      content: messageContent,
    };

    setInput("");

    void postMessage(payload);
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
    const res = await fetch(apiUrl(`/api/messages/${id}`), {
      method: "DELETE",
    });
    if (res.ok) {
      setMessages((prev) => prev.filter((m) => m._id !== id));
      setChatData((prev) => ({
        ...prev,
        messages: prev.messages.filter((m) => m._id !== id),
      }));
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
      setChatData((prev) => ({
        ...prev,
        messages: prev.messages.map((m) =>
          m._id === msg._id ? (data.message as Message) : m
        ),
      }));
    }
  };

  function resolveMessageDate(rawDate: string) {
    const parsed = new Date(rawDate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }

    return new Date(lastFetchTime);
  }

  const formatTime = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "UTC",
      }),
    []
  );

  const formatDate = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
    []
  );

  const getUtcDateKey = (date: Date) =>
    `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;

  function formatDateLabel(dateInput: string | Date) {
    const date =
      typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    const now = new Date();

    const todayKey = getUtcDateKey(now);
    const yesterday = new Date(now);
    yesterday.setUTCDate(now.getUTCDate() - 1);
    const yesterdayKey = getUtcDateKey(yesterday);
    const dateKey = getUtcDateKey(date);

    if (dateKey === todayKey) return "Today";
    if (dateKey === yesterdayKey) return "Yesterday";

    return formatDate.format(date);
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
        <Link
          href="/friend"
          className="mobile-back-button"
          prefetch
          replace
          aria-label="Back to conversations"
        >
          <span aria-hidden="true" className="mobile-back-button__icon">
            ←
          </span>
        </Link>
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
          <div className="mobile-thread-avatar mobile-thread-avatar--fallback">
            💬
          </div>
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
          <span className="brand-tagline">
            Conversations that keep you close.
          </span>
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
              className={`status-dot ${
                chatOnline ? "status-dot-online" : "status-dot-offline"
              }`}
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
        <button
          type="button"
          className="chat-header-action"
          onClick={handleBackNavigation}
          aria-label="Back to home"
        >
          🏠
        </button>
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
        const createdAt = resolveMessageDate(msg.createdAt);
        const msgDate = createdAt.toDateString();
        const isSender = msg.from === user?.username;

        const showDateLabel = msgDate !== lastDateLabel;
        if (showDateLabel) lastDateLabel = msgDate;

        return (
          <div key={msg._id + idx}>
            {showDateLabel && (
              <div className="text-center text-muted small my-3">
                <span className="badge bg-secondary">
                  {formatDateLabel(createdAt)}
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
                  <time
                    className="chat-message-time"
                    dateTime={createdAt.toISOString()}
                  >
                    {formatTime.format(createdAt)}
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
      {chatUser ? (
        mobileThreadLayout
      ) : (
        <div className="chat-mobile-thread-view">
          {headerContent}
          <div className="empty-thread-message">
            Choose a conversation to start chatting.
          </div>
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
