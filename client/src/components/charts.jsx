import { Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { BAND, inr, monthLabel } from '../lib/format.js';

const tick = { fontSize: 12, fill: '#5B6E6A' };
const axisLine = { stroke: '#C2CCC8' };

function Tip({ active, payload, label, render }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[3px] border border-line2 bg-white px-3 py-2 text-[13px] shadow-md">
      {render ? render(payload, label) : (
        <>
          <p className="mb-1 font-semibold text-harbor-800">{label}</p>
          {payload.map((p) => (
            <p key={p.dataKey} className="flex items-center gap-2 text-quiet">
              <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
              {p.name}: <span className="font-semibold text-harbor-800">{p.value == null ? '–' : `${p.value}%`}</span>
            </p>
          ))}
        </>
      )}
    </div>
  );
}

export function ReliabilityChart({ data, height = 260 }) {
  const rows = data.map((d) => ({ ...d, label: monthLabel(d.month) }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rows} margin={{ top: 8, right: 12, left: -6, bottom: 0 }}>
        <CartesianGrid stroke="#E1E7E4" vertical={false} />
        <XAxis dataKey="label" tick={tick} axisLine={axisLine} tickLine={false} />
        <YAxis domain={[40, 100]} tick={tick} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
        <Tooltip content={<Tip />} />
        <Legend iconType="plainline" wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />
        <Line type="monotone" dataKey="onTimePct" name="On-time delivery" stroke="#3355FF" strokeWidth={2.5} dot={{ r: 2.5 }} connectNulls />
        <Line type="monotone" dataKey="slaCompliance" name="SLA compliance" stroke="#1F9D6B" strokeWidth={2.5} strokeDasharray="6 4" dot={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DelayQualityChart({ data, height = 260 }) {
  const rows = data.map((d) => ({ ...d, label: monthLabel(d.month) }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rows} margin={{ top: 8, right: 12, left: -6, bottom: 0 }}>
        <CartesianGrid stroke="#E1E7E4" vertical={false} />
        <XAxis dataKey="label" tick={tick} axisLine={axisLine} tickLine={false} />
        <YAxis yAxisId="d" tick={tick} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}d`} />
        <YAxis yAxisId="q" orientation="right" tick={tick} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
        <Tooltip
          content={
            <Tip
              render={(pl, label) => (
                <>
                  <p className="mb-1 font-semibold text-harbor-800">{label}</p>
                  {pl.map((p) => (
                    <p key={p.dataKey} className="flex items-center gap-2 text-quiet">
                      <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                      {p.name}: <span className="font-semibold text-harbor-800">{p.value == null ? '–' : p.dataKey === 'avgDelayDays' ? `${p.value} days` : `${p.value}%`}</span>
                    </p>
                  ))}
                </>
              )}
            />
          }
        />
        <Legend iconType="plainline" wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />
        <Line yAxisId="d" type="monotone" dataKey="avgDelayDays" name="Average delay (days)" stroke="#D68A0C" strokeWidth={2.5} dot={{ r: 2.5 }} connectNulls />
        <Line yAxisId="q" type="monotone" dataKey="defectRate" name="Defect rate" stroke="#D93A4B" strokeWidth={2.5} strokeDasharray="6 4" dot={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Each supplier is a dot: right = more on time, lower = fewer defects, bigger = more spend.
export function QuadrantChart({ rows, height = 300 }) {
  const pts = rows.filter((r) => r.onTimePct != null && r.defectRate != null);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 10, right: 16, left: -4, bottom: 20 }}>
        <CartesianGrid stroke="#E1E7E4" />
        <XAxis type="number" dataKey="onTimePct" name="On-time" domain={[55, 100]} tick={tick} axisLine={axisLine} tickLine={false} tickFormatter={(v) => `${v}%`} label={{ value: 'On-time delivery', position: 'insideBottom', offset: -10, fontSize: 12, fill: '#5B6E6A' }} />
        <YAxis type="number" dataKey="defectRate" name="Defects" domain={[0, (m) => Math.max(3, Math.ceil(m))]} tick={tick} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} label={{ value: 'Defect rate', angle: -90, position: 'insideLeft', offset: 14, fontSize: 12, fill: '#5B6E6A' }} />
        <ZAxis type="number" dataKey="spend" range={[70, 420]} />
        <ReferenceLine x={90} stroke="#8A9A96" strokeDasharray="4 4" />
        <ReferenceLine y={2} stroke="#8A9A96" strokeDasharray="4 4" />
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          content={
            <Tip
              render={(pl) => {
                const r = pl[0]?.payload;
                return (
                  <>
                    <p className="font-semibold text-harbor-800">{r.name}</p>
                    <p className="text-quiet">On-time {r.onTimePct}% · Defects {r.defectRate}%</p>
                    <p className="text-quiet">Spend {inr(r.spend)} · {r.band}</p>
                  </>
                );
              }}
            />
          }
        />
        <Scatter data={pts}>
          {pts.map((r) => (
            <Cell key={r.supplierId} fill={BAND[r.band]?.stroke} fillOpacity={0.85} stroke="#fff" strokeWidth={1.5} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}

export function SpendChart({ rows, height = 300 }) {
  const top = rows.slice(0, 8);
  return (
    <ResponsiveContainer width="100%" height={Math.max(height, top.length * 38)}>
      <BarChart data={top} layout="vertical" margin={{ top: 0, right: 64, left: 0, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={168} tick={{ ...tick, fill: '#17394F' }} axisLine={false} tickLine={false} tickFormatter={(v) => (v.length > 24 ? v.slice(0, 23) + '…' : v)} />
        <Tooltip cursor={{ fill: 'rgba(14,36,51,0.05)' }} content={<Tip render={(pl) => <p><span className="font-semibold text-harbor-800">{pl[0].payload.name}</span> <span className="text-quiet">{inr(pl[0].value)}</span></p>} />} />
        <Bar dataKey="spend" fill="#24506A" radius={[0, 3, 3, 0]} barSize={18}>
          <LabelList dataKey="spend" position="right" formatter={(v) => inr(v)} style={{ fontSize: 12, fill: '#17394F', fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
