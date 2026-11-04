import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth, useLoad } from '../lib/auth.jsx';
import { date, inr, pct } from '../lib/format.js';
import { useForm } from '../lib/useForm.js';
import { DataTable, Empty, ErrorNote, Field, FigureBand, PageHeader, SectionTitle, Segmented, SeverityPill, Sheet, Spinner, Tone, useToast } from '../components/ui.jsx';

const STATUS_TONE = { Open: 'bad', Acknowledged: 'warn', Resolved: 'good', Waived: 'mute' };

function BreachSheet({ open, suppliers, onClose, onSaved }) {
  const f = useForm({ supplier: '', type: 'Response time', severity: 'Minor', detail: '', penalty: 0 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (open) { setError(''); f.setV({ supplier: '', type: 'Response time', severity: 'Minor', detail: '', penalty: 0 }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/violations', f.v);
      toast('Breach logged');
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Log a breach"
      subtitle="Late and defective deliveries are raised automatically. Use this for anything else, such as slow support responses."
      footer={<><button type="button" className="btn-quiet" onClick={onClose}>Cancel</button><button form="breach-form" className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Log breach'}</button></>}
    >
      <form id="breach-form" onSubmit={save} className="grid grid-cols-2 gap-4">
        <Field label="Supplier" className="col-span-2">
          <select className="input" required {...f.bind('supplier')}>
            <option value="">Choose a supplier</option>
            {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Type"><select className="input" {...f.bind('type')}>{['Response time', 'Late delivery', 'Quality defect', 'Other'].map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Severity"><select className="input" {...f.bind('severity')}>{['Minor', 'Major', 'Critical'].map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="What happened" className="col-span-2"><textarea className="input" rows={3} required {...f.bind('detail')} /></Field>
        <Field label="Penalty (₹)" className="col-span-2"><input className="input" type="number" min="0" {...f.bind('penalty')} /></Field>
        {error && <p role="alert" className="col-span-2 rounded-[3px] bg-bad-tint px-3 py-2 text-sm font-medium text-bad-text">{error}</p>}
      </form>
    </Sheet>
  );
}

export default function SlaWatch() {
  const { canWrite } = useAuth();
  const toast = useToast();
  const { data, error, loading, reload } = useLoad(async () => {
    const [v, s, c, cards] = await Promise.all([api.get('/violations?limit=2000'), api.get('/suppliers?limit=1000'), api.get('/contracts?limit=1000'), api.get('/analytics/scorecards')]);
    return { violations: v.items, suppliers: s.items, contracts: c.items, cards };
  });
  const [status, setStatus] = useState('Open');
  const [severity, setSeverity] = useState('');
  const [type, setType] = useState('');
  const [limit, setLimit] = useState(100);
  const [sheet, setSheet] = useState(false);

  const rows = useMemo(() => (data ? data.violations.filter((v) => (status === 'All' || v.status === status) && (!severity || v.severity === severity) && (!type || v.type === type)) : []), [data, status, severity, type]);

  if (loading) return <Spinner />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;

  const open = data.violations.filter((v) => v.status === 'Open');
  const month = Date.now() - 30 * 86400000;
  const resolvedRecently = data.violations.filter((v) => ['Resolved', 'Waived'].includes(v.status) && v.resolvedAt && new Date(v.resolvedAt) > month).length;

  async function setState(v, next) {
    try {
      await api.put(`/violations/${v._id}`, { status: next });
      toast(`Marked ${next.toLowerCase()}`);
      reload();
    } catch (e) {
      toast(e.message, 'bad');
    }
  }

  const columns = [
    { key: 'sup', label: 'Supplier', sort: (r) => r.supplier?.name, render: (r) => (<><span className="block font-semibold">{r.supplier?.name}</span><span className="text-[13px] text-quiet">{r.delivery?.poNumber || r.contract?.contractNumber || 'Logged manually'}</span></>) },
    { key: 'detail', label: 'Breach', className: 'min-w-[280px]', render: (r) => (<><span className="block font-semibold">{r.type}</span><span className="text-[13px] leading-snug text-quiet">{r.detail}</span></>) },
    { key: 'sev', label: 'Severity', sort: (r) => ({ Minor: 1, Major: 2, Critical: 3 }[r.severity]), render: (r) => <SeverityPill severity={r.severity} /> },
    { key: 'date', label: 'Detected', sort: (r) => new Date(r.detectedAt).getTime(), render: (r) => date(r.detectedAt) },
    { key: 'pen', label: 'Penalty', align: 'right', sort: (r) => r.penalty, render: (r) => <span className="num">{inr(r.penalty, { compact: false })}</span> },
    { key: 'st', label: 'Status', sort: (r) => r.status, render: (r) => <Tone tone={STATUS_TONE[r.status]}>{r.status}</Tone> },
    ...(canWrite ? [{ key: 'act', label: '', render: (r) => (
      <div className="flex gap-1.5">
        {r.status === 'Open' && <button className="btn-quiet h-8" onClick={() => setState(r, 'Acknowledged')}>Acknowledge</button>}
        {['Open', 'Acknowledged'].includes(r.status) && <button className="btn-quiet h-8" onClick={() => setState(r, 'Resolved')}>Resolve</button>}
        {['Open', 'Acknowledged'].includes(r.status) && <button className="btn-ghost h-8" onClick={() => setState(r, 'Waived')}>Waive</button>}
        {['Resolved', 'Waived'].includes(r.status) && <button className="btn-ghost h-8" onClick={() => setState(r, 'Open')}>Reopen</button>}
      </div>
    ) }] : []),
  ];

  // Contract promises vs what each supplier actually delivered over the last 12 months
  const cardById = new Map(data.cards.map((c) => [c.supplierId, c]));
  const scoreboard = data.contracts
    .filter((c) => c.state === 'Active')
    .map((c) => ({ c, m: cardById.get(c.supplier?._id) }))
    .filter((x) => x.m && x.m.delivered > 0)
    .map(({ c, m }) => ({ ...c, m, ontimeGap: m.onTimePct - c.sla.onTimeTarget, defectOver: m.defectRate - c.sla.maxDefectRate }))
    .sort((a, b) => a.ontimeGap - b.ontimeGap);

  const scoreCols = [
    { key: 'sup', label: 'Supplier', render: (r) => (<><span className="block font-semibold">{r.supplier?.name}</span><span className="text-[13px] text-quiet">{r.contractNumber}</span></>) },
    { key: 'ot', label: 'On-time: promised vs actual', sort: (r) => r.ontimeGap, render: (r) => (<span className="num"><span className="text-quiet">{r.sla.onTimeTarget}% → </span><span className="font-semibold">{pct(r.m.onTimePct)}</span></span>) },
    { key: 'otg', label: 'Gap', align: 'right', sort: (r) => r.ontimeGap, render: (r) => <span className={`num font-semibold ${r.ontimeGap >= 0 ? 'text-ok-text' : r.ontimeGap > -8 ? 'text-warn-text' : 'text-bad-text'}`}>{r.ontimeGap >= 0 ? '+' : ''}{r.ontimeGap.toFixed(1)} pts</span> },
    { key: 'df', label: 'Defects: limit vs actual', sort: (r) => r.defectOver, render: (r) => (<span className="num"><span className="text-quiet">{r.sla.maxDefectRate}% → </span><span className="font-semibold">{pct(r.m.defectRate, 2)}</span></span>) },
    { key: 'sla', label: 'Deliveries within SLA', align: 'right', sort: (r) => r.m.slaCompliance, render: (r) => <span className="num font-semibold">{pct(r.m.slaCompliance, 0)}</span> },
    { key: 'res', label: 'Verdict', render: (r) => (r.ontimeGap >= 0 && r.defectOver <= 0 ? <Tone tone="good">Meeting terms</Tone> : r.ontimeGap >= 0 || r.defectOver <= 0 ? <Tone tone="warn">Partly meeting</Tone> : <Tone tone="bad">Missing both</Tone>) },
  ];

  return (
    <>
      <PageHeader
        title="SLA watch"
        sub="Where suppliers have broken the terms of their contracts, and how far each one is from what it promised."
        actions={canWrite && <button className="btn-primary" onClick={() => setSheet(true)}><Plus className="h-4 w-4" /> Log a breach</button>}
      />

      <FigureBand
        items={[
          { label: 'Open breaches', value: open.length, tone: open.length ? 'text-bad-text' : 'text-ok-text', note: `${open.filter((v) => v.severity === 'Critical').length} critical · ${open.filter((v) => v.severity === 'Major').length} major` },
          { label: 'Penalties still open', value: inr(open.reduce((s, v) => s + v.penalty, 0)), note: 'Claimable from suppliers' },
          { label: 'Resolved in 30 days', value: resolvedRecently, note: 'Including waived breaches' },
          { label: 'Suppliers with an open breach', value: new Set(open.map((v) => v.supplier?._id)).size, note: `Of ${data.suppliers.filter((s) => s.status === 'Active').length} active suppliers` },
        ]}
      />

      <div className="mb-3 mt-8 flex flex-wrap items-center gap-3">
        <Segmented label="Breach status" value={status} onChange={(v) => { setStatus(v); setLimit(100); }} options={['Open', 'Acknowledged', 'Resolved', 'All']} />
        <select className="input w-auto" value={severity} onChange={(e) => setSeverity(e.target.value)} aria-label="Filter by severity">
          <option value="">Any severity</option>{['Critical', 'Major', 'Minor'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className="input w-auto" value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type">
          <option value="">Any type</option>{['Late delivery', 'Quality defect', 'Response time', 'Other'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <span className="text-sm text-quiet">{rows.length} shown</span>
      </div>

      <section className="panel overflow-hidden">
        <DataTable columns={columns} rows={rows} limit={limit} initialSort={{ key: 'date', dir: 'desc' }} empty={<Empty title={status === 'Open' ? 'No open breaches' : 'Nothing in this view'}>{status === 'Open' ? 'Every supplier is within the terms of its contract.' : 'Try another status or filter.'}</Empty>} />
        {rows.length > limit && <div className="border-t border-line p-3 text-center"><button className="btn-quiet" onClick={() => setLimit((l) => l + 100)}>Show 100 more ({rows.length - limit} left)</button></div>}
      </section>

      <section className="panel mt-8 overflow-hidden">
        <div className="px-5 pt-5"><SectionTitle title="Promised versus delivered" note="Each active contract’s SLA terms against the supplier’s last 12 months. Furthest behind first." /></div>
        <DataTable columns={scoreCols} rows={scoreboard} dense empty={<Empty title="Not enough delivery history yet" />} />
      </section>

      <BreachSheet open={sheet} suppliers={data.suppliers} onClose={() => setSheet(false)} onSaved={reload} />
    </>
  );
}
