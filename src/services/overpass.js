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

const ENDPOINT_TIMEOUT_MS = 9000;
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
    'nwr["leisure"="nature_reserve"]',
    'nwr["boundary"="protected_area"]',
    'nwr["leisure"="playground"]',
    'nwr["tourism"="zoo"]',
  ],
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
  return `[out:json][timeout:25];(${clauses.join('')});out center tags;`;
}

function categoryFor(tags) {
  if (!tags) return null;
  if (tags.amenity === 'school') return 'school';
  if (tags.amenity === 'university' || tags.amenity === 'college') return 'university';
  if (tags.amenity === 'kindergarten' || tags.amenity === 'childcare') return 'daycare';
  if (
    tags.leisure === 'park' ||
    tags.leisure === 'nature_reserve' ||
    tags.leisure === 'playground' ||
    tags.boundary === 'protected_area' ||
    tags.tourism === 'zoo'
  )
    return 'park';
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
          const lat = el.lat ?? el.center?.lat;
          const lng = el.lon ?? el.center?.lon;
          if (lat == null || lng == null) return null;
          const categoryId = categoryFor(el.tags);
          if (!categoryId) return null;
          if (!categoryIds.includes(categoryId)) return null;
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
            lat,
            lng,
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
