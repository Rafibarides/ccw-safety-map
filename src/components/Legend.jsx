import { Info, ShieldAlert, ShieldCheck } from 'lucide-react';

export default function Legend({ status, sensitiveCount, awarenessCount }) {
  const tone = status?.tone || 'ok';
  const Icon = tone === 'ok' ? ShieldCheck : tone === 'info' ? Info : ShieldAlert;

  return (
    <div className="legend">
      <div className={`legend-pill legend-${tone === 'warn' ? 'warn' : tone === 'info' ? 'info' : 'ok'}`}>
        <Icon size={14} />
        <span className="legend-copy">
          <span className="legend-title">{status?.title || 'Outside mapped no-carry areas'}</span>
          {status?.detail && <span className="legend-detail">{status.detail}</span>}
        </span>
      </div>
      <div className="legend-counts">
        <span className="legend-count legend-warn-text">{sensitiveCount} sensitive</span>
        <span className="legend-sep">·</span>
        <span className="legend-count legend-amber-text">{awarenessCount} aware</span>
      </div>
    </div>
  );
}
