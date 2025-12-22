"use client";

import {
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { resolveApiUrl } from "@/app/lib/api";

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

interface PrefetchOptions<T> {
  staleTime?: number;
  transform?: (payload: unknown) => T;
  fallback?: T;
}

export function prefetchCachedApi<T>(
  url: string,
  {
    staleTime = DEFAULT_STALE_TIME,
    transform,
    fallback,
  }: PrefetchOptions<T> = {}
): Promise<T> {
  const entry = ensureEntry<T>(url);
  const now = Date.now();
  if (entry.data != null && now - entry.timestamp < staleTime) {
    return Promise.resolve(entry.data as T);
  }

  if (entry.promise) {
    return entry.promise;
  }

  const request = fetch(resolveApiUrl(url), { cache: "no-store" })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      return res.json();
    })
    .then((payload) => (transform ? transform(payload) : (payload as T)) as T);

  const wrapped = request
    .then((result) => {
      entry.data = result;
      entry.timestamp = Date.now();
      entry.error = null;
      return result;
    })
    .catch((err) => {
      const errorObj =
        err instanceof Error ? err : new Error("Failed to prefetch data");
      entry.error = errorObj;

      if (fallback !== undefined) {
        console.warn(
          `Prefetch for ${url} failed; using fallback value.`,
          errorObj
        );
        entry.data = fallback;
        entry.timestamp = Date.now();
        return fallback;
      }

      throw errorObj;
    })
    .finally(() => {
      entry.promise = null;
    });

  entry.promise = wrapped;
  return wrapped;
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
  {
    staleTime = DEFAULT_STALE_TIME,
    fallback,
    transform,
  }: UseCachedApiOptions<T> = {}
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
          typeof value === "function" ? (value as (prev: T) => T)(prev) : value;
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
    const res = await fetch(resolveApiUrl(url), { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Request failed with status ${res.status}`);
    }
    const payload = await res.json();
    return (
      transformRef.current ? transformRef.current(payload) : (payload as T)
    ) as T;
  }, [url]);

  const refresh = useCallback(async () => {
    try {
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
    } catch (err) {
      const errorObj =
        err instanceof Error ? err : new Error("Failed to refresh data");
      const fallbackValue = (fallbackRef.current ?? (undefined as T)) as T;

      if (!url) {
        setError(errorObj);
        setLoading(false);
        setState((prev) => (prev == null ? fallbackValue : prev));
        return fallbackValue;
      }

      const entry = ensureEntry<T>(url);
      entry.error = errorObj;
      entry.promise = null;

      setError(errorObj);
      setLoading(false);
      setState((prev) => prev ?? entry.data ?? fallbackValue);

      return entry.data ?? fallbackValue;
    }
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

    const hasCachedData = entry.data != null;
    if (hasCachedData) {
      setState(entry.data as T);
      setError(entry.error);
    }
    setLoading(!hasCachedData);
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

        if (entry.data == null && fallbackRef.current !== undefined) {
          entry.data = fallbackRef.current as T;
          entry.timestamp = Date.now();
          setState(fallbackRef.current as T);
        }

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
