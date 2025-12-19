import { io, type Socket } from "socket.io-client";

const baseUrl =
  process.env.NEXT_PUBLIC_SOCKET_URL?.trim() ||
  (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "");

let socket: Socket | null = null;

// Lazily create the client instance so that server-side rendering never tries
// to touch the window object.
if (typeof window !== "undefined") {
  socket = io(baseUrl, {
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnectionAttempts: 5,
  });
}

export default socket;
