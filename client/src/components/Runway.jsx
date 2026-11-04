import { Link } from 'react-router-dom';
import { date, inr } from '../lib/format.js';

const ZONES = [
  { from: 0, to: 30, bg: '#FBE4E7', label: '30' },
  { from: 30, to: 60, bg: '#FBF0D9', label: '60' },
  { from: 60, to: 90, bg: '#E6EAFF', label: '90' },
];
const SPAN = 100; // days shown on the runway

// Contracts plotted by how many days remain: the closer to "today" (left edge), the more urgent.
export default function Runway({ rows, linkTo = (r) => `/suppliers/${r.supplierId}` }) {
  if (!rows.length) return <p className="px-5 py-8 text-center text-sm text-quiet">No contracts end in the next 90 days.</p>;
  return (
    <div className="px-5 py-4">
      <div className="relative ml-0 sm:ml-[210px]">
        <div className="relative h-6 text-[11px] font-semibold text-quiet" aria-hidden="true">
          <span className="absolute left-0">Today</span>
          {[30, 60, 90].map((d) => (
            <span key={d} className="absolute -translate-x-1/2" style={{ left: `${(d / SPAN) * 100}%` }}>{d} days</span>
          ))}
        </div>
      </div>
      <ul className="space-y-1.5">
        {rows.map((r) => {
          const left = Math.min(Math.max(r.daysLeft, 0), SPAN) / SPAN * 100;
          const lapsed = r.daysLeft < 0;
          return (
            <li key={r.contractId} className="items-center gap-3 sm:flex">
              <div className="mb-1 min-w-0 sm:mb-0 sm:w-[198px] sm:shrink-0">
                <Link to={linkTo(r)} className="block truncate text-sm font-semibold text-harbor-800 hover:text-signal">{r.supplierName}</Link>
                <p className="truncate text-xs text-quiet">{r.contractNumber} · {inr(r.annualValue)} a year</p>
              </div>
              <div className="relative h-9 flex-1 overflow-hidden rounded-[3px]">
                {ZONES.map((z) => (
                  <span key={z.label} className="absolute inset-y-0" style={{ left: `${(z.from / SPAN) * 100}%`, width: `${((z.to - z.from) / SPAN) * 100}%`, background: z.bg }} />
                ))}
                <span className="absolute inset-y-0 right-0 bg-[#EEF1EF]" style={{ left: `${(90 / SPAN) * 100}%` }} />
                <span
                  className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-white shadow"
                  style={{ left: `calc(${left}% - ${left > 50 ? 7 : 0}px)`, background: lapsed ? '#D93A4B' : r.daysLeft <= 30 ? '#D93A4B' : r.daysLeft <= 60 ? '#D68A0C' : '#3355FF' }}
                />
                <span className={`absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-xs font-semibold ${lapsed || r.daysLeft <= 30 ? 'text-bad-text' : 'text-harbor-800'}`} style={left > 62 ? { right: `${100 - left + 3}%` } : { left: `calc(${left}% + 16px)` }}>
                  {lapsed ? `Lapsed ${Math.abs(r.daysLeft)} days ago` : `Ends ${date(r.endDate)}`}
                  {r.noticeOverdue && !lapsed ? (r.autoRenew ? ' · auto-renews' : ' · notice date passed') : ''}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
