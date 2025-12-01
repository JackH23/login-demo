import { io, type Socket } from "socket.io-client";

import { API_BASE_URL } from "@/app/lib/api";

const socketBaseUrl = (process.env.NEXT_PUBLIC_SOCKET_BASE_URL || API_BASE_URL)
  // Default Next.js dev server origin should target the backend instead.
  .replace("localhost:3000", "localhost:3001");

const socketsEnabled = process.env.NEXT_PUBLIC_ENABLE_SOCKET !== "false";

let socket: Socket | null = null;

if (socketsEnabled) {
  socket = io(socketBaseUrl, {
    transports: ["websocket"],
  });
}

export default socket;
