import { X, ExternalLink, MapPin, Navigation } from 'lucide-react';
import CategoryIcon from './CategoryIcon.jsx';
import { CATEGORY_MAP } from '../data/categories.js';

export default function DetailDrawer({ feature, onClose }) {
  if (!feature) return null;
  const cat = CATEGORY_MAP[feature.categoryId];
  if (!cat) return null;

  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    feature.address || `${feature.lat},${feature.lng}`
  )}`;

  return (
    <div className="detail-drawer" role="dialog" aria-label={feature.name}>
      <button className="icon-btn detail-close" onClick={onClose} aria-label="Close">
        <X size={16} />
      </button>
      <div
        className="detail-badge"
        style={{
          borderColor: cat.color,
          color: cat.color,
          boxShadow: `0 0 16px ${cat.color}55`,
        }}
      >
        <CategoryIcon name={cat.icon} size={14} color={cat.color} />
        <span>{cat.label}</span>
        {cat.sensitive && <span className="badge-pill">SENSITIVE</span>}
      </div>
      <h2 className="detail-name">{feature.name}</h2>
      {feature.subtitle && <div className="detail-sub">{feature.subtitle}</div>}
      {feature.address && (
        <div className="detail-row">
          <MapPin size={14} />
          <span>{feature.address}</span>
        </div>
      )}
      <p className="detail-desc">{cat.description}</p>
      <div className="detail-actions">
        <a
          className="detail-action"
          href={directions}
          target="_blank"
          rel="noreferrer"
        >
          <Navigation size={14} /> <span>Directions</span>
        </a>
        {feature.meta?.website && (
          <a
            className="detail-action"
            href={feature.meta.website}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={14} /> <span>Website</span>
          </a>
        )}
      </div>
      <div className="detail-meta">
        <span className="detail-source">Source: {feature.source}</span>
        <span className="detail-radius">{cat.extentLabel}</span>
      </div>
    </div>
  );
}
