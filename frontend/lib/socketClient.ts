import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "@/app/lib/api";

function resolveSocketBase() {
  const envBase = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (envBase) return envBase;

  if (API_BASE_URL) return API_BASE_URL;

  // Let socket.io default to the current origin in the browser so requests
  // follow the same origin as the frontend when no base URL is configured.
  if (typeof window !== "undefined") return undefined;

  if (process.env.NODE_ENV === "development") return "http://localhost:8000";

  return undefined;
}

let socket: Socket | null = null;

// Lazily create the client instance so that server-side rendering never tries
// to touch the window object.
if (typeof window !== "undefined") {
  socket = io(resolveSocketBase(), {
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnectionAttempts: 5,
  });
}

export default socket;
