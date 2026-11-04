// Analytics engine. Everything here is a pure function over plain arrays so it can be
// used by the API, the CSV exporter for Tableau, and the self-test without a database.

const DAY = 86400000;

// How the performance score is built (weights are renormalised when a part has no data yet)
export const SCORE_WEIGHTS = { onTime: 0.35, quality: 0.25, sla: 0.2, review: 0.2 };

export const qualityScore = (defectRate) => Math.max(0, 100 - defectRate * 8);

export const bandFor = (s) =>
  s == null ? 'Unrated' : s >= 88 ? 'Excellent' : s >= 78 ? 'Reliable' : s >= 68 ? 'Watch' : 'At risk';

const id = (v) => (v == null ? null : String(v._id ?? v));
const sum = (arr, fn) => arr.reduce((s, x) => s + (fn(x) || 0), 0);
const pct = (n, d) => (d ? (n / d) * 100 : null);
export const round = (v, p = 1) => (v == null || Number.isNaN(v) ? null : Math.round(v * 10 ** p) / 10 ** p);

export function monthKey(date) {
  return new Date(date).toISOString().slice(0, 7);
}

export function lastMonths(n, now = new Date()) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    out.push(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString().slice(0, 7));
  }
  return out;
}

export function monthRange(key) {
  const [y, m] = key.split('-').map(Number);
  return { from: new Date(Date.UTC(y, m - 1, 1)), to: new Date(Date.UTC(y, m, 1) - 1) };
}

const inRange = (d, r) => {
  if (!d) return false;
  const t = +new Date(d);
  return (!r.from || t >= +r.from) && (!r.to || t <= +r.to);
};

export function scoreFrom({ onTimePct, defectRate, slaCompliance, reviewScore }) {
  const parts = [];
  if (onTimePct != null) parts.push([SCORE_WEIGHTS.onTime, onTimePct]);
  if (defectRate != null) parts.push([SCORE_WEIGHTS.quality, qualityScore(defectRate)]);
  if (slaCompliance != null) parts.push([SCORE_WEIGHTS.sla, slaCompliance]);
  if (reviewScore != null) parts.push([SCORE_WEIGHTS.review, reviewScore]);
  if (!parts.length) return null;
  const totalWeight = sum(parts, ([w]) => w);
  return sum(parts, ([w, v]) => w * v) / totalWeight;
}

// Rolls up a set of deliveries + violations into the headline numbers.
export function rollup(deliveries, violations, range = {}) {
  const delivered = deliveries.filter((d) => d.status === 'Delivered' && inRange(d.deliveredDate, range));
  const ordered = deliveries.filter((d) => d.status !== 'Cancelled' && inRange(d.orderDate, range));
  const onTime = delivered.filter((d) => d.delayDays <= 0).length;
  const late = delivered.filter((d) => d.delayDays > 0);
  const units = sum(delivered, (d) => d.quantityReceived);
  const defects = sum(delivered, (d) => d.defectiveQty);

  const deliveredIds = new Set(delivered.map((d) => id(d)));
  const breachedIds = new Set(
    violations.filter((v) => v.delivery && deliveredIds.has(id(v.delivery))).map((v) => id(v.delivery))
  );

  return {
    delivered: delivered.length,
    onTime,
    onTimePct: pct(onTime, delivered.length),
    avgDelayDays: delivered.length ? sum(late, (d) => d.delayDays) / delivered.length : null,
    avgLateDays: late.length ? sum(late, (d) => d.delayDays) / late.length : null,
    units,
    defects,
    defectRate: units ? (defects / units) * 100 : null,
    slaCompliance: delivered.length ? (1 - breachedIds.size / delivered.length) * 100 : null,
    spend: sum(ordered, (d) => d.amount),
    orders: ordered.length,
  };
}

export function supplierMetrics(data, range = {}, now = new Date(), months = 12) {
  const { suppliers, deliveries, violations, evaluations, contracts } = data;
  const keys = lastMonths(months, now);

  return suppliers.map((s) => {
    const sid = id(s);
    const sd = deliveries.filter((d) => id(d.supplier) === sid);
    const sv = violations.filter((v) => id(v.supplier) === sid);
    const r = rollup(sd, sv, range);

    const evals = evaluations
      .filter((e) => id(e.supplier) === sid)
      .sort((a, b) => String(b.period).localeCompare(String(a.period)))
      .slice(0, 4);
    const reviewScore = evals.length ? (sum(evals, (e) => e.overall) / evals.length / 5) * 100 : null;

    const score = scoreFrom({ ...r, reviewScore });

    // Monthly composite used for the pulse trace
    let last = null;
    const raw = keys.map((k) => {
      const mr = rollup(sd, sv, monthRange(k));
      const v = scoreFrom({ onTimePct: mr.onTimePct, defectRate: mr.defectRate, slaCompliance: mr.slaCompliance });
      if (v != null) last = v;
      return v;
    });
    const firstReal = raw.find((v) => v != null);
    let carry = firstReal ?? null;
    const pulse = raw.map((v) => {
      if (v != null) carry = v;
      return carry == null ? null : round(carry, 1);
    });

    const active = (contracts || []).filter((c) => id(c.supplier) === sid && c.state === 'Active');
    const nextExpiry = active.length ? new Date(Math.min(...active.map((c) => +new Date(c.endDate)))) : null;

    return {
      supplierId: sid,
      code: s.code,
      name: s.name,
      category: s.category,
      tier: s.tier,
      status: s.status,
      city: s.city,
      delivered: r.delivered,
      onTimePct: round(r.onTimePct),
      avgDelayDays: round(r.avgDelayDays, 2),
      avgLateDays: round(r.avgLateDays, 1),
      defectRate: round(r.defectRate, 2),
      slaCompliance: round(r.slaCompliance),
      reviewScore: round(reviewScore),
      spend: Math.round(r.spend),
      orders: r.orders,
      openViolations: sv.filter((v) => v.status === 'Open').length,
      score: round(score),
      band: bandFor(score),
      pulse,
      contractValue: sum(active, (c) => c.annualValue),
      nextExpiry,
    };
  });
}

export function monthlySeries(deliveries, violations, now = new Date(), months = 12) {
  return lastMonths(months, now).map((key) => {
    const range = monthRange(key);
    const r = rollup(deliveries, violations, range);
    return {
      month: key,
      delivered: r.delivered,
      onTimePct: round(r.onTimePct),
      avgDelayDays: round(r.avgDelayDays, 2),
      defectRate: round(r.defectRate, 2),
      slaCompliance: round(r.slaCompliance),
      spend: Math.round(r.spend),
      violations: violations.filter((v) => inRange(v.detectedAt, range)).length,
    };
  });
}

export function renewals(contracts, suppliers, now = new Date()) {
  const byId = new Map(suppliers.map((s) => [id(s), s]));
  return contracts
    .filter((c) => c.state === 'Active')
    .map((c) => {
      const daysLeft = Math.ceil((+new Date(c.endDate) - +now) / DAY);
      const noticeBy = new Date(+new Date(c.endDate) - (c.renewalNoticeDays ?? 60) * DAY);
      const sup = byId.get(id(c.supplier));
      return {
        contractId: id(c),
        contractNumber: c.contractNumber,
        title: c.title,
        supplierId: id(c.supplier),
        supplierName: sup?.name ?? 'Unknown supplier',
        endDate: c.endDate,
        annualValue: c.annualValue,
        autoRenew: !!c.autoRenew,
        daysLeft,
        noticeBy,
        noticeOverdue: noticeBy < now && daysLeft >= 0,
        window: daysLeft < 0 ? 'Lapsed' : daysLeft <= 30 ? '30' : daysLeft <= 60 ? '60' : daysLeft <= 90 ? '90' : null,
      };
    })
    .filter((c) => c.window)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

export function overview(data, now = new Date()) {
  const { suppliers, deliveries, violations, contracts } = data;
  const all = rollup(deliveries, violations, {});
  const year = rollup(deliveries, violations, { from: new Date(+now - 365 * DAY), to: now });
  const cur = rollup(deliveries, violations, { from: new Date(+now - 90 * DAY), to: now });
  const prev = rollup(deliveries, violations, { from: new Date(+now - 180 * DAY), to: new Date(+now - 90 * DAY) });
  const metrics = supplierMetrics(data, { from: new Date(+now - 365 * DAY), to: now }, now);
  const rated = metrics.filter((m) => m.score != null && m.status === 'Active');
  const ren = renewals(contracts, suppliers, now);
  const open = violations.filter((v) => v.status === 'Open');
  const delta = (a, b) => (a == null || b == null ? null : round(a - b));

  return {
    asOf: now,
    activeSuppliers: suppliers.filter((s) => s.status === 'Active').length,
    avgScore: round(rated.length ? sum(rated, (m) => m.score) / rated.length : null),
    onTimePct: round(year.onTimePct),
    onTimeDelta: delta(cur.onTimePct, prev.onTimePct),
    slaCompliance: round(year.slaCompliance),
    slaDelta: delta(cur.slaCompliance, prev.slaCompliance),
    spend12m: Math.round(year.spend),
    renewalExposure: Math.round(sum(ren, (r) => r.annualValue)),
    renewalCount: ren.length,
    openViolations: open.length,
    criticalOpen: open.filter((v) => v.severity === 'Critical').length,
    penaltiesOpen: Math.round(sum(open, (v) => v.penalty)),
    avgDelayDays: round(year.avgLateDays, 1),
    defectRate: round(year.defectRate, 2),
    lifetime: { delivered: all.delivered },
  };
}

export function spendBreakdown(data, now = new Date(), months = 12) {
  const range = { from: new Date(+now - months * 30.4 * DAY), to: now };
  const metrics = supplierMetrics(data, range, now);
  const bySupplier = metrics
    .map((m) => ({ supplierId: m.supplierId, name: m.name, category: m.category, spend: m.spend }))
    .filter((m) => m.spend > 0)
    .sort((a, b) => b.spend - a.spend);
  const cat = new Map();
  for (const m of bySupplier) cat.set(m.category, (cat.get(m.category) || 0) + m.spend);
  const byCategory = [...cat.entries()].map(([category, spend]) => ({ category, spend })).sort((a, b) => b.spend - a.spend);
  return { bySupplier, byCategory };
}
