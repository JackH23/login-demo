import { resolveImageUrl } from "./api";

type BasicUser = {
  username: string;
  image?: string | null;
  friends?: string[];
  online?: boolean;
  isAdmin?: boolean;
};

export function normalizeUserImage<T extends BasicUser>(user: T): T {
  const normalizedImage = resolveImageUrl(user.image ?? null) ?? undefined;
  return { ...user, image: normalizedImage };
}

type DirectoryPayload<T extends BasicUser> = {
  viewer?: T | null;
  friends?: T[] | null;
  total?: number | null;
  nextCursor?: string | null;
};

export function normalizeUsersResponse<T extends BasicUser>(
  payload: unknown
): T[] {
  const users = (payload as { users?: T[] | null })?.users ?? [];
  return users.map((user) => normalizeUserImage(user));
}

export function normalizeUserResponse<T extends BasicUser>(
  payload: unknown
): T | null {
  const user = (payload as { user?: T | null })?.user ?? null;
  return user ? normalizeUserImage(user) : null;
}

export function normalizeDirectoryResponse<T extends BasicUser>(
  payload: unknown
): {
  viewer: T | null;
  friends: T[];
  total: number;
  nextCursor: string | null;
} {
  const { viewer, friends, total, nextCursor } =
    (payload as DirectoryPayload<T>) ?? {};

  const normalizedFriends = (friends ?? []).map((user) =>
    normalizeUserImage(user)
  );
  const normalizedViewer = viewer ? normalizeUserImage(viewer) : null;

  return {
    viewer: normalizedViewer,
    friends: normalizedFriends,
    total:
      typeof total === "number" && Number.isFinite(total)
        ? total
        : normalizedFriends.length,
    nextCursor: typeof nextCursor === "string" ? nextCursor : null,
  };
}
