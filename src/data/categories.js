import { palette } from '../theme.js';

// How far the statute actually reaches. There is no invented caution radius.
//   premises  — inside that establishment or building. No distance around it.
//   grounds   — the building and its grounds, drawn from the mapped footprint.
//   perimeter — a boundary written into law (Times Square).
//   awareness — shown, but not a CCIA sensitive location.
export const CATEGORIES = [
  {
    id: 'times_square',
    label: 'Times Square',
    short: 'Times Square',
    extent: 'perimeter',
    extentLabel: 'Street perimeter',
    zoneNote: 'Streets and sidewalks inside the line. Building interiors are not part of this zone.',
    description:
      'The only named geographic no-carry zone in the CCIA. NYC Admin Code § 10-315 is an L: south sidewalk of West 40th to the north sidewalk of West 48th, from the west sidewalk of Ninth Avenue to the east sidewalk of Sixth Avenue, then up to the north sidewalk of West 53rd between the west sidewalk of Eighth Avenue and Sixth. Penal Law § 265.01-e(2)(t). The zone has to be posted. Building interiors are excluded from this designation (a bar or other sensitive place inside still counts for its own reason). A resident with a carry license may go straight between home and the edge of the zone; a handgun carried through in a vehicle has to be unloaded and locked, ammunition separate (38 RCNY § 5-34).',
    sensitive: true,
    color: palette.neonRed,
    icon: 'Map',
  },
  {
    id: 'liquor_onprem',
    label: 'On-Premises Liquor',
    short: 'Bar / Restaurant',
    extent: 'premises',
    extentLabel: 'Premises only',
    zoneNote: 'Inside this establishment only.',
    description:
      'A bar, restaurant, tavern, or other place with an active on-premises alcohol license, and on-premises cannabis consumption sites. Penal Law § 265.01-e(2)(o). The ban is inside that establishment. There is no radius onto the sidewalk, the street, or the restaurant next door. Three licenses on one block are three premises, not one blob. This layer is alcohol licenses only; on-premises cannabis is also sensitive and is not in this dataset.',
    sensitive: true,
    color: palette.neonRed,
    icon: 'Beer',
  },
  {
    id: 'liquor_offprem',
    label: 'Off-Premises Liquor',
    short: 'Liquor Store',
    extent: 'awareness',
    extentLabel: 'Not sensitive',
    zoneNote: null,
    description:
      'Packaged liquor, grocery wine, and beer to go. Selling alcohol for off-site consumption is not a CCIA sensitive location. Shown so it is not confused with an on-premises license.',
    sensitive: false,
    color: palette.neonAmber,
    icon: 'Wine',
  },
  {
    id: 'school',
    label: 'School (K-12)',
    short: 'School',
    extent: 'grounds',
    extentLabel: 'Building & grounds',
    zoneNote: 'School building and grounds. The surrounding blocks are not a state buffer.',
    description:
      'Public, private, and charter K-12 schools. Penal Law § 265.01-e(2)(m) prohibits carry in or on the building and grounds — not on the streets around the school. The outline is the mapped campus. A pin with no outline means the grounds were not mapped, so the dot is not a radius. Federal law, 18 USC § 922(q), adds 1,000 feet from the grounds. That federal zone does not apply on private property off the grounds, and it generally does not apply to a person licensed by New York: the exception requires the state to have law enforcement verify eligibility before issuing the license, which Penal Law § 400.00 does. A license from another state does not qualify. The federal circle is a separate layer and is off until you turn it on.',
    sensitive: true,
    color: palette.neonMagenta,
    icon: 'GraduationCap',
  },
  {
    id: 'university',
    label: 'College / University',
    short: 'College',
    extent: 'grounds',
    extentLabel: 'Building & grounds',
    zoneNote: 'Campus building and grounds. No distance around the campus.',
    description:
      'Colleges, universities, and the other educational institutions listed in Penal Law § 265.01-e(2)(m). Carry is prohibited in or on the building and grounds. There is no state or federal distance buffer around a college campus. The federal 1,000-foot school zone is K-12 only.',
    sensitive: true,
    color: palette.neonViolet,
    icon: 'School',
  },
  {
    id: 'daycare',
    label: 'Daycare / Pre-K',
    short: 'Daycare',
    extent: 'premises',
    extentLabel: 'The facility only',
    zoneNote: 'The childcare site itself. No distance around it.',
    description:
      'Nursery schools, preschools, summer camps, and childcare programs. Penal Law § 265.01-e(2)(e) and (f). The sensitive location is the program’s site, not a buffer down the block. A summer-camp exception exists for certain supervised shooting activities under Penal Law § 265.20.',
    sensitive: true,
    color: palette.neonMagenta,
    icon: 'Baby',
  },
  {
    id: 'park',
    label: 'Park / Playground / Zoo',
    short: 'Park',
    extent: 'grounds',
    extentLabel: 'The park itself',
    zoneNote: 'Inside the park, playground, or zoo. Not the streets around it.',
    description:
      'Public parks, playgrounds, and zoos. Penal Law § 265.01-e(2)(d). The ban is the park itself. Central Park, Prospect Park, and the other famous city parks are drawn from the NYC Parks property line: inside that line is the park, including its internal roads, and a street the city left outside the property is not. Smaller parks use their mapped footprint. The Adirondack and Catskill forest preserve is expressly not a “public park” for this section, so that wilderness is not drawn as a no-carry area.',
    sensitive: true,
    color: palette.neonLime,
    icon: 'Trees',
  },
  {
    id: 'hospital',
    label: 'Hospital / Medical',
    short: 'Hospital',
    extent: 'premises',
    extentLabel: 'Facility only',
    zoneNote: 'The care site itself. There is no distance buffer around a hospital.',
    description:
      'Locations providing health, behavioral health, or chemical dependence care or services. Penal Law § 265.01-e(2)(b). That is the facility, not a radius around the block. Where a campus is mapped, the outline is the site. A clinic pin is the premises only — the street outside is not automatically included.',
    sensitive: true,
    color: palette.neonRed,
    icon: 'Hospital',
  },
  {
    id: 'government',
    label: 'Government Building',
    short: 'Gov Building',
    extent: 'premises',
    extentLabel: 'The building only',
    zoneNote: 'Inside the government building. No buffer on the surrounding streets.',
    description:
      'Places owned or controlled by federal, state, or local government for government administration. Penal Law § 265.01-e(2)(a). The building, not a zone around it. Federal facilities are also covered by 18 USC § 930.',
    sensitive: true,
    color: palette.neonCyan,
    icon: 'Landmark',
  },
  {
    id: 'courthouse',
    label: 'Courthouse',
    short: 'Court',
    extent: 'premises',
    extentLabel: 'The building only',
    zoneNote: 'The courthouse itself. No buffer on the surrounding streets.',
    description:
      'Courthouses, included with government buildings in Penal Law § 265.01-e(2)(a), and federal court facilities under 18 USC § 930. The ban is the building, not the blocks around it.',
    sensitive: true,
    color: palette.neonCyan,
    icon: 'Scale',
  },
  {
    id: 'post_office',
    label: 'Post Office',
    short: 'USPS',
    extent: 'premises',
    extentLabel: 'The property only',
    zoneNote: 'On postal property. No buffer past the property line.',
    description:
      'US Postal Service property. Firearms are prohibited on postal property under 39 CFR § 232.1. That is the property itself, not a radius down the street.',
    sensitive: true,
    color: palette.neonBlue,
    icon: 'Mail',
  },
  {
    id: 'place_of_worship',
    label: 'Place of Worship',
    short: 'Worship',
    extent: 'premises',
    extentLabel: 'The building only',
    zoneNote: 'The house of worship itself. No buffer on the surrounding streets.',
    description:
      'Churches, synagogues, mosques, and temples. Penal Law § 265.01-e(2)(c) prohibits carry in the place of worship, with an exception for people responsible for security there. There is no distance buffer. Court treatment of this subsection has changed; confirm the current order before relying on it.',
    sensitive: true,
    color: palette.neonViolet,
    icon: 'Church',
  },
  {
    id: 'library',
    label: 'Library',
    short: 'Library',
    extent: 'premises',
    extentLabel: 'The building only',
    zoneNote: 'The library itself. No buffer on the surrounding streets.',
    description:
      'Public libraries. Penal Law § 265.01-e(2)(d) lists libraries with parks, playgrounds, and zoos. The ban is the library, not a radius around it.',
    sensitive: true,
    color: palette.neonLime,
    icon: 'Library',
  },
  {
    id: 'transit',
    label: 'Transit Station',
    short: 'Transit',
    extent: 'premises',
    extentLabel: 'Station or vehicle',
    zoneNote: 'The station or transit vehicle. A subway entrance pin is not a radius.',
    description:
      'Subway and rail stations, bus terminals, and public-transit vehicles. Penal Law § 265.01-e(2)(n). The ban is the facility or the vehicle. A mapped subway entrance is a pin, not a circle — the sidewalk around the stair is not automatically part of the station.',
    sensitive: true,
    color: palette.neonBlue,
    icon: 'TrainFront',
  },
  {
    id: 'airport',
    label: 'Airport',
    short: 'Airport',
    extent: 'grounds',
    extentLabel: 'Airport property',
    zoneNote: 'On airport property. Not a circle beyond the airport.',
    description:
      'Airports. Penal Law § 265.01-e(2)(n), and federal rules inside the sterile area. The outline is the mapped airport property. There is no extra distance beyond that property line.',
    sensitive: true,
    color: palette.neonAmber,
    icon: 'Plane',
  },
  {
    id: 'polling',
    label: 'Polling Place',
    short: 'Polling',
    extent: 'premises',
    extentLabel: 'While in use',
    zoneNote: 'The polling place, and only while it is being used to vote.',
    description:
      'A location while it is being used as a polling place. Penal Law § 265.01-e(2)(q). It is not sensitive on ordinary days, and there is no buffer around the building.',
    sensitive: true,
    color: palette.neonLime,
    icon: 'Vote',
  },
];

export const CATEGORY_MAP = CATEGORIES.reduce((acc, category) => {
  acc[category.id] = category;
  return acc;
}, {});

export const SENSITIVE_IDS = CATEGORIES.filter((category) => category.sensitive).map(
  (category) => category.id
);
