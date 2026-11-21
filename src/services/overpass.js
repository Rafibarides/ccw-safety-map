// Overpass API (OSM) queries for every non-liquor sensitive category.
// Single bbox round-trip returns all enabled categories at once.
//
// Public Overpass mirrors are frequently rate-limited or briefly down, so the
// client is built to tolerate that: each endpoint gets a short timeout, a
// failing endpoint is put in a cooldown so we stop hammering it, and the last
// endpoint that succeeded is tried first on the next request.

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
];

const ENDPOINT_TIMEOUT_MS = 12000;
const COOLDOWN_MS = 60_000;

// endpoint -> timestamp until which it is considered unhealthy
const cooldownUntil = new Map();
let preferredEndpoint = null;

function isHealthy(endpoint) {
  const until = cooldownUntil.get(endpoint);
  return !until || Date.now() > until;
}

function orderedEndpoints() {
  // Only healthy endpoints. If every mirror is cooling down we return an empty
  // list so the request fails fast instead of hanging on dead servers; the
  // cooldown expires on its own and the next attempt will probe again.
  const healthy = OVERPASS_ENDPOINTS.filter(isHealthy);
  if (preferredEndpoint && healthy.includes(preferredEndpoint)) {
    return [preferredEndpoint, ...healthy.filter((e) => e !== preferredEndpoint)];
  }
  return healthy;
}

// Map of categoryId -> array of Overpass tag filters.
// Each filter is a string snippet appended inside (node|way|relation)["..."].
const TAG_FILTERS = {
  school: [
    'nwr["amenity"="school"]',
  ],
  university: [
    'nwr["amenity"="university"]',
    'nwr["amenity"="college"]',
  ],
  daycare: [
    'nwr["amenity"="kindergarten"]',
    'nwr["amenity"="childcare"]',
  ],
  park: [
    'nwr["leisure"="park"]',
    'nwr["leisure"="playground"]',
    'nwr["tourism"="zoo"]',
  ],
  library: ['nwr["amenity"="library"]'],
  government: [
    'nwr["office"="government"]',
    'nwr["amenity"="townhall"]',
    'nwr["building"="government"]',
  ],
  courthouse: [
    'nwr["amenity"="courthouse"]',
  ],
  post_office: [
    'nwr["amenity"="post_office"]',
  ],
  hospital: [
    'nwr["amenity"="hospital"]',
    'nwr["amenity"="clinic"]',
    'nwr["healthcare"="hospital"]',
  ],
  place_of_worship: [
    'nwr["amenity"="place_of_worship"]',
  ],
  transit: [
    'nwr["railway"="station"]',
    'nwr["public_transport"="station"]',
    'nwr["amenity"="bus_station"]',
    'nwr["railway"="subway_entrance"]',
  ],
  airport: [
    'nwr["aeroway"="aerodrome"]',
    'nwr["aeroway"="terminal"]',
  ],
  polling: [
    'nwr["amenity"="polling_station"]',
  ],
};

function buildQuery(bbox, categoryIds) {
  const bb = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  const clauses = [];
  for (const id of categoryIds) {
    const filters = TAG_FILTERS[id];
    if (!filters) continue;
    for (const f of filters) {
      clauses.push(`${f}(${bb});`);
    }
  }
  if (clauses.length === 0) return null;
  return `[out:json][timeout:25];(${clauses.join('')});out tags geom;`;
}

function categoryFor(tags) {
  if (!tags) return null;
  if (tags.amenity === 'school') return 'school';
  if (tags.amenity === 'university' || tags.amenity === 'college') return 'university';
  if (tags.amenity === 'kindergarten' || tags.amenity === 'childcare') return 'daycare';
  if (tags.leisure === 'park' || tags.leisure === 'playground' || tags.tourism === 'zoo') {
    return 'park';
  }
  if (tags.amenity === 'library') return 'library';
  if (tags.amenity === 'courthouse') return 'courthouse';
  if (
    tags.office === 'government' ||
    tags.amenity === 'townhall' ||
    tags.building === 'government'
  )
    return 'government';
  if (tags.amenity === 'post_office') return 'post_office';
  if (
    tags.amenity === 'hospital' ||
    tags.amenity === 'clinic' ||
    tags.healthcare === 'hospital'
  )
    return 'hospital';
  if (tags.amenity === 'place_of_worship') return 'place_of_worship';
  if (
    tags.railway === 'station' ||
    tags.public_transport === 'station' ||
    tags.amenity === 'bus_station' ||
    tags.railway === 'subway_entrance'
  )
    return 'transit';
  if (tags.aeroway === 'aerodrome' || tags.aeroway === 'terminal') return 'airport';
  if (tags.amenity === 'polling_station') return 'polling';
  return null;
}

function buildAddress(tags) {
  if (!tags) return '';
  const parts = [
    [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' '),
    tags['addr:city'],
    tags['addr:state'],
    tags['addr:postcode'],
  ].filter(Boolean);
  return parts.join(', ');
}

const CLOSE_M = 1e-6;
const MAX_RING_POINTS = 700;

function closeEnough(a, b) {
  return Math.abs(a.lat - b.lat) < CLOSE_M && Math.abs(a.lng - b.lng) < CLOSE_M;
}

function asPoints(geometry) {
  if (!geometry) return [];
  return geometry
    .filter((p) => p && p.lat != null && p.lon != null)
    .map((p) => ({ lat: p.lat, lng: p.lon }));
}

function simplifyRing(ring) {
  if (ring.length <= MAX_RING_POINTS) return ring;
  const closed = closeEnough(ring[0], ring[ring.length - 1]);
  const body = closed ? ring.slice(0, -1) : ring.slice();
  const step = Math.ceil(body.length / (MAX_RING_POINTS - 2));
  const out = [];
  for (let i = 0; i < body.length; i += step) out.push(body[i]);
  if (closed) out.push(out[0]);
  return out;
}

function signedArea(ring) {
  let area = 0;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    area += ring[j].lng * ring[i].lat - ring[i].lng * ring[j].lat;
  }
  return area / 2;
}

function ensureWinding(ring, ccw) {
  const positive = signedArea(ring) > 0;
  if (positive === ccw) return ring;
  return [...ring].reverse();
}

function ringCentroid(ring) {
  let lat = 0;
  let lng = 0;
  let n = 0;
  const last = ring.length - 1;
  const end = ring.length > 1 && closeEnough(ring[0], ring[last]) ? last : ring.length;
  for (let i = 0; i < end; i++) {
    lat += ring[i].lat;
    lng += ring[i].lng;
    n += 1;
  }
  if (!n) return null;
  return { lat: lat / n, lng: lng / n };
}

function pointInRing(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const yi = ring[i].lat;
    const yj = ring[j].lat;
    if ((yi > point.lat) === (yj > point.lat)) continue;
    const xAt = ((ring[j].lng - ring[i].lng) * (point.lat - yi)) / (yj - yi) + ring[i].lng;
    if (point.lng < xAt) inside = !inside;
  }
  return inside;
}

// Join way fragments that share endpoints into closed rings.
function stitchRings(segments) {
  const pool = segments.map((segment) => segment.slice()).filter((segment) => segment.length >= 2);
  const rings = [];
  while (pool.length) {
    const ring = pool.pop();
    let guard = 0;
    while (guard++ < 1000) {
      if (ring.length >= 4 && closeEnough(ring[0], ring[ring.length - 1])) break;
      const end = ring[ring.length - 1];
      const start = ring[0];
      const idx = pool.findIndex((segment) => {
        const a = segment[0];
        const b = segment[segment.length - 1];
        return closeEnough(end, a) || closeEnough(end, b) || closeEnough(start, a) || closeEnough(start, b);
      });
      if (idx < 0) break;
      const next = pool.splice(idx, 1)[0];
      if (closeEnough(end, next[0])) {
        ring.push(...next.slice(1));
      } else if (closeEnough(end, next[next.length - 1])) {
        next.reverse();
        ring.push(...next.slice(1));
      } else if (closeEnough(start, next[next.length - 1])) {
        ring.unshift(...next.slice(0, -1));
      } else {
        next.reverse();
        ring.unshift(...next.slice(0, -1));
      }
    }
    if (ring.length >= 4 && closeEnough(ring[0], ring[ring.length - 1])) {
      rings.push(simplifyRing(ring));
    }
  }
  return rings;
}

function polygonsFromElement(el) {
  if (el.type === 'way' && el.geometry?.length) {
    const ring = asPoints(el.geometry);
    if (ring.length >= 4 && closeEnough(ring[0], ring[ring.length - 1])) {
      return [{ outer: ensureWinding(simplifyRing(ring), true), holes: [] }];
    }
    return [];
  }
  if (el.type !== 'relation' || !el.members?.length) return [];

  const outers = [];
  const inners = [];
  for (const member of el.members) {
    const pts = asPoints(member.geometry);
    if (pts.length < 2) continue;
    if (member.role === 'inner') inners.push(pts);
    else outers.push(pts);
  }
  const outerRings = stitchRings(outers).map((ring) => ensureWinding(ring, true));
  const innerRings = stitchRings(inners).map((ring) => ensureWinding(ring, false));
  return outerRings.map((outer) => {
    const center = ringCentroid(outer);
    const holes = center
      ? innerRings.filter((hole) => {
          const c = ringCentroid(hole);
          return c && pointInRing(c, outer);
        })
      : [];
    return { outer, holes };
  });
}

function elementLatLng(el, polygons) {
  if (el.lat != null && el.lon != null) return { lat: el.lat, lng: el.lon };
  if (el.center?.lat != null && el.center?.lon != null) {
    return { lat: el.center.lat, lng: el.center.lon };
  }
  if (polygons?.length) {
    const center = ringCentroid(polygons[0].outer);
    if (center) return center;
  }
  return null;
}

async function tryEndpoint(url, body, signal) {
  // Combine the caller's abort signal with a per-endpoint timeout so a slow
  // mirror can't stall the whole failover chain.
  const timeoutCtrl = new AbortController();
  const timer = setTimeout(() => timeoutCtrl.abort(), ENDPOINT_TIMEOUT_MS);
  const onAbort = () => timeoutCtrl.abort();
  if (signal) {
    if (signal.aborted) timeoutCtrl.abort();
    else signal.addEventListener('abort', onAbort, { once: true });
  }
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(body)}`,
      signal: timeoutCtrl.signal,
    });
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}

export async function fetchOverpassFeatures(bbox, categoryIds, { signal } = {}) {
  const query = buildQuery(bbox, categoryIds);
  if (!query) return [];

  let lastErr = null;
  for (const endpoint of orderedEndpoints()) {
    // Respect a real user-initiated abort (new pan) immediately.
    if (signal?.aborted) {
      const e = new Error('aborted');
      e.name = 'AbortError';
      throw e;
    }
    try {
      const res = await tryEndpoint(endpoint, query, signal);
      if (!res.ok) {
        cooldownUntil.set(endpoint, Date.now() + COOLDOWN_MS);
        lastErr = new Error(`Overpass ${res.status}`);
        continue;
      }
      const data = await res.json();
      preferredEndpoint = endpoint;
      cooldownUntil.delete(endpoint);
      return (data.elements || [])
        .map((el) => {
          const categoryId = categoryFor(el.tags);
          if (!categoryId) return null;
          if (!categoryIds.includes(categoryId)) return null;
          const polygons = polygonsFromElement(el);
          let coords = elementLatLng(el, polygons);
          if (!coords && el.geometry?.length) coords = ringCentroid(asPoints(el.geometry));
          if (!coords && el.members?.length) {
            const pts = [];
            for (const member of el.members) pts.push(...asPoints(member.geometry));
            coords = ringCentroid(pts);
          }
          if (!coords) return null;
          const tags = el.tags || {};
          return {
            id: `osm:${el.type}/${el.id}`,
            source: 'OpenStreetMap',
            categoryId,
            name: tags.name || tags['name:en'] || tags.operator || 'Unnamed',
            subtitle:
              tags.amenity ||
              tags.leisure ||
              tags.office ||
              tags.aeroway ||
              tags.railway ||
              tags.public_transport ||
              tags.healthcare ||
              tags.tourism ||
              '',
            address: buildAddress(tags),
            lat: coords.lat,
            lng: coords.lng,
            polygons: polygons.length ? polygons : undefined,
            meta: {
              osmType: el.type,
              osmId: el.id,
              operator: tags.operator,
              website: tags.website || tags['contact:website'],
            },
          };
        })
        .filter(Boolean);
    } catch (err) {
      // A real user-initiated abort (new pan/zoom) bubbles up and stops here.
      if (err.name === 'AbortError' && signal?.aborted) throw err;
      // Otherwise it's a per-endpoint timeout or network error: cool the
      // endpoint down and try the next mirror.
      cooldownUntil.set(endpoint, Date.now() + COOLDOWN_MS);
      lastErr = err;
    }
  }
  throw lastErr || new Error('All Overpass endpoints failed');
}
