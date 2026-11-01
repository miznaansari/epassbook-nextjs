'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Stale-while-revalidate fetch for the dashboard.
 *
 * - First visit (nothing saved): `isFirstLoad` is true while the request runs.
 * - Later visits (even after closing the app): the last saved payload renders
 *   immediately from localStorage, and a background request refreshes it
 *   (`isRefreshing`). On failure the saved data stays and `error` is set.
 * - When the key changes to something never fetched, the previous key's data is
 *   offered as `placeholderData` so the UI can stay visible (dimmed) instead of
 *   flashing a skeleton.
 *
 * Storage keys look like `pb:dash:v1:<userId>:<name>`; all are wiped on logout
 * via clearDashboardCache().
 */

export const DASH_CACHE_PREFIX = 'pb:dash:v1:';
const memory = new Map(); // survives client-side navigation within the session

function readStore(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function evictOldest(groupPrefix, keep) {
  try {
    const keys = Object.keys(window.localStorage).filter(k => k.startsWith(groupPrefix));
    if (keys.length <= keep) return;
    keys
      .map(k => ({ k, at: readStore(k)?.savedAt || 0 }))
      .sort((a, b) => a.at - b.at)
      .slice(0, keys.length - keep)
      .forEach(({ k }) => window.localStorage.removeItem(k));
  } catch {
    /* storage unavailable — nothing to evict */
  }
}

function writeStore(key, value, groupPrefix, keep) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded: drop this group's older entries and try once more.
    try {
      evictOldest(groupPrefix, 1);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      return;
    }
  }
  if (groupPrefix) evictOldest(groupPrefix, keep);
}

function peek(key) {
  if (!key || typeof window === 'undefined') return null;
  if (memory.has(key)) return memory.get(key);
  const snap = readStore(key);
  if (snap) memory.set(key, snap);
  return snap;
}

/** Remove every saved dashboard payload (memory + localStorage). Call on logout. */
export function clearDashboardCache() {
  memory.clear();
  try {
    Object.keys(window.localStorage)
      .filter(k => k.startsWith(DASH_CACHE_PREFIX))
      .forEach(k => window.localStorage.removeItem(k));
  } catch {
    /* storage unavailable */
  }
}

/** Per-viewer convenience values (e.g. selected cycles); never throws. */
export function readPref(key, fallback) {
  const snap = typeof window === 'undefined' ? null : readStore(key);
  return snap ?? fallback;
}

export function writePref(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

/**
 * @param {string|null} url       request URL (null = disabled)
 * @param {string|null} cacheKey  storage key for this exact request
 * @param {{ select?: (payload:any)=>any, group?: string, keep?: number, onUnauthorized?: ()=>void }} [opts]
 *   select: trim the payload before saving; group/keep: cap how many keys sharing
 *   the `group` prefix are kept in storage.
 */
export function useCachedFetch(url, cacheKey, { select, group, keep = 8, onUnauthorized } = {}) {
  const [, setVersion] = useState(0);
  const [request, setRequest] = useState({ key: null, status: 'idle', error: null });
  const lastData = useRef(null);
  const optsRef = useRef({ select, group, keep, onUnauthorized });
  optsRef.current = { select, group, keep, onUnauthorized };

  const snap = peek(cacheKey);
  const data = snap?.data ?? null;

  const run = useCallback(async () => {
    if (!url || !cacheKey) return;
    setRequest({ key: cacheKey, status: 'loading', error: null });
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.status === 401) {
        optsRef.current.onUnauthorized?.();
        return;
      }
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const payload = await res.json();
      const { select: sel, group: grp, keep: kp } = optsRef.current;
      const next = { data: sel ? sel(payload) : payload, savedAt: Date.now() };
      memory.set(cacheKey, next);
      writeStore(cacheKey, next, grp, kp);
      setVersion(v => v + 1);
      setRequest(r => (r.key === cacheKey ? { key: cacheKey, status: 'ready', error: null } : r));
    } catch (err) {
      setRequest(r => (r.key === cacheKey ? { key: cacheKey, status: 'error', error: err.message || 'Network error' } : r));
    }
  }, [url, cacheKey]);

  useEffect(() => {
    run();
  }, [run]);

  useEffect(() => {
    if (data) lastData.current = data;
  }, [data]);

  const loading = request.key === cacheKey && request.status === 'loading';
  return {
    data,
    placeholderData: data ? null : lastData.current,
    savedAt: snap?.savedAt ?? null,
    isFirstLoad: !data && !lastData.current && (loading || request.key !== cacheKey),
    isRefreshing: loading,
    error: request.key === cacheKey && request.status === 'error' ? request.error : null,
    refresh: run,
  };
}
