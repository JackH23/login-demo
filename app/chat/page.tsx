"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRef } from "react";
import { io, Socket } from "socket.io-client";

interface Message {
  type: "text" | "image" | "file";
  content: string;
  fileName?: string;
  from: string;
  to: string;
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const chatUser = searchParams.get("user") ?? "";
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const socket: Socket = io("http://localhost:3000"); // ← Replace with your backend URL

  useEffect(() => {
    if (!user || !chatUser) return;

    socket.emit("join", { user: user.username, chatWith: chatUser });

    socket.on("receive-message", (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    // Optional: Load chat history once
    fetch(`/api/messages?user1=${user.username}&user2=${chatUser}`)
      .then((res) => res.json())
      .then((data) => setMessages(data.messages ?? []));

    return () => {
      socket.disconnect();
    };
  }, [user, chatUser]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!user || !chatUser || !input.trim()) return;

    const payload: Message = {
      from: user.username,
      to: chatUser,
      type: "text",
      content: input,
    };

    setInput("");
    setMessages((prev) => [...prev, payload]); // Optimistic UI

    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    socket.emit("send-message", payload);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !chatUser) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const isImage = file.type.startsWith("image/");
      const payload = {
        from: user.username,
        to: chatUser,
        type: isImage ? ("image" as const) : ("file" as const),
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
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="container-fluid d-flex flex-column vh-100 p-0">
      {/* Header */}
      <div className="bg-primary text-white px-4 py-3 d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-3">
          <h5 className="mb-0">Chat {chatUser && `with ${chatUser}`}</h5>
          <span className="badge bg-light text-dark">Online</span>
        </div>
        <a href="/home" className="btn btn-sm btn-light text-dark">
          🏠 Home
        </a>
      </div>

      {/* Message Area */}
      <div className="flex-grow-1 overflow-auto bg-light p-3">
        {messages.map((msg, index) => {
          const isSender = msg.from === user?.username;
          return (
            <div
              key={index}
              className={`d-flex mb-2 ${
                isSender ? "justify-content-end" : "justify-content-start"
              }`}
            >
              <div
                className={`p-2 rounded shadow-sm ${
                  isSender
                    ? "bg-info text-white text-end"
                    : "bg-white text-dark text-start"
                }`}
                style={{ maxWidth: "75%" }}
              >
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
                      backgroundColor: isSender ? "#0d6efd" : "#f8f9fa",
                      color: isSender ? "#fff" : "#000",
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
                          color: isSender ? "#fff" : "#000",
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
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}></div> {/* 👈 scroll target */}
      </div>

      {/* Input + File Upload */}
      <div className="border-top p-3 bg-white">
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
