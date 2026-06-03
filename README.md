# CCW Safety Map

A dark, mobile-first **NY State concealed-carry awareness map** that highlights CCIA-sensitive locations around you (or any address you search). Built with React + Vite, Google Maps, NY Open Data, and OpenStreetMap.

> **Awareness tool, not legal advice.** NY Penal Law § 265.01-e ("CCIA") sensitive-location rules and related litigation change frequently. Always verify before carrying.

## What it does

You're going to a random wedding in a barn somewhere. Is it on-premises liquor licensed? Is it near a school, hospital, park, courthouse, transit hub or airport? Drop the address in the search bar and the map shows:

- **Neon awareness bubbles** around every CCIA-sensitive feature in view
- **On-premises vs off-premises liquor** color-coded separately (bar/restaurant = sensitive; liquor store / grocery wine = not sensitive)
- **A live "inside a sensitive zone" indicator** for the highlighted point
- **Filterable layers** (schools, K-12 vs college, daycare, parks, hospitals, courts, gov buildings, post offices, transit, airports, places of worship, polling, on/off-premises liquor)

### Data sources

| Layer | Source |
| --- | --- |
| Liquor licenses | NY Open Data — NYS Liquor Authority (dataset `hrvs-fxs2`) |
| Schools (K-12) | OpenStreetMap (`amenity=school`) |
| Colleges / universities | OpenStreetMap (`amenity=university|college`) |
| Daycare / Pre-K | OpenStreetMap (`amenity=kindergarten|childcare`) |
| Parks / protected land | OpenStreetMap (`leisure=park|nature_reserve`, `boundary=protected_area`) |
| Hospitals | OpenStreetMap (`amenity=hospital|clinic`, `healthcare=hospital`) |
| Courthouses | OpenStreetMap (`amenity=courthouse`) |
| Post offices | OpenStreetMap (`amenity=post_office`) |
| Government buildings | OpenStreetMap (`office=government`, `amenity=townhall`) |
| Places of worship | OpenStreetMap (`amenity=place_of_worship`) |
| Transit facilities | OpenStreetMap (`railway=station`, `public_transport=station`, `amenity=bus_station`) |
| Airports | OpenStreetMap (`aeroway=aerodrome|terminal`) |
| Polling places | OpenStreetMap (`amenity=polling_station`) |

OSM is queried live via the [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) for the current map bounding box. Liquor data comes from the Socrata SoQL endpoint.

## Quick start

```bash
npm install
cp .env.example .env.local
# edit .env.local and paste your Google Maps API key
npm run dev
```

Open http://localhost:5173.

### Required environment variables

| Var | Required | Notes |
| --- | --- | --- |
| `VITE_GOOGLE_MAPS_API_KEY` | yes | Enable **Maps JavaScript API** and **Places API (New)** in Google Cloud. Restrict the key to your domains. |
| `VITE_GOOGLE_MAPS_MAP_ID` | optional | A Vector Map ID with your dark style applied. If omitted, the app falls back to inline JSON styling. |
| `VITE_NY_OPEN_DATA_APP_TOKEN` | optional | A free [Socrata app token](https://data.ny.gov/profile/app_tokens) to raise rate limits. |

## Deploy to GitHub Pages

The repo's `homepage` in `package.json` is set to `https://rafibarides.github.io/ccw-safety-map` and `vite.config.js` uses `base: '/ccw-safety-map/'` for builds.

```bash
npm run deploy
```

This runs `vite build` and pushes `dist/` to the `gh-pages` branch via the `gh-pages` package.

Then in GitHub → Settings → Pages, set the source to the `gh-pages` branch.

> Add `https://rafibarides.github.io/*` to your Google Maps API key allow-list before deploying.

## Project structure

```
src/
  App.jsx                 # composition, state, bbox-debounced fetching
  main.jsx
  index.css               # dark neon theme
  theme.js                # palette + Google Maps dark style
  components/
    MapView.jsx           # Google Map + markers + circles + highlight rings
    SearchBar.jsx         # Google Places autocomplete
    FilterPanel.jsx       # layer toggles, radius scale (bottom sheet on mobile)
    Legend.jsx            # "inside sensitive zone" banner + counts
    DetailDrawer.jsx      # feature info + directions
    CategoryIcon.jsx      # Lucide icon resolver
  data/
    categories.js         # canonical category metadata (color, radius, CCIA refs)
    liquorClassifications.js  # SLA license code -> on/off premises
  services/
    index.js              # combined bbox fetcher
    liquorLicenses.js     # NY Open Data Socrata client
    overpass.js           # OSM Overpass client (with endpoint failover)
  hooks/
    useDebounce.js
```

## Notes on classification

NY CCIA "sensitive locations" (Penal Law § 265.01-e) covered here:

- (a) Federal/state/local government buildings
- (b) Health-care facilities including hospitals
- (c) Places of worship (subject to ongoing litigation)
- (d) Public parks, zoos, playgrounds
- (g) Mental-health and substance-use facilities
- (j) Polling places (when in use)
- (l) Childcare facilities
- (m) Schools, colleges, universities
- (n) Public transportation, airports
- (o) Establishments licensed to serve alcohol for **on-premises** consumption

Federal layers also flagged:

- 18 USC § 922(q) — **1000 ft Gun-Free School Zone** around K-12 schools
- 18 USC § 930 — federal facilities (courthouses, post offices)
- 39 CFR § 232.1 — USPS property

## License

MIT. Data subject to source-provider terms (OSM/ODbL, NY Open Data terms).
