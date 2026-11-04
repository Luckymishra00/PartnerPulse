import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Legend, Line, Pie, PieChart, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { BAND, inr, monthLabel } from '../lib/format.js';

const tick = { fontSize: 12, fill: '#5B6E6A' };
const axisLine = { stroke: '#C2CCC8' };
const grid = '#E1E7E4';
const INK = '#17394F';
const CAT_COLORS = ['#3355FF', '#24506A', '#1F9D6B', '#D68A0C', '#8A6FD6', '#D93A4B', '#3A6A86', '#8A9A96'];

function Tip({ active, payload, label, children }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[3px] border border-line2 bg-white px-3 py-2 text-[13px] shadow-md">
      {children ? children(payload, label) : null}
    </div>
  );
}

// A chart with its own title and a one-line reading of what it shows
export function ChartPanel({ title, takeaway, children, className = '' }) {
  return (
    <section className={`panel p-5 ${className}`}>
      <h3 className="text-lg font-semibold text-harbor-800">{title}</h3>
      {takeaway && <p className="mb-3 mt-0.5 max-w-[60ch] text-sm leading-snug text-quiet">{takeaway}</p>}
      {children}
    </section>
  );
}

// Every supplier ranked by score, coloured by band
export function ScoreRanking({ rows }) {
  const sorted = [...rows].sort((a, b) => b.score - a.score);
  return (
    <ResponsiveContainer width="100%" height={Math.max(260, sorted.length * 30)}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
        <XAxis type="number" domain={[0, 100]} hide />
        <YAxis type="category" dataKey="name" width={170} tick={{ ...tick, fill: INK }} axisLine={false} tickLine={false} tickFormatter={(v) => (v.length > 24 ? v.slice(0, 23) + '…' : v)} />
        <ReferenceLine x={78} stroke="#8A9A96" strokeDasharray="4 4" />
        <Tooltip cursor={{ fill: 'rgba(14,36,51,0.05)' }} content={<Tip>{(pl) => <p><span className="font-semibold text-harbor-800">{pl[0].payload.name}</span> <span className="text-quiet">{pl[0].payload.band}, score {pl[0].value}</span></p>}</Tip>} />
        <Bar dataKey="score" barSize={16} radius={[0, 3, 3, 0]}>
          {sorted.map((r) => <Cell key={r.supplierId} fill={BAND[r.band]?.stroke} />)}
          <LabelList dataKey="score" position="right" style={{ fontSize: 12, fill: INK, fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// How late or early deliveries arrive
export function DelayHistogram({ rows }) {
  return (
    <ResponsiveContainer width="100%" height={270}>
      <BarChart data={rows} margin={{ top: 18, right: 8, left: -14, bottom: 0 }}>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey="label" tick={{ ...tick, fontSize: 11 }} axisLine={axisLine} tickLine={false} interval={0} />
        <YAxis tick={tick} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip cursor={{ fill: 'rgba(14,36,51,0.05)' }} content={<Tip>{(pl) => <p><span className="font-semibold text-harbor-800">{pl[0].payload.label}</span> <span className="text-quiet">{pl[0].value} deliveries</span></p>}</Tip>} />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {rows.map((r, i) => <Cell key={r.label} fill={!r.late ? '#1F9D6B' : i < 4 ? '#E3A02B' : '#D93A4B'} />)}
          <LabelList dataKey="count" position="top" style={{ fontSize: 12, fill: INK, fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// SLA breaches by kind, stacked by severity
export function BreachMix({ rows }) {
  return (
    <ResponsiveContainer width="100%" height={270}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey="type" tick={tick} axisLine={axisLine} tickLine={false} />
        <YAxis tick={tick} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip cursor={{ fill: 'rgba(14,36,51,0.05)' }} content={<Tip>{(pl) => { const r = pl[0].payload; return (<><p className="font-semibold text-harbor-800">{r.type}</p><p className="text-quiet">{r.Minor} minor, {r.Major} major, {r.Critical} critical</p><p className="text-quiet">Penalties {inr(r.penalty)}</p></>); }}</Tip>} />
        <Legend iconType="square" wrapperStyle={{ fontSize: 13 }} />
        <Bar dataKey="Minor" stackId="s" fill="#8A9A96" />
        <Bar dataKey="Major" stackId="s" fill="#E3A02B" />
        <Bar dataKey="Critical" stackId="s" fill="#D93A4B" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// On-time % and SLA compliance by category
export function CategoryPerformance({ rows }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(270, rows.length * 46)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }} barCategoryGap={10}>
        <CartesianGrid stroke={grid} horizontal={false} />
        <XAxis type="number" domain={[40, 100]} tick={tick} axisLine={axisLine} tickLine={false} tickFormatter={(v) => `${v}%`} />
        <YAxis type="category" dataKey="category" width={116} tick={{ ...tick, fill: INK }} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: 'rgba(14,36,51,0.05)' }} content={<Tip>{(pl) => <><p className="font-semibold text-harbor-800">{pl[0].payload.category}</p><p className="text-quiet">{pl[0].payload.suppliers} suppliers, spend {inr(pl[0].payload.spend)}</p>{pl.map((p) => <p key={p.dataKey} className="text-quiet">{p.name}: <span className="font-semibold text-harbor-800">{p.value ?? '–'}%</span></p>)}</>}</Tip>} />
        <Legend iconType="square" wrapperStyle={{ fontSize: 13 }} />
        <Bar dataKey="onTimePct" name="On-time delivery" fill="#3355FF" barSize={11} radius={[0, 3, 3, 0]} />
        <Bar dataKey="slaCompliance" name="SLA compliance" fill="#1F9D6B" barSize={11} radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Monthly spend (bars) against deliveries received (line)
export function SpendVolume({ rows }) {
  const data = rows.map((r) => ({ ...r, label: monthLabel(r.month) }));
  return (
    <ResponsiveContainer width="100%" height={270}>
      <ComposedChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey="label" tick={tick} axisLine={axisLine} tickLine={false} />
        <YAxis yAxisId="s" tick={tick} tickLine={false} axisLine={false} tickFormatter={(v) => inr(v)} width={64} />
        <YAxis yAxisId="n" orientation="right" tick={tick} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
        <Tooltip cursor={{ fill: 'rgba(14,36,51,0.05)' }} content={<Tip>{(pl, label) => <><p className="font-semibold text-harbor-800">{label}</p>{pl.map((p) => <p key={p.dataKey} className="text-quiet">{p.name}: <span className="font-semibold text-harbor-800">{p.dataKey === 'spend' ? inr(p.value) : p.value}</span></p>)}</>}</Tip>} />
        <Legend iconType="square" wrapperStyle={{ fontSize: 13 }} />
        <Bar yAxisId="s" dataKey="spend" name="Spend" fill="#24506A" radius={[3, 3, 0, 0]} />
        <Line yAxisId="n" type="monotone" dataKey="delivered" name="Deliveries received" stroke="#E3A02B" strokeWidth={2.5} dot={{ r: 2.5 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// Share of spend by category
export function SpendShare({ rows }) {
  const total = rows.reduce((a, r) => a + r.spend, 0) || 1;
  return (
    <div className="grid items-center gap-4 sm:grid-cols-[200px_1fr]">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={rows} dataKey="spend" nameKey="category" innerRadius={56} outerRadius={92} paddingAngle={2} stroke="#fff" strokeWidth={2}>
            {rows.map((r, i) => <Cell key={r.category} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
          </Pie>
          <Tooltip content={<Tip>{(pl) => <p><span className="font-semibold text-harbor-800">{pl[0].name}</span> <span className="text-quiet">{inr(pl[0].value)} ({((pl[0].value / total) * 100).toFixed(0)}%)</span></p>}</Tip>} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="space-y-1.5 text-sm">
        {rows.map((r, i) => (
          <li key={r.category} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />{r.category}</span>
            <span className="num text-quiet">{inr(r.spend)} <span className="text-harbor-800">{((r.spend / total) * 100).toFixed(0)}%</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Does money go to the suppliers who perform? Right = more spend, up = better score.
export function ScoreVsSpend({ rows }) {
  return (
    <ResponsiveContainer width="100%" height={290}>
      <ScatterChart margin={{ top: 10, right: 16, left: 0, bottom: 22 }}>
        <CartesianGrid stroke={grid} />
        <XAxis type="number" dataKey="spend" name="Spend" tick={tick} axisLine={axisLine} tickLine={false} tickFormatter={(v) => inr(v)} label={{ value: 'Spend, last 12 months', position: 'insideBottom', offset: -12, fontSize: 12, fill: '#5B6E6A' }} />
        <YAxis type="number" dataKey="score" name="Score" domain={[40, 100]} tick={tick} axisLine={false} tickLine={false} width={40} label={{ value: 'Score', angle: -90, position: 'insideLeft', offset: 14, fontSize: 12, fill: '#5B6E6A' }} />
        <ZAxis range={[90, 90]} />
        <ReferenceLine y={78} stroke="#8A9A96" strokeDasharray="4 4" />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<Tip>{(pl) => { const r = pl[0].payload; return (<><p className="font-semibold text-harbor-800">{r.name}</p><p className="text-quiet">Score {r.score}, {r.band}</p><p className="text-quiet">Spend {inr(r.spend)}</p></>); }}</Tip>} />
        <Scatter data={rows}>
          {rows.map((r) => <Cell key={r.supplierId} fill={BAND[r.band]?.stroke} fillOpacity={0.9} stroke="#fff" strokeWidth={1.5} />)}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}

// Contract value that comes up for renewal each month
export function RenewalMonths({ rows }) {
  const data = rows.map((r) => ({ ...r, label: monthLabel(r.month) }));
  return (
    <ResponsiveContainer width="100%" height={270}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey="label" tick={tick} axisLine={axisLine} tickLine={false} />
        <YAxis tick={tick} tickLine={false} axisLine={false} tickFormatter={(v) => inr(v)} width={64} />
        <Tooltip cursor={{ fill: 'rgba(14,36,51,0.05)' }} content={<Tip>{(pl) => <><p className="font-semibold text-harbor-800">{pl[0].payload.label}</p><p className="text-quiet">{pl[0].payload.count} contract{pl[0].payload.count === 1 ? '' : 's'} end, {inr(pl[0].value)}</p></>}</Tip>} />
        <Bar dataKey="value" fill="#3355FF" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Breaches detected each month
export function BreachTrend({ rows }) {
  const data = rows.map((r) => ({ ...r, label: monthLabel(r.month) }));
  return (
    <ResponsiveContainer width="100%" height={270}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey="label" tick={tick} axisLine={axisLine} tickLine={false} />
        <YAxis tick={tick} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip cursor={{ fill: 'rgba(14,36,51,0.05)' }} content={<Tip>{(pl) => <p><span className="font-semibold text-harbor-800">{pl[0].payload.label}</span> <span className="text-quiet">{pl[0].value} breaches</span></p>}</Tip>} />
        <Bar dataKey="violations" fill="#D93A4B" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
