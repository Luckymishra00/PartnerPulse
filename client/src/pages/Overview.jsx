import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useLoad, useAuth } from '../lib/auth.jsx';
import { BAND, date, inr, metricTone, pct } from '../lib/format.js';
import { PulseTrace } from '../components/Pulse.jsx';
import Runway from '../components/Runway.jsx';
import { DelayQualityChart, QuadrantChart, ReliabilityChart, SpendChart } from '../components/charts.jsx';
import { ErrorNote, FigureBand, PageHeader, SectionTitle, SeverityPill, Segmented, Spinner, deltaNote } from '../components/ui.jsx';

export default function Overview() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useLoad(() => api.get('/analytics/dashboard'));
  const [filter, setFilter] = useState('All');
  const [spendView, setSpendView] = useState('Supplier');
  const nav = useNavigate();

  if (loading) return <Spinner label="Reading the latest supplier data" />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;

  const { kpis, board, trend, spend, renewals, attention } = data;
  const rows = filter === 'All' ? board : board.filter((b) => b.band === 'Watch' || b.band === 'At risk');
  const first = user?.name?.split(' ')[0];
  const atRisk = board.filter((b) => b.band === 'At risk' || b.band === 'Watch').length;

  return (
    <>
      <PageHeader
        title={`Hello ${first}, here is your supplier pulse`}
        sub={`${kpis.activeSuppliers} active suppliers over the last 12 months. ${atRisk ? `${atRisk} need a closer look.` : 'None need a closer look right now.'}`}
      />

      <FigureBand
        items={[
          { label: 'Average performance score', value: kpis.avgScore ?? '–', tone: metricTone(kpis.avgScore, 88, 78), note: 'Out of 100, across active suppliers' },
          { label: 'On-time delivery', value: pct(kpis.onTimePct), tone: metricTone(kpis.onTimePct, 92, 85), ...deltaNote(kpis.onTimeDelta) },
          { label: 'SLA compliance', value: pct(kpis.slaCompliance), tone: metricTone(kpis.slaCompliance, 90, 75), ...deltaNote(kpis.slaDelta) },
          { label: 'Renewal exposure', value: inr(kpis.renewalExposure), note: `${kpis.renewalCount} contracts end within 90 days` },
          { label: 'Open SLA breaches', value: kpis.openViolations, tone: kpis.criticalOpen ? 'text-bad-text' : 'text-harbor-800', note: `${kpis.criticalOpen} critical · ${inr(kpis.penaltiesOpen)} in penalties` },
          { label: 'Spend, last 12 months', value: inr(kpis.spend12m), note: `${kpis.avgDelayDays ?? '–'} days average when late` },
        ]}
      />

      {/* The Pulse Board: the one place the interface gets expressive */}
      <section className="panel mt-8 overflow-hidden" aria-labelledby="board-title">
        <div className="flex flex-wrap items-end justify-between gap-3 px-5 pb-3 pt-5">
          <div>
            <h2 id="board-title" className="text-2xl font-bold">Pulse board</h2>
            <p className="mt-0.5 text-sm text-quiet">Each line is a supplier’s monthly performance for the past year. Select a row to open the supplier.</p>
          </div>
          <Segmented label="Filter suppliers" value={filter} onChange={setFilter} options={[{ value: 'All', label: `All ${board.length}` }, { value: 'Attention', label: 'Needs a look' }]} />
        </div>

        <div className="hidden grid-cols-[minmax(190px,1.4fr)_190px_repeat(3,minmax(70px,0.55fr))_minmax(110px,0.8fr)_130px] gap-x-4 border-b border-line2 px-5 py-2 text-[13px] font-semibold text-quiet md:grid">
          <span>Supplier</span><span>Past 12 months</span><span className="text-right">On time</span><span className="text-right">SLA met</span><span className="text-right">Defects</span><span className="text-right">Spend</span><span className="text-right">Score</span>
        </div>

        <ul>
          {rows.map((s, i) => {
            const b = BAND[s.band] || BAND.Unrated;
            return (
              <li key={s.supplierId}>
                <button
                  onClick={() => nav(`/suppliers/${s.supplierId}`)}
                  className="group relative grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 border-b border-line px-5 py-3 text-left transition-colors hover:bg-white md:grid-cols-[minmax(190px,1.4fr)_190px_repeat(3,minmax(70px,0.55fr))_minmax(110px,0.8fr)_130px]"
                >
                  <span className="absolute inset-y-0 left-0 w-[4px]" style={{ background: b.stroke }} aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold text-harbor-800 group-hover:text-signal">{s.name}</span>
                    <span className="block truncate text-[13px] text-quiet">{s.category} · {s.city}</span>
                  </span>
                  <span className="order-last col-span-2 md:order-none md:col-span-1"><PulseTrace values={s.pulse} band={s.band} delay={i * 70} /></span>
                  <span className={`num hidden text-right text-[17px] font-semibold md:block ${metricTone(s.onTimePct, 92, 85)}`}>{pct(s.onTimePct, 0)}</span>
                  <span className={`num hidden text-right text-[17px] font-semibold md:block ${metricTone(s.slaCompliance, 90, 75)}`}>{pct(s.slaCompliance, 0)}</span>
                  <span className={`num hidden text-right text-[17px] font-semibold md:block ${s.defectRate == null ? 'text-quiet' : s.defectRate <= 1.5 ? 'text-ok-text' : s.defectRate <= 2.2 ? 'text-warn-text' : 'text-bad-text'}`}>{pct(s.defectRate)}</span>
                  <span className="num hidden text-right text-[16px] md:block">{inr(s.spend)}</span>
                  <span className="flex items-center justify-end gap-3">
                    <span className="num text-[30px] font-bold leading-none" style={{ color: b.fg }}>{Math.round(s.score ?? 0)}</span>
                    <span className="w-[66px] text-left text-[12px] font-semibold leading-tight" style={{ color: b.fg }}>{s.band}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {!rows.length && <p className="px-5 py-10 text-center text-sm text-quiet">Every supplier is performing in the Reliable band or better.</p>}
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <section className="panel overflow-hidden">
          <div className="px-5 pt-5">
            <SectionTitle title="Renewal runway" note="Contracts ending within 90 days, plotted by days remaining" />
          </div>
          <Runway rows={renewals} />
        </section>

        <section className="panel">
          <div className="px-5 pt-5">
            <SectionTitle title="Breaches to resolve" note="Open major and critical SLA violations" right={<Link to="/sla" className="text-sm font-semibold text-signal hover:underline">Open SLA watch</Link>} />
          </div>
          {attention.length ? (
            <ul className="px-5 pb-3">
              {attention.map((v) => (
                <li key={v._id} className="flex items-start justify-between gap-3 border-t border-line py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{v.supplierName}</p>
                    <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-quiet">{v.detail}</p>
                    <p className="mt-1 text-xs text-quiet">{v.type} · {date(v.detectedAt)}</p>
                  </div>
                  <SeverityPill severity={v.severity} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 pb-8 pt-4 text-sm text-quiet">No major or critical breaches are open.</p>
          )}
        </section>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="panel p-5">
          <SectionTitle title="Delivery reliability" note="Share of deliveries on time and within SLA, by month" />
          <ReliabilityChart data={trend} />
        </section>
        <section className="panel p-5">
          <SectionTitle title="Delays and defects" note="Average days late (left axis) and defect rate (right axis)" />
          <DelayQualityChart data={trend} />
        </section>
        <section className="panel p-5">
          <SectionTitle title="Who is on time and who is clean" note="Right and low is best. Dashed lines mark 90% on time and 2% defects. Dot size shows spend." />
          <QuadrantChart rows={board} />
          <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-quiet">
            {['Excellent', 'Reliable', 'Watch', 'At risk'].map((k) => (
              <li key={k} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: BAND[k].stroke }} />{k}</li>
            ))}
          </ul>
        </section>
        <section className="panel p-5">
          <SectionTitle title="Where the money goes" note="Order value placed in the last 12 months" right={<Segmented label="Group spend by" value={spendView} onChange={setSpendView} options={['Supplier', 'Category']} />} />
          {spendView === 'Supplier' ? (
            <SpendChart rows={spend.bySupplier} />
          ) : (
            <ul className="mt-4 space-y-3">
              {spend.byCategory.map((c) => {
                const max = spend.byCategory[0].spend;
                return (
                  <li key={c.category}>
                    <div className="mb-1 flex justify-between text-sm"><span className="font-semibold">{c.category}</span><span className="num font-semibold">{inr(c.spend)}</span></div>
                    <div className="h-2.5 rounded-sm bg-harbor-800/10"><div className="h-full rounded-sm bg-harbor-600" style={{ width: `${(c.spend / max) * 100}%` }} /></div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
