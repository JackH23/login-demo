import { resolveImageUrl } from "./api";

type BasicUser = {
  username: string;
  image?: string | null;
  friends?: string[];
  online?: boolean;
};

export function normalizeUserImage<T extends BasicUser>(user: T): T {
  const normalizedImage = resolveImageUrl(user.image ?? null) ?? undefined;
  return { ...user, image: normalizedImage };
}

export function normalizeUsersResponse<T extends BasicUser>(payload: unknown): T[] {
  const users = (payload as { users?: T[] | null })?.users ?? [];
  return users.map((user) => normalizeUserImage(user));
}

export function normalizeUserResponse<T extends BasicUser>(payload: unknown): T | null {
  const user = (payload as { user?: T | null })?.user ?? null;
  return user ? normalizeUserImage(user) : null;
}
