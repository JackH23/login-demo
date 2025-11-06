"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
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
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
        if (
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          const body =
            message.type === "text"
              ? message.content
              : `sent a ${message.type}`;
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
      composerRef.current?.focus();
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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    const textarea = composerRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const maxHeight = 160;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  }, [input]);

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
      className={`container-fluid d-flex flex-column vh-100 p-0 ${
        theme === "night" ? "bg-dark text-white" : "bg-light"
      }`}
    >
      {/* Header */}
      <header
        className={`chat-header ${
          theme === "night" ? "chat-header-night" : "chat-header-day"
        }`}
      >
        <div className="d-flex align-items-center gap-3 flex-wrap">
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
            <div className="d-flex align-items-center gap-2">
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
          <button type="button" className="chat-header-action" aria-label="Open settings">
            ⚙️
          </button>
          <a href="/user" className="chat-header-action" aria-label="Back to home">
            🏠
          </a>
        </div>
      </header>

      {/* Message Area */}
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
                    <time
                      className="chat-message-time"
                      dateTime={msg.createdAt}
                    >
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

      {/* Input + File Upload */}
      <footer
        className={`chat-footer ${
          theme === "night" ? "chat-footer-night" : "chat-footer-day"
        }`}
        aria-label="Message composer"
      >
        <div className="chat-footer-inner">
          <div className="chat-composer">
            <div className="chat-composer-field">
              <button
                type="button"
                className="chat-composer-tool"
                aria-label="Insert emoji"
              >
                😊
              </button>
              <textarea
                ref={composerRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder="Write a message..."
                rows={1}
                className="chat-composer-input"
                aria-label="Write a message"
              />
              <div className="chat-composer-trailing">
                <label className="chat-composer-tool" aria-label="Attach a file">
                  📎
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    onChange={handleFile}
                    hidden
                  />
                </label>
              </div>
            </div>
            <div className="chat-composer-hint">
              Press <kbd>Enter</kbd> to send · <kbd>Shift</kbd> + <kbd>Enter</kbd> for a new line
            </div>
          </div>
          <button type="button" className="chat-send-btn" onClick={handleSend}>
            Send
          </button>
        </div>
      </footer>
    </div>
  );
}
