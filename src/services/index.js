import { fetchLiquorLicenses } from './liquorLicenses.js';
import { fetchOverpassFeatures } from './overpass.js';
import { buildCacheKey, cacheGet, cacheSet } from './cache.js';

const LIQUOR_IDS = new Set(['liquor_onprem', 'liquor_offprem']);

export function liquorCatsEnabled(enabledIds) {
  return enabledIds.some((id) => LIQUOR_IDS.has(id));
}
export function osmCatsEnabled(enabledIds) {
  return enabledIds.some((id) => !LIQUOR_IDS.has(id));
}

// Fetches NY liquor licenses for the bbox (Socrata — fast and reliable).
export async function fetchLiquorCached(bbox, enabledIds, { signal } = {}) {
  const cats = enabledIds.filter((id) => LIQUOR_IDS.has(id));
  if (cats.length === 0) return [];
  const key = buildCacheKey('liq', bbox, cats);
  const hit = cacheGet(key);
  if (hit) return hit;
  const rows = await fetchLiquorLicenses(bbox, { signal });
  const filtered = rows.filter((r) => cats.includes(r.categoryId));
  cacheSet(key, filtered);
  return filtered;
}

// Fetches OSM features for the bbox (Overpass — slower, sometimes down).
export async function fetchOsmCached(bbox, enabledIds, { signal } = {}) {
  const cats = enabledIds.filter((id) => !LIQUOR_IDS.has(id));
  if (cats.length === 0) return [];
  const key = buildCacheKey('osm', bbox, cats);
  const hit = cacheGet(key);
  if (hit) return hit;
  const rows = await fetchOverpassFeatures(bbox, cats, { signal });
  cacheSet(key, rows);
  return rows;
}
