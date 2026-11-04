import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth, useLoad } from '../lib/auth.jsx';
import { CATEGORIES, metricTone, pct } from '../lib/format.js';
import SupplierSheet from '../components/SupplierSheet.jsx';
import { BandPill, DataTable, Empty, ErrorNote, PageHeader, Spinner, Tone } from '../components/ui.jsx';

const STATUS_TONE = { Active: 'good', 'On hold': 'warn', Offboarded: 'mute' };
const TIER_TONE = { Strategic: 'info', Preferred: 'good', Approved: 'mute', Probation: 'bad' };

export default function Suppliers() {
  const { canWrite } = useAuth();
  const nav = useNavigate();
  const { data, error, loading, reload } = useLoad(async () => {
    const [list, cards] = await Promise.all([api.get('/suppliers'), api.get('/analytics/scorecards')]);
    const byId = new Map(cards.map((c) => [c.supplierId, c]));
    return list.items.map((s) => ({ ...s, m: byId.get(s._id) }));
  });
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [sheet, setSheet] = useState(false);

  const rows = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    return data.filter(
      (s) =>
        (!category || s.category === category) &&
        (!status || s.status === status) &&
        (!needle || [s.name, s.code, s.city, s.contactName].some((x) => x?.toLowerCase().includes(needle)))
    );
  }, [data, q, category, status]);

  const columns = [
    { key: 'name', label: 'Supplier', sort: (r) => r.name, render: (r) => (<><span className="block font-semibold text-harbor-800">{r.name}</span><span className="text-[13px] text-quiet">{r.code} · {r.city || 'No city'}</span></>) },
    { key: 'category', label: 'Category', sort: (r) => r.category },
    { key: 'tier', label: 'Tier', render: (r) => <Tone tone={TIER_TONE[r.tier]}>{r.tier}</Tone> },
    { key: 'score', label: 'Score', sort: (r) => r.m?.score ?? -1, render: (r) => r.m?.score == null ? <span className="text-quiet">Not rated</span> : (<span className="flex items-center gap-2.5"><span className="num w-9 text-xl font-bold">{Math.round(r.m.score)}</span><BandPill band={r.m.band} /></span>) },
    { key: 'ontime', label: 'On time', align: 'right', sort: (r) => r.m?.onTimePct ?? -1, render: (r) => <span className={`num font-semibold ${metricTone(r.m?.onTimePct, 92, 85)}`}>{pct(r.m?.onTimePct, 0)}</span> },
    { key: 'open', label: 'Open breaches', align: 'right', sort: (r) => r.m?.openViolations ?? 0, render: (r) => <span className="num font-semibold">{r.m?.openViolations ?? 0}</span> },
    { key: 'status', label: 'Status', render: (r) => <Tone tone={STATUS_TONE[r.status]}>{r.status}</Tone> },
  ];

  return (
    <>
      <PageHeader
        title="Suppliers"
        sub="Every vendor you buy from, with their current score. Open a supplier to see contracts, deliveries, reviews and breaches."
        actions={canWrite && <button className="btn-primary" onClick={() => setSheet(true)}><Plus className="h-4 w-4" /> Add supplier</button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1 sm:max-w-[340px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-quiet" />
          <input className="input pl-9" placeholder="Search by name, code or city" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search suppliers" />
        </div>
        <select className="input w-auto" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">Any status</option>
          {['Active', 'On hold', 'Offboarded'].map((c) => <option key={c}>{c}</option>)}
        </select>
        {data && <span className="text-sm text-quiet">{rows.length} of {data.length}</span>}
      </div>

      <section className="panel overflow-hidden">
        {loading ? <Spinner /> : error ? <div className="p-4"><ErrorNote message={error} onRetry={reload} /></div> : (
          <DataTable
            columns={columns}
            rows={rows}
            initialSort={{ key: 'score', dir: 'desc' }}
            onRowClick={(r) => nav(`/suppliers/${r._id}`)}
            empty={<Empty title={data?.length ? 'No suppliers match these filters' : 'No suppliers yet'} action={canWrite && !data?.length && <button className="btn-primary" onClick={() => setSheet(true)}>Add your first supplier</button>}>{data?.length ? 'Clear the search or choose a different category.' : 'Add a supplier to start tracking contracts and deliveries.'}</Empty>}
          />
        )}
      </section>

      <SupplierSheet open={sheet} onClose={() => setSheet(false)} onSaved={reload} />
    </>
  );
}
