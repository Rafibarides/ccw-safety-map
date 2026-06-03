import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { Layers, Loader2, AlertTriangle, Info, X } from 'lucide-react';

import MapView from './components/MapView.jsx';
import SearchBar from './components/SearchBar.jsx';
import FilterPanel from './components/FilterPanel.jsx';
import Legend from './components/Legend.jsx';
import DetailDrawer from './components/DetailDrawer.jsx';

import { CATEGORIES, CATEGORY_MAP } from './data/categories.js';
import {
  fetchLiquorCached,
  fetchOsmCached,
  liquorCatsEnabled,
  osmCatsEnabled,
} from './services/index.js';
import { useDebouncedValue } from './hooks/useDebounce.js';

const FT_PER_METER = 3.28084;
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;

// Fallback initial view (used until/unless geolocation resolves): a
// reasonably zoomed-in view over NYC so the map is immediately useful.
const DEFAULT_VIEW = { lat: 40.7128, lng: -73.9778, zoom: 14 };
const GEO_ZOOM = 15;

const DEFAULT_ENABLED = CATEGORIES.map((c) => c.id);

function bboxArea(b) {
  return Math.abs((b.north - b.south) * (b.east - b.west));
}

function haversine(a, b) {
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

export default function App() {
  const [enabled, setEnabled] = useState(DEFAULT_ENABLED);
  const [showRadii, setShowRadii] = useState(true);
  const [radiusScale, setRadiusScale] = useState(1);
  const [panelOpen, setPanelOpen] = useState(false);
  const [bounds, setBounds] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingVisible, setLoadingVisible] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [highlightPoint, setHighlightPoint] = useState(null);
  const [focusRequest, setFocusRequest] = useState(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const abortRef = useRef(null);

  // Accumulating feature cache: id -> feature. Survives across pans so we
  // never flash an empty map; visible features are filtered by current bbox.
  const featureCacheRef = useRef(new Map());
  const [featureTick, setFeatureTick] = useState(0);

  const debouncedBounds = useDebouncedValue(bounds, 350);
  const enabledKey = useMemo(() => [...enabled].sort().join(','), [enabled]);

  // Visible features = bbox-filtered slice of the accumulating cache,
  // restricted to currently-enabled categories.
  const features = useMemo(() => {
    if (!bounds) return [];
    const padLat = (bounds.north - bounds.south) * 0.15;
    const padLng = (bounds.east - bounds.west) * 0.15;
    const n = bounds.north + padLat;
    const s = bounds.south - padLat;
    const e = bounds.east + padLng;
    const w = bounds.west - padLng;
    const enabledSet = new Set(enabled);
    const out = [];
    for (const f of featureCacheRef.current.values()) {
      if (!enabledSet.has(f.categoryId)) continue;
      if (f.lat < s || f.lat > n) continue;
      if (f.lng < w || f.lng > e) continue;
      out.push(f);
    }
    return out;
    // featureTick forces recompute when the cache mutates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds, enabled, featureTick]);

  // Show "loading" only if a fetch hasn't resolved within 300ms — keeps the
  // UI quiet for cache hits and fast networks.
  useEffect(() => {
    if (!loading) {
      setLoadingVisible(false);
      return;
    }
    const t = setTimeout(() => setLoadingVisible(true), 300);
    return () => clearTimeout(t);
  }, [loading]);

  const mergeIntoCache = useCallback((incoming) => {
    if (!incoming || incoming.length === 0) return;
    const cache = featureCacheRef.current;
    for (const f of incoming) cache.set(f.id, f);
    if (cache.size > 8000) {
      const overflow = cache.size - 8000;
      const it = cache.keys();
      for (let i = 0; i < overflow; i++) cache.delete(it.next().value);
    }
    setFeatureTick((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!debouncedBounds) return;
    if (bboxArea(debouncedBounds) > 1.2) {
      setError({ kind: 'zoom', msg: 'Zoom in to load sensitive locations' });
      return;
    }
    if (enabled.length === 0) {
      setError(null);
      return;
    }

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const opts = { signal: ctrl.signal };
    setError(null);

    // The liquor source (data.ny.gov) is fast and reliable, so it drives the
    // visible loading spinner. OSM (Overpass) is slower and frequently down,
    // so it loads in the background and only surfaces a soft notice on failure.
    const wantLiquor = liquorCatsEnabled(enabled);
    const wantOsm = osmCatsEnabled(enabled);

    setLoading(wantLiquor);

    if (wantLiquor) {
      fetchLiquorCached(debouncedBounds, enabled, opts)
        .then((rows) => {
          if (ctrl.signal.aborted) return;
          mergeIntoCache(rows);
        })
        .catch((err) => {
          if (err.name === 'AbortError' || ctrl.signal.aborted) return;
          setError({ kind: 'partial', msg: 'Liquor data unavailable — retrying' });
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setLoading(false);
        });
    }

    if (wantOsm) {
      fetchOsmCached(debouncedBounds, enabled, opts)
        .then((rows) => {
          if (ctrl.signal.aborted) return;
          mergeIntoCache(rows);
        })
        .catch((err) => {
          if (err.name === 'AbortError' || ctrl.signal.aborted) return;
          setError((prev) =>
            prev && prev.kind !== 'partial'
              ? prev
              : { kind: 'partial', msg: 'Map layers (OSM) temporarily unavailable' }
          );
        });
    }

    return () => ctrl.abort();
  }, [debouncedBounds, enabledKey, enabled, mergeIntoCache]);

  const counts = useMemo(() => {
    const c = {};
    for (const f of features) c[f.categoryId] = (c[f.categoryId] || 0) + 1;
    return c;
  }, [features]);

  const sensitiveCount = useMemo(
    () => features.filter((f) => CATEGORY_MAP[f.categoryId]?.sensitive).length,
    [features]
  );
  const awarenessCount = features.length - sensitiveCount;

  // Is the active highlightPoint (or map center) inside any sensitive radius?
  const insideSensitive = useMemo(() => {
    const probe = highlightPoint || bounds?.center;
    if (!probe) return false;
    for (const f of features) {
      const cat = CATEGORY_MAP[f.categoryId];
      if (!cat?.sensitive) continue;
      const r = (cat.radiusFt * radiusScale) / FT_PER_METER;
      if (haversine(probe, { lat: f.lat, lng: f.lng }) <= r) return true;
    }
    return false;
  }, [features, highlightPoint, bounds, radiusScale]);

  const toggleCat = useCallback((id) => {
    setEnabled((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);
  const enableAll = useCallback(() => setEnabled(DEFAULT_ENABLED), []);
  const disableAll = useCallback(() => setEnabled([]), []);

  const onSearchPick = useCallback(({ point, viewport }) => {
    setHighlightPoint(point);
    setSelected(null);
    setFocusRequest({ point, viewport, ts: Date.now() });
  }, []);

  const goToMyLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setHighlightPoint(point);
        setSelected(null);
        setFocusRequest({ point, zoom: GEO_ZOOM, ts: Date.now() });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  // On first load, try to center on the user's live location.
  const didGeoInit = useRef(false);
  useEffect(() => {
    if (didGeoInit.current) return;
    didGeoInit.current = true;
    goToMyLocation();
  }, [goToMyLocation]);

  const onBoundsChange = useCallback((b) => {
    setBounds(b);
  }, []);

  if (!API_KEY) {
    return <KeyMissingScreen />;
  }

  return (
    <APIProvider apiKey={API_KEY} libraries={['places', 'geometry', 'marker']}>
      <div className="app-root">
        <div className="map-wrap">
          <MapView
            apiMapId={MAP_ID}
            initialCenter={{ lat: DEFAULT_VIEW.lat, lng: DEFAULT_VIEW.lng }}
            initialZoom={DEFAULT_VIEW.zoom}
            features={features}
            onFeatureSelect={setSelected}
            showRadii={showRadii}
            radiusScale={radiusScale}
            highlightPoint={highlightPoint}
            onBoundsChange={onBoundsChange}
            focusRequest={focusRequest}
            zoom={bounds?.zoom}
          />
        </div>

        <header className="top-bar">
          <div className="brand">
            <span className="brand-dot" />
            <div className="brand-text">
              <span className="brand-name">CCW Safety Map</span>
              <span className="brand-sub">NY State · CCIA awareness</span>
            </div>
          </div>
          <button
            className="icon-btn ghost about-btn"
            onClick={() => setAboutOpen(true)}
            aria-label="About"
          >
            <Info size={16} />
          </button>
        </header>

        <div className="search-wrap">
          <SearchBar onPick={onSearchPick} onLocate={goToMyLocation} />
        </div>

        <div className="legend-wrap">
          <Legend
            sensitiveCount={sensitiveCount}
            awarenessCount={awarenessCount}
            insideSensitive={insideSensitive}
          />
        </div>

        {loadingVisible && (
          <div className="status-toast">
            <Loader2 size={14} className="spin" />
            <span>Loading nearby data…</span>
          </div>
        )}
        {!loadingVisible && error && (
          <div className={`status-toast status-${error.kind === 'zoom' ? 'info' : 'warn'}`}>
            {error.kind === 'zoom' ? <Info size={14} /> : <AlertTriangle size={14} />}
            <span>{error.msg}</span>
          </div>
        )}

        <button
          className="fab"
          onClick={() => setPanelOpen(true)}
          aria-label="Open layers"
        >
          <Layers size={18} />
          <span>{enabled.length} layers</span>
        </button>

        <FilterPanel
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          enabled={enabled}
          onToggle={toggleCat}
          onAll={enableAll}
          onNone={disableAll}
          showRadii={showRadii}
          onToggleRadii={setShowRadii}
          radiusScale={radiusScale}
          onRadiusScale={setRadiusScale}
          counts={counts}
        />

        {selected && (
          <DetailDrawer feature={selected} onClose={() => setSelected(null)} />
        )}

        {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
      </div>
    </APIProvider>
  );
}

function KeyMissingScreen() {
  return (
    <div className="key-missing">
      <div className="key-card">
        <h1>CCW Safety Map</h1>
        <p>
          Set <code>VITE_GOOGLE_MAPS_API_KEY</code> in a <code>.env.local</code>{' '}
          file to launch the map. See <code>.env.example</code>.
        </p>
        <pre>VITE_GOOGLE_MAPS_API_KEY=your_key_here</pre>
      </div>
    </div>
  );
}

function AboutModal({ onClose }) {
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>About CCW Safety Map</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </header>
        <div className="modal-body">
          <p>
            Going to that barn wedding upstate? Quickly check whether the
            venue is on-premises licensed, near a school, or otherwise inside
            a NY State CCIA sensitive location.
          </p>
          <h3>Data sources</h3>
          <ul>
            <li><b>Liquor licenses</b> — NY Open Data (NYS Liquor Authority)</li>
            <li><b>Schools, hospitals, parks, courthouses, transit, airports, post offices, gov buildings, places of worship, daycares</b> — OpenStreetMap via Overpass</li>
          </ul>
          <h3>Sensitivity classification</h3>
          <p>
            Each layer maps to NY Penal Law § 265.01-e (the CCIA "sensitive
            locations" statute) where applicable. Bars, restaurants and other
            on-premises licensed venues are flagged as sensitive; off-premises
            stores (grocery wine, liquor stores) are shown for awareness only.
          </p>
          <h3>Disclaimer</h3>
          <p>
            This is an awareness tool, not legal advice. Sensitive-location
            rules and litigation status change. Verify with current statutes
            and counsel before acting.
          </p>
        </div>
      </div>
    </div>
  );
}
