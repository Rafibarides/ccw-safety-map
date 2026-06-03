// Classifies a NYS Liquor Authority "Current Active Licenses" row
// (dataset 9s3h-dpkz on data.ny.gov) as either:
//   - "onprem"  : licensed to serve alcohol for ON-PREMISES consumption.
//                 These are CCIA sensitive locations under NY Penal Law
//                 § 265.01-e(2)(o).
//   - "offprem" : sealed/take-home only (liquor store, grocery wine, beer
//                 to go, wholesale). NOT a CCIA sensitive location on its
//                 own, shown for situational awareness.
//
// The dataset's `description` field is the human-readable license type, e.g.
//   "On-Premises Liquor", "Restaurant Wine", "Tavern Wine", "Grocery Store",
//   "Wine Store", "Liquor Store", "Drug Store", "Catering Establishment",
//   "Bottle Club", "Cabaret Liquor", "Brewer", "Micro-Brewer",
//   "Farm Winery", "Direct Shipper Wine", "Wholesaler", "Importer", etc.
//
// We classify by keyword matching `description` (case-insensitive). The
// default for unknown values is `onprem` since being conservative biases
// toward MORE awareness, not less.

const ON_PREMISES_KEYWORDS = [
  'on-premises',
  'on premises',
  'tavern',
  'restaurant',
  'eating place',
  'hotel',
  'catering',
  'cabaret',
  'club ',
  'bottle club',
  'ballpark',
  'racetrack',
  'race track',
  'theater',
  'theatre',
  'bowling',
  'beer & wine',
  'wine, beer',
  'cider, beer',
  'brew pub',
  'brewpub',
  'wine pub',
  'cider pub',
  'tasting',
  'farm winery',
  'farm brewery',
  'farm distillery',
  'farm cidery',
  'farm meadery',
  'micro-brewer',
  'micro brewer',
  'micro-distillery',
  'micro distillery',
  'brewer',
  'distiller',
  'winery',
  'cidery',
  'meadery',
  'railroad',
  'vessel',
  'airplane',
  'plane',
  'summer hotel',
];

const OFF_PREMISES_KEYWORDS = [
  'off-premises',
  'off premises',
  'liquor store',
  'wine store',
  'grocery',
  'drug store',
  'package store',
  'wholesale',
  'wholesaler',
  'importer',
  'agent',
  'broker',
  'solicitor',
  'warehouse',
  'direct shipper',
  'industrial alcohol',
  'denatured alcohol',
  'storeroom',
  'still',
];

function getDescription(record) {
  return String(
    record.description ||
      record.license_type_name ||
      record.licensetypename ||
      ''
  ).toLowerCase();
}

export function classifyLiquorLicense(record) {
  const desc = getDescription(record);
  if (!desc) return 'onprem';

  for (const kw of OFF_PREMISES_KEYWORDS) {
    if (desc.includes(kw)) return 'offprem';
  }
  for (const kw of ON_PREMISES_KEYWORDS) {
    if (desc.includes(kw)) return 'onprem';
  }
  return 'onprem';
}

export function liquorCategoryFor(record) {
  return classifyLiquorLicense(record) === 'onprem' ? 'liquor_onprem' : 'liquor_offprem';
}
