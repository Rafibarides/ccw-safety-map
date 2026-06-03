import { liquorCategoryFor } from '../data/liquorClassifications.js';

// NYS Liquor Authority — Current Active Licenses.
// https://data.ny.gov/Economic-Development/Current-Liquor-Authority-Active-Licenses/9s3h-dpkz
const ENDPOINT = 'https://data.ny.gov/resource/9s3h-dpkz.json';

const APP_TOKEN = import.meta.env.VITE_NY_OPEN_DATA_APP_TOKEN || '';

function buildHeaders() {
  const h = { Accept: 'application/json' };
  if (APP_TOKEN) h['X-App-Token'] = APP_TOKEN;
  return h;
}

function parsePoint(geo) {
  if (!geo) return null;
  if (Array.isArray(geo.coordinates) && geo.coordinates.length === 2) {
    const [lng, lat] = geo.coordinates;
    return { lat: Number(lat), lng: Number(lng) };
  }
  return null;
}

function joinAddress(record) {
  return [
    record.actualaddressofpremises,
    record.additionaladdressinformation,
    record.city,
    record.statename,
    record.zipcode,
  ]
    .filter(Boolean)
    .map(String)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(', ');
}

function displayName(record) {
  const dba = record.dba && String(record.dba).trim();
  const legal = record.legalname && String(record.legalname).trim();
  return dba || legal || record.description || 'Licensed Premises';
}

// Socrata `within_box(field, nwLat, nwLng, seLat, seLng)`.
export async function fetchLiquorLicenses(bbox, { signal, limit = 1500 } = {}) {
  const where = `within_box(georeference, ${bbox.north}, ${bbox.west}, ${bbox.south}, ${bbox.east})`;
  const params = new URLSearchParams({
    $where: where,
    $limit: String(limit),
  });

  const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
    headers: buildHeaders(),
    signal,
  });
  if (!res.ok) throw new Error(`Liquor data ${res.status}`);
  const rows = await res.json();
  return normalize(rows);
}

function normalize(rows) {
  return rows
    .map((r) => {
      const coords = parsePoint(r.georeference);
      if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) {
        return null;
      }
      const categoryId = liquorCategoryFor(r);
      return {
        id: `liq:${r.licensepermitid || `${coords.lat},${coords.lng}`}`,
        source: 'NYS Liquor Authority',
        categoryId,
        name: displayName(r),
        subtitle: r.description || '',
        address: joinAddress(r),
        lat: coords.lat,
        lng: coords.lng,
        meta: {
          permitId: r.licensepermitid,
          classCode: r.class,
          legalName: r.legalname,
          county: r.premisescounty,
          effective: r.effectivedate,
          expires: r.expirationdate,
        },
      };
    })
    .filter(Boolean);
}
