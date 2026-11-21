import { CATEGORY_MAP } from '../data/categories.js';

const M_PER_DEG_LAT = 111320;
const FT_PER_METER = 3.28084;

// 18 USC § 922(q): 1,000 feet from the grounds of a K-12 school.
export const FEDERAL_SCHOOL_BUFFER_FT = 1000;
// Dense blocks make the 1,000 ft ring unreadable until the map is close in.
export const SCHOOL_BUFFER_MIN_ZOOM = 15;
const FEDERAL_SCHOOL_BUFFER_M = FEDERAL_SCHOOL_BUFFER_FT / FT_PER_METER;

// Close enough that a searched address is the licensed premises itself,
// not the neighboring storefront. This is not a legal buffer.
const PREMISES_MATCH_M = 25;

export function haversine(a, b) {
  const R = 6371000;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function ringContains(point, ring) {
  if (!ring || ring.length < 3) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const yi = ring[i].lat;
    const yj = ring[j].lat;
    const xi = ring[i].lng;
    const xj = ring[j].lng;
    const crosses = (yi > point.lat) !== (yj > point.lat);
    if (!crosses) continue;
    const xAt = ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (point.lng < xAt) inside = !inside;
  }
  return inside;
}

export function pointInFeature(point, feature) {
  if (!point || !feature?.polygons?.length) return false;
  for (const poly of feature.polygons) {
    if (!ringContains(point, poly.outer)) continue;
    if (poly.holes?.some((hole) => ringContains(point, hole))) continue;
    return true;
  }
  return false;
}

// Circle that contains the mapped grounds plus the federal 1,000 ft.
// A true offset curve is tighter; this is the conservative approximation
// drawn when the optional federal layer is on.
export function schoolBufferRadiusM(feature) {
  if (!feature?.polygons?.length) return FEDERAL_SCHOOL_BUFFER_M;
  const origin = { lat: feature.lat, lng: feature.lng };
  let reach = 0;
  for (const poly of feature.polygons) {
    for (const p of poly.outer) reach = Math.max(reach, haversine(origin, p));
  }
  return FEDERAL_SCHOOL_BUFFER_M + reach;
}

export function circleRing(center, radiusM, steps = 64) {
  const pts = [];
  const cos = Math.cos((center.lat * Math.PI) / 180);
  const lngScale = M_PER_DEG_LAT * (cos || 1);
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    pts.push({
      lat: center.lat + (Math.sin(t) * radiusM) / M_PER_DEG_LAT,
      lng: center.lng + (Math.cos(t) * radiusM) / lngScale,
    });
  }
  return pts;
}

function rank(feature) {
  if (feature.categoryId === 'times_square') return 0;
  if (feature.categoryId === 'school' || feature.categoryId === 'university' || feature.categoryId === 'daycare') return 1;
  if (feature.categoryId === 'hospital') return 2;
  if (feature.perimeter) return 3;
  if (feature.categoryId === 'park') return 4;
  return 5;
}

function zoneTitle(feature) {
  if (feature.categoryId === 'times_square') return 'Times Square — no carry';
  return `No carry · ${feature.name}`;
}

function nearestOnPremises(point, features) {
  let nearest = null;
  let nearestD = PREMISES_MATCH_M;
  for (const feature of features) {
    if (feature.categoryId !== 'liquor_onprem') continue;
    const d = haversine(point, feature);
    if (d <= nearestD) {
      nearest = feature;
      nearestD = d;
    }
  }
  return nearest;
}

const CLEAR = {
  tone: 'ok',
  title: 'Outside mapped no-carry areas',
  detail: null,
};

// probe: map center or the searched point. highlight: only a searched point,
// used for "this address is the premises" — never while merely panning.
export function assessLocation({ probe, highlight, features, schoolBuffer }) {
  const polygonProbe = highlight || probe;
  if (!polygonProbe) return CLEAR;

  const containing = [];
  for (const feature of features) {
    const cat = CATEGORY_MAP[feature.categoryId];
    if (!cat?.sensitive || !feature.polygons?.length) continue;
    if (pointInFeature(polygonProbe, feature)) containing.push(feature);
  }

  if (containing.length) {
    containing.sort((a, b) => rank(a) - rank(b));
    const top = containing[0];
    const cat = CATEGORY_MAP[top.categoryId];
    const extra = containing.length - 1;
    const title = zoneTitle(top);
    let detail = top.zoneNote || cat?.zoneNote || null;
    // The Times Square line does not cover building interiors, but an
    // on-premises license inside that line still does.
    if (top.categoryId === 'times_square' && highlight) {
      const bar = nearestOnPremises(highlight, features);
      if (bar) {
        detail = `${bar.name} is no-carry inside — it has an on-premises license. The Times Square rule itself is the streets and sidewalks.`;
      }
    }
    return {
      tone: 'warn',
      title: extra > 0 ? `${title} +${extra}` : title,
      detail,
    };
  }

  if (highlight) {
    let nearest = null;
    let nearestD = PREMISES_MATCH_M;
    let count = 0;
    for (const feature of features) {
      if (feature.categoryId !== 'liquor_onprem') continue;
      const d = haversine(highlight, feature);
      if (d > PREMISES_MATCH_M) continue;
      count += 1;
      if (d < nearestD) {
        nearest = feature;
        nearestD = d;
      }
    }
    if (count > 1) {
      return {
        tone: 'warn',
        title: 'On-premises licenses at this spot',
        detail:
          'Each license is its own premises. They do not merge, and the sidewalk between them is not included.',
      };
    }
    if (nearest) {
      return {
        tone: 'warn',
        title: `No carry inside ${nearest.name}`,
        detail: 'On-premises license. The ban is inside this establishment, not the sidewalk or the next door.',
      };
    }
  }

  if (schoolBuffer) {
    let hit = null;
    let hitD = Infinity;
    for (const feature of features) {
      if (feature.categoryId !== 'school') continue;
      const d = haversine(polygonProbe, feature);
      const radius = schoolBufferRadiusM(feature);
      if (d <= radius && d < hitD) {
        hit = feature;
        hitD = d;
      }
    }
    if (hit) {
      return {
        tone: 'info',
        title: 'Federal school zone',
        detail: `About 1,000 ft from ${hit.name}. A New York pistol license is generally an exception. State law only covers the school grounds.`,
      };
    }
  }

  return CLEAR;
}
