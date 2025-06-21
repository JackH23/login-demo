"use client";

import { useSearchParams } from "next/navigation";

export default function ChatPage() {
  const searchParams = useSearchParams();
  const user = searchParams.get("user") ?? "";

  return (
    <div className="p-4">
      <h1 className="h3 mb-4">Chat {user && `with ${user}`}</h1>
      <p>This is the chat page.</p>
    </div>
  );
}
