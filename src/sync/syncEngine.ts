import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { todayKey } from '../lib/date';
import { getApiKey } from '../lib/secureKey';
import { supabase } from '../lib/supabase';
import { createEmptyState, setCacheWritesEnabled, useGlowStore, userCacheKey, type PersistedState } from '../store/useGlowStore';
import { rowKey, rowsToState, stableStringify, tableSpecs, type Row } from './tables';

export type SyncStatus = 'idle' | 'loading' | 'syncing' | 'synced' | 'offline' | 'error';

interface SyncState {
  status: SyncStatus;
  lastSyncedAt: number | null;
  error: string | null;
  pending: number;
}

export const useSyncStore = create<SyncState>(() => ({ status: 'idle', lastSyncedAt: null, error: null, pending: 0 }));

type Snapshot = Record<string, Record<string, string>>;

const snapshotKey = (userId: string) => `glowup-daily:synced:${userId}`;
const PAGE = 1000;
const CHUNK = 500;
const PUSH_DEBOUNCE_MS = 500;
const RETRY_MS = [3000, 10000, 30000, 60000];

let session: {
  userId: string;
  snapshot: Snapshot;
  unsubscribe: () => void;
  appStateSub: { remove: () => void } | null;
  timer: ReturnType<typeof setTimeout> | null;
  inFlight: Promise<boolean> | null;
  again: boolean;
  retries: number;
} | null = null;

function dataOf(): PersistedState {
  const s = useGlowStore.getState();
  const empty = createEmptyState();
  const out = {} as Record<string, unknown>;
  for (const k of Object.keys(empty)) out[k] = (s as unknown as Record<string, unknown>)[k];
  return out as unknown as PersistedState;
}

function snapshotOf(state: PersistedState): Snapshot {
  const snap: Snapshot = {};
  for (const spec of tableSpecs) {
    const map: Record<string, string> = {};
    for (const row of spec.extract(state)) map[rowKey(spec, row)] = stableStringify(row);
    snap[spec.table] = map;
  }
  return snap;
}

function countPending(state: PersistedState, snap: Snapshot): number {
  const now = snapshotOf(state);
  let n = 0;
  for (const spec of tableSpecs) {
    const a = now[spec.table];
    const b = snap[spec.table] ?? {};
    for (const k of Object.keys(a)) if (a[k] !== b[k]) n++;
    for (const k of Object.keys(b)) if (!(k in a)) n++;
  }
  return n;
}

const errText = (e: unknown) => (e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : String(e));
const isNetworkError = (e: unknown) => /fetch|network|Failed to fetch|NetworkError|timed out|ECONN|offline/i.test(errText(e));

/** Pushes every row that differs from the last server-confirmed snapshot. Returns true when fully synced. */
async function pushDiff(): Promise<boolean> {
  if (!session || !supabase) return false;
  const s = session;
  const state = dataOf();
  const userId = s.userId;
  const current = snapshotOf(state);
  useSyncStore.setState({ status: 'syncing' });
  try {
    for (const spec of tableSpecs) {
      const prev = s.snapshot[spec.table] ?? {};
      const rows = spec.extract(state).filter((r) => prev[rowKey(spec, r)] !== current[spec.table][rowKey(spec, r)]);
      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK).map((r) => ({ ...r, user_id: userId }));
        const { error } = await supabase.from(spec.table).upsert(chunk, { onConflict: spec.key ? `user_id,${spec.key}` : 'user_id' });
        if (error) throw error;
        for (const r of chunk) prev[rowKey(spec, r)] = current[spec.table][rowKey(spec, r)];
      }
      s.snapshot[spec.table] = prev;
    }
    for (const spec of [...tableSpecs].reverse()) {
      if (!spec.key) continue;
      const prev = s.snapshot[spec.table] ?? {};
      const gone = Object.keys(prev).filter((k) => !(k in current[spec.table]));
      for (let i = 0; i < gone.length; i += CHUNK) {
        const ids = gone.slice(i, i + CHUNK);
        const { error } = await supabase.from(spec.table).delete().in(spec.key, ids);
        if (error) throw error;
        for (const k of ids) delete prev[k];
      }
    }
    if (session !== s) return false;
    await AsyncStorage.setItem(snapshotKey(userId), JSON.stringify(s.snapshot));
    s.retries = 0;
    const pending = countPending(dataOf(), s.snapshot);
    useSyncStore.setState({ status: pending ? 'syncing' : 'synced', lastSyncedAt: Date.now(), error: null, pending });
    return pending === 0;
  } catch (e) {
    if (session === s) await AsyncStorage.setItem(snapshotKey(userId), JSON.stringify(s.snapshot));
    useSyncStore.setState({ status: isNetworkError(e) ? 'offline' : 'error', error: errText(e), pending: countPending(dataOf(), s.snapshot) });
    scheduleRetry();
    return false;
  }
}

function scheduleRetry() {
  if (!session) return;
  const delay = RETRY_MS[Math.min(session.retries, RETRY_MS.length - 1)];
  session.retries++;
  if (session.timer) clearTimeout(session.timer);
  session.timer = setTimeout(() => void flush(), delay);
}

export async function flush(): Promise<boolean> {
  if (!session) return false;
  const s = session;
  if (s.inFlight) {
    s.again = true;
    return s.inFlight;
  }
  s.inFlight = (async () => {
    let ok = await pushDiff();
    while (session === s && s.again) {
      s.again = false;
      ok = await pushDiff();
    }
    return ok;
  })();
  try {
    return await s.inFlight;
  } finally {
    s.inFlight = null;
  }
}

function schedulePush() {
  if (!session) return;
  if (session.timer) clearTimeout(session.timer);
  useSyncStore.setState({ pending: countPending(dataOf(), session.snapshot) });
  session.timer = setTimeout(() => void flush(), PUSH_DEBOUNCE_MS);
}

async function pullAll(): Promise<Record<string, Row[]>> {
  if (!supabase) throw new Error('Supabase is not configured');
  const out: Record<string, Row[]> = {};
  for (const spec of tableSpecs) {
    const rows: Row[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from(spec.table)
        .select('*')
        .order(spec.key ?? 'user_id')
        .range(from, from + PAGE - 1);
      if (error) throw error;
      rows.push(...(data as Row[]));
      if (!data || data.length < PAGE) break;
    }
    out[spec.table] = rows;
  }
  return out;
}

/**
 * Starts a signed-in session: loads the device cache, pushes anything left unsynced from last time,
 * then pulls the server copy (the source of truth) and keeps pushing changes as they happen.
 */
export async function startUserSession(userId: string, fallbackName: string): Promise<void> {
  await stopUserSession({ keepCache: true });
  useSyncStore.setState({ status: 'loading', error: null, pending: 0 });
  await AsyncStorage.removeItem('glowup-daily-v1');

  setCacheWritesEnabled(false);
  useGlowStore.getState().replaceUserData(createEmptyState());
  useGlowStore.persist.setOptions({ name: userCacheKey(userId) });
  const cached = await AsyncStorage.getItem(userCacheKey(userId));
  if (cached) await useGlowStore.persist.rehydrate();
  const hasKey = !!(await getApiKey());
  useGlowStore.setState((st) => ({ aiSettings: { ...st.aiSettings, hasKey } }));
  setCacheWritesEnabled(true);

  const rawSnap = await AsyncStorage.getItem(snapshotKey(userId));
  session = {
    userId,
    snapshot: rawSnap ? (JSON.parse(rawSnap) as Snapshot) : {},
    unsubscribe: () => {},
    appStateSub: null,
    timer: null,
    inFlight: null,
    again: false,
    retries: 0,
  };

  if (cached && rawSnap) await flush();

  try {
    const rows = await pullAll();
    const next = rowsToState(rows, dataOf(), todayKey());
    if (!next.userName && fallbackName) next.userName = fallbackName;
    useGlowStore.getState().replaceUserData(next);
    session.snapshot = snapshotOf(rowsToState(rows, next, todayKey()));
    await AsyncStorage.setItem(snapshotKey(userId), JSON.stringify(session.snapshot));
    useSyncStore.setState({ status: 'synced', lastSyncedAt: Date.now(), error: null, pending: countPending(next, session.snapshot) });
  } catch (e) {
    if (!cached) {
      const message = errText(e);
      await stopUserSession({ keepCache: true });
      useSyncStore.setState({ status: 'error', error: message });
      throw new Error(isNetworkError(e) ? 'Can’t reach GlowUp’s server. Check your connection and try again.' : message);
    }
    useSyncStore.setState({ status: isNetworkError(e) ? 'offline' : 'error', error: errText(e) });
    scheduleRetry();
  }

  const active = session;
  active.unsubscribe = useGlowStore.subscribe((state, prev) => {
    if (session !== active) return;
    const changed = Object.keys(createEmptyState()).some((k) => (state as unknown as Record<string, unknown>)[k] !== (prev as unknown as Record<string, unknown>)[k]);
    if (changed) schedulePush();
  });
  active.appStateSub = AppState.addEventListener('change', (st) => {
    if (st === 'active' && session === active) void flush();
  });
  schedulePush();
  useGlowStore.setState({ hydrated: true });
}

/** Ends the session. Pending changes get one last push; the device cache is wiped only when fully synced. */
export async function stopUserSession({ keepCache = false }: { keepCache?: boolean } = {}): Promise<void> {
  const s = session;
  if (!s) return;
  if (s.timer) clearTimeout(s.timer);
  const synced = await Promise.race([flush(), new Promise<boolean>((r) => setTimeout(() => r(false), 4000))]);
  s.unsubscribe();
  s.appStateSub?.remove();
  session = null;
  setCacheWritesEnabled(false);
  if (!keepCache && synced) {
    await AsyncStorage.multiRemove([userCacheKey(s.userId), snapshotKey(s.userId)]);
  }
  useGlowStore.persist.setOptions({ name: 'glowup-daily:signed-out' });
  useGlowStore.getState().replaceUserData(createEmptyState());
  useGlowStore.setState({ hydrated: false });
  useSyncStore.setState({ status: 'idle', pending: 0, error: null });
}

export const currentSyncUserId = () => session?.userId ?? null;
