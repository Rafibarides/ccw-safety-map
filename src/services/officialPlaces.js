// City and state location lists that stay available when OpenStreetMap is down.
// Parks, hospitals, child care, and subway stations for the view.

const NYC = { south: 40.49, north: 40.92, west: -74.26, east: -73.7 };

const BOROUGH = {
  M: 'Manhattan',
  X: 'The Bronx',
  B: 'Brooklyn',
  Q: 'Queens',
  R: 'Staten Island',
};

function overlapsNyc(bbox) {
  return !(
    bbox.east < NYC.west ||
    bbox.west > NYC.east ||
    bbox.north < NYC.south ||
    bbox.south > NYC.north
  );
}

function clean(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function getJson(url, signal) {
  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function ringAreaAndCentroid(ring) {
  let twice = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x1, y1] = ring[j];
    const [x2, y2] = ring[i];
    const cross = x1 * y2 - x2 * y1;
    twice += cross;
    cx += (x1 + x2) * cross;
    cy += (y1 + y2) * cross;
  }
  if (Math.abs(twice) < 1e-12) {
    const [lng, lat] = ring[0];
    return { area: 0, lat, lng };
  }
  return { area: Math.abs(twice) / 2, lng: cx / (3 * twice), lat: cy / (3 * twice) };
}

function polygonCentroid(geometry) {
  const polygons = geometry?.type === 'Polygon' ? [geometry.coordinates] : geometry?.coordinates;
  if (!polygons) return null;
  let best = null;
  for (const polygon of polygons) {
    const ring = polygon?.[0];
    if (!ring || ring.length < 3) continue;
    const next = ringAreaAndCentroid(ring);
    if (!best || next.area > best.area) best = next;
  }
  if (!best || !Number.isFinite(best.lat) || !Number.isFinite(best.lng)) return null;
  return { lat: best.lat, lng: best.lng };
}

async function fetchParks(bbox, signal) {
  if (!overlapsNyc(bbox)) return [];
  const where = `within_box(multipolygon, ${bbox.north}, ${bbox.west}, ${bbox.south}, ${bbox.east}) AND retired=false`;
  const params = new URLSearchParams({
    $select: 'signname,borough,acres,gispropnum,multipolygon',
    $where: where,
    $limit: '2000',
  });
  const data = await getJson(
    `https://data.cityofnewyork.us/resource/enfh-gkve.geojson?${params}`,
    signal
  );
  return (data.features || [])
    .map((feature) => {
      const props = feature.properties || {};
      const point = polygonCentroid(feature.geometry);
      const id = clean(props.gispropnum);
      if (!point || !id) return null;
      const borough = BOROUGH[props.borough] || 'New York';
      return {
        id: `dpr:${id}`,
        source: 'NYC Parks',
        categoryId: 'park',
        name: clean(props.signname) || 'Park',
        subtitle: 'Public park',
        address: `${borough}, New York`,
        lat: point.lat,
        lng: point.lng,
        meta: { acres: props.acres ? Number(props.acres) : undefined },
      };
    })
    .filter(Boolean);
}

async function fetchHospitals(bbox, signal) {
  const where =
    `latitude between ${bbox.south} and ${bbox.north}` +
    ` AND longitude between ${bbox.west} and ${bbox.east}` +
    ` AND (description='Hospital' OR description='Diagnostic and Treatment Center' OR description='Off-Campus Emergency Department')`;
  const params = new URLSearchParams({
    $select: 'fac_id,facility_name,description,address1,city,latitude,longitude',
    $where: where,
    $limit: '2000',
  });
  const rows = await getJson(`https://health.data.ny.gov/resource/vn5v-hh5r.json?${params}`, signal);
  return rows
    .map((row) => {
      const lat = num(row.latitude);
      const lng = num(row.longitude);
      if (lat == null || lng == null) return null;
      return {
        id: `doh:${clean(row.fac_id) || `${lat.toFixed(5)},${lng.toFixed(5)}`}`,
        source: 'NYS Department of Health',
        categoryId: 'hospital',
        name: clean(row.facility_name) || 'Hospital',
        subtitle: clean(row.description) || 'Hospital',
        address: [clean(row.address1), clean(row.city)].filter(Boolean).join(', '),
        lat,
        lng,
      };
    })
    .filter(Boolean);
}

async function fetchDaycares(bbox, signal) {
  if (!overlapsNyc(bbox)) return [];
  const where =
    `latitude between ${bbox.south} and ${bbox.north}` +
    ` AND longitude between ${bbox.west} and ${bbox.east}`;
  const params = new URLSearchParams({
    $select: 'dcid,program_name,facility_type,address,borough,zipcode,latitude,longitude',
    $where: where,
    $limit: '3000',
  });
  const rows = await getJson(`https://data.cityofnewyork.us/resource/gy3q-4tzp.json?${params}`, signal);
  return rows
    .map((row) => {
      const lat = num(row.latitude);
      const lng = num(row.longitude);
      if (lat == null || lng == null) return null;
      const name = clean(row.program_name) || 'Child care';
      return {
        id: `dohmh:${clean(row.dcid) || name}:${lat.toFixed(5)},${lng.toFixed(5)}`,
        source: 'NYC Health',
        categoryId: 'daycare',
        name,
        subtitle: clean(row.facility_type) || 'Child care',
        address: [clean(row.address), clean(row.borough), clean(row.zipcode)].filter(Boolean).join(', '),
        lat,
        lng,
      };
    })
    .filter(Boolean);
}

async function fetchSubway(bbox, signal) {
  const where = `within_box(georeference, ${bbox.north}, ${bbox.west}, ${bbox.south}, ${bbox.east})`;
  const params = new URLSearchParams({
    $select: 'station_id,stop_name,daytime_routes,borough,gtfs_latitude,gtfs_longitude',
    $where: where,
    $limit: '1000',
  });
  const rows = await getJson(`https://data.ny.gov/resource/39hk-dx4f.json?${params}`, signal);
  return rows
    .map((row) => {
      const lat = num(row.gtfs_latitude);
      const lng = num(row.gtfs_longitude);
      if (lat == null || lng == null) return null;
      const routes = clean(row.daytime_routes);
      return {
        id: `mta:${clean(row.station_id) || `${lat.toFixed(5)},${lng.toFixed(5)}`}`,
        source: 'MTA',
        categoryId: 'transit',
        name: clean(row.stop_name) || 'Subway station',
        subtitle: routes ? `Subway ${routes}` : 'Subway station',
        address: clean(row.borough),
        lat,
        lng,
      };
    })
    .filter(Boolean);
}

const LOADERS = {
  park: fetchParks,
  hospital: fetchHospitals,
  daycare: fetchDaycares,
  transit: fetchSubway,
};

export const OFFICIAL_PLACE_IDS = Object.keys(LOADERS);

export async function fetchOfficialPlaces(bbox, categoryIds, { signal } = {}) {
  const loaders = categoryIds.map((id) => LOADERS[id]).filter(Boolean);
  if (!loaders.length) return [];
  const settled = await Promise.allSettled(loaders.map((load) => load(bbox, signal)));
  if (signal?.aborted) {
    const err = new Error('aborted');
    err.name = 'AbortError';
    throw err;
  }
  const rows = [];
  let failures = 0;
  for (const result of settled) {
    if (result.status === 'fulfilled') rows.push(...result.value);
    else failures += 1;
  }
  if (failures === settled.length) {
    throw settled.find((result) => result.status === 'rejected')?.reason || new Error('Official places failed');
  }
  return rows;
}
