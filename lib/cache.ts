type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

class InMemoryCache<T> {
  private store = new Map<string, CacheEntry<T>>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: this.now() + ttlMs });
  }

  clear(key?: string): void {
    if (typeof key === 'string') {
      this.store.delete(key);
    } else {
      this.store.clear();
    }
  }
}

export const sentimentCache = new InMemoryCache<unknown>();
