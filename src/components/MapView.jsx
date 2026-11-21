import { useEffect, useRef, memo } from 'react';
import { Map, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { MarkerClusterer, SuperClusterAlgorithm } from '@googlemaps/markerclusterer';
import { darkMapStyle, palette } from '../theme.js';
import { CATEGORY_MAP } from '../data/categories.js';
import { ICON_MARKUP } from '../data/iconMarkup.js';
import { circleRing, SCHOOL_BUFFER_MIN_ZOOM, schoolBufferRadiusM } from '../geo/geo.js';

const iconUrlCache = new Map();

function markerIconUrl(color, iconName, size) {
  const key = `${iconName}|${color}|${size}`;
  const cached = iconUrlCache.get(key);
  if (cached) return cached;
  const markup = ICON_MARKUP[iconName] || ICON_MARKUP.MapPin;
  const scale = (size * 0.56) / 24;
  const offset = ((size - 24 * scale) / 2).toFixed(2);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<circle cx="${size / 2}" cy="${size / 2}" r="${(size / 2 - 1.1).toFixed(2)}" fill="#050710" stroke="${color}" stroke-width="1.6"/>` +
    `<g transform="translate(${offset} ${offset}) scale(${scale.toFixed(4)})" fill="none" stroke="${color}" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">` +
    markup +
    `</g></svg>`;
  const url = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  iconUrlCache.set(key, url);
  return url;
}

// Soft heat blob. Sparse groups stay dim and cool. A tight pile of sensitive
// places burns hotter and wider, and fades out instead of drawing a hard circle.
function glowIconUrl(count) {
  const heat = Math.max(0, Math.min(1, Math.log(count) / Math.log(90)));
  const size = Math.round(48 + heat * 68);
  const core = heat > 0.72 ? '#ff3b6b' : heat > 0.38 ? '#ff2bd6' : '#c084fc';
  const mid = heat > 0.5 ? '#ff2bd6' : '#9d6cff';
  const edge = heat > 0.35 ? '#ff2bd6' : '#7c5cff';
  const coreA = (0.5 + heat * 0.45).toFixed(2);
  const midA = (0.22 + heat * 0.28).toFixed(2);
  const edgeA = (0.06 + heat * 0.1).toFixed(2);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">` +
    `<defs><radialGradient id="g" cx="50%" cy="50%" r="50%">` +
    `<stop offset="0%" stop-color="${core}" stop-opacity="${coreA}"/>` +
    `<stop offset="16%" stop-color="${core}" stop-opacity="${(Number(coreA) * 0.82).toFixed(2)}"/>` +
    `<stop offset="42%" stop-color="${mid}" stop-opacity="${midA}"/>` +
    `<stop offset="72%" stop-color="${edge}" stop-opacity="${edgeA}"/>` +
    `<stop offset="100%" stop-color="${edge}" stop-opacity="0"/>` +
    `</radialGradient></defs>` +
    `<circle cx="50" cy="50" r="50" fill="url(#g)"/>` +
    `</svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    size,
    heat,
  };
}

function PlaceOutlines({ features, visible, onFeatureSelect }) {
  const map = useMap();
  const mapsApi = useMapsLibrary('maps');
  const shapesRef = useRef([]);

  useEffect(() => {
    if (!map || !mapsApi) return;

    for (const shape of shapesRef.current) {
      shape.listener?.remove();
      shape.polygon.setMap(null);
    }
    shapesRef.current = [];

    for (const feature of features) {
      if (!feature.polygons?.length) continue;
      const cat = CATEGORY_MAP[feature.categoryId];
      if (!cat) continue;
      const legalLine = Boolean(feature.perimeter);
      if (!visible && !legalLine) continue;
      const timesSquare = feature.categoryId === 'times_square';
      for (const poly of feature.polygons) {
        const paths = [poly.outer, ...(poly.holes || [])];
        const polygon = new mapsApi.Polygon({
          paths,
          strokeColor: cat.color,
          strokeOpacity: legalLine ? 0.95 : 0.9,
          strokeWeight: timesSquare ? 3 : legalLine ? 2.5 : 2,
          fillColor: cat.color,
          fillOpacity: legalLine ? 0.1 : 0.18,
          clickable: true,
          zIndex: timesSquare ? 2 : legalLine ? 1 : 3,
          map,
        });
        const listener = polygon.addListener('click', () => onFeatureSelect?.(feature));
        shapesRef.current.push({ polygon, listener });
      }
    }

    return () => {
      for (const shape of shapesRef.current) {
        shape.listener?.remove();
        shape.polygon.setMap(null);
      }
      shapesRef.current = [];
    };
  }, [map, mapsApi, features, visible, onFeatureSelect]);

  return null;
}

function SchoolBuffers({ features, visible }) {
  const map = useMap();
  const mapsApi = useMapsLibrary('maps');
  const shapesRef = useRef([]);

  useEffect(() => {
    if (!map || !mapsApi) return;

    for (const shape of shapesRef.current) shape.setMap(null);
    shapesRef.current = [];

    if (!visible) return;

    const schools = features.filter((feature) => feature.categoryId === 'school');
    const color = CATEGORY_MAP.school?.color || palette.neonMagenta;

    for (const school of schools) {
      const radius = schoolBufferRadiusM(school);
      const fill = new mapsApi.Circle({
        center: { lat: school.lat, lng: school.lng },
        radius,
        strokeOpacity: 0,
        fillColor: color,
        fillOpacity: 0.045,
        clickable: false,
        zIndex: 0,
        map,
      });
      const dash = new mapsApi.Polyline({
        path: circleRing({ lat: school.lat, lng: school.lng }, radius),
        strokeOpacity: 0,
        clickable: false,
        icons: [
          {
            icon: {
              path: 'M 0,-1 0,1',
              strokeOpacity: 0.85,
              strokeColor: color,
              scale: 2,
            },
            offset: '0',
            repeat: '12px',
          },
        ],
        map,
      });
      shapesRef.current.push(fill, dash);
    }

    return () => {
      for (const shape of shapesRef.current) shape.setMap(null);
      shapesRef.current = [];
    };
  }, [map, mapsApi, features, visible]);

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

    const size = zoom >= 16 ? 34 : zoom >= 14 ? 28 : 22;
    const anchor = size / 2;
    const clustered = [];

    const markers = features.map((f) => {
      const cat = CATEGORY_MAP[f.categoryId];
      const color = cat?.color || palette.neonCyan;
      const marker = new markerApi.Marker({
        position: { lat: f.lat, lng: f.lng },
        title: f.name,
        optimized: true,
        icon: {
          url: markerIconUrl(color, cat?.icon, size),
          scaledSize: new coreApi.Size(size, size),
          anchor: new coreApi.Point(anchor, anchor),
        },
      });
      marker.addListener('click', () => onFeatureSelect?.(f));
      if (f.perimeter) marker.setMap(map);
      else clustered.push(marker);
      return marker;
    });
    markersRef.current = markers;

    clustererRef.current = new MarkerClusterer({
      map,
      markers: clustered,
      algorithm: new SuperClusterAlgorithm({ radius: 72, maxZoom: 16, minPoints: 2 }),
      renderer: {
        render: ({ count, position }) => {
          const glow = glowIconUrl(count);
          return new markerApi.Marker({
            position,
            optimized: false,
            icon: {
              url: glow.url,
              scaledSize: new coreApi.Size(glow.size, glow.size),
              anchor: new coreApi.Point(glow.size / 2, glow.size / 2),
            },
            shape: {
              type: 'circle',
              coords: [
                Math.round(glow.size / 2),
                Math.round(glow.size / 2),
                Math.round(glow.size * 0.28),
              ],
            },
            zIndex: Math.round(1_000_000 + glow.heat * 1000 + count),
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
  showOutlines,
  showSchoolBuffer,
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

  const buffersVisible = showSchoolBuffer && (zoom || 0) >= SCHOOL_BUFFER_MIN_ZOOM;

  return (
    <>
      <SchoolBuffers features={features} visible={buffersVisible} />
      <PlaceOutlines features={features} visible={showOutlines} onFeatureSelect={onFeatureSelect} />
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
