class MemoryStorage implements Storage {
  private store: Record<string, string> = {};

  get length(): number {
    return Object.keys(this.store).length;
  }

  clear(): void {
    this.store = {};
  }

  getItem(key: string): string | null {
    return this.store[key] !== undefined ? this.store[key] : null;
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return keys[index] !== undefined ? keys[index] : null;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }
}

function createSafeStorage(type: "localStorage" | "sessionStorage"): Storage {
  try {
    // Attempt to access and test the real window storage
    if (typeof window !== "undefined") {
      const storage = window[type];
      const testKey = "__safe_storage_test_key__";
      storage.setItem(testKey, testKey);
      storage.removeItem(testKey);
      return storage;
    }
  } catch (e) {
    // In-memory storage fallback
  }
  return new MemoryStorage();
}

export const safeLocalStorage = createSafeStorage("localStorage");
export const safeSessionStorage = createSafeStorage("sessionStorage");
