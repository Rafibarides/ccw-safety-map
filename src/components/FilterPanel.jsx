import { useEffect } from 'react';
import { X, SlidersHorizontal, Circle, EyeOff, Eye } from 'lucide-react';
import { CATEGORIES } from '../data/categories.js';
import CategoryIcon from './CategoryIcon.jsx';

export default function FilterPanel({
  open,
  onClose,
  enabled,
  onToggle,
  onAll,
  onNone,
  showRadii,
  onToggleRadii,
  radiusScale,
  onRadiusScale,
  counts,
}) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        className={`scrim ${open ? 'scrim-open' : ''}`}
        onClick={onClose}
        aria-hidden
      />
      <aside className={`filter-panel ${open ? 'filter-panel-open' : ''}`}>
        <div className="panel-handle" aria-hidden />
        <header className="panel-header">
          <div className="panel-title">
            <SlidersHorizontal size={16} />
            <span>Layers & Awareness</span>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </header>

        <div className="panel-section">
          <div className="panel-section-title">Awareness radii</div>
          <div className="radius-row">
            <button
              className={`pill-btn ${showRadii ? 'pill-on' : ''}`}
              onClick={() => onToggleRadii(!showRadii)}
            >
              {showRadii ? <Eye size={14} /> : <EyeOff size={14} />}
              <span>{showRadii ? 'Bubbles on' : 'Bubbles off'}</span>
            </button>
            <div className="scale-group" role="group" aria-label="Radius scale">
              {[0.5, 1, 1.5, 2].map((s) => (
                <button
                  key={s}
                  className={`scale-btn ${radiusScale === s ? 'scale-on' : ''}`}
                  onClick={() => onRadiusScale(s)}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="panel-section">
          <div className="panel-section-title-row">
            <span className="panel-section-title">Sensitive layers</span>
            <div className="bulk-actions">
              <button className="link-btn" onClick={onAll}>All</button>
              <span className="dot-sep">·</span>
              <button className="link-btn" onClick={onNone}>None</button>
            </div>
          </div>
          <ul className="cat-list">
            {CATEGORIES.map((c) => {
              const on = enabled.includes(c.id);
              const count = counts?.[c.id] ?? 0;
              return (
                <li key={c.id}>
                  <button
                    className={`cat-row ${on ? 'cat-on' : ''}`}
                    onClick={() => onToggle(c.id)}
                    aria-pressed={on}
                  >
                    <span
                      className="cat-swatch"
                      style={{
                        background: on ? c.color : 'transparent',
                        borderColor: c.color,
                        boxShadow: on ? `0 0 10px ${c.color}` : 'none',
                      }}
                    >
                      <CategoryIcon
                        name={c.icon}
                        size={14}
                        color={on ? '#05070d' : c.color}
                        strokeWidth={2.4}
                      />
                    </span>
                    <span className="cat-text">
                      <span className="cat-label">{c.label}</span>
                      <span className="cat-sub">
                        {c.sensitive ? 'Sensitive' : 'Awareness'} · {c.radiusFt} ft
                      </span>
                    </span>
                    <span className="cat-count">
                      <Circle
                        size={6}
                        fill={count > 0 ? c.color : 'transparent'}
                        color={c.color}
                      />
                      <span>{count}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="panel-footer">
          <p className="disclaimer">
            Awareness tool only. Not legal advice. NY CCIA sensitive-location
            rules and federal law change; verify before carrying.
          </p>
        </div>
      </aside>
    </>
  );
}
