type Entry<T> = { data: T; expiresAt: number };

const store = new Map<string, Entry<unknown>>();

export const cache = {
  get<T>(key: string): T | null {
    const entry = store.get(key) as Entry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return null;
    }
    return entry.data;
  },

  set<T>(key: string, data: T, ttlMs: number): void {
    store.set(key, { data, expiresAt: Date.now() + ttlMs });
  },

  del(key: string): void {
    store.delete(key);
  },

  delPrefix(prefix: string): void {
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) store.delete(key);
    }
  },
};
