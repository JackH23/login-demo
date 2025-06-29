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

  // Show the scroll-to-bottom button when the user scrolls away from the bottom
  // or when new messages arrive while not at the bottom
  useEffect(() => {
    const container = document.getElementById("chat-scroll-container");
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
      id="chat-scroll-container"
      className={`container-fluid d-flex flex-column vh-100 p-0 ${
        theme === "night" ? "bg-dark text-white" : "bg-light"
      }`}
    >
      {/* Header */}
      <div
        className={`px-4 py-3 d-flex justify-content-between align-items-center ${
          theme === "night" ? "bg-dark text-white" : "bg-primary text-white"
        }`}
      >
        <div className="d-flex align-items-center gap-3">
          <h5 className="mb-0">Chat {chatUser && `with ${chatUser}`}</h5>
          <span className={`badge ${chatOnline ? 'bg-success' : 'bg-secondary'} text-light`}>
            {chatOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        <a href="/user" className="btn btn-sm btn-light text-dark">
          🏠 Home
        </a>
      </div>

      {/* Message Area */}
      <div
        className={`flex-grow-1 overflow-auto p-3 ${
          theme === "night" ? "bg-dark text-white" : "bg-light"
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
                className={`d-flex mb-2 ${
                  isSender ? "justify-content-end" : "justify-content-start"
                }`}
              >
                <div
                  className={`p-2 rounded shadow-sm ${
                    isSender
                      ? "bg-info text-white text-end"
                      : theme === "night"
                      ? "bg-secondary text-white text-start"
                      : "bg-white text-dark text-start"
                  }`}
                  style={{ maxWidth: "75%", position: "relative" }}
                >
                  {/* Message content */}
                  {msg.type === "text" && <div>{msg.content}</div>}
                  {msg.type === "image" && (
                    <img
                      src={msg.content}
                      alt="sent-img"
                      className="img-fluid rounded"
                      style={{ maxWidth: "200px" }}
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

                  <div className="small text-muted mt-1">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>

                  {isSender && selectedMsgId === msg._id && (
                    <div className="mt-2 d-flex gap-3">
                      {msg.type === "text" && (
                        <button
                          className="btn btn-sm btn-light text-primary"
                          onClick={() => {
                            handleEdit(msg);
                            setSelectedMsgId(null);
                          }}
                        >
                          ✏️ Edit
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-light text-danger"
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
            className="btn btn-primary position-fixed bottom-0 end-0 m-4 rounded-circle shadow"
            style={{ zIndex: 1000, width: "48px", height: "48px" }}
            onClick={scrollToBottom}
            title="Scroll to latest"
          >
            ⬇
          </button>
        )}
        <div ref={bottomRef}></div>
      </div>

      {/* Input + File Upload */}
      <div
        className={`border-top p-3 ${
          theme === "night" ? "bg-dark" : "bg-white"
        }`}
      >
        <div className="input-group">
          <input
            type="text"
            className="form-control"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <label className="btn btn-outline-secondary mb-0">
            📎
            <input
              type="file"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              onChange={handleFile}
              hidden
            />
          </label>
          <button className="btn btn-primary" onClick={handleSend}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}