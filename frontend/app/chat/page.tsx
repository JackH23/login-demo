"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import type { Socket } from "socket.io-client";
import { apiUrl, resolveApiUrl } from "@/app/lib/api";

const PAGE_SIZE = 50;
const CHAT_CACHE_PREFIX = "chat-cache:";
const SCROLL_BOTTOM_THRESHOLD = 96;

interface Message {
  _id: string;
  type: "text" | "image" | "file";
  content: string;
  fileName?: string;
  from: string;
  to: string;
  createdAt: string;
}

interface ChatParticipant {
  username: string;
  image?: string;
  online?: boolean;
  friends?: string[];
}

interface ChatEmoji {
  shortcode: string;
  unicode: string;
  category?: string;
  hasSkinTones?: boolean;
}

interface ChatData {
  messages: Message[];
  participants: ChatParticipant[];
  emojis: ChatEmoji[];
  hasMore?: boolean;
}

type UploadState = {
  progress: number;
  status: "uploading" | "failed" | "complete";
  error?: string;
};

const ABSOLUTE_MEDIA_URL = /^(https?:|data:|blob:)/i;

function resolveAttachmentUrl(value: string) {
  if (!value || ABSOLUTE_MEDIA_URL.test(value)) return value;
  const normalizedPath = value.startsWith("/") ? value : `/${value}`;
  return resolveApiUrl(normalizedPath);
}

function normalizeMessageMedia(message: Message): Message {
  if (message.type === "text") return message;
  return {
    ...message,
    content: resolveAttachmentUrl(message.content),
  };
}

function ChatPageContent() {
  const searchParams = useSearchParams();
  const chatUser = searchParams.get("user") ?? "";
  const router = useRouter();
  const { user, socket } = useAuth();
  const { theme, setTheme } = useTheme();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingLatest, setLoadingLatest] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const lastFetchTimeRef = useRef<number>(Date.now());
  const oldestCursorRef = useRef<string | null>(null);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerNodeRef = useRef<HTMLDivElement | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const prevLengthRef = useRef(0); // Initialize ref here
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [chatOnline, setChatOnline] = useState(false);
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [emojiList, setEmojiList] = useState<ChatEmoji[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const emojiLoadedRef = useRef(false);
  const [uploadStates, setUploadStates] = useState<Record<string, UploadState>>(
    {}
  );

  const cacheKey = useMemo(() => {
    if (!user || !chatUser) return null;
    return `${CHAT_CACHE_PREFIX}${user.username}:${chatUser}`;
  }, [chatUser, user]);

  useEffect(() => {
    if (!selectedMsgId) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!messagesContainerNodeRef.current) return;
      if (!(event.target instanceof Node)) return;

      const selectedMessageNode =
        messagesContainerNodeRef.current.querySelector(
          `[data-message-id="${selectedMsgId}"]`
        );

      if (selectedMessageNode && !selectedMessageNode.contains(event.target)) {
        setSelectedMsgId(null);
      }
    };

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [selectedMsgId]);

  const messagesContainerRef = useCallback((node: HTMLDivElement | null) => {
    messagesContainerNodeRef.current = node;
  }, []);

  const sortMessagesByDate = useCallback((list: Message[]) => {
    return [...list].sort(
      (a, b) =>
        resolveMessageDate(a.createdAt).getTime() -
        resolveMessageDate(b.createdAt).getTime()
    );
  }, []);

  const mergeMessages = useCallback(
    (incoming: Message[], existing: Message[]) => {
      const byId = new Map<string, Message>();
      for (const msg of existing) {
        byId.set(msg._id, msg);
      }
      for (const msg of incoming) {
        byId.set(msg._id, msg);
      }
      return sortMessagesByDate([...byId.values()]);
    },
    [sortMessagesByDate]
  );

  const fetchChatData = useCallback(
    async (before?: string | null): Promise<ChatData> => {
      if (!user || !chatUser) {
        return { messages: [], participants: [], emojis: [], hasMore: false };
      }

      const params = new URLSearchParams({
        user1: user.username,
        user2: chatUser,
        limit: PAGE_SIZE.toString(),
      });

      if (before) {
        params.set("before", before);
      }

      const res = await fetch(apiUrl(`/api/messages?${params.toString()}`), {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      const payload = await res.json();
      const raw = payload as Partial<ChatData> & { hasMore?: boolean };

      return {
        messages: Array.isArray(raw.messages)
          ? raw.messages.map(normalizeMessageMedia)
          : [],
        participants: Array.isArray(raw.participants) ? raw.participants : [],
        emojis: Array.isArray(raw.emojis) ? raw.emojis : [],
        hasMore: Boolean(raw.hasMore),
      };
    },
    [chatUser, user]
  );

  useEffect(() => {
    setParticipants([]);
    setChatOnline(false);
  }, [chatUser]);

  const updateScrollButtonVisibility = useCallback(() => {
    const container = messagesContainerNodeRef.current;
    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight - container.clientHeight - container.scrollTop;
    const hasScrollableContent =
      container.scrollHeight > container.clientHeight + 8;

    setShowScrollButton(
      hasScrollableContent && distanceFromBottom > SCROLL_BOTTOM_THRESHOLD
    );
  }, []);

  useEffect(() => {
    const updateBreakpoint = () => {
      if (typeof window === "undefined") return;
      setIsMobile(window.matchMedia("(max-width: 768px)").matches);
      updateScrollButtonVisibility();
    };

    updateBreakpoint();
    window.addEventListener("resize", updateBreakpoint);
    return () => window.removeEventListener("resize", updateBreakpoint);
  }, [updateScrollButtonVisibility]);

  useEffect(() => {
    router.prefetch("/friend");
  }, [router]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    requestAnimationFrame(updateScrollButtonVisibility);
  };

  const toggleTheme = () => {
    setTheme(theme === "night" ? "brightness" : "night");
  };

  const handleBackNavigation = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/friend");
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

  // Join/leave socket room for current chat partner
  useEffect(() => {
    if (!socketRef.current || !user || !chatUser) return;
    const payload = { user: user.username, partner: chatUser };
    socketRef.current.emit("chat:join", payload);

    return () => {
      socketRef.current?.emit("chat:leave", payload);
    };
  }, [chatUser, user]);

  useEffect(() => {
    setMessages([]);
    setParticipants([]);
    setEmojiList([]);
    setHasMore(true);
    oldestCursorRef.current = null;
    prevLengthRef.current = 0;
    if (!cacheKey || typeof window === "undefined") return;

    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return;
      const cached = JSON.parse(raw) as Partial<ChatData> & {
        oldestCursor?: string;
      };
      const cachedMessages = Array.isArray(cached.messages)
        ? cached.messages.map(normalizeMessageMedia)
        : [];
      setMessages(sortMessagesByDate(cachedMessages));
      setParticipants(
        Array.isArray(cached.participants) ? cached.participants : []
      );
      if (Array.isArray(cached.emojis) && cached.emojis.length) {
        setEmojiList(cached.emojis);
        emojiLoadedRef.current = true;
      }
      if (typeof cached.hasMore === "boolean") {
        setHasMore(cached.hasMore);
      }
      oldestCursorRef.current =
        cached.oldestCursor ?? cachedMessages[0]?.createdAt ?? null;
    } catch (error) {
      console.warn("Failed to load cached chat", error);
    }
  }, [cacheKey, sortMessagesByDate]);

  const hydrateLatest = useCallback(async () => {
    if (!user || !chatUser) return;
    setLoadingLatest(true);
    try {
      const data = await fetchChatData();
      lastFetchTimeRef.current = Date.now();
      setMessages((prev) => mergeMessages(data.messages ?? [], prev));
      setParticipants(data.participants ?? []);
      if (data.emojis?.length && !emojiLoadedRef.current) {
        setEmojiList(data.emojis);
        emojiLoadedRef.current = true;
      }
      const partner = (data.participants ?? []).find(
        (p) => p.username === chatUser
      );
      if (partner && typeof partner.online === "boolean") {
        setChatOnline(partner.online);
      }
      setHasMore(Boolean(data.hasMore ?? data.messages?.length === PAGE_SIZE));
    } catch (error) {
      console.error("Failed to fetch latest chat", error);
    } finally {
      setLoadingLatest(false);
    }
  }, [chatUser, fetchChatData, mergeMessages, user]);

  useEffect(() => {
    void hydrateLatest();
  }, [hydrateLatest]);

  const loadOlderMessages = useCallback(async () => {
    if (!user || !chatUser || loadingOlder || loadingLatest || !hasMore) return;
    const cursor = oldestCursorRef.current;
    if (!cursor) return;

    const container = messagesContainerNodeRef.current;
    const previousHeight = container?.scrollHeight ?? 0;

    setLoadingOlder(true);
    try {
      const data = await fetchChatData(cursor);
      setMessages((prev) => mergeMessages(data.messages ?? [], prev));
      if (!participants.length) {
        setParticipants(data.participants ?? []);
      }
      if (data.emojis?.length && !emojiLoadedRef.current) {
        setEmojiList(data.emojis);
        emojiLoadedRef.current = true;
      }
      setHasMore(Boolean(data.hasMore ?? data.messages?.length === PAGE_SIZE));
    } catch (error) {
      console.error("Failed to load older messages", error);
    } finally {
      setLoadingOlder(false);
      if (container) {
        const delta = container.scrollHeight - previousHeight;
        container.scrollTop += delta;
      }
    }
  }, [
    chatUser,
    fetchChatData,
    hasMore,
    loadingLatest,
    loadingOlder,
    mergeMessages,
    participants.length,
    user,
  ]);

  useEffect(() => {
    if (!messages.length) {
      oldestCursorRef.current = null;
      return;
    }
    const sorted = sortMessagesByDate(messages);
    oldestCursorRef.current = sorted[0]?.createdAt ?? null;
  }, [messages, sortMessagesByDate]);

  useEffect(() => {
    if (!cacheKey || !user || !chatUser) return;
    if (typeof window === "undefined") return;

    try {
      const payload = {
        messages,
        participants,
        emojis: emojiList,
        hasMore,
        oldestCursor: oldestCursorRef.current,
      };
      localStorage.setItem(cacheKey, JSON.stringify(payload));
    } catch (error) {
      console.warn("Unable to persist chat cache", error);
    }
  }, [cacheKey, chatUser, emojiList, hasMore, messages, participants, user]);

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

  useEffect(() => {
    if (!socketRef.current || !user) return;

    const handleIncoming = (msg: Message & { clientMessageId?: string }) => {
      const isPartnerMessage =
        (msg.from === chatUser && msg.to === user.username) ||
        (msg.to === chatUser && msg.from === user.username);
      if (!isPartnerMessage) return;

      const normalizedMessage = normalizeMessageMedia(msg);
      setMessages((prev) => {
        const withoutTemp = msg.clientMessageId
          ? prev.filter((m) => m._id !== msg.clientMessageId)
          : prev;
        return sortMessagesByDate([...withoutTemp, normalizedMessage]);
      });

      if (msg.from === chatUser) {
        scrollToBottom();
      }
    };

    const handlePresence = (username: string, online: boolean) => {
      setParticipants((prev) =>
        prev.map((p) => (p.username === username ? { ...p, online } : p))
      );
      if (username === chatUser) {
        setChatOnline(online);
      }
    };

    socketRef.current.on("chat:message", handleIncoming);
    socketRef.current.on("user-online", (username) =>
      handlePresence(username, true)
    );
    socketRef.current.on("user-offline", (username) =>
      handlePresence(username, false)
    );

    return () => {
      socketRef.current?.off("chat:message", handleIncoming);
      socketRef.current?.off("user-online");
      socketRef.current?.off("user-offline");
    };
  }, [chatUser, sortMessagesByDate, user]);

  const chatPartner = participants.find((p) => p.username === chatUser);
  const emojiButtonTitle = emojiList.length
    ? `Insert emoji (${emojiList.length} available)`
    : "Add emoji";

  const currentUsername = user?.username ?? "";

  const openProfile = () => {
    if (!chatUser) return;
    router.push(`/user/${encodeURIComponent(chatUser)}`);
  };

  // Show the scroll-to-bottom button when the user scrolls away from the bottom
  // or when new messages arrive while not at the bottom. Also trigger lazy
  // loading when the user scrolls near the top.
  useEffect(() => {
    const container = messagesContainerNodeRef.current;
    if (!container) return;

    const handleScroll = () => {
      updateScrollButtonVisibility();

      const nearTop = container.scrollTop < 120;
      if (nearTop) {
        void loadOlderMessages();
      }
    };

    // Initial check in case the list overflows on first render
    handleScroll();

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
    // Re-run when messages change so the button updates if new messages push
    // content while the user is scrolled up
  }, [loadOlderMessages, messages.length, updateScrollButtonVisibility]);

  useEffect(() => {
    updateScrollButtonVisibility();
  }, [messages.length, updateScrollButtonVisibility]);

  const replaceTempMessage = useCallback(
    (tempId: string, confirmed: Message) => {
      setMessages((prev) =>
        sortMessagesByDate(prev.map((m) => (m._id === tempId ? confirmed : m)))
      );
      setUploadStates((prev) => {
        const current = prev[tempId];
        if (!current) return prev;
        const next = { ...prev };
        delete next[tempId];
        next[confirmed._id] = current;
        return next;
      });
    },
    [sortMessagesByDate]
  );

  const removeTempMessage = useCallback((tempId: string) => {
    setMessages((prev) => prev.filter((m) => m._id !== tempId));
    setUploadStates((prev) => {
      if (!prev[tempId]) return prev;
      const next = { ...prev };
      delete next[tempId];
      return next;
    });
  }, []);

  const waitForSocketConnection = useCallback((client: Socket) => {
    if (client.connected) return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
      const handleConnect = () => {
        cleanup();
        resolve();
      };
      const handleError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const cleanup = () => {
        clearTimeout(timeoutId);
        client.off("connect", handleConnect);
        client.off("connect_error", handleError);
      };

      const timeoutId = window.setTimeout(() => {
        cleanup();
        reject(new Error("Socket connection timed out"));
      }, 3000);

      client.once("connect", handleConnect);
      client.once("connect_error", handleError);
      client.connect();
    });
  }, []);

  const sendMessageViaSocket = useCallback(
    async (
      payload: Omit<Message, "_id" | "createdAt">,
      tempId: string
    ): Promise<Message> => {
      const client = socketRef.current;
      if (!client) throw new Error("Socket not connected");

      await waitForSocketConnection(client);

      return await new Promise<Message>((resolve, reject) => {
        client
          .timeout(4000)
          .emit(
            "chat:send",
            { ...payload, clientMessageId: tempId },
            (
              response:
                | { ok?: boolean; message?: Message; error?: string }
                | Error
                | undefined
            ) => {
              if (response instanceof Error) {
                reject(response);
                return;
              }

              if (!response?.ok || !response.message) {
                reject(new Error(response?.error || "Failed to send"));
                return;
              }

              resolve(normalizeMessageMedia(response.message));
            }
          );
      });
    },
    [waitForSocketConnection]
  );

  const sendMessageViaHttp = useCallback(
    async (payload: Omit<Message, "_id" | "createdAt">): Promise<Message> => {
      const res = await fetch(apiUrl("/api/messages"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let message = `Request failed with status ${res.status}`;
        try {
          const bodyText = await res.text();
          if (bodyText.trim()) {
            try {
              const data = JSON.parse(bodyText);
              if (typeof data?.error === "string" && data.error.trim()) {
                message = data.error;
              } else {
                message = bodyText;
              }
            } catch {
              message = bodyText;
            }
          }
        } catch {
          // Swallow body read errors and fall back to the default message
        }

        throw new Error(message);
      }

      const data = await res.json();
      if (!data?.message) {
        throw new Error("Unexpected response from the server");
      }

      return normalizeMessageMedia(data.message as Message);
    },
    [resolveMessageDate]
  );

  const findMatchingPersistedMessage = useCallback(
    (
      list: Message[],
      optimistic: Message,
      payload: Omit<Message, "_id" | "createdAt">
    ) => {
      const normalizedContent = payload.content.trim();
      const optimisticTime =
        resolveMessageDate(optimistic.createdAt).getTime() - 1000;

      return list.find((msg) => {
        if (
          msg.from !== payload.from ||
          msg.to !== payload.to ||
          msg.type !== payload.type
        ) {
          return false;
        }

        const messageTime = resolveMessageDate(msg.createdAt).getTime();
        if (messageTime < optimisticTime) return false;

        if (payload.type === "text") {
          return msg.content.trim() === normalizedContent;
        }

        return msg.fileName === payload.fileName;
      });
    },
    [resolveMessageDate]
  );

  const uploadFileWithProgress = useCallback(
    (file: File, tempId: string) =>
      new Promise<{ dataUrl: string; name: string }>((resolve, reject) => {
        const reader = new FileReader();

        reader.onprogress = (event) => {
          if (!event.lengthComputable) return;
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadStates((prev) => ({
            ...prev,
            [tempId]: {
              progress,
              status: "uploading",
            },
          }));
        };

        reader.onload = () => {
          const result = reader.result;
          if (typeof result !== "string") {
            reject(new Error("Unable to process uploaded file"));
            return;
          }
          setUploadStates((prev) => ({
            ...prev,
            [tempId]: {
              progress: 100,
              status: "uploading",
            },
          }));
          resolve({ dataUrl: result, name: file.name });
        };

        reader.onerror = () => reject(new Error("Failed to read file"));

        reader.readAsDataURL(file);
      }),
    []
  );

  const confirmOptimisticMessage = useCallback(
    async (
      tempId: string,
      optimisticMessage: Message,
      payload: Omit<Message, "_id" | "createdAt">
    ) => {
      try {
        const confirmed = await sendMessageViaSocket(payload, tempId);
        replaceTempMessage(tempId, confirmed);
        return confirmed;
      } catch (error) {
        console.warn("Socket delivery failed; attempting HTTP fallback", error);
      }

      try {
        const latest = await fetchChatData();
        const persisted = findMatchingPersistedMessage(
          latest.messages ?? [],
          optimisticMessage,
          payload
        );
        if (persisted) {
          replaceTempMessage(tempId, persisted);
          return persisted;
        }
      } catch (error) {
        console.warn("Unable to refresh chat data after socket failure", error);
      }

      try {
        const confirmed = await sendMessageViaHttp(payload);
        replaceTempMessage(tempId, confirmed);
        return confirmed;
      } catch (error) {
        console.error("Unable to send message", error);
        setUploadStates((prev) => ({
          ...prev,
          [tempId]: {
            progress: prev[tempId]?.progress ?? 0,
            status: "failed",
            error:
              error instanceof Error ? error.message : "Failed to send message",
          },
        }));
        throw error;
      }
    },
    [
      fetchChatData,
      findMatchingPersistedMessage,
      replaceTempMessage,
      sendMessageViaHttp,
      sendMessageViaSocket,
    ]
  );

  const postMessage = async (payload: Omit<Message, "_id" | "createdAt">) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticMessage: Message = {
      _id: tempId,
      createdAt: new Date().toISOString(),
      ...payload,
    };

    setMessages((prev) => sortMessagesByDate([...prev, optimisticMessage]));
    scrollToBottom();

    try {
      const confirmed = await sendMessageViaSocket(payload, tempId);
      replaceTempMessage(tempId, confirmed);
      return;
    } catch (error) {
      console.warn("Socket delivery failed; attempting HTTP fallback", error);
    }

    try {
      const latest = await fetchChatData();
      const persisted = findMatchingPersistedMessage(
        latest.messages ?? [],
        optimisticMessage,
        payload
      );
      if (persisted) {
        replaceTempMessage(tempId, persisted);
        return;
      }
    } catch (error) {
      console.warn("Unable to refresh chat data after socket failure", error);
    }

    try {
      const confirmed = await sendMessageViaHttp(payload);
      replaceTempMessage(tempId, confirmed);
    } catch (error) {
      console.error("Unable to send message", error);
    }
  };

  const handleSend = () => {
    if (!user || !chatUser || !input.trim()) return;

    const messageContent = input.trim();

    const payload = {
      from: user.username,
      to: chatUser,
      type: "text" as const,
      content: messageContent,
    };

    setInput("");

    void postMessage(payload);
  };

  const processUploadedFile = useCallback(
    async (file: File, tempId: string, optimisticMessage: Message) => {
      try {
        const { dataUrl, name } = await uploadFileWithProgress(file, tempId);
        setUploadStates((prev) => ({
          ...prev,
          [tempId]: { progress: 100, status: "uploading" },
        }));

        setMessages((prev) =>
          prev.map((m) =>
            m._id === tempId
              ? {
                  ...m,
                  content: dataUrl,
                  fileName: name ?? optimisticMessage.fileName,
                }
              : m
          )
        );

        const payload: Omit<Message, "_id" | "createdAt"> = {
          from: optimisticMessage.from,
          to: optimisticMessage.to,
          type: optimisticMessage.type,
          content: dataUrl,
          fileName: name ?? optimisticMessage.fileName,
        };

        const confirmedMessage = await confirmOptimisticMessage(
          tempId,
          { ...optimisticMessage, content: dataUrl },
          payload
        );
        setUploadStates((prev) => ({
          ...prev,
          ...(confirmedMessage?._id && prev[confirmedMessage._id]
            ? {
                [confirmedMessage._id]: {
                  ...prev[confirmedMessage._id],
                  progress: 100,
                  status: "complete",
                },
              }
            : {}),
          ...(prev[tempId] && !confirmedMessage?._id
            ? {
                [tempId]: {
                  ...prev[tempId],
                  progress: 100,
                  status: "complete",
                },
              }
            : {}),
        }));
      } catch (error) {
        console.error("File upload failed", error);
        setUploadStates((prev) => ({
          ...prev,
          [tempId]: {
            progress: prev[tempId]?.progress ?? 0,
            status: "failed",
            error:
              error instanceof Error ? error.message : "Failed to upload file",
          },
        }));
      } finally {
        if (optimisticMessage.content.startsWith("blob:")) {
          URL.revokeObjectURL(optimisticMessage.content);
        }
      }
    },
    [confirmOptimisticMessage, uploadFileWithProgress]
  );

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !chatUser) return;

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const isImage = file.type.startsWith("image/");
    const previewUrl = URL.createObjectURL(file);

    const optimisticMessage: Message = {
      _id: tempId,
      from: user.username,
      to: chatUser,
      type: isImage ? "image" : "file",
      content: previewUrl,
      fileName: file.name,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => sortMessagesByDate([...prev, optimisticMessage]));
    setUploadStates((prev) => ({
      ...prev,
      [tempId]: { progress: 0, status: "uploading" },
    }));
    scrollToBottom();
    e.target.value = "";

    void processUploadedFile(file, tempId, optimisticMessage);
  };

  const handleDelete = async (id: string) => {
    let removedMessage: Message | undefined;
    setMessages((prev) => {
      removedMessage = prev.find((m) => m._id === id);
      return prev.filter((m) => m._id !== id);
    });
    setUploadStates((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });

    try {
      const res = await fetch(apiUrl(`/api/messages/${id}`), {
        method: "DELETE",
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to delete message");
      }
    } catch (error) {
      console.error("Unable to delete message", error);
      if (removedMessage) {
        setMessages((prev) =>
          sortMessagesByDate([...prev, removedMessage as Message])
        );
      }
      alert("Failed to delete message. Please try again.");
    }
  };

  const handleEdit = async (msg: Message) => {
    const newContent = prompt("Edit message", msg.content);
    if (newContent === null) return;
    const trimmed = newContent.trim();
    if (!trimmed) return;

    const previousContent = msg.content;
    setMessages((prev) =>
      prev.map((m) => (m._id === msg._id ? { ...m, content: trimmed } : m))
    );

    try {
      const res = await fetch(apiUrl(`/api/messages/${msg._id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to edit message");
      }

      const data = await res.json();
      if (data?.message) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === msg._id ? normalizeMessageMedia(data.message) : m
          )
        );
      }
    } catch (error) {
      console.error("Unable to edit message", error);
      setMessages((prev) =>
        prev.map((m) =>
          m._id === msg._id ? { ...m, content: previousContent } : m
        )
      );
      alert("Failed to update message. Please try again.");
    }
  };

  function resolveMessageDate(rawDate: string) {
    const parsed = new Date(rawDate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }

    return new Date(lastFetchTimeRef.current);
  }

  const formatTime = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "UTC",
      }),
    []
  );

  const formatDate = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
    []
  );

  const getUtcDateKey = (date: Date) =>
    `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;

  function formatDateLabel(dateInput: string | Date) {
    const date =
      typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    const now = new Date();

    const todayKey = getUtcDateKey(now);
    const yesterday = new Date(now);
    yesterday.setUTCDate(now.getUTCDate() - 1);
    const yesterdayKey = getUtcDateKey(yesterday);
    const dateKey = getUtcDateKey(date);

    if (dateKey === todayKey) return "Today";
    if (dateKey === yesterdayKey) return "Yesterday";

    return formatDate.format(date);
  }

  let lastDateLabel = "";

  const headerContent = isMobile ? (
    <div
      className={`mobile-thread-header ${
        theme === "night"
          ? "mobile-thread-header--night"
          : "mobile-thread-header--day"
      }`}
    >
      <div className="mobile-header-actions">
        <Link
          href="/friend"
          className="mobile-back-button"
          prefetch
          replace
          aria-label="Back to conversations"
        >
          <span aria-hidden="true" className="mobile-back-button__icon">
            ←
          </span>
        </Link>
      </div>
      {chatUser ? (
        <div className="d-flex align-items-center gap-3">
          {chatPartner?.image ? (
            <img
              src={chatPartner.image}
              alt={`${chatUser}'s avatar`}
              className="mobile-thread-avatar"
            />
          ) : (
            <div className="mobile-thread-avatar mobile-thread-avatar--fallback">
              {chatUser.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="d-flex flex-column">
            <span className="mobile-thread-name">{chatUser}</span>
            <span className="mobile-thread-status">
              {chatOnline ? "Online" : "Last seen recently"}
            </span>
          </div>
        </div>
      ) : (
        <div className="d-flex align-items-center gap-2">
          <div className="mobile-thread-avatar mobile-thread-avatar--fallback">
            💬
          </div>
          <div className="d-flex flex-column">
            <span className="mobile-thread-name">PulseChat</span>
            <span className="mobile-thread-status">Pick a chat to start</span>
          </div>
        </div>
      )}
    </div>
  ) : (
    <header
      className={`chat-header ${
        theme === "night" ? "chat-header-night" : "chat-header-day"
      }`}
    >
      <div className="chat-header-brand d-flex align-items-center gap-3 flex-wrap">
        <div className="brand-badge">
          <span className="brand-icon" aria-hidden="true">
            💬
          </span>
        </div>
        <div className="d-flex flex-column flex-sm-row align-items-sm-center gap-1 gap-sm-3">
          <span className="brand-name">PulseChat</span>
          <span className="brand-tagline">
            Conversations that keep you close.
          </span>
        </div>
      </div>

      {chatUser && (
        <div className="chat-user-status d-flex align-items-center gap-3 flex-wrap">
          <div
            className="d-flex align-items-center gap-2"
            role="button"
            tabIndex={0}
            onClick={openProfile}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openProfile();
              }
            }}
          >
            {chatPartner?.image ? (
              <img
                src={chatPartner.image}
                alt={`${chatUser}'s avatar`}
                className="chat-user-avatar"
              />
            ) : (
              <div className="chat-user-avatar chat-user-avatar--fallback">
                {chatUser.charAt(0).toUpperCase()}
              </div>
            )}
            <div
              className={`status-dot ${
                chatOnline ? "status-dot-online" : "status-dot-offline"
              }`}
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
        <button
          type="button"
          className="chat-header-action"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "night" ? "Light" : "Dark"} Mode`}
        >
          {theme === "night" ? "🌞" : "🌙"}
        </button>
        <button
          type="button"
          className="chat-header-action"
          onClick={handleBackNavigation}
          aria-label="Back to home"
        >
          🏠
        </button>
      </div>
    </header>
  );

  const messagesContent = (
    <div className="chat-canvas-shell position-relative d-flex flex-column flex-grow-1">
      <div
        ref={messagesContainerRef}
        id="chat-scroll-container"
        className={`chat-canvas flex-grow-1 overflow-auto ${
          theme === "night" ? "chat-canvas-night" : "chat-canvas-day"
        }`}
      >
        {messages.map((msg, idx) => {
          const createdAt = resolveMessageDate(msg.createdAt);
          const msgDate = createdAt.toDateString();
          const isSender = msg.from === user?.username;
          const uploadState = uploadStates[msg._id];

          const showDateLabel = msgDate !== lastDateLabel;
          if (showDateLabel) lastDateLabel = msgDate;

          return (
            <div key={msg._id + idx}>
              {showDateLabel && (
                <div className="text-center text-muted small my-3">
                  <span className="badge bg-secondary">
                    {formatDateLabel(createdAt)}
                  </span>
                </div>
              )}

              <div
                onClick={() => {
                  if (isSender) {
                    setSelectedMsgId((current) =>
                      current === msg._id ? null : msg._id
                    );
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (isSender) setSelectedMsgId(msg._id);
                  else setSelectedMsgId(null);
                }}
                className={`chat-message ${
                  isSender ? "chat-message--sent" : "chat-message--received"
                }`}
                data-message-id={msg._id}
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
                      dateTime={createdAt.toISOString()}
                    >
                      {formatTime.format(createdAt)}
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

                  {uploadState && (
                    <div
                      className={`chat-message-upload-status chat-message-upload-status--${uploadState.status}`}
                    >
                      {uploadState.status === "uploading" ? (
                        <span>
                          Uploading…{" "}
                          {Number.isFinite(uploadState.progress)
                            ? `${uploadState.progress}%`
                            : ""}
                        </span>
                      ) : uploadState.status === "failed" ? (
                        <span className="text-danger">
                          Upload failed
                          {uploadState.error ? `: ${uploadState.error}` : ""}
                        </span>
                      ) : (
                        <span
                          className="chat-message-upload-success"
                          aria-label="Upload complete"
                        >
                          <span aria-hidden="true">✓</span>
                          <span aria-hidden="true">✓</span>
                          <span className="visually-hidden">Upload complete</span>
                        </span>
                      )}
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
        <div ref={bottomRef}></div>
      </div>
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
    </div>
  );

  const composer = (
    <footer
      className={`chat-footer ${
        theme === "night" ? "chat-footer--night" : "chat-footer--day"
      }`}
    >
      <div className="chat-composer" role="group" aria-label="Message composer">
        <button
          type="button"
          className="chat-composer__icon-btn"
          aria-label="Add emoji"
          title={emojiButtonTitle}
        >
          😊
        </button>
        <div className="chat-composer__input-row">
          <input
            type="text"
            className="chat-composer__input"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button
            type="button"
            className="chat-composer__send"
            aria-label="Send message"
            onClick={handleSend}
          >
            ➤
          </button>
        </div>
        <button
          type="button"
          className="chat-composer__icon-btn"
          aria-label="Attach a file"
          onClick={() => fileInputRef.current?.click()}
        >
          📎
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          onChange={handleFile}
          hidden
        />
      </div>
    </footer>
  );

  const desktopLayout = (
    <div
      className={`container-fluid d-flex flex-column vh-100 p-0 ${
        theme === "night" ? "bg-dark text-white" : "bg-light"
      }`}
    >
      {headerContent}
      {messagesContent}
      {composer}
    </div>
  );

  const mobileThreadLayout = (
    <div className="chat-mobile-thread-view">
      {headerContent}
      {messagesContent}
      {composer}
    </div>
  );

  if (!isMobile) return desktopLayout;

  return (
    <div className="chat-mobile-shell">
      {chatUser ? (
        mobileThreadLayout
      ) : (
        <div className="chat-mobile-thread-view">
          {headerContent}
          <div className="empty-thread-message">
            Choose a conversation to start chatting.
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading chat…</div>}>
      <ChatPageContent />
    </Suspense>
  );
}
