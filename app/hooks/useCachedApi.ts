"use client";

import {
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type CacheEntry<T> = {
  data: T | null;
  timestamp: number;
  promise: Promise<T> | null;
  error: Error | null;
};

const cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_STALE_TIME = 30_000;

function ensureEntry<T>(key: string): CacheEntry<T> {
  let entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) {
    entry = { data: null, timestamp: 0, promise: null, error: null };
    cache.set(key, entry as CacheEntry<unknown>);
  }
  return entry;
}

interface UseCachedApiOptions<T> {
  staleTime?: number;
  fallback?: T;
  transform?: (payload: unknown) => T;
}

interface UseCachedApiReturn<T> {
  data: T;
  loading: boolean;
  error: Error | null;
  setData: (value: SetStateAction<T>) => void;
  refresh: () => Promise<T>;
}

export function useCachedApi<T>(
  url: string | null,
  { staleTime = DEFAULT_STALE_TIME, fallback, transform }: UseCachedApiOptions<T> = {}
): UseCachedApiReturn<T> {
  const transformRef = useRef(transform);
  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  const fallbackRef = useRef(fallback);
  useEffect(() => {
    fallbackRef.current = fallback;
  }, [fallback]);

  const [data, setState] = useState<T>(() => {
    if (!url) {
      return (fallbackRef.current ?? (undefined as T)) as T;
    }
    const entry = cache.get(url) as CacheEntry<T> | undefined;
    if (entry?.data != null) {
      return entry.data;
    }
    return (fallbackRef.current ?? (undefined as T)) as T;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (!url) return false;
    const entry = cache.get(url) as CacheEntry<T> | undefined;
    return !entry || entry.data == null;
  });

  const [error, setError] = useState<Error | null>(() => {
    if (!url) return null;
    const entry = cache.get(url) as CacheEntry<T> | undefined;
    return entry?.error ?? null;
  });

  const setData = useCallback(
    (value: SetStateAction<T>) => {
      if (!url) {
        setState((prev) =>
          typeof value === "function" ? (value as (prev: T) => T)(prev) : value
        );
        return;
      }
      setState((prev) => {
        const next =
          typeof value === "function"
            ? (value as (prev: T) => T)(prev)
            : value;
        const entry = ensureEntry<T>(url);
        entry.data = next;
        entry.timestamp = Date.now();
        entry.error = null;
        return next;
      });
    },
    [url]
  );

  const performFetch = useCallback(async () => {
    if (!url) {
      return (fallbackRef.current ?? (undefined as T)) as T;
    }
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Request failed with status ${res.status}`);
    }
    const payload = await res.json();
    return (
      transformRef.current ? transformRef.current(payload) : (payload as T)
    ) as T;
  }, [url]);

  const refresh = useCallback(async () => {
    const result = await performFetch();
    if (!url) {
      setState(result);
      setError(null);
      setLoading(false);
      return result;
    }
    const entry = ensureEntry<T>(url);
    entry.data = result;
    entry.timestamp = Date.now();
    entry.error = null;
    entry.promise = null;
    setState(result);
    setError(null);
    setLoading(false);
    return result;
  }, [performFetch, url]);

  useEffect(() => {
    if (!url) return;
    let isMounted = true;
    const entry = ensureEntry<T>(url);
    const now = Date.now();
    const isStale = !entry.data || now - entry.timestamp > staleTime;

    if (!isStale) {
      setState(entry.data as T);
      setError(entry.error);
      setLoading(false);
      return;
    }

    setLoading(true);
    const promise =
      entry.promise ??
      performFetch().then((result) => {
        entry.data = result;
        entry.timestamp = Date.now();
        entry.error = null;
        return result;
      });

    entry.promise = promise;

    promise
      .then((result) => {
        if (!isMounted) return;
        setState(result);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        const errorObj =
          err instanceof Error ? err : new Error("Failed to load data");
        entry.error = errorObj;
        setError(errorObj);
        setLoading(false);
      })
      .finally(() => {
        entry.promise = null;
      });

    return () => {
      isMounted = false;
    };
  }, [performFetch, staleTime, url]);

  return {
    data,
    loading,
    error,
    setData,
    refresh,
  };
}
