import { useMemo } from 'react';
import { BAND } from '../lib/format.js';

// The product's signature: a supplier's last 12 months drawn as a vital-signs trace.
// The line draws itself once on load; the end point carries a ring that pulses twice.
export function PulseTrace({ values = [], band = 'Reliable', width = 168, height = 40, delay = 0, label }) {
  const stroke = BAND[band]?.stroke || BAND.Unrated.stroke;
  const geo = useMemo(() => {
    const vs = values.filter((v) => v != null);
    if (vs.length < 2) return null;
    const lo = Math.min(...vs);
    const hi = Math.max(...vs);
    const span = Math.max(hi - lo, 14);
    const mid = (hi + lo) / 2;
    const pad = 6;
    const pts = values.map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (width - pad * 2);
      const y = height - pad - (((v ?? mid) - (mid - span / 2)) / span) * (height - pad * 2);
      return [x, y];
    });
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return { pts, len: Math.ceil(len) + 4, d: pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ') };
  }, [values, width, height]);

  if (!geo) return <span className="text-xs text-quiet">Not enough history</span>;
  const [ex, ey] = geo.pts[geo.pts.length - 1];
  const first = values.find((v) => v != null);
  const last = [...values].reverse().find((v) => v != null);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label || `Performance over 12 months: from ${Math.round(first)} to ${Math.round(last)}`}>
      <line x1="0" x2={width} y1={height / 2} y2={height / 2} stroke="#D6DDDA" strokeWidth="1" strokeDasharray="2 4" />
      <path
        d={geo.d}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="miter"
        strokeLinecap="round"
        className="trace-line"
        style={{ '--len': geo.len, '--delay': `${delay}ms` }}
      />
      <circle cx={ex} cy={ey} r="3.2" fill={stroke} />
      <circle cx={ex} cy={ey} r="3.2" fill={stroke} className="animate-ring" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
    </svg>
  );
}

export function PulseMark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#17394F" />
      <path d="M3.5 17h6.5l3-8 5 15 3-7h7.5" fill="none" stroke="#7F93FF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="miter" />
    </svg>
  );
}

// Long decorative heartbeat for the sign-in screen
export function HeartbeatLine({ className = '' }) {
  const d = useMemo(() => {
    const base = 120;
    let x = 0;
    let p = `M0 ${base}`;
    const beat = (s) => {
      p += ` L${x + 40 * s} ${base} L${x + 52 * s} ${base - 10} L${x + 64 * s} ${base} L${x + 86 * s} ${base} L${x + 94 * s} ${base + 14} L${x + 104 * s} ${base - 92} L${x + 116 * s} ${base + 52} L${x + 124 * s} ${base} L${x + 150 * s} ${base} L${x + 166 * s} ${base - 20} L${x + 184 * s} ${base}`;
      x += 184 * s;
    };
    const gaps = [0.9, 1.15, 0.8, 1.05, 0.95, 1.2, 0.85];
    for (const g of gaps) {
      p += ` L${x + 90} ${base}`;
      x += 90;
      beat(g);
    }
    p += ` L${x + 400} ${base}`;
    return p;
  }, []);
  return (
    <svg className={className} viewBox="0 0 1800 240" preserveAspectRatio="xMinYMid slice" aria-hidden="true">
      <path d={d} fill="none" stroke="#7F93FF" strokeWidth="2.5" strokeLinejoin="miter" strokeLinecap="round" className="trace-line" style={{ '--len': 4200, '--delay': '300ms', animationDuration: '3.2s' }} />
    </svg>
  );
}
