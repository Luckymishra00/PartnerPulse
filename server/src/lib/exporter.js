// Builds flat, Tableau-friendly tables (one row per fact, ISO dates, 0/1 flags, plain numbers).
import { bandFor, lastMonths, monthRange, rollup, scoreFrom, supplierMetrics, round } from './metrics.js';

const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const id = (v) => (v == null ? '' : String(v._id ?? v));

export function buildDatasets(data, now = new Date()) {
  const { suppliers, contracts, deliveries, violations, evaluations } = data;
  const sup = new Map(suppliers.map((s) => [id(s), s]));
  const con = new Map(contracts.map((c) => [id(c), c]));
  const breached = new Set(violations.filter((v) => v.delivery).map((v) => id(v.delivery)));

  const out = {};

  out.suppliers = suppliers.map((s) => ({
    supplier_id: id(s),
    supplier_code: s.code,
    supplier_name: s.name,
    category: s.category,
    tier: s.tier,
    status: s.status,
    city: s.city || '',
    country: s.country || '',
    onboarded_on: day(s.onboardedOn),
  }));

  out.contracts = contracts.map((c) => {
    const daysLeft = Math.ceil((+new Date(c.endDate) - +now) / 86400000);
    return {
      contract_id: id(c),
      contract_number: c.contractNumber,
      supplier_id: id(c.supplier),
      supplier_name: sup.get(id(c.supplier))?.name || '',
      title: c.title,
      type: c.type,
      state: c.state,
      start_date: day(c.startDate),
      end_date: day(c.endDate),
      annual_value_inr: c.annualValue,
      auto_renew: c.autoRenew ? 1 : 0,
      renewal_notice_days: c.renewalNoticeDays,
      days_to_expiry: daysLeft,
      renewal_window: c.state !== 'Active' ? 'n/a' : daysLeft < 0 ? 'Lapsed' : daysLeft <= 30 ? '0-30 days' : daysLeft <= 60 ? '31-60 days' : daysLeft <= 90 ? '61-90 days' : 'Beyond 90 days',
      sla_on_time_target_pct: c.sla?.onTimeTarget,
      sla_max_delay_days: c.sla?.maxDelayDays,
      sla_max_defect_rate_pct: c.sla?.maxDefectRate,
      sla_response_hours: c.sla?.responseHours,
      sla_penalty_per_breach_inr: c.sla?.penaltyPerBreach,
    };
  });

  out.deliveries = deliveries.map((d) => {
    const s = sup.get(id(d.supplier));
    const delivered = d.status === 'Delivered';
    return {
      po_number: d.poNumber,
      supplier_id: id(d.supplier),
      supplier_name: s?.name || '',
      category: s?.category || '',
      contract_id: id(d.contract),
      item: d.item,
      status: d.status,
      order_date: day(d.orderDate),
      promised_date: day(d.promisedDate),
      delivered_date: day(d.deliveredDate),
      order_month: day(d.orderDate).slice(0, 7),
      delivered_month: day(d.deliveredDate).slice(0, 7),
      delay_days: delivered ? d.delayDays : '',
      is_delivered: delivered ? 1 : 0,
      is_on_time: delivered ? (d.delayDays <= 0 ? 1 : 0) : '',
      quantity_ordered: d.quantityOrdered,
      quantity_received: d.quantityReceived,
      defective_qty: d.defectiveQty,
      defect_rate_pct: d.quantityReceived ? round((d.defectiveQty / d.quantityReceived) * 100, 2) : '',
      amount_inr: d.amount,
      breached_sla: delivered ? (breached.has(id(d)) ? 1 : 0) : '',
    };
  });

  out.violations = violations.map((v) => ({
    violation_id: id(v),
    supplier_id: id(v.supplier),
    supplier_name: sup.get(id(v.supplier))?.name || '',
    contract_number: con.get(id(v.contract))?.contractNumber || '',
    po_number: deliveries.find((d) => id(d) === id(v.delivery))?.poNumber || '',
    type: v.type,
    severity: v.severity,
    status: v.status,
    detected_on: day(v.detectedAt),
    detected_month: day(v.detectedAt).slice(0, 7),
    resolved_on: day(v.resolvedAt),
    penalty_inr: v.penalty,
    detail: v.detail || '',
  }));

  out.evaluations = evaluations.map((e) => ({
    supplier_id: id(e.supplier),
    supplier_name: sup.get(id(e.supplier))?.name || '',
    period: e.period,
    delivery_score: e.scores?.delivery,
    quality_score: e.scores?.quality,
    pricing_score: e.scores?.pricing,
    communication_score: e.scores?.communication,
    compliance_score: e.scores?.compliance,
    overall_score: e.overall,
    recommendation: e.recommendation,
    evaluated_on: day(e.evaluatedOn),
  }));

  // supplier x month: the table most Tableau views will be built on
  const kpiRows = [];
  const months = lastMonths(12, now);
  for (const s of suppliers) {
    const sd = deliveries.filter((d) => id(d.supplier) === id(s));
    const sv = violations.filter((v) => id(v.supplier) === id(s));
    for (const m of months) {
      const r = rollup(sd, sv, monthRange(m));
      if (!r.delivered && !r.orders) continue;
      const score = scoreFrom({ onTimePct: r.onTimePct, defectRate: r.defectRate, slaCompliance: r.slaCompliance });
      kpiRows.push({
        month: m + '-01',
        supplier_id: id(s),
        supplier_name: s.name,
        category: s.category,
        orders_placed: r.orders,
        deliveries_received: r.delivered,
        on_time_deliveries: r.onTime,
        on_time_pct: round(r.onTimePct),
        avg_delay_days: round(r.avgDelayDays, 2),
        units_received: r.units,
        defective_units: r.defects,
        defect_rate_pct: round(r.defectRate, 2),
        sla_compliance_pct: round(r.slaCompliance),
        spend_inr: Math.round(r.spend),
        violations: sv.filter((v) => day(v.detectedAt).slice(0, 7) === m).length,
        performance_score: round(score),
      });
    }
  }
  out.monthly_supplier_kpis = kpiRows;

  out.supplier_scorecard = supplierMetrics(data, { from: new Date(+now - 365 * 86400000), to: now }, now).map((m) => ({
    supplier_id: m.supplierId,
    supplier_code: m.code,
    supplier_name: m.name,
    category: m.category,
    tier: m.tier,
    performance_score: m.score,
    band: m.band,
    on_time_pct: m.onTimePct,
    sla_compliance_pct: m.slaCompliance,
    defect_rate_pct: m.defectRate,
    avg_delay_days: m.avgDelayDays,
    review_score_pct: m.reviewScore,
    spend_12m_inr: m.spend,
    open_violations: m.openViolations,
    active_contract_value_inr: m.contractValue,
    next_contract_expiry: day(m.nextExpiry),
  }));

  return out;
}

export function toCsv(rows) {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const esc = (v) => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n') + '\n';
}

export { bandFor };
