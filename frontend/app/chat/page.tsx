"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CSSProperties,
  HTMLAttributes,
  MutableRefObject,
  ReactNode,
} from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import type { Socket } from "socket.io-client";
import { apiUrl, resolveApiUrl } from "@/app/lib/api";
import type { ListChildComponentProps, ListOnScrollProps } from "react-window";
import { VariableSizeList } from "react-window";

const PAGE_SIZE = 50;
const CHAT_CACHE_PREFIX = "chat-cache:";

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

type ChatListItem =
  | { kind: "date"; id: string; label: string }
  | { kind: "message"; message: Message };

interface ListRenderData {
  items: ChatListItem[];
  currentUsername: string;
  theme: string;
  selectedMsgId: string | null;
  uploadStates: Record<string, UploadState>;
  onSelect: (messageId: string | null) => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string) => void;
  formatTime: (date: Date) => string;
  onSize: (index: number, size: number) => void;
  resolveMessageDate: (raw: string) => Date;
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

const DateDivider = memo(function DateDivider({ label }: { label: string }) {
  return (
    <div className="text-center text-muted small my-3">
      <span className="badge bg-secondary">{label}</span>
    </div>
  );
});

interface MessageBubbleProps {
  message: Message;
  isSender: boolean;
  theme: string;
  selected: boolean;
  uploadState?: UploadState;
  timeLabel: string;
  createdAt: Date;
  onSelect: (messageId: string | null) => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string) => void;
}

const MessageBubble = memo(function MessageBubble({
  message,
  isSender,
  theme,
  selected,
  uploadState,
  timeLabel,
  createdAt,
  onSelect,
  onEdit,
  onDelete,
}: MessageBubbleProps) {
  return (
    <div
      onClick={() => {
        if (isSender) {
          onSelect(selected ? null : message._id);
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onSelect(isSender ? message._id : null);
      }}
      className={`chat-message ${
        isSender ? "chat-message--sent" : "chat-message--received"
      }`}
      data-message-id={message._id}
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
            <span className="chat-message-sender">{message.from}</span>
          )}
          <time className="chat-message-time" dateTime={createdAt.toISOString()}>
            {timeLabel}
          </time>
        </div>

        {message.type === "text" && (
          <p className="chat-message-text">{message.content}</p>
        )}

        {message.type === "image" && (
          <div className="chat-message-media">
            <img src={message.content} alt="sent-img" />
          </div>
        )}

        {message.type === "file" && (
          <div className="chat-message-file">
            <div className="chat-message-file-icon" aria-hidden="true">
              📄
            </div>
            <div className="chat-message-file-meta">
              <a href={message.content} download={message.fileName}>
                {message.fileName}
              </a>
              <span className="chat-message-file-type">
                {message.fileName?.split(".").pop()?.toUpperCase()} File
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

        {isSender && selected && (
          <div className="chat-message-actions">
            {message.type === "text" && (
              <button
                className="chat-message-action"
                onClick={() => {
                  onEdit(message);
                  onSelect(null);
                }}
              >
                ✏️ Edit
              </button>
            )}
            <button
              className="chat-message-action chat-message-action--danger"
              onClick={() => {
                onDelete(message._id);
                onSelect(null);
              }}
            >
              🗑️ Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

const MeasuredItem = memo(function MeasuredItem({
  index,
  style,
  onSize,
  children,
}: {
  index: number;
  style: CSSProperties;
  onSize: (index: number, size: number) => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    const measure = () => {
      const rect = node.getBoundingClientRect();
      onSize(index, rect.height);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [index, onSize]);

  return (
    <div ref={ref} style={style}>
      {children}
    </div>
  );
});

const VirtualizedMessageRow = memo(function VirtualizedMessageRow({
  index,
  style,
  data,
}: ListChildComponentProps<ListRenderData>) {
  const item = data.items[index];

  if (item.kind === "date") {
    return (
      <MeasuredItem index={index} style={style} onSize={data.onSize}>
        <DateDivider label={item.label} />
      </MeasuredItem>
    );
  }

  const isSender = item.message.from === data.currentUsername;
  const selected = data.selectedMsgId === item.message._id;
  const uploadState = data.uploadStates[item.message._id];
  const createdAt = data.resolveMessageDate(item.message.createdAt);
  const timeLabel = data.formatTime(createdAt);

  return (
    <MeasuredItem index={index} style={style} onSize={data.onSize}>
      <MessageBubble
        message={item.message}
        isSender={isSender}
        theme={data.theme}
        selected={selected}
        uploadState={uploadState}
        timeLabel={timeLabel}
        createdAt={createdAt}
        onSelect={data.onSelect}
        onEdit={data.onEdit}
        onDelete={data.onDelete}
      />
    </MeasuredItem>
  );
});

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
  const chatContentRef = useRef<HTMLDivElement | null>(null);
  const listWrapperRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<VariableSizeList<ListRenderData> | null>(null);
  const sizeMapRef = useRef<Map<number, number>>(new Map());
  const listItemsRef = useRef<ChatListItem[]>([]);
  const [listHeight, setListHeight] = useState(0);

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

  const currentUsername = user?.username ?? "";

  const resolveMessageDate = useCallback((rawDate: string) => {
    const parsed = new Date(rawDate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }

    return new Date(lastFetchTimeRef.current);
  }, []);

  useEffect(() => {
    if (!selectedMsgId) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!chatContentRef.current) return;
      if (!(event.target instanceof Node)) return;

      const selectedMessageNode = chatContentRef.current.querySelector(
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

  const sortMessagesByDate = useCallback(
    (list: Message[]) => {
      return [...list].sort(
        (a, b) =>
          resolveMessageDate(a.createdAt).getTime() -
          resolveMessageDate(b.createdAt).getTime()
      );
    },
    [resolveMessageDate]
  );

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

  useEffect(() => {
    const updateBreakpoint = () => {
      if (typeof window === "undefined") return;
      setIsMobile(window.matchMedia("(max-width: 768px)").matches);
    };

    updateBreakpoint();
    window.addEventListener("resize", updateBreakpoint);
    return () => window.removeEventListener("resize", updateBreakpoint);
  }, []);

  useEffect(() => {
    router.prefetch("/friend");
  }, [router]);

  useLayoutEffect(() => {
    const el = listWrapperRef.current;
    if (!el) return;

    const updateHeight = () => setListHeight(el.clientHeight);
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = chatContentRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
    }

    const lastIndex = Math.max(listItemsRef.current.length - 1, 0);
    if (listRef.current && listItemsRef.current.length) {
      listRef.current.scrollToItem(lastIndex, "end");
    }

    setShowScrollButton(false);
  }, []);

  const isUserNearBottom = useCallback(() => {
    const el = chatContentRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }, []);

  const handleItemSize = useCallback((index: number, size: number) => {
    const current = sizeMapRef.current.get(index);
    if (current !== size) {
      sizeMapRef.current.set(index, size);
      listRef.current?.resetAfterIndex(index, false);
    }
  }, []);

  const getItemSize = useCallback((index: number) => {
    return sizeMapRef.current.get(index) ?? 120;
  }, []);

  const handleListScroll = useCallback(
    ({ scrollOffset }: ListOnScrollProps) => {
      const el = chatContentRef.current;
      if (!el) return;

      const distanceFromBottom = el.scrollHeight - scrollOffset - el.clientHeight;
      setShowScrollButton(distanceFromBottom > 80);

      if (el.scrollTop < 120) {
        void loadOlderMessages();
      }
    },
    [loadOlderMessages]
  );

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

    const container = chatContentRef.current;
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
    const grew = messages.length > prevLengthRef.current;
    const lastMessage = messages[messages.length - 1];
    if (grew) {
      const shouldAutoScroll =
        prevLengthRef.current === 0 ||
        (lastMessage &&
          (lastMessage.from === chatUser || lastMessage.from === currentUsername) &&
          isUserNearBottom());

      if (shouldAutoScroll) {
        scrollToBottom(prevLengthRef.current === 0 ? "auto" : "smooth");
      }
    }
    prevLengthRef.current = messages.length; // Update ref after checking
  }, [chatUser, currentUsername, isUserNearBottom, messages, scrollToBottom]);

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

      if (msg.from === chatUser && isUserNearBottom()) {
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
  }, [chatUser, isUserNearBottom, sortMessagesByDate, user]);

  const chatPartner = participants.find((p) => p.username === chatUser);
  const emojiButtonTitle = emojiList.length
    ? `Insert emoji (${emojiList.length} available)`
    : "Add emoji";

  const openProfile = () => {
    if (!chatUser) return;
    router.push(`/user/${encodeURIComponent(chatUser)}`);
  };

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

  const listItems = useMemo(() => {
    let lastDateLabel = "";
    const nextItems: ChatListItem[] = [];

    for (const msg of messages) {
      const label = formatDateLabel(msg.createdAt);
      if (label !== lastDateLabel) {
        nextItems.push({
          kind: "date",
          id: `${label}-${msg.createdAt}`,
          label,
        });
        lastDateLabel = label;
      }

      nextItems.push({ kind: "message", message: msg });
    }

    return nextItems;
  }, [formatDateLabel, messages]);

  useEffect(() => {
    listItemsRef.current = listItems;
    sizeMapRef.current.clear();
    listRef.current?.resetAfterIndex(0, true);
  }, [listItems]);

  useEffect(() => {
    const el = chatContentRef.current;
    if (!el) return;

    handleListScroll({
      scrollDirection: "forward",
      scrollOffset: el.scrollTop,
      scrollUpdateWasRequested: false,
    });
  }, [handleListScroll, listItems]);

  const listData = useMemo(
    () => ({
      items: listItems,
      currentUsername,
      theme,
      selectedMsgId,
      uploadStates,
      onSelect: setSelectedMsgId,
      onEdit: handleEdit,
      onDelete: handleDelete,
      formatTime: (date: Date) => formatTime.format(date),
      onSize: handleItemSize,
      resolveMessageDate,
    }),
    [
      currentUsername,
      formatTime,
      handleDelete,
      handleEdit,
      handleItemSize,
      listItems,
      resolveMessageDate,
      selectedMsgId,
      theme,
      uploadStates,
    ]
  );

  const listHeightValue = Math.max(listHeight, 320);

  const ListOuterElement = useMemo(
    () =>
      forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
        function ListOuterElement(props, ref) {
          return (
            <div
              {...props}
              ref={(node) => {
                chatContentRef.current = node;
                if (typeof ref === "function") {
                  ref(node);
                } else if (ref) {
                  (ref as MutableRefObject<HTMLDivElement | null>).current =
                    node;
                }
              }}
              id="chat-scroll-container"
              className={`chat-canvas chat-content flex-grow-1 overflow-auto ${
                theme === "night" ? "chat-canvas-night" : "chat-canvas-day"
              }`}
            />
          );
        }
      ),
    [theme]
  );

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
    <div
      ref={listWrapperRef}
      className="chat-canvas-shell position-relative d-flex flex-column flex-grow-1 overflow-hidden"
    >
      <VariableSizeList<ListRenderData>
        height={listHeightValue}
        width="100%"
        itemCount={listItems.length}
        itemSize={getItemSize}
        itemKey={(index) => {
          const item = listItems[index];
          return item.kind === "date"
            ? `date-${item.id}`
            : `message-${item.message._id}`;
        }}
        itemData={listData}
        outerElementType={ListOuterElement}
        onScroll={handleListScroll}
        ref={listRef}
      >
        {VirtualizedMessageRow}
      </VariableSizeList>
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
      className={`chat-page container-fluid d-flex flex-column p-0 ${
        theme === "night" ? "bg-dark text-white" : "bg-light"
      }`}
    >
      {headerContent}
      {messagesContent}
      {composer}
    </div>
  );

  const mobileThreadLayout = (
    <div className="chat-mobile-thread-view chat-page">
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
        <div className="chat-mobile-thread-view chat-page">
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
