import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth, useLoad } from '../lib/auth.jsx';
import { date } from '../lib/format.js';
import { useForm } from '../lib/useForm.js';
import { DataTable, Empty, ErrorNote, Field, FigureBand, PageHeader, Sheet, Spinner, Tone, useToast } from '../components/ui.jsx';

const CRITERIA = [
  ['delivery', 'Delivery', 0.3, 'Arrives when promised'],
  ['quality', 'Quality', 0.3, 'Meets specification'],
  ['pricing', 'Pricing', 0.15, 'Competitive and predictable'],
  ['communication', 'Communication', 0.15, 'Responsive and clear'],
  ['compliance', 'Compliance', 0.1, 'Paperwork, audits, regulations'],
];
const REC_TONE = { Expand: 'good', Maintain: 'info', Improve: 'warn', 'Review for exit': 'bad' };

function recentPeriods(n = 6) {
  const out = [];
  const d = new Date();
  let y = d.getUTCFullYear();
  let q = Math.floor(d.getUTCMonth() / 3) + 1;
  for (let i = 0; i < n; i++) {
    out.push(`${y}-Q${q}`);
    q -= 1;
    if (q === 0) { q = 4; y -= 1; }
  }
  return out;
}

const overallOf = (s) => CRITERIA.reduce((t, [k, , w]) => t + (Number(s[k]) || 0) * w, 0);
const suggest = (o) => (o >= 4.2 ? 'Expand' : o >= 3.4 ? 'Maintain' : o >= 2.7 ? 'Improve' : 'Review for exit');

// Five short bars, one per criterion, so a review can be scanned without reading numbers
export function ScoreBars({ scores }) {
  return (
    <div className="flex items-end gap-1" role="img" aria-label={CRITERIA.map(([k, l]) => `${l} ${scores[k]}`).join(', ')}>
      {CRITERIA.map(([k, l]) => (
        <span key={k} className="flex h-8 w-3.5 items-end rounded-[2px] bg-harbor-800/10" title={`${l}: ${scores[k]} of 5`}>
          <span className="w-full rounded-[2px]" style={{ height: `${(scores[k] / 5) * 100}%`, background: scores[k] >= 4 ? '#1F9D6B' : scores[k] >= 3 ? '#3A6A86' : '#D68A0C' }} />
        </span>
      ))}
    </div>
  );
}

function ReviewSheet({ open, review, suppliers, onClose, onSaved }) {
  const f = useForm({ supplier: '', period: recentPeriods()[0], scores: {}, recommendation: 'Maintain', comments: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const { user } = useAuth();
  const editing = !!review;

  useEffect(() => {
    if (!open) return;
    setError('');
    f.setV(review
      ? { ...review, supplier: review.supplier?._id || review.supplier }
      : { supplier: '', period: recentPeriods()[0], scores: Object.fromEntries(CRITERIA.map(([k]) => [k, 3])), recommendation: 'Maintain', comments: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, review]);

  const overall = overallOf(f.v.scores || {});
  const setScore = (k, val) => f.setV((s) => ({ ...s, scores: { ...s.scores, [k]: Number(val) } }));

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = { supplier: f.v.supplier, period: f.v.period, scores: f.v.scores, recommendation: f.v.recommendation, comments: f.v.comments };
      if (editing) await api.put(`/evaluations/${review._id}`, body);
      else await api.post('/evaluations', body);
      toast('Review saved');
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message.includes('already in use') ? 'This supplier already has a review for that period. Edit the existing one instead.' : err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm('Delete this review?')) return;
    try {
      await api.del(`/evaluations/${review._id}`);
      toast('Review deleted');
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? 'Edit review' : 'Review a supplier'}
      subtitle="Rate each area from 1 (poor) to 5 (excellent). Reviews make up 20% of the performance score."
      footer={
        <>
          {editing && user.role === 'admin' && <button type="button" className="btn-danger mr-auto" onClick={remove}>Delete</button>}
          <button type="button" className="btn-quiet" onClick={onClose}>Cancel</button>
          <button form="review-form" className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save review'}</button>
        </>
      }
    >
      <form id="review-form" onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Supplier">
            <select className="input" required disabled={editing} {...f.bind('supplier')}>
              <option value="">Choose a supplier</option>
              {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Period">
            <select className="input" disabled={editing} {...f.bind('period')}>{(editing ? [review.period] : recentPeriods()).map((p) => <option key={p}>{p}</option>)}</select>
          </Field>
        </div>

        <div className="space-y-4 border-y border-line py-4">
          {CRITERIA.map(([k, label, w, help]) => (
            <div key={k}>
              <div className="flex items-baseline justify-between">
                <label htmlFor={`s-${k}`} className="text-sm font-semibold">{label} <span className="font-normal text-quiet">· {help} ({Math.round(w * 100)}%)</span></label>
                <span className="num text-xl font-bold">{Number(f.v.scores?.[k] ?? 3).toFixed(1)}</span>
              </div>
              <input id={`s-${k}`} type="range" min="1" max="5" step="0.5" className="mt-1 w-full" value={f.v.scores?.[k] ?? 3} onChange={(e) => setScore(k, e.target.value)} />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between rounded-[3px] bg-harbor-800 px-4 py-3 text-white">
          <span className="text-sm font-semibold">Weighted overall</span>
          <span className="num text-3xl font-bold">{overall.toFixed(2)}<span className="text-base font-medium text-harbor-300"> / 5</span></span>
        </div>

        <Field label="Recommendation" hint={`Scores suggest: ${suggest(overall)}`}>
          <select className="input" {...f.bind('recommendation')}>{Object.keys(REC_TONE).map((r) => <option key={r}>{r}</option>)}</select>
        </Field>
        <Field label="Comments"><textarea className="input" rows={3} {...f.bind('comments')} /></Field>
        {error && <p role="alert" className="rounded-[3px] bg-bad-tint px-3 py-2 text-sm font-medium text-bad-text">{error}</p>}
      </form>
    </Sheet>
  );
}

export default function Evaluations() {
  const { canWrite } = useAuth();
  const { data, error, loading, reload } = useLoad(async () => {
    const [e, s] = await Promise.all([api.get('/evaluations?limit=1000'), api.get('/suppliers?limit=1000')]);
    return { evaluations: e.items, suppliers: s.items };
  });
  const [period, setPeriod] = useState('');
  const [sheet, setSheet] = useState({ open: false, review: null });

  const periods = useMemo(() => (data ? [...new Set(data.evaluations.map((e) => e.period))].sort().reverse() : []), [data]);
  const rows = useMemo(() => (data ? data.evaluations.filter((e) => !period || e.period === period) : []), [data, period]);

  if (loading) return <Spinner />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;

  const latest = periods[0];
  const inLatest = data.evaluations.filter((e) => e.period === latest);
  const reviewedIds = new Set(inLatest.map((e) => e.supplier?._id));
  const missing = data.suppliers.filter((s) => s.status === 'Active' && !reviewedIds.has(s._id)).length;
  const avg = inLatest.length ? inLatest.reduce((s, e) => s + e.overall, 0) / inLatest.length : null;
  const open = (review = null) => setSheet({ open: true, review });

  const columns = [
    { key: 'sup', label: 'Supplier', sort: (r) => r.supplier?.name, render: (r) => (<><span className="block font-semibold">{r.supplier?.name}</span><span className="text-[13px] text-quiet">{r.supplier?.category}</span></>) },
    { key: 'period', label: 'Period', sort: (r) => r.period, render: (r) => r.period },
    { key: 'bars', label: 'Delivery · Quality · Price · Comms · Compliance', render: (r) => <ScoreBars scores={r.scores} /> },
    { key: 'overall', label: 'Overall', align: 'right', sort: (r) => r.overall, render: (r) => <span className="num text-xl font-bold">{r.overall.toFixed(2)}</span> },
    { key: 'rec', label: 'Recommendation', sort: (r) => r.recommendation, render: (r) => <Tone tone={REC_TONE[r.recommendation]}>{r.recommendation}</Tone> },
    { key: 'by', label: 'Reviewed by', render: (r) => (<><span className="block">{r.evaluatedBy || '–'}</span><span className="text-[13px] text-quiet">{date(r.evaluatedOn)}</span></>) },
  ];

  return (
    <>
      <PageHeader
        title="Supplier reviews"
        sub="Quarterly scorecards from your own team. They capture what the delivery data cannot: pricing, communication and compliance."
        actions={canWrite && <button className="btn-primary" onClick={() => open()}><Plus className="h-4 w-4" /> New review</button>}
      />

      <FigureBand
        items={[
          { label: `Average score, ${latest || 'latest period'}`, value: avg == null ? '–' : avg.toFixed(2), note: `${inLatest.length} suppliers reviewed` },
          { label: 'Still to review', value: missing, tone: missing ? 'text-warn-text' : 'text-ok-text', note: missing ? `Active suppliers without a ${latest} review` : 'Every active supplier is covered' },
          { label: 'Recommended to expand', value: inLatest.filter((e) => e.recommendation === 'Expand').length, note: 'In the latest period' },
          { label: 'Flagged for exit review', value: inLatest.filter((e) => e.recommendation === 'Review for exit').length, tone: inLatest.some((e) => e.recommendation === 'Review for exit') ? 'text-bad-text' : 'text-harbor-800', note: 'In the latest period' },
        ]}
      />

      <div className="mb-3 mt-8 flex items-center gap-3">
        <label htmlFor="period" className="text-sm font-semibold text-quiet">Period</label>
        <select id="period" className="input w-auto" value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="">All periods</option>
          {periods.map((p) => <option key={p}>{p}</option>)}
        </select>
      </div>

      <section className="panel overflow-hidden">
        <DataTable columns={columns} rows={rows} initialSort={{ key: 'period', dir: 'desc' }} onRowClick={canWrite ? (r) => open(r) : undefined} empty={<Empty title="No reviews yet" action={canWrite && <button className="btn-primary" onClick={() => open()}>Write the first review</button>}>Review each supplier once a quarter to keep the score honest.</Empty>} />
      </section>

      <ReviewSheet open={sheet.open} review={sheet.review} suppliers={data.suppliers} onClose={() => setSheet((s) => ({ ...s, open: false }))} onSaved={reload} />
    </>
  );
}
