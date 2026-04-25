/**
 * localStorage utility with TTL (Time To Live) support
 * Automatically expires cache after specified duration
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // milliseconds
}

/**
 * Store data in localStorage with TTL
 * @param key - Storage key
 * @param data - Data to store
 * @param ttlDays - TTL in days (default: 30 days)
 */
export const setLocalStorageWithTTL = <T>(
  key: string,
  data: T,
  ttlDays: number = 30
): void => {
  const ttlMs = ttlDays * 24 * 60 * 60 * 1000;
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
  };
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (e) {
    console.warn("Failed to write to localStorage:", e);
  }
};

/**
 * Get data from localStorage if not expired
 * @param key - Storage key
 * @returns Data if exists and not expired, null otherwise
 */
export const getLocalStorageWithTTL = <T>(key: string): T | null => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;

    const entry: CacheEntry<T> = JSON.parse(item);
    const elapsed = Date.now() - entry.timestamp;

    // Check if expired
    if (elapsed > entry.ttl) {
      localStorage.removeItem(key);
      return null;
    }

    return entry.data;
  } catch (e) {
    console.warn("Failed to read from localStorage:", e);
    return null;
  }
};

/**
 * Remove data from localStorage
 */
export const removeLocalStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn("Failed to remove from localStorage:", e);
  }
};

/**
 * Generate cache key for tenant features
 */
export const getFeaturesStorageKey = (tenantId: string): string => {
  return `tenant-features:${tenantId}`;
};
