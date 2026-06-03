import { ShieldAlert, ShieldCheck } from 'lucide-react';

export default function Legend({ sensitiveCount, awarenessCount, insideSensitive }) {
  return (
    <div className="legend">
      <div className={`legend-pill ${insideSensitive ? 'legend-warn' : 'legend-ok'}`}>
        {insideSensitive ? (
          <>
            <ShieldAlert size={14} />
            <span>Inside a sensitive zone</span>
          </>
        ) : (
          <>
            <ShieldCheck size={14} />
            <span>Clear of visible zones</span>
          </>
        )}
      </div>
      <div className="legend-counts">
        <span className="legend-count legend-warn-text">{sensitiveCount} sensitive</span>
        <span className="legend-sep">·</span>
        <span className="legend-count legend-amber-text">{awarenessCount} aware</span>
      </div>
    </div>
  );
}
