// Times Square sensitive-location zone, NYC Admin Code § 10-315.
//
// The code describes an L, not a rectangle. It runs from the south side of
// West 40th Street to the north side of West 48th Street, between the west
// side of Ninth Avenue and the east side of Sixth Avenue, then north to the
// north side of West 53rd Street between the west side of Eighth Avenue and
// the east side of Sixth Avenue. The named sidewalk is included. Building
// interiors are not part of this zone.
//
// Corners are US Census TIGER centerline intersections, shifted out to the
// property line using the 1811 Manhattan street widths: avenues 100 ft,
// West 40th, 48th, and 53rd Streets 60 ft. That lands on the sidewalk edge
// the statute names. It can be off by a few feet from a surveyed line.

export const TIMES_SQUARE_RING = [
  { lat: 40.7623728, lng: -73.9899687 },
  { lat: 40.7571382, lng: -73.9937721 },
  { lat: 40.7534161, lng: -73.9849375 },
  { lat: 40.7617766, lng: -73.9788459 },
  { lat: 40.7643079, lng: -73.9848394 },
  { lat: 40.761176, lng: -73.9871206 },
];

export const TIMES_SQUARE_FEATURE = {
  id: 'static:times-square',
  source: 'NYC Admin Code § 10-315',
  categoryId: 'times_square',
  name: 'Times Square',
  subtitle: 'Sensitive location zone',
  address: 'West 40th–53rd Streets, Sixth–Ninth Avenues, Manhattan',
  lat: 40.7589,
  lng: -73.9851,
  perimeter: true,
  polygons: [{ outer: TIMES_SQUARE_RING, holes: [] }],
  meta: {},
};

export function timesSquareInView(bounds) {
  if (!bounds) return false;
  let north = -Infinity;
  let south = Infinity;
  let east = -Infinity;
  let west = Infinity;
  for (const p of TIMES_SQUARE_RING) {
    north = Math.max(north, p.lat);
    south = Math.min(south, p.lat);
    east = Math.max(east, p.lng);
    west = Math.min(west, p.lng);
  }
  const pad = 0.004;
  return !(
    bounds.east < west - pad ||
    bounds.west > east + pad ||
    bounds.north < south - pad ||
    bounds.south > north + pad
  );
}
