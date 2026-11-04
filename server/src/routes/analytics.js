import { Router } from 'express';
import { asyncH } from '../middleware/auth.js';
import Supplier from '../models/Supplier.js';
import Contract from '../models/Contract.js';
import Delivery from '../models/Delivery.js';
import Evaluation from '../models/Evaluation.js';
import Violation from '../models/Violation.js';
import { monthlySeries, overview, renewals, spendBreakdown, supplierMetrics } from '../lib/metrics.js';

export async function loadData() {
  const [suppliers, contracts, deliveries, evaluations, violations] = await Promise.all([
    Supplier.find().lean(),
    Contract.find().lean(),
    Delivery.find().lean(),
    Evaluation.find().lean(),
    Violation.find().lean(),
  ]);
  return { suppliers, contracts, deliveries, evaluations, violations };
}

const r = Router();

// One call feeds the whole overview page
r.get(
  '/dashboard',
  asyncH(async (_req, res) => {
    const data = await loadData();
    const now = new Date();
    const yearRange = { from: new Date(+now - 365 * 86400000), to: now };
    const board = supplierMetrics(data, yearRange, now).filter((m) => m.status !== 'Offboarded');
    const nameOf = new Map(data.suppliers.map((s) => [String(s._id), s.name]));
    const attention = data.violations
      .filter((v) => v.status === 'Open' && ['Critical', 'Major'].includes(v.severity))
      .sort((a, b) => +new Date(b.detectedAt) - +new Date(a.detectedAt))
      .slice(0, 6)
      .map((v) => ({ ...v, supplierName: nameOf.get(String(v.supplier)) }));

    res.json({
      kpis: overview(data, now),
      board: board.sort((a, b) => (b.score ?? -1) - (a.score ?? -1)),
      trend: monthlySeries(data.deliveries, data.violations, now, 12),
      spend: spendBreakdown(data, now),
      renewals: renewals(data.contracts, data.suppliers, now),
      attention,
    });
  })
);

r.get(
  '/scorecards',
  asyncH(async (req, res) => {
    const data = await loadData();
    const now = new Date();
    const days = Math.min(Math.max(+req.query.days || 365, 30), 1095);
    res.json(supplierMetrics(data, { from: new Date(+now - days * 86400000), to: now }, now));
  })
);

r.get(
  '/renewals',
  asyncH(async (_req, res) => {
    const data = await loadData();
    res.json(renewals(data.contracts, data.suppliers));
  })
);

r.get(
  '/trend',
  asyncH(async (req, res) => {
    const data = await loadData();
    res.json(monthlySeries(data.deliveries, data.violations, new Date(), Math.min(+req.query.months || 12, 36)));
  })
);

const DAY = 86400000;
const sumBy = (rows, f) => rows.reduce((a, x) => a + (f(x) || 0), 0);

// Everything the Reports page charts need, in one call (last 12 months)
r.get(
  '/insights',
  asyncH(async (_req, res) => {
    const data = await loadData();
    const now = new Date();
    const from = new Date(+now - 365 * DAY);

    const board = supplierMetrics(data, { from, to: now }, now).filter((m) => m.status !== 'Offboarded' && m.score != null);

    const delivered = data.deliveries.filter((d) => d.status === 'Delivered' && d.deliveredDate && new Date(d.deliveredDate) >= from);
    const defs = [
      ['Early', (d) => d < 0, false],
      ['On the day', (d) => d === 0, false],
      ['1–2 days late', (d) => d >= 1 && d <= 2, true],
      ['3–5 days late', (d) => d >= 3 && d <= 5, true],
      ['6–10 days late', (d) => d >= 6 && d <= 10, true],
      ['Over 10 days', (d) => d > 10, true],
    ];
    const delayBuckets = defs.map(([label, test, late]) => ({ label, late, count: delivered.filter((d) => test(d.delayDays)).length }));

    const viol = data.violations.filter((v) => new Date(v.detectedAt) >= from);
    const breachMix = ['Late delivery', 'Quality defect', 'Response time', 'Other'].map((type) => {
      const mine = viol.filter((v) => v.type === type);
      return {
        type,
        Minor: mine.filter((v) => v.severity === 'Minor').length,
        Major: mine.filter((v) => v.severity === 'Major').length,
        Critical: mine.filter((v) => v.severity === 'Critical').length,
        total: mine.length,
        penalty: Math.round(sumBy(mine, (v) => v.penalty)),
      };
    }).filter((b) => b.total > 0);

    const cats = new Map();
    for (const m of board) cats.set(m.category, [...(cats.get(m.category) || []), m]);
    const wavg = (rows, f) => {
      const w = rows.filter((x) => f(x) != null && x.delivered > 0);
      const t = sumBy(w, (x) => x.delivered);
      return t ? Math.round((sumBy(w, (x) => f(x) * x.delivered) / t) * 10) / 10 : null;
    };
    const categoryPerf = [...cats.entries()]
      .map(([category, rows]) => ({
        category,
        suppliers: rows.length,
        onTimePct: wavg(rows, (x) => x.onTimePct),
        slaCompliance: wavg(rows, (x) => x.slaCompliance),
        score: Math.round((sumBy(rows, (x) => x.score) / rows.length) * 10) / 10,
        spend: sumBy(rows, (x) => x.spend),
      }))
      .sort((a, b) => b.spend - a.spend);

    const renewalByMonth = Array.from({ length: 12 }, (_, i) => {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i + 1, 1));
      const mine = data.contracts.filter((c) => c.state === 'Active' && new Date(c.endDate) >= start && new Date(c.endDate) < end);
      return {
        month: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`,
        value: Math.round(sumBy(mine, (c) => c.annualValue)),
        count: mine.length,
      };
    });

    res.json({
      deliveredCount: delivered.length,
      board: board.map(({ supplierId, name, category, tier, band, score, onTimePct, defectRate, slaCompliance, spend, delivered: n, openViolations, nextExpiry, contractValue }) => ({ supplierId, name, category, tier, band, score, onTimePct, defectRate, slaCompliance, spend, delivered: n, openViolations, nextExpiry, contractValue })),
      trend: monthlySeries(data.deliveries, data.violations, now, 12),
      spend: spendBreakdown(data, now),
      delayBuckets,
      breachMix,
      categoryPerf,
      renewalByMonth,
    });
  })
);

export default r;
