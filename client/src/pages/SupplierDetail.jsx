import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth, useLoad } from '../lib/auth.jsx';
import { BAND, date, inr, metricTone, pct } from '../lib/format.js';
import { PulseTrace } from '../components/Pulse.jsx';
import SupplierSheet from '../components/SupplierSheet.jsx';
import { DelayQualityChart, ReliabilityChart } from '../components/charts.jsx';
import { BandPill, DataTable, Empty, ErrorNote, Segmented, SeverityPill, Spinner, Tone, useToast } from '../components/ui.jsx';

const LIFE_TONE = { Active: 'good', Lapsed: 'bad', Terminated: 'mute', Draft: 'mute' };

export default function SupplierDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { user, canWrite } = useAuth();
  const { data, error, loading, reload } = useLoad(() => api.get(`/suppliers/${id}/profile`), [id]);
  const [tab, setTab] = useState('Deliveries');
  const [edit, setEdit] = useState(false);

  if (loading) return <Spinner />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  const { supplier: s, metrics: m, trend, contracts, deliveries, evaluations, violations } = data;
  const band = BAND[m.band] || BAND.Unrated;

  async function remove() {
    if (!window.confirm(`Delete ${s.name}? Contracts, reviews and breaches for this supplier are deleted too.`)) return;
    try {
      await api.del(`/suppliers/${s._id}`);
      toast('Supplier deleted');
      nav('/suppliers');
    } catch (e) {
      toast(e.message, 'bad');
    }
  }

  const stats = [
    ['On-time delivery', pct(m.onTimePct), metricTone(m.onTimePct, 92, 85)],
    ['SLA compliance', pct(m.slaCompliance), metricTone(m.slaCompliance, 90, 75)],
    ['Defect rate', pct(m.defectRate, 2), m.defectRate == null ? 'text-quiet' : m.defectRate <= 1.5 ? 'text-ok-text' : m.defectRate <= 2.2 ? 'text-warn-text' : 'text-bad-text'],
    ['Average days late', m.avgLateDays == null ? '–' : `${m.avgLateDays}`, 'text-harbor-800'],
    ['Spend, 12 months', inr(m.spend), 'text-harbor-800'],
    ['Open breaches', m.openViolations, m.openViolations ? 'text-bad-text' : 'text-ok-text'],
  ];

  const tabs = {
    Deliveries: (
      <DataTable
        rows={deliveries}
        columns={[
          { key: 'po', label: 'PO', render: (r) => <span className="font-semibold">{r.poNumber}</span> },
          { key: 'item', label: 'Item' },
          { key: 'order', label: 'Ordered', render: (r) => date(r.orderDate) },
          { key: 'promised', label: 'Promised', render: (r) => date(r.promisedDate) },
          { key: 'result', label: 'Result', render: (r) => r.status !== 'Delivered' ? <Tone tone={r.overdueDays ? 'bad' : 'mute'}>{r.overdueDays ? `Overdue ${r.overdueDays} days` : r.status}</Tone> : r.delayDays <= 0 ? <Tone tone="good">{r.delayDays < 0 ? `${-r.delayDays} days early` : 'On time'}</Tone> : <Tone tone={r.delayDays > 3 ? 'bad' : 'warn'}>{r.delayDays} days late</Tone> },
          { key: 'amount', label: 'Value', align: 'right', render: (r) => <span className="num">{inr(r.amount)}</span> },
        ]}
        empty={<Empty title="No deliveries recorded" />}
      />
    ),
    Contracts: (
      <DataTable
        rows={contracts}
        columns={[
          { key: 'no', label: 'Contract', render: (r) => (<><span className="block font-semibold">{r.contractNumber}</span><span className="text-[13px] text-quiet">{r.title}</span></>) },
          { key: 'term', label: 'Term', render: (r) => `${date(r.startDate)} to ${date(r.endDate)}` },
          { key: 'val', label: 'Annual value', align: 'right', render: (r) => <span className="num">{inr(r.annualValue)}</span> },
          { key: 'sla', label: 'SLA terms', render: (r) => <span className="text-[13px] text-quiet">{r.sla.onTimeTarget}% on time · max {r.sla.maxDelayDays}d late · {r.sla.maxDefectRate}% defects</span> },
          { key: 'life', label: 'Status', render: (r) => <Tone tone={LIFE_TONE[r.lifecycle] || 'warn'}>{r.lifecycle}</Tone> },
        ]}
        empty={<Empty title="No contracts" />}
      />
    ),
    Reviews: (
      <DataTable
        rows={evaluations}
        columns={[
          { key: 'period', label: 'Period', render: (r) => <span className="font-semibold">{r.period}</span> },
          { key: 'overall', label: 'Overall', render: (r) => <span className="num text-lg font-bold">{r.overall.toFixed(2)}<span className="text-sm font-medium text-quiet"> / 5</span></span> },
          { key: 'parts', label: 'Delivery · Quality · Price · Comms · Compliance', render: (r) => <span className="num text-[13px] text-quiet">{['delivery', 'quality', 'pricing', 'communication', 'compliance'].map((k) => r.scores[k]).join(' · ')}</span> },
          { key: 'rec', label: 'Recommendation', render: (r) => <Tone tone={{ Expand: 'good', Maintain: 'info', Improve: 'warn', 'Review for exit': 'bad' }[r.recommendation]}>{r.recommendation}</Tone> },
        ]}
        empty={<Empty title="No reviews yet">Add a quarterly review from the Reviews page.</Empty>}
      />
    ),
    Breaches: (
      <DataTable
        rows={violations}
        columns={[
          { key: 'type', label: 'Breach', render: (r) => (<><span className="block font-semibold">{r.type}</span><span className="text-[13px] text-quiet">{r.detail}</span></>) },
          { key: 'sev', label: 'Severity', render: (r) => <SeverityPill severity={r.severity} /> },
          { key: 'date', label: 'Detected', render: (r) => date(r.detectedAt) },
          { key: 'pen', label: 'Penalty', align: 'right', render: (r) => <span className="num">{inr(r.penalty, { compact: false })}</span> },
          { key: 'st', label: 'Status', render: (r) => <Tone tone={r.status === 'Open' ? 'bad' : r.status === 'Acknowledged' ? 'warn' : 'good'}>{r.status}</Tone> },
        ]}
        empty={<Empty title="No breaches on record" />}
      />
    ),
  };

  return (
    <>
      <Link to="/suppliers" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-quiet hover:text-harbor-800"><ArrowLeft className="h-4 w-4" /> All suppliers</Link>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-bold leading-tight sm:text-[40px]">{s.name}</h1>
          <p className="mt-1.5 text-[15px] text-quiet">{s.code} · {s.category} · {[s.city, s.country].filter(Boolean).join(', ')} · {s.tier} tier</p>
          {(s.contactName || s.email) && <p className="mt-1 text-sm text-quiet">{[s.contactName, s.email, s.phone].filter(Boolean).join(' · ')}</p>}
        </div>
        {canWrite && (
          <div className="flex gap-2">
            <button className="btn-quiet" onClick={() => setEdit(true)}><Pencil className="h-4 w-4" /> Edit</button>
            {user.role === 'admin' && <button className="btn-danger" onClick={remove}><Trash2 className="h-4 w-4" /> Delete</button>}
          </div>
        )}
      </header>

      <section className="panel grid overflow-hidden lg:grid-cols-[340px_1fr]">
        <div className="relative border-b border-line p-6 lg:border-b-0 lg:border-r" style={{ background: band.bg }}>
          <p className="text-sm font-semibold" style={{ color: band.fg }}>Performance score</p>
          <p className="num mt-1 text-[84px] font-bold leading-none" style={{ color: band.fg }}>{m.score == null ? '–' : Math.round(m.score)}</p>
          <div className="mt-3"><BandPill band={m.band} /></div>
          <div className="mt-5 rounded-[3px] bg-white/70 p-2"><PulseTrace values={m.pulse} band={m.band} width={268} height={56} /></div>
          <p className="mt-2 text-xs leading-relaxed" style={{ color: band.fg }}>Built from on-time delivery (35%), quality (25%), SLA compliance (20%) and review scores (20%).</p>
        </div>
        <dl className="grid grid-cols-2 sm:grid-cols-3">
          {stats.map(([k, v, tone], i) => (
            <div key={k} className={`px-5 py-5 ${i % 3 !== 0 ? 'sm:border-l sm:border-line' : ''} ${i % 2 === 1 ? 'max-sm:border-l max-sm:border-line' : ''} ${i >= 2 ? 'border-t border-line' : ''} ${i >= 3 ? '' : 'max-sm:border-t-0'}`}>
              <dt className="text-[13px] font-semibold text-quiet">{k}</dt>
              <dd className={`num mt-1.5 text-[32px] font-bold leading-none ${tone}`}>{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="panel p-5"><h2 className="mb-1 text-xl font-semibold">Reliability by month</h2><ReliabilityChart data={trend} height={230} /></section>
        <section className="panel p-5"><h2 className="mb-1 text-xl font-semibold">Delays and defects by month</h2><DelayQualityChart data={trend} height={230} /></section>
      </div>

      <section className="panel mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
          <h2 className="text-xl font-semibold">Records</h2>
          <Segmented label="Record type" value={tab} onChange={setTab} options={['Deliveries', 'Contracts', 'Reviews', 'Breaches']} />
        </div>
        {tabs[tab]}
      </section>

      <SupplierSheet open={edit} supplier={s} onClose={() => setEdit(false)} onSaved={reload} />
    </>
  );
}
