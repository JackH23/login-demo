"use client";

import { useSearchParams } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Socket } from "socket.io-client";

interface Message {
  _id: string;
  type: "text" | "image" | "file";
  content: string;
  fileName?: string;
  from: string;
  to: string;
  createdAt: string;
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const chatUser = searchParams.get("user") ?? "";
  const { user, socket } = useAuth();
  const { theme } = useTheme();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const prevLengthRef = useRef(0); // Initialize ref here
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [chatOnline, setChatOnline] = useState(false);

  const isNight = theme === "night";
  const chatInitial = chatUser ? chatUser.charAt(0).toUpperCase() : "C";
  const statusLabel = chatOnline ? "Online" : "Offline";

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
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

  // Listen for incoming messages from the server
  useEffect(() => {
    const sock = socketRef.current;
    if (!sock) return;

    const handleReceive = (message: Message) => {
      if (message.from === chatUser && message.to === user?.username) {
        setMessages((prev) => [...prev, message]);
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          const body =
            message.type === "text" ? message.content : `sent a ${message.type}`;
          new Notification(`Message from ${message.from}`, { body });
        }
      }
    };

    sock.on("receive-message", handleReceive);
    return () => {
      sock.off("receive-message", handleReceive);
    };
  }, [chatUser, user, socket]);

  // Fetch messages
  useEffect(() => {
    if (!user || !chatUser) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(
          `/api/messages?user1=${user.username}&user2=${chatUser}`
        );
        const data = await res.json();
        setMessages(data.messages ?? []);
      } catch {
        setMessages([]);
      }
    };

    fetchMessages(); // Initial load

    const interval = setInterval(fetchMessages, 3000); // Poll for new messages
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

  // Listen for online/offline status of the chat partner
  useEffect(() => {
    if (!socket || !chatUser) return;
    const handleOnline = (username: string) => {
      if (username === chatUser) setChatOnline(true);
    };
    const handleOffline = (username: string) => {
      if (username === chatUser) setChatOnline(false);
    };
    socket.on("user-online", handleOnline);
    socket.on("user-offline", handleOffline);
    return () => {
      socket.off("user-online", handleOnline);
      socket.off("user-offline", handleOffline);
    };
  }, [socket, chatUser]);

  // Initial status fetch
  useEffect(() => {
    if (!chatUser) return;
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/users/${chatUser}`);
        const data = await res.json();
        setChatOnline(data.user?.online ?? false);
      } catch {
        setChatOnline(false);
      }
    };
    fetchStatus();
  }, [chatUser]);

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

  const handleSend = async () => {
    if (!user || !chatUser || !input.trim()) return;

    const payload = {
      from: user.username,
      to: chatUser,
      type: "text" as const,
      content: input,
    };

    setInput("");

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
      socketRef.current?.emit("send-message", data.message);
      scrollToBottom();
    }
  };

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !chatUser) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const isImage = file.type.startsWith("image/");
      const payload: Omit<Message, "_id"> = {
        from: user.username,
        to: chatUser,
        type: isImage ? "image" : "file",
        content: reader.result as string,
        fileName: file.name,
      };

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        socketRef.current?.emit("send-message", data.message);
        scrollToBottom();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/messages/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMessages((prev) => prev.filter((m) => m._id !== id));
    }
  };

  const handleEdit = async (msg: Message) => {
    const newContent = prompt("Edit message", msg.content);
    if (newContent === null || newContent.trim() === "") return;
    const res = await fetch(`/api/messages/${msg._id}`, {
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

  const handleNotificationAction = () => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => undefined);
    }
  };

  const handleEmojiInsert = (emoji: string) => {
    setInput((prev) => `${prev}${emoji}`);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSend();
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

  return (
    <div className={`chat-shell ${isNight ? "chat-shell-dark" : "chat-shell-light"}`}>
      <header className={`chat-header ${isNight ? "chat-header-dark" : "chat-header-light"}`}>
        <div className="chat-header-left">
          <div className="chat-avatar" aria-hidden="true">
            <span className="chat-avatar-initial">{chatInitial}</span>
            <span
              className={`chat-status-dot ${
                chatOnline ? "chat-status-dot-online" : "chat-status-dot-offline"
              }`}
              aria-hidden="true"
            />
          </div>
          <div className="chat-header-meta">
            <p className="chat-header-eyebrow">Direct message</p>
            <h1 className="chat-header-title">
              {chatUser ? chatUser : "Choose a person"}
            </h1>
            <div className="chat-header-status" aria-live="polite">
              <span
                className={`chat-status-pill ${
                  chatOnline ? "chat-status-pill-online" : "chat-status-pill-offline"
                }`}
              >
                {statusLabel}
              </span>
              {chatUser && (
                <span className="chat-header-subtitle">{`Chat channel with ${chatUser}`}</span>
              )}
            </div>
          </div>
        </div>
        <div className="chat-header-actions">
          <a
            className="chat-header-action"
            href="/user"
            title="Back to home"
            aria-label="Back to home"
          >
            🏠
          </a>
          <a
            className="chat-header-action"
            href="/setting"
            title="Open settings"
            aria-label="Open settings"
          >
            ⚙️
          </a>
          <button
            type="button"
            className="chat-header-action"
            title="Manage notifications"
            aria-label="Manage notifications"
            onClick={handleNotificationAction}
          >
            🔔
          </button>
        </div>
      </header>

      <main className="chat-main" role="main">
        <div
          ref={messagesContainerRef}
          id="chat-scroll-container"
          className={`chat-body ${isNight ? "chat-body-dark" : "chat-body-light"}`}
        >
          {messages.length === 0 && (
            <div className="chat-empty-state">
              <div className="chat-empty-icon" aria-hidden="true">
                💬
              </div>
              <p className="chat-empty-title">No messages yet</p>
              <p className="chat-empty-subtitle">
                {chatUser
                  ? `Say hello to ${chatUser} and start the conversation.`
                  : "Select someone to begin a conversation."}
              </p>
            </div>
          )}

          {messages.map((msg, idx) => {
            const msgDate = new Date(msg.createdAt).toDateString();
            const isSender = msg.from === user?.username;

            const showDateLabel = msgDate !== lastDateLabel;
            if (showDateLabel) lastDateLabel = msgDate;

            const timeLabel = new Date(msg.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div key={`${msg._id}-${idx}`} className="chat-message-block">
                {showDateLabel && (
                  <div className="chat-date-divider">
                    <span>{formatDateLabel(msg.createdAt)}</span>
                  </div>
                )}

                <div
                  className={`chat-message-wrapper ${
                    isSender
                      ? "chat-message-wrapper-self"
                      : "chat-message-wrapper-recipient"
                  }`}
                >
                  <div
                    onContextMenu={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (isSender) setSelectedMsgId(msg._id);
                      else setSelectedMsgId(null);
                    }}
                    onClick={(event) => event.stopPropagation()}
                    className={`chat-bubble ${
                      isSender ? "chat-bubble-self" : "chat-bubble-other"
                    } ${isNight ? "chat-bubble-night" : "chat-bubble-day"} ${
                      selectedMsgId === msg._id ? "chat-bubble-selected" : ""
                    }`}
                  >
                    <div className="chat-bubble-content">
                      {msg.type === "text" && <p className="mb-0">{msg.content}</p>}

                      {msg.type === "image" && (
                        <figure className="chat-bubble-media">
                          <img src={msg.content} alt="Sent media" className="chat-media-image" />
                          {msg.fileName && (
                            <figcaption className="chat-media-caption">{msg.fileName}</figcaption>
                          )}
                        </figure>
                      )}

                      {msg.type === "file" && (
                        <div className="chat-attachment-card">
                          <div className="chat-attachment-icon" aria-hidden="true">
                            📄
                          </div>
                          <div className="chat-attachment-meta">
                            <a
                              href={msg.content}
                              download={msg.fileName}
                              className="chat-attachment-link"
                            >
                              {msg.fileName ?? "Download file"}
                            </a>
                            {msg.fileName && (
                              <span className="chat-attachment-subtext">
                                {msg.fileName.split(".").pop()?.toUpperCase()} file
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="chat-bubble-meta">
                      <span className="chat-sender-tag">{isSender ? "You" : msg.from}</span>
                      <span className="chat-meta-divider">•</span>
                      <time className="chat-timestamp" dateTime={msg.createdAt}>
                        {timeLabel}
                      </time>
                    </div>

                    {isSender && selectedMsgId === msg._id && (
                      <div className="chat-bubble-actions">
                        {msg.type === "text" && (
                          <button
                            type="button"
                            className="chat-bubble-action"
                            onClick={() => {
                              handleEdit(msg);
                              setSelectedMsgId(null);
                            }}
                          >
                            ✏️ Edit
                          </button>
                        )}
                        <button
                          type="button"
                          className="chat-bubble-action chat-bubble-action-danger"
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
              type="button"
            >
              ⬇
            </button>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      <footer className={`chat-footer ${isNight ? "chat-footer-dark" : "chat-footer-light"}`}>
        <form className="chat-input-bar" onSubmit={handleSubmit}>
          <button
            type="button"
            className="chat-icon-button"
            title="Add emoji"
            aria-label="Add emoji"
            onClick={() => handleEmojiInsert("😊")}
          >
            😊
          </button>

          <input
            type="text"
            className="chat-input-field"
            placeholder="Type your message..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />

          <div className="chat-input-actions">
            <label
              className="chat-icon-button"
              title="Attach a file"
              aria-label="Attach a file"
            >
              📎
              <input
                type="file"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                onChange={handleFile}
                className="chat-input-file"
              />
            </label>
            <button type="submit" className="chat-send-btn">
              <span className="chat-send-text">Send</span>
              <span className="chat-send-icon" aria-hidden="true">
                ➤
              </span>
            </button>
          </div>
        </form>
      </footer>
    </div>
  );
}