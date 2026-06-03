import { useEffect, useRef, memo } from 'react';
import { Map, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { darkMapStyle, palette } from '../theme.js';
import { CATEGORY_MAP } from '../data/categories.js';

const FT_PER_METER = 3.28084;
const CIRCLE_MIN_ZOOM = 14;
const PIN_MIN_ZOOM = 13;

function ftToMeters(ft) {
  return ft / FT_PER_METER;
}

// SVG icon used for non-clustered markers. Two sizes so dots stay subtle at
// lower zooms and grow into clear pins at higher zooms.
function markerIconUrl(color, size = 26) {
  const inner = Math.round(size * 0.15);
  const outer = Math.round(size * 0.38);
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${size} ${size}' width='${size}' height='${size}'>` +
    `<circle cx='${size / 2}' cy='${size / 2}' r='${outer}' fill='%23050710' stroke='${encodeURIComponent(color)}' stroke-width='1.8'/>` +
    `<circle cx='${size / 2}' cy='${size / 2}' r='${inner}' fill='${encodeURIComponent(color)}'/>` +
    `</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${svg}`;
}

function clusterIconUrl(count, color = palette.neonCyan) {
  const size = count >= 100 ? 56 : count >= 25 ? 48 : 40;
  const inner = Math.round(size * 0.62);
  const outer = Math.round(size * 0.46);
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${size} ${size}' width='${size}' height='${size}'>` +
    `<circle cx='${size / 2}' cy='${size / 2}' r='${outer}' fill='${encodeURIComponent(color)}' opacity='0.18'/>` +
    `<circle cx='${size / 2}' cy='${size / 2}' r='${inner / 2}' fill='%23050710' stroke='${encodeURIComponent(color)}' stroke-width='1.8'/>` +
    `</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${svg}`;
}

function AwarenessCircles({ features, radiusScale, visible }) {
  const map = useMap();
  const mapsApi = useMapsLibrary('maps');
  const circlesRef = useRef([]);

  useEffect(() => {
    if (!map || !mapsApi) return;

    for (const c of circlesRef.current) c.setMap(null);
    circlesRef.current = [];

    if (!visible) return;

    for (const f of features) {
      const cat = CATEGORY_MAP[f.categoryId];
      if (!cat) continue;
      const radius = ftToMeters(cat.radiusFt * radiusScale);
      const circle = new mapsApi.Circle({
        center: { lat: f.lat, lng: f.lng },
        radius,
        strokeColor: cat.color,
        strokeOpacity: 0.55,
        strokeWeight: 1,
        fillColor: cat.color,
        fillOpacity: cat.sensitive ? 0.08 : 0.04,
        clickable: false,
        map,
      });
      circlesRef.current.push(circle);
    }

    return () => {
      for (const c of circlesRef.current) c.setMap(null);
      circlesRef.current = [];
    };
  }, [map, mapsApi, features, radiusScale, visible]);

  return null;
}

function HighlightCircle({ point }) {
  const map = useMap();
  const mapsApi = useMapsLibrary('maps');
  const ringsRef = useRef([]);

  useEffect(() => {
    if (!map || !mapsApi || !point) return;
    for (const r of ringsRef.current) r.setMap(null);
    ringsRef.current = [];
    const opacities = [0.9, 0.55, 0.22];
    [40, 90, 160].forEach((r, i) => {
      const ring = new mapsApi.Circle({
        center: point,
        radius: r,
        strokeColor: palette.neonCyan,
        strokeOpacity: opacities[i],
        strokeWeight: 1.4,
        fillOpacity: 0,
        clickable: false,
        map,
      });
      ringsRef.current.push(ring);
    });
    return () => {
      for (const r of ringsRef.current) r.setMap(null);
      ringsRef.current = [];
    };
  }, [map, mapsApi, point]);

  return null;
}

// Imperative marker layer — far faster than React reconciliation when we have
// hundreds of points, and integrates cleanly with MarkerClusterer.
function MarkerLayer({ features, onFeatureSelect, zoom }) {
  const map = useMap();
  const coreApi = useMapsLibrary('core');
  // Marker lives in the `marker` library (not `maps`).
  const markerApi = useMapsLibrary('marker');
  const clustererRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!map || !coreApi || !markerApi) return;

    for (const m of markersRef.current) m.setMap(null);
    markersRef.current = [];
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
      clustererRef.current.setMap(null);
      clustererRef.current = null;
    }

    if (!features.length) return;

    const size = zoom >= CIRCLE_MIN_ZOOM ? 28 : zoom >= PIN_MIN_ZOOM ? 22 : 16;
    const anchor = size / 2;

    const markers = features.map((f) => {
      const cat = CATEGORY_MAP[f.categoryId];
      const color = cat?.color || palette.neonCyan;
      const marker = new markerApi.Marker({
        position: { lat: f.lat, lng: f.lng },
        title: f.name,
        optimized: true,
        icon: {
          url: markerIconUrl(color, size),
          scaledSize: new coreApi.Size(size, size),
          anchor: new coreApi.Point(anchor, anchor),
        },
      });
      marker.addListener('click', () => onFeatureSelect?.(f));
      return marker;
    });
    markersRef.current = markers;

    clustererRef.current = new MarkerClusterer({
      map,
      markers,
      renderer: {
        render: ({ count, position }) => {
          const color =
            count >= 100
              ? palette.neonMagenta
              : count >= 25
              ? palette.neonAmber
              : palette.neonCyan;
          const size = count >= 100 ? 56 : count >= 25 ? 48 : 40;
          return new markerApi.Marker({
            position,
            label: {
              text: String(count),
              color: '#04111a',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: count >= 100 ? '13px' : '12px',
              fontWeight: '700',
            },
            icon: {
              url: clusterIconUrl(count, color),
              scaledSize: new coreApi.Size(size, size),
              anchor: new coreApi.Point(size / 2, size / 2),
            },
            zIndex: 1_000_000 + count,
          });
        },
      },
    });

    return () => {
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
        clustererRef.current.setMap(null);
        clustererRef.current = null;
      }
      for (const m of markersRef.current) m.setMap(null);
      markersRef.current = [];
    };
  }, [map, coreApi, markerApi, features, onFeatureSelect, zoom]);

  return null;
}

function MapInner({
  features,
  onFeatureSelect,
  showRadii,
  radiusScale,
  highlightPoint,
  onBoundsChange,
  focusRequest,
  zoom,
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('idle', () => {
      const b = map.getBounds();
      if (!b) return;
      const ne = b.getNorthEast();
      const sw = b.getSouthWest();
      onBoundsChange?.({
        north: ne.lat(),
        east: ne.lng(),
        south: sw.lat(),
        west: sw.lng(),
        zoom: map.getZoom(),
        center: { lat: map.getCenter().lat(), lng: map.getCenter().lng() },
      });
    });
    return () => listener.remove();
  }, [map, onBoundsChange]);

  useEffect(() => {
    if (!map || !focusRequest) return;
    if (focusRequest.viewport) {
      map.fitBounds(focusRequest.viewport, 80);
    } else if (focusRequest.point) {
      map.panTo(focusRequest.point);
      const target = focusRequest.zoom ?? 16;
      const z = map.getZoom() || 0;
      if (z < target) map.setZoom(target);
    }
  }, [map, focusRequest]);

  const circlesVisible = showRadii && (zoom || 0) >= CIRCLE_MIN_ZOOM;

  return (
    <>
      <AwarenessCircles features={features} radiusScale={radiusScale} visible={circlesVisible} />
      <HighlightCircle point={highlightPoint} />
      <MarkerLayer features={features} onFeatureSelect={onFeatureSelect} zoom={zoom || 0} />
    </>
  );
}

export default memo(function MapView(props) {
  const { apiMapId, initialCenter, initialZoom, ...inner } = props;
  const hasMapId = Boolean(apiMapId);

  return (
    <Map
      mapId={hasMapId ? apiMapId : undefined}
      styles={hasMapId ? undefined : darkMapStyle}
      defaultCenter={initialCenter}
      defaultZoom={initialZoom}
      gestureHandling="greedy"
      disableDefaultUI={true}
      clickableIcons={false}
      colorScheme="DARK"
      reuseMaps
    >
      <MapInner {...inner} />
    </Map>
  );
});
