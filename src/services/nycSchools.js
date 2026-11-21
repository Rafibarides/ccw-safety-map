// NYC public, charter, and early-childhood school buildings.
// 2019–2020 School Point Locations, NYC Open Data a3nt-yts4.
// OpenStreetMap is the fallback outside the city and for campuses OSM mapped
// that this building list does not include.

const ENDPOINT = 'https://data.cityofnewyork.us/resource/a3nt-yts4.json';

const NYC = { south: 40.49, north: 40.92, west: -74.26, east: -73.7 };

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

export async function fetchNycSchools(bbox, { signal, limit = 3000 } = {}) {
  if (!overlapsNyc(bbox)) return [];
  const where = `within_box(the_geom, ${bbox.north}, ${bbox.west}, ${bbox.south}, ${bbox.east})`;
  const params = new URLSearchParams({
    $select: 'loc_code,ats_code,loc_name,address,city,state,zip,the_geom',
    $where: where,
    $limit: String(limit),
  });
  const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!res.ok) throw new Error(`NYC schools ${res.status}`);
  const rows = await res.json();
  return rows
    .map((row) => {
      const coords = row.the_geom?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) return null;
      const lng = Number(coords[0]);
      const lat = Number(coords[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const code = clean(row.loc_code || row.ats_code);
      const name = clean(row.loc_name) || 'School';
      return {
        id: `doe:${code || `${lat.toFixed(5)},${lng.toFixed(5)}`}:${name}`,
        source: 'NYC Open Data',
        categoryId: 'school',
        name,
        subtitle: 'School building',
        address: [clean(row.address), clean(row.city), clean(row.state), clean(row.zip)]
          .filter(Boolean)
          .join(', '),
        lat,
        lng,
        meta: { locCode: code },
      };
    })
    .filter(Boolean);
}
