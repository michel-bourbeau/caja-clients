/**
 * Simple in-memory API response cache with request deduplication
 * - Stores API responses with timestamp to track when they were cached
 * - Deduplicates in-flight requests to prevent duplicate API calls
 * - Cache is cleared on page reload (no persistent storage)
 */

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

const cache = new Map<string, CacheEntry<any>>();
const inFlightRequests = new Map<string, Promise<any>>();

/**
 * Create a unique cache key for an API endpoint
 */
export const createCacheKey = (endpoint: string, tenantId: string): string => {
  return `${endpoint}:${tenantId}`;
};

/**
 * Get cached data if it exists
 */
export const getCachedData = <T>(key: string): T | null => {
  const entry = cache.get(key);
  return entry ? entry.data : null;
};

/**
 * Store data in cache
 */
export const setCachedData = <T>(key: string, data: T): void => {
  cache.set(key, { data, timestamp: Date.now() });
};

/**
 * Get in-flight request promise to deduplicate simultaneous requests
 */
export const getInFlightRequest = <T>(key: string): Promise<T> | null => {
  return inFlightRequests.get(key) ?? null;
};

/**
 * Store an in-flight request promise
 */
export const setInFlightRequest = <T>(key: string, promise: Promise<T>): void => {
  inFlightRequests.set(key, promise);
  // Clean up after promise settles
  promise.finally(() => {
    inFlightRequests.delete(key);
  });
};

/**
 * Clear a specific cache entry
 */
export const invalidateCache = (key: string): void => {
  cache.delete(key);
};

/**
 * Clear all cached data
 */
export const clearAllCache = (): void => {
  cache.clear();
  inFlightRequests.clear();
};

/**
 * Get cache statistics (for debugging)
 */
export const getCacheStats = () => {
  return {
    size: cache.size,
    inFlightCount: inFlightRequests.size,
    keys: Array.from(cache.keys()),
    timestamps: Array.from(cache.entries()).map(([key, entry]) => ({
      key,
      cachedAt: new Date(entry.timestamp).toISOString(),
    })),
  };
};
