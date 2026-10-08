'use client';

interface ScoreGaugeProps {
  score: number;
  technical: number;
  content: number;
  indexability: number;
  performance: number;
  internalLink: number;
  structuredData: number;
}

export default function ScoreGauge({
  score,
  technical,
  content,
  indexability,
  performance,
  internalLink,
  structuredData,
}: ScoreGaugeProps) {
  const getScoreColor = (val: number) => {
    if (val >= 80) return '#10b981'; // emerald
    if (val >= 50) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  const color = getScoreColor(score);
  const strokeDashoffset = 283 - (283 * Math.min(100, Math.max(0, score))) / 100;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="card-header">
        <h3 className="card-title">Proprietary Optimization Score</h3>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Algorithmic Audit Engine</span>
      </div>

      <div className="score-gauge-flex">
        {/* Circular Gauge */}
        <div style={{ position: 'relative', width: '130px', height: '130px', flexShrink: 0 }}>
          <svg width="130" height="130" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="transparent"
              stroke="var(--bg-surface)"
              strokeWidth="9"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="transparent"
              stroke={color}
              strokeWidth="9"
              strokeDasharray="283"
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{score}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>/ 100</span>
          </div>
        </div>

        {/* Breakdown details */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem', width: '100%', minWidth: 0 }}>
          <div style={{ background: 'var(--bg-input)', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Technical SEO</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{technical} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ 25</span></div>
          </div>
          <div style={{ background: 'var(--bg-input)', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Content & Headings</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{content} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ 25</span></div>
          </div>
          <div style={{ background: 'var(--bg-input)', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Indexability</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{indexability} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ 15</span></div>
          </div>
          <div style={{ background: 'var(--bg-input)', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Response Speed</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{performance} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ 10</span></div>
          </div>
          <div style={{ background: 'var(--bg-input)', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Internal Linking</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{internalLink} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ 10</span></div>
          </div>
          <div style={{ background: 'var(--bg-input)', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Structured Data</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{structuredData} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ 15</span></div>
          </div>
        </div>
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
        * Calculated dynamically from active crawl diagnostics. Does not represent external search engine ranking algorithms.
      </div>
    </div>
  );
}

