// Neon dark palette used across the UI.
export const palette = {
  bg: '#05070d',
  bgElev: '#0a0f1f',
  surface: 'rgba(12, 18, 32, 0.78)',
  surfaceSolid: '#0c1220',
  border: 'rgba(120, 200, 255, 0.18)',
  borderStrong: 'rgba(120, 200, 255, 0.45)',
  text: '#e8f1ff',
  textMuted: '#7a8aa3',
  textDim: '#4a5870',
  neonCyan: '#00f5ff',
  neonMagenta: '#ff2bd6',
  neonLime: '#39ff7a',
  neonAmber: '#ffb020',
  neonRed: '#ff3b6b',
  neonViolet: '#9d6cff',
  neonBlue: '#3aa8ff',
  warn: '#ff3b6b',
  ok: '#39ff7a',
};

// Google Maps inline JSON style — used as a fallback when no Map ID is set.
// Dark base with deep blue water and muted labels so the neon overlays pop.
export const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0a0f1f' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0f1f' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5a6b85' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#9ab0d1' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#6f8197' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#10172a' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#10172a' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#52617a' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1a2540' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1a2540' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#131b30' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#03070f' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#2c3a55' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#0c1325' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#0a1020' }] },
];
