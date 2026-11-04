import { Download } from 'lucide-react';
import { api, downloadCsv } from '../lib/api.js';
import { useLoad } from '../lib/auth.jsx';
import { BandPill, DataTable, ErrorNote, PageHeader, SectionTitle, Spinner, Tone, useToast } from '../components/ui.jsx';
import { date, inr, relDays } from '../lib/format.js';
import { BreachMix, BreachTrend, CategoryPerformance, ChartPanel, DelayHistogram, RenewalMonths, ScoreRanking, ScoreVsSpend, SpendShare, SpendVolume } from '../components/analysis.jsx';

const DATASET_INFO = {
  monthly_supplier_kpis: ['Supplier by month', 'The best starting point. One row per supplier per month with on-time %, defects, SLA compliance, spend and score.'],
  deliveries: ['Every order', 'One row per purchase order with delay days, 0/1 flags for on-time and SLA breach, quantities and value.'],
  supplier_scorecard: ['Current scorecard', 'One row per supplier with its latest score, band and 12-month metrics.'],
  contracts: ['Contracts', 'Value, dates, days to expiry, renewal window and the SLA terms of each contract.'],
  violations: ['SLA breaches', 'Each breach with type, severity, status and penalty.'],
  evaluations: ['Quarterly reviews', 'The five review scores and recommendation for each supplier and quarter.'],
  suppliers: ['Supplier list', 'Names, categories, tiers and locations. Join the other tables to this one on supplier_id.'],
};

const DAY_MS = 86400000;

// Turns a supplier's numbers into a plain next step. Contract timing decides how urgent it is.
function decide(s) {
  const days = s.nextExpiry ? Math.ceil((new Date(s.nextExpiry) - Date.now()) / DAY_MS) : null;
  const soon = days != null && days >= 0 && days <= 90;
  const breaches = s.openViolations ? `${s.openViolations} open breach${s.openViolations === 1 ? '' : 'es'}` : 'no open breaches';
  const why = `On-time ${s.onTimePct ?? '–'}%, SLA met ${s.slaCompliance ?? '–'}%, ${breaches}`;
  let action, tone, rank;
  if (days != null && days < 0) [action, tone, rank] = ['Contract has ended: renew or close it', 'bad', 0];
  else if (s.band === 'At risk') [action, tone, rank] = soon ? ['Do not renew as it stands', 'bad', 1] : ['Start an improvement plan', 'bad', 2];
  else if (s.band === 'Watch') [action, tone, rank] = soon ? ['Renew with tighter SLA terms', 'warn', 3] : ['Review with the supplier', 'warn', 4];
  else if (s.band === 'Reliable') [action, tone, rank] = soon ? ['Renew', 'info', 5] : ['Keep as it is', 'info', 7];
  else [action, tone, rank] = soon ? ['Renew early and consider more volume', 'good', 6] : ['Keep and consider more volume', 'good', 8];
  return { ...s, _id: s.supplierId, days, why, action, tone, rank };
}

function Decisions({ state }) {
  const { data, error, loading, reload } = state;
  if (loading || error || !data?.board?.length) return null;
  const rows = data.board.map(decide).sort((a, b) => a.rank - b.rank || a.score - b.score);

  const exportCsv = () => {
    const head = ['Supplier', 'Category', 'Band', 'Score', 'Contract ends', 'Why', 'Recommended action'];
    const body = rows.map((r) => [r.name, r.category, r.band, r.score, r.nextExpiry ? new Date(r.nextExpiry).toISOString().slice(0, 10) : '', r.why, r.action]);
    const csv = [head, ...body].map((l) => l.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'partnerpulse_supplier_actions.csv' });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section className="panel mt-8 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
        <SectionTitle title="What to do about each supplier" note="Based on the performance band and when the contract ends. The most urgent come first." />
        <button className="btn-quiet h-8" onClick={exportCsv}><Download className="h-4 w-4" /> Download</button>
      </div>
      <DataTable
        dense
        rows={rows}
        columns={[
          { key: 'name', label: 'Supplier', render: (r) => (<><span className="block font-semibold">{r.name}</span><span className="text-xs text-quiet">{r.category}</span></>) },
          { key: 'band', label: 'Band', render: (r) => <span className="inline-flex items-center gap-2"><BandPill band={r.band} /><span className="num text-quiet">{r.score}</span></span> },
          { key: 'end', label: 'Contract ends', render: (r) => (r.nextExpiry ? (<><span className="block">{date(r.nextExpiry)}</span><span className="text-xs text-quiet">{relDays(r.days)}</span></>) : <span className="text-quiet">No active contract</span>) },
          { key: 'why', label: 'Why', className: 'min-w-[240px]', render: (r) => <span className="text-[13px] leading-snug text-quiet">{r.why}</span> },
          { key: 'action', label: 'Recommended action', className: 'min-w-[220px]', render: (r) => <Tone tone={r.tone}>{r.action}</Tone> },
        ]}
      />
    </section>
  );
}

const pctOf = (n, d) => (d ? Math.round((n / d) * 100) : 0);

function Analysis({ state }) {
  const { data, error, loading, reload } = state;
  if (loading) return <Spinner label="Preparing the analysis" />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;

  const { board, trend, spend, delayBuckets, breachMix, categoryPerf, renewalByMonth, deliveredCount } = data;
  if (!board.length || !deliveredCount) {
    return (
      <section className="panel px-5 py-10 text-center">
        <p className="font-display text-lg font-semibold">Nothing to analyse yet</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-quiet">Record a few delivered orders under Deliveries and the charts will fill in.</p>
      </section>
    );
  }

  // One-line readings, worked out from the same data the charts draw
  const below = board.filter((b) => b.score < 78).length;
  const late = delayBuckets.filter((b) => b.late).reduce((a, b) => a + b.count, 0);
  const veryLate = delayBuckets.slice(4).reduce((a, b) => a + b.count, 0);
  const topBreach = [...breachMix].sort((a, b) => b.total - a.total)[0];
  const totalBreaches = breachMix.reduce((a, b) => a + b.total, 0);
  const weakCat = [...categoryPerf].filter((c) => c.onTimePct != null).sort((a, b) => a.onTimePct - b.onTimePct)[0];
  const peak = [...trend].sort((a, b) => b.spend - a.spend)[0];
  const spendTotal = board.reduce((a, b) => a + b.spend, 0);
  const weakSpend = board.filter((b) => b.band === 'Watch' || b.band === 'At risk').reduce((a, b) => a + b.spend, 0);
  const topCat = spend.byCategory[0];
  const catTotal = spend.byCategory.reduce((a, b) => a + b.spend, 0);
  const bigRenewal = [...renewalByMonth].sort((a, b) => b.value - a.value)[0];
  const monthName = (k) => new Date(k + '-01T00:00:00Z').toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  return (
    <div className="space-y-6">
      <ChartPanel
        title="Supplier ranking"
        takeaway={`${below} of ${board.length} suppliers score below 78, the line between Reliable and Watch. Colour shows each supplier’s band.`}
      >
        <ScoreRanking rows={board} />
      </ChartPanel>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartPanel title="How late deliveries arrive" takeaway={`${pctOf(late, deliveredCount)}% of ${deliveredCount} deliveries came in late, and ${pctOf(veryLate, deliveredCount)}% were more than 5 days late.`}>
          <DelayHistogram rows={delayBuckets} />
        </ChartPanel>

        <ChartPanel title="SLA breaches by kind" takeaway={topBreach ? `${topBreach.type} is the most common breach: ${topBreach.total} of ${totalBreaches} in the last 12 months.` : 'No breaches in the last 12 months.'}>
          {breachMix.length ? <BreachMix rows={breachMix} /> : <p className="py-16 text-center text-sm text-quiet">No breaches recorded.</p>}
        </ChartPanel>

        <ChartPanel title="Reliability by category" takeaway={weakCat ? `${weakCat.category} has the lowest on-time rate at ${weakCat.onTimePct}%.` : 'Not enough deliveries yet.'}>
          <CategoryPerformance rows={categoryPerf} />
        </ChartPanel>

        <ChartPanel title="Do we spend with the best suppliers?" takeaway={`${inr(weakSpend)} (${pctOf(weakSpend, spendTotal)}% of spend) sits with suppliers in the Watch or At risk bands.`}>
          <ScoreVsSpend rows={board} />
        </ChartPanel>

        <ChartPanel title="Spend and delivery volume" takeaway={peak ? `Spend peaked in ${monthName(peak.month)} at ${inr(peak.spend)}.` : undefined}>
          <SpendVolume rows={trend} />
        </ChartPanel>

        <ChartPanel title="Where the money goes" takeaway={topCat ? `${topCat.category} takes ${pctOf(topCat.spend, catTotal)}% of spend.` : undefined}>
          <SpendShare rows={spend.byCategory} />
        </ChartPanel>

        <ChartPanel title="Contract renewals ahead" takeaway={bigRenewal?.value ? `${monthName(bigRenewal.month)} has the most value up for renewal: ${inr(bigRenewal.value)} across ${bigRenewal.count} contract${bigRenewal.count === 1 ? '' : 's'}.` : 'No active contracts end in the next 12 months.'}>
          <RenewalMonths rows={renewalByMonth} />
        </ChartPanel>

        <ChartPanel title="Breaches month by month" takeaway="Breaches detected each month, across all suppliers.">
          <BreachTrend rows={trend} />
        </ChartPanel>
      </div>
    </div>
  );
}

export default function Reports() {
  const toast = useToast();
  const { data, error, loading, reload } = useLoad(() => api.get('/exports'));
  const ins = useLoad(() => api.get('/analytics/insights'));

  async function get(name) {
    try { await downloadCsv(name); } catch (e) { toast(e.message, 'bad'); }
  }

  return (
    <>
      <PageHeader title="Analysis and Tableau" sub="Analysis of the last 12 months of supplier performance, what to do about each supplier, and the data tables for Tableau." />

      <Analysis state={ins} />
      <Decisions state={ins} />

      <section className="panel mt-8 overflow-hidden">
        <div className="px-5 pt-5"><SectionTitle title="Data for Tableau" note="Flat CSV tables with one row per fact, ISO dates and 0/1 flags. They always reflect the latest data in MongoDB." /></div>
        {loading ? <Spinner /> : error ? <div className="p-4"><ErrorNote message={error} onRetry={reload} /></div> : (
          <DataTable
            dense
            rows={data.map((d) => ({ ...d, _id: d.name }))}
            columns={[
              { key: 'name', label: 'Table', render: (r) => (<><span className="block font-semibold">{DATASET_INFO[r.name]?.[0] || r.name}</span><span className="font-mono text-xs text-quiet">partnerpulse_{r.name}.csv</span></>) },
              { key: 'info', label: 'What it holds', className: 'min-w-[260px]', render: (r) => <span className="text-[13px] leading-snug text-quiet">{DATASET_INFO[r.name]?.[1]}</span> },
              { key: 'rows', label: 'Rows', align: 'right', render: (r) => <span className="num">{r.rows.toLocaleString('en-IN')}</span> },
              { key: 'cols', label: 'Columns', align: 'right', render: (r) => <span className="num">{r.columns}</span> },
              { key: 'dl', label: '', render: (r) => <button className="btn-quiet h-8" onClick={() => get(r.name)}><Download className="h-4 w-4" /> Download</button> },
            ]}
          />
        )}
        <p className="border-t border-line px-5 py-3 text-[13px] text-quiet">Prefer files on disk? Run <span className="font-mono text-harbor-700">npm run export:tableau</span> in the project folder to write all tables to <span className="font-mono text-harbor-700">tableau-data/</span>.</p>
      </section>

    </>
  );
}
