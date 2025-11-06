"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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

  const isNight = theme === "night";
  const accentColor = isNight ? "#4dabf7" : "#0d6efd";
  const headerGradient = isNight
    ? "linear-gradient(135deg, rgba(35,48,78,0.9), rgba(20,20,35,0.95))"
    : "linear-gradient(135deg, rgba(13,110,253,0.92), rgba(111,66,193,0.92))";
  const backgroundGradient = isNight
    ? "radial-gradient(circle at top, rgba(77,171,247,0.2), transparent 55%), radial-gradient(circle at bottom, rgba(111,66,193,0.12), transparent 65%)"
    : "radial-gradient(circle at top, rgba(13,110,253,0.22), transparent 55%), radial-gradient(circle at bottom, rgba(255,193,7,0.18), transparent 70%)";

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const prevLengthRef = useRef(0); // Initialize ref here
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [chatOnline, setChatOnline] = useState(false);

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

  // Track if the user has scrolled away from the latest messages
  useEffect(() => {
    const container = document.getElementById("chat-scroll-container");
    if (!container) return;

    const handleScroll = () => {
      const atBottom =
        container.scrollHeight - container.scrollTop <=
        container.clientHeight + 80;
      setShowScrollButton(!atBottom);
    };

    handleScroll();

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // When new messages arrive while scrolled up, surface the jump button
  useEffect(() => {
    const container = document.getElementById("chat-scroll-container");
    if (!container) return;

    const atBottom =
      container.scrollHeight - container.scrollTop <=
      container.clientHeight + 80;
    if (atBottom) {
      setShowScrollButton(false);
    } else {
      setShowScrollButton(true);
    }
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

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    <div
      className={`min-vh-100 d-flex flex-column position-relative ${
        isNight ? "text-white" : "text-dark"
      }`}
      style={{
        backgroundColor: isNight ? "#0f172a" : "#f5f7fb",
        backgroundImage: backgroundGradient,
      }}
    >
      <div className="container-fluid px-3 px-md-5 py-4 flex-grow-1 d-flex flex-column">
        <div
          className="rounded-4 shadow-lg overflow-hidden d-flex flex-column flex-grow-1 border border-0"
          style={{ backdropFilter: "blur(8px)", backgroundColor: isNight ? "rgba(17,24,39,0.82)" : "rgba(255,255,255,0.9)" }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 d-flex justify-content-between align-items-center"
            style={{
              backgroundImage: headerGradient,
              position: "sticky",
              top: 0,
              zIndex: 5,
              boxShadow: isNight
                ? "0 4px 12px rgba(15, 23, 42, 0.45)"
                : "0 4px 12px rgba(15, 23, 42, 0.15)",
            }}
          >
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center fw-semibold shadow"
                style={{
                  width: "48px",
                  height: "48px",
                  backgroundColor: isNight ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.25)",
                  border: `2px solid ${chatOnline ? "#34d399" : "rgba(255,255,255,0.35)"}`,
                }}
              >
                {chatUser ? chatUser.charAt(0).toUpperCase() : "?"}
              </div>
              <div>
                <h4 className="mb-1 fw-semibold">{chatUser ? chatUser : "Select a conversation"}</h4>
                <div className="d-flex align-items-center gap-2 small">
                  <span
                    className="rounded-pill px-3 py-1 text-uppercase fw-semibold"
                    style={{
                      backgroundColor: chatOnline ? "rgba(52,211,153,0.15)" : "rgba(148,163,184,0.2)",
                      color: chatOnline ? "#34d399" : isNight ? "#94a3b8" : "#475569",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {chatOnline ? "Online" : "Offline"}
                  </span>
                  <span className="opacity-75">
                    {messages.length > 0
                      ? `${messages.length} message${messages.length === 1 ? "" : "s"}`
                      : "No messages yet"}
                  </span>
                </div>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <a
                href="/user"
                className="btn btn-light border-0 fw-semibold d-flex align-items-center gap-2"
                style={{ color: "#0f172a" }}
              >
                <span role="img" aria-label="Home">
                  🏠
                </span>
                Dashboard
              </a>
            </div>
          </div>

          {/* Message Area */}
          <div
            id="chat-scroll-container"
            className="flex-grow-1 overflow-auto position-relative"
            style={{
              backgroundImage: isNight
                ? "linear-gradient(180deg, rgba(15,23,42,0.9), rgba(15,15,35,0.96))"
                : "linear-gradient(180deg, rgba(248,250,255,0.9), rgba(232,240,255,0.7))",
              padding: "1.75rem 1.5rem",
            }}
          >
            {messages.length === 0 && (
              <div className="h-100 d-flex flex-column justify-content-center align-items-center text-center text-muted">
                <div className="display-6 mb-3">💬</div>
                <h5 className="fw-semibold mb-2">Start the conversation</h5>
                <p className="mb-0" style={{ maxWidth: "340px" }}>
                  Share a friendly greeting, drop a question, or send a file to kick things off.
                </p>
              </div>
            )}
            {messages.map((msg, idx) => {
              const msgDate = new Date(msg.createdAt).toDateString();
              const isSender = msg.from === user?.username;

              const showDateLabel = msgDate !== lastDateLabel;
              if (showDateLabel) lastDateLabel = msgDate;

              return (
                <div key={msg._id + idx}>
                  {showDateLabel && (
                    <div className="text-center text-muted small my-3">
                      <span
                        className="badge rounded-pill"
                        style={{
                          backgroundColor: isNight ? "rgba(148,163,184,0.25)" : "rgba(148,163,184,0.18)",
                          color: isNight ? "#e2e8f0" : "#1e293b",
                          padding: "0.65rem 1.5rem",
                        }}
                      >
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
                    className={`d-flex mb-4 gap-3 ${
                      isSender ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                      style={{
                        width: "40px",
                        height: "40px",
                        backgroundColor: isSender
                          ? accentColor
                          : isNight
                          ? "rgba(148,163,184,0.25)"
                          : "rgba(148,163,184,0.2)",
                        color: isSender ? "#fff" : isNight ? "#e2e8f0" : "#1e293b",
                        fontWeight: 600,
                      }}
                    >
                      {(isSender ? user?.username : msg.from)?.charAt(0).toUpperCase() ?? "?"}
                    </div>
                    <div
                      className="p-3 rounded-4 shadow"
                      style={{
                        maxWidth: "70%",
                        position: "relative",
                        background: isSender
                          ? `linear-gradient(135deg, ${accentColor}, ${isNight ? "#38bdf8" : "#60a5fa"})`
                          : isNight
                          ? "rgba(148,163,184,0.18)"
                          : "rgba(255,255,255,0.95)",
                        color: isSender ? "#ffffff" : isNight ? "#e2e8f0" : "#0f172a",
                        border: isSender ? "none" : `1px solid ${isNight ? "rgba(148,163,184,0.35)" : "rgba(148,163,184,0.35)"}`,
                      }}
                    >
                      {/* Message content */}
                      {msg.type === "text" && <div>{msg.content}</div>}
                      {msg.type === "image" && (
                        <img
                          src={msg.content}
                          alt="sent-img"
                          className="img-fluid rounded"
                          style={{
                            maxWidth: "220px",
                            border: isSender ? "2px solid rgba(255,255,255,0.45)" : "2px solid rgba(148,163,184,0.25)",
                          }}
                        />
                      )}
                      {msg.type === "file" && (
                        <div
                          className="d-flex align-items-center gap-2 p-2 rounded"
                      style={{
                        backgroundColor: isSender
                          ? "#0d6efd"
                          : theme === "night"
                          ? "#343a40"
                          : "#f8f9fa",
                        color: isSender
                          ? "#fff"
                          : theme === "night"
                          ? "#fff"
                          : "#000",
                      }}
                    >
                      <div
                        className="bg-white d-flex align-items-center justify-content-center rounded-circle"
                        style={{
                          width: "40px",
                          height: "40px",
                          fontSize: "1.25rem",
                          color: "#0d6efd",
                        }}
                      >
                        📄
                      </div>
                      <div className="flex-grow-1">
                        <a
                          href={msg.content}
                          download={msg.fileName}
                          className="text-decoration-none fw-semibold"
                          style={{
                            color: isSender
                              ? "#fff"
                              : theme === "night"
                              ? "#fff"
                              : "#000",
                            wordBreak: "break-word",
                          }}
                        >
                          {msg.fileName}
                        </a>
                        <div className="small text-muted">
                          {msg.fileName?.split(".").pop()?.toUpperCase()} File
                        </div>
                      </div>
                    </div>
                  )}

                      <div className="small mt-2 d-flex align-items-center justify-content-between" style={{ opacity: 0.75 }}>
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="small fw-semibold">
                          {isSender ? "You" : msg.from}
                        </span>
                      </div>

                      {isSender && selectedMsgId === msg._id && (
                        <div className="mt-3 d-flex flex-wrap gap-2">
                          {msg.type === "text" && (
                            <button
                              className="btn btn-sm btn-light border-0 text-primary px-3"
                              onClick={() => {
                                handleEdit(msg);
                                setSelectedMsgId(null);
                              }}
                            >
                              ✏️ Edit
                            </button>
                          )}
                          <button
                            className="btn btn-sm btn-light border-0 text-danger px-3"
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
                type="button"
                className="btn btn-primary shadow-lg position-absolute d-flex align-items-center gap-2"
                style={{
                  right: "1.5rem",
                  bottom: "1.5rem",
                  borderRadius: "9999px",
                  padding: "0.65rem 1.25rem",
                  background: `linear-gradient(135deg, ${accentColor}, ${isNight ? "#22d3ee" : "#38bdf8"})`,
                  border: "none",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                }}
                onClick={scrollToBottom}
                title="Jump to latest message"
                aria-label="Jump to latest message"
              >
                <span style={{ fontSize: "1.15rem", lineHeight: 1 }}>⬇</span>
                Jump to latest
              </button>
            )}
            <div ref={bottomRef}></div>
          </div>

          {/* Input + File Upload */}
          <div
            className={`border-top px-3 px-md-4 py-3 ${isNight ? "bg-transparent" : "bg-white"}`}
            style={{
              backdropFilter: "blur(10px)",
              borderTop: isNight ? "1px solid rgba(148,163,184,0.15)" : "1px solid rgba(148,163,184,0.3)",
            }}
          >
            <div className="input-group rounded-pill overflow-hidden shadow-sm">
              <input
                type="text"
                className="form-control border-0"
                placeholder="Send a message, emoji, or file..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                style={{
                  backgroundColor: isNight ? "rgba(15,23,42,0.6)" : "rgba(248,250,255,0.9)",
                  color: isNight ? "#e2e8f0" : "#0f172a",
                }}
              />
              <label
                className="btn border-0 d-flex align-items-center px-3"
                style={{
                  backgroundColor: isNight ? "rgba(15,23,42,0.6)" : "rgba(255,255,255,0.95)",
                  color: accentColor,
                  cursor: "pointer",
                }}
                title="Attach a file"
              >
                📎
                <input
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  onChange={handleFile}
                  hidden
                />
              </label>
              <button
                className="btn fw-semibold text-white px-4 border-0"
                style={{
                  background: `linear-gradient(135deg, ${accentColor}, ${isNight ? "#22d3ee" : "#38bdf8"})`,
                }}
                onClick={handleSend}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}