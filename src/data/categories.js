import { palette } from '../theme.js';

// Awareness radii reflect a conservative "buffer of caution" around the
// feature, NOT a literal legal boundary. NY CCIA (Penal Law § 265.01-e)
// generally prohibits carry inside sensitive locations themselves; federal
// Gun-Free School Zones Act adds a 1000 ft buffer around K-12 schools.
// Values are in feet so the UI can render either ft or meters.
export const DEFAULT_RADIUS_FT = {
  schoolFederal: 1000, // GFSZA 18 USC § 922(q)
  building: 250,
  parkLarge: 500,
  airport: 1500,
};

// Master category list. id is stable, used as map key + filter key.
export const CATEGORIES = [
  {
    id: 'liquor_onprem',
    label: 'On-Premises Liquor',
    short: 'Bar / Restaurant',
    description:
      'Establishments licensed to serve alcohol for on-site consumption (bars, taverns, restaurants, hotels with bars). Sensitive under NY Penal Law § 265.01-e(2)(o).',
    sensitive: true,
    color: palette.neonRed,
    radiusFt: 250,
    icon: 'Beer',
  },
  {
    id: 'liquor_offprem',
    label: 'Off-Premises Liquor',
    short: 'Liquor Store / Grocery Wine',
    description:
      'Licensed to sell sealed alcohol for off-site consumption (liquor stores, grocery wine, beer to go). Not a CCIA sensitive location on its own, shown for situational awareness.',
    sensitive: false,
    color: palette.neonAmber,
    radiusFt: 150,
    icon: 'Wine',
  },
  {
    id: 'school',
    label: 'School (K-12)',
    short: 'School',
    description:
      'K-12 schools. Sensitive under NY Penal Law § 265.01-e(2)(m) AND inside the federal Gun-Free School Zone (1000 ft).',
    sensitive: true,
    color: palette.neonMagenta,
    radiusFt: DEFAULT_RADIUS_FT.schoolFederal,
    icon: 'GraduationCap',
  },
  {
    id: 'university',
    label: 'College / University',
    short: 'College',
    description:
      'Colleges and universities. Sensitive under NY Penal Law § 265.01-e(2)(m).',
    sensitive: true,
    color: palette.neonViolet,
    radiusFt: 500,
    icon: 'School',
  },
  {
    id: 'daycare',
    label: 'Daycare / Pre-K',
    short: 'Daycare',
    description:
      'Childcare facilities and pre-K programs. Sensitive under NY Penal Law § 265.01-e(2)(l).',
    sensitive: true,
    color: palette.neonMagenta,
    radiusFt: 300,
    icon: 'Baby',
  },
  {
    id: 'park',
    label: 'Park / Protected Land',
    short: 'Park',
    description:
      'Public parks, zoos, playgrounds and protected land. Sensitive under NY Penal Law § 265.01-e(2)(d).',
    sensitive: true,
    color: palette.neonLime,
    radiusFt: 300,
    icon: 'Trees',
  },
  {
    id: 'government',
    label: 'Government Building',
    short: 'Gov Building',
    description:
      'Federal, state and local government buildings. Sensitive under NY Penal Law § 265.01-e(2)(a).',
    sensitive: true,
    color: palette.neonCyan,
    radiusFt: 250,
    icon: 'Landmark',
  },
  {
    id: 'courthouse',
    label: 'Courthouse',
    short: 'Court',
    description:
      'Courthouses and court facilities. Sensitive under NY Penal Law § 265.01-e(2)(b) and federally under 18 USC § 930.',
    sensitive: true,
    color: palette.neonCyan,
    radiusFt: 300,
    icon: 'Scale',
  },
  {
    id: 'post_office',
    label: 'Post Office',
    short: 'USPS',
    description:
      'US Postal Service facilities — federal property, firearms generally prohibited under 39 CFR § 232.1.',
    sensitive: true,
    color: palette.neonBlue,
    radiusFt: 200,
    icon: 'Mail',
  },
  {
    id: 'hospital',
    label: 'Hospital / Medical',
    short: 'Hospital',
    description:
      'Hospitals, urgent care, mental health facilities and substance use treatment. Sensitive under NY Penal Law § 265.01-e(2)(g).',
    sensitive: true,
    color: palette.neonRed,
    radiusFt: 300,
    icon: 'Hospital',
  },
  {
    id: 'place_of_worship',
    label: 'Place of Worship',
    short: 'Worship',
    description:
      'Churches, synagogues, mosques, temples. Sensitive under NY Penal Law § 265.01-e(2)(c), subject to ongoing litigation.',
    sensitive: true,
    color: palette.neonViolet,
    radiusFt: 200,
    icon: 'Church',
  },
  {
    id: 'transit',
    label: 'Transit Station',
    short: 'Transit',
    description:
      'Public transit hubs (subway, rail, bus terminal). Sensitive under NY Penal Law § 265.01-e(2)(n).',
    sensitive: true,
    color: palette.neonBlue,
    radiusFt: 250,
    icon: 'TrainFront',
  },
  {
    id: 'airport',
    label: 'Airport',
    short: 'Airport',
    description:
      'Airports — sensitive under NY Penal Law § 265.01-e(2)(n) and TSA-regulated federally.',
    sensitive: true,
    color: palette.neonAmber,
    radiusFt: DEFAULT_RADIUS_FT.airport,
    icon: 'Plane',
  },
  {
    id: 'polling',
    label: 'Polling Place',
    short: 'Polling',
    description:
      'Polling stations (when in use as such). Sensitive under NY Penal Law § 265.01-e(2)(j).',
    sensitive: true,
    color: palette.neonLime,
    radiusFt: 100,
    icon: 'Vote',
  },
];

export const CATEGORY_MAP = CATEGORIES.reduce((acc, c) => {
  acc[c.id] = c;
  return acc;
}, {});

export const SENSITIVE_IDS = CATEGORIES.filter((c) => c.sensitive).map((c) => c.id);
