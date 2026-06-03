// In-memory bbox query cache so panning back to a previously-fetched area
// doesn't re-hit the upstream APIs.
//
// Keys are built from a *quantized* bbox (rounded to a 0.05° grid, roughly
// 5 km) + the sorted category list. Two pans within the same grid cell with
// the same category set will share a cache entry.

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ENTRIES = 200;
const GRID = 0.05;

const store = new Map(); // key -> { ts, data }

function quantize(n) {
  return Math.round(n / GRID) * GRID;
}

export function buildCacheKey(prefix, bbox, categoryIds) {
  const cats = [...categoryIds].sort().join(',');
  const q = [bbox.north, bbox.south, bbox.east, bbox.west].map(quantize).join(',');
  return `${prefix}|${q}|${cats}`;
}

export function cacheGet(key, ttl = DEFAULT_TTL_MS) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > ttl) {
    store.delete(key);
    return null;
  }
  // refresh recency
  store.delete(key);
  store.set(key, entry);
  return entry.data;
}

export function cacheSet(key, data) {
  store.set(key, { ts: Date.now(), data });
  if (store.size > MAX_ENTRIES) {
    // delete the oldest (Maps preserve insertion order)
    const first = store.keys().next().value;
    if (first !== undefined) store.delete(first);
  }
}

export function cacheClear() {
  store.clear();
}
