interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  storedAt: string;
}

export class TtlCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private readonly maxEntries: number;

  constructor(maxEntries = 400) {
    this.maxEntries = maxEntries;
  }

  get(key: string): { value: T; storedAt: string } | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return {
      value: entry.value,
      storedAt: entry.storedAt,
    };
  }

  set(key: string, value: T, ttlMs: number): string {
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) {
        this.store.delete(oldestKey);
      }
    }

    const storedAt = new Date().toISOString();
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      storedAt,
    });
    return storedAt;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}
