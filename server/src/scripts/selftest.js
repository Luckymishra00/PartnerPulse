// Database-free check of the analytics engine, SLA rules and exports (run: npm test)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateDataset } from '../lib/demoData.js';
import { evaluateDelivery } from '../lib/sla.js';
import { overview, supplierMetrics, monthlySeries, renewals, scoreFrom, bandFor } from '../lib/metrics.js';
import { buildDatasets, toCsv } from '../lib/exporter.js';

const now = new Date();
const data = generateDataset(now);
let passed = 0;
const ok = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };

ok('seed has the expected volume', () => {
  assert.equal(data.suppliers.length, 14);
  assert.ok(data.deliveries.length > 500);
  assert.ok(data.violations.length > 10);
});

ok('SLA engine flags late and defective deliveries', () => {
  const contract = { sla: { maxDelayDays: 2, maxDefectRate: 2, penaltyPerBreach: 1000 } };
  const base = { poNumber: 'PO-1', status: 'Delivered', quantityReceived: 100, defectiveQty: 0, delayDays: 2 };
  assert.equal(evaluateDelivery(base, contract).length, 0, 'within grace is fine');
  const late = evaluateDelivery({ ...base, delayDays: 6 }, contract); // 3x the 2-day grace
  assert.equal(late[0].type, 'Late delivery');
  assert.equal(late[0].severity, 'Major');
  assert.equal(late[0].penalty, 2000);
  assert.equal(evaluateDelivery({ ...base, delayDays: 10 }, contract)[0].severity, 'Critical'); // 5x grace
  const bad = evaluateDelivery({ ...base, defectiveQty: 9 }, contract);
  assert.equal(bad[0].type, 'Quality defect');
  assert.equal(evaluateDelivery({ ...base, status: 'In transit', delayDays: 30 }, contract).length, 0);
});

ok('score weights renormalise and band thresholds hold', () => {
  assert.equal(scoreFrom({ onTimePct: 100, defectRate: 0, slaCompliance: 100, reviewScore: 100 }), 100);
  assert.equal(scoreFrom({ onTimePct: 80, defectRate: null, slaCompliance: null, reviewScore: null }), 80);
  assert.equal(bandFor(90), 'Excellent'); assert.equal(bandFor(80), 'Reliable');
  assert.equal(bandFor(70), 'Watch'); assert.equal(bandFor(60), 'At risk');
});

const board = supplierMetrics(data, { from: new Date(+now - 365 * 86400000), to: now }, now);
ok('every supplier gets a score, a band and a 12-month pulse', () => {
  assert.equal(board.length, 14);
  for (const m of board) {
    assert.ok(m.score > 0 && m.score <= 100, `${m.name} score ${m.score}`);
    assert.equal(m.pulse.length, 12);
  }
  const bands = new Set(board.map((m) => m.band));
  assert.ok(bands.size >= 4, 'demo data should span all four bands: ' + [...bands]);
});

ok('overview KPIs are sane', () => {
  const k = overview(data, now);
  assert.ok(k.onTimePct > 50 && k.onTimePct < 100);
  assert.ok(k.slaCompliance > 50 && k.slaCompliance <= 100);
  assert.ok(k.spend12m > 1e7);
  assert.ok(k.renewalCount >= 3);
  assert.ok(k.openViolations > 0);
  console.log('      ', JSON.stringify({ score: k.avgScore, onTime: k.onTimePct, sla: k.slaCompliance, spend: k.spend12m, renewals: k.renewalCount, open: k.openViolations }));
});

ok('monthly series and renewals', () => {
  const s = monthlySeries(data.deliveries, data.violations, now, 12);
  assert.equal(s.length, 12);
  assert.ok(s.every((m) => m.delivered > 0));
  const r = renewals(data.contracts, data.suppliers, now);
  assert.ok(r.some((x) => x.window === 'Lapsed'));
  assert.ok(r.some((x) => x.window === '30'));
});

ok('tableau datasets are rectangular and csv-safe', () => {
  const sets = buildDatasets(data, now);
  assert.deepEqual(Object.keys(sets).sort(), ['contracts', 'deliveries', 'evaluations', 'monthly_supplier_kpis', 'supplier_scorecard', 'suppliers', 'violations']);
  for (const [name, rows] of Object.entries(sets)) {
    assert.ok(rows.length > 0, name);
    const cols = Object.keys(rows[0]).length;
    assert.ok(rows.every((r) => Object.keys(r).length === cols), name + ' ragged');
  }
  assert.equal(toCsv([{ a: 'x,"y"', b: 1 }]), 'a,b\n"x,""y""",1\n');
  const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../tableau-data');
  fs.mkdirSync(out, { recursive: true });
  for (const [name, rows] of Object.entries(sets)) fs.writeFileSync(path.join(out, `partnerpulse_${name}.csv`), toCsv(rows));
});

console.log(`\n${passed} checks passed\n`);
