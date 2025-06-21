"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

interface Message {
  type: "text" | "image" | "file";
  content: string;
  fileName?: string;
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const user = searchParams.get("user") ?? "";

  const [messages, setMessages] = useState<Message[]>([
    { type: "text", content: "Hello!" },
    { type: "text", content: "Hi, how are you?" },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (input.trim()) {
      setMessages([...messages, { type: "text", content: input }]);
      setInput("");
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const isImage = file.type.startsWith("image/");
      setMessages((prev) => [
        ...prev,
        {
          type: isImage ? "image" : "file",
          content: reader.result as string,
          fileName: file.name,
        },
      ]);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="container-fluid d-flex flex-column vh-100 p-0">
      {/* Header */}
      <div className="bg-primary text-white px-4 py-3 d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-3">
          <h5 className="mb-0">Chat {user && `with ${user}`}</h5>
          <span className="badge bg-light text-dark">Online</span>
        </div>
        <a href="/home" className="btn btn-sm btn-light text-dark">
          🏠 Home
        </a>
      </div>

      {/* Message Area */}
      <div className="flex-grow-1 overflow-auto bg-light p-3">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`mb-3 p-2 rounded shadow-sm ${
              index % 2 === 0
                ? "bg-white text-start"
                : "bg-info text-white text-end"
            }`}
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
              <a
                href={msg.content}
                download={msg.fileName}
                className="text-decoration-none text-dark"
              >
                📎 {msg.fileName}
              </a>
            )}
          </div>
        ))}
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
