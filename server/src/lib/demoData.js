// Generates a believable 12 months of procurement history. Deterministic (seeded RNG),
// so charts look the same on every machine. Pure: no database access.
import { evaluateDelivery } from './sla.js';
import { overallFrom } from './evalScore.js';

const DAY = 86400000;
// 24-hex ids; Mongoose casts these to ObjectId on insert, so no DB driver is needed here
let counter = 0;
const oid = () => {
  const hex = (n, w) => n.toString(16).padStart(w, '0');
  return hex(Math.floor(Date.now() / 1000), 8) + hex(0xa1b2c3d4e5 % 0x10000000000, 10) + hex(++counter, 6);
};

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// rel = baseline on-time reliability, slope = drift over the year (+ improving, - declining),
// defect = baseline defect rate in %, endOffset = contract end in days from today
const PROFILES = [
  { name: 'Nirmal Steel Works', category: 'Raw materials', tier: 'Strategic', city: 'Ludhiana', rel: 0.93, slope: 0.02, defect: 1.1, endOffset: 210, perMonth: 5, item: ['TMT bars 12mm', 'Steel coils HR', 'MS angles'], val: [900000, 2500000] },
  { name: 'Punjab Packwell Industries', category: 'Packaging', tier: 'Preferred', city: 'Khanna', rel: 0.86, slope: 0.05, defect: 1.6, endOffset: 41, perMonth: 5, item: ['Corrugated cartons', 'Stretch film', 'Pallet wrap'], val: [150000, 600000] },
  { name: 'Satluj Freight Lines', category: 'Logistics', tier: 'Approved', city: 'Ludhiana', rel: 0.76, slope: -0.04, defect: 0.6, endOffset: 66, perMonth: 6, item: ['Full truckload - Delhi NCR', 'Part load - Mumbai', 'Express freight'], val: [60000, 300000] },
  { name: 'Aryavart Data Systems', category: 'IT services', tier: 'Strategic', city: 'Bengaluru', rel: 0.95, slope: 0.0, defect: 0.5, endOffset: 380, perMonth: 2, item: ['Managed support - monthly', 'ERP customisation sprint', 'Network audit'], val: [250000, 1200000] },
  { name: 'Himalaya Chemicals Pvt Ltd', category: 'Chemicals', tier: 'Approved', city: 'Baddi', rel: 0.82, slope: -0.06, defect: 2.4, endOffset: 18, perMonth: 4, item: ['Industrial solvent 200L', 'Caustic soda flakes', 'Coolant concentrate'], val: [200000, 800000] },
  { name: 'Kaveri Electronics', category: 'Electronics', tier: 'Preferred', city: 'Chennai', rel: 0.9, slope: 0.01, defect: 1.4, endOffset: 300, perMonth: 4, item: ['PLC modules', 'Control relays', 'Sensor kits'], val: [400000, 1500000] },
  { name: 'BrightEdge Facility Care', category: 'Facility services', tier: 'Approved', city: 'Gurugram', rel: 0.7, slope: 0.0, defect: 1.8, endOffset: -12, perMonth: 3, item: ['Housekeeping - monthly', 'HVAC servicing', 'Pest control'], val: [40000, 180000] },
  { name: 'Triveni Fasteners', category: 'Raw materials', tier: 'Approved', city: 'Rajkot', rel: 0.84, slope: 0.03, defect: 1.9, endOffset: 450, perMonth: 4, item: ['High tensile bolts', 'Anchor fasteners', 'Washers bulk'], val: [120000, 500000] },
  { name: 'Deccan Cold Chain', category: 'Logistics', tier: 'Probation', city: 'Hyderabad', rel: 0.64, slope: -0.03, defect: 1.2, endOffset: 88, perMonth: 4, item: ['Reefer transport - Chennai', 'Cold storage - weekly', 'Reefer transport - Pune'], val: [90000, 380000] },
  { name: 'Sundaram Corrugates', category: 'Packaging', tier: 'Preferred', city: 'Coimbatore', rel: 0.91, slope: 0.01, defect: 1.0, endOffset: 520, perMonth: 4, item: ['5-ply boxes', 'Die-cut inserts', 'Printed sleeves'], val: [180000, 700000] },
  { name: 'Vajra Maintenance Services', category: 'Maintenance', tier: 'Approved', city: 'Pune', rel: 0.78, slope: 0.04, defect: 1.5, endOffset: 130, perMonth: 3, item: ['Preventive maintenance - line 2', 'Compressor overhaul', 'Conveyor realignment'], val: [100000, 450000] },
  { name: 'Orbit Semiconductor Distribution', category: 'Electronics', tier: 'Approved', city: 'Noida', rel: 0.87, slope: -0.02, defect: 2.1, endOffset: 240, perMonth: 4, item: ['Power ICs', 'MOSFET reels', 'Connectors lot'], val: [300000, 1100000] },
  { name: 'GreenLeaf Industrial Gases', category: 'Chemicals', tier: 'Strategic', city: 'Vadodara', rel: 0.96, slope: 0.0, defect: 0.4, endOffset: 600, perMonth: 4, item: ['Nitrogen cylinders', 'Argon mix', 'Oxygen bulk fill'], val: [150000, 650000] },
  { name: 'Zenith Cloud Hosting', category: 'IT services', tier: 'Preferred', city: 'Mumbai', rel: 0.92, slope: -0.07, defect: 0.7, endOffset: 700, perMonth: 2, item: ['Cloud hosting - monthly', 'Backup storage tier', 'DDoS protection add-on'], val: [180000, 520000] },
];

const sla = (rand, category) => ({
  onTimeTarget: [90, 92, 95, 95, 97][Math.floor(rand() * 5)],
  maxDelayDays: category === 'Logistics' ? 1 : [2, 3, 3, 4, 5][Math.floor(rand() * 5)],
  maxDefectRate: [1.5, 2, 2, 2.5, 3][Math.floor(rand() * 5)],
  responseHours: [4, 8, 24, 24, 48][Math.floor(rand() * 5)],
  penaltyPerBreach: [5000, 10000, 15000, 25000, 50000][Math.floor(rand() * 5)],
});

export function generateDataset(now = new Date()) {
  const rand = rng(20261024);
  const between = (a, b) => a + rand() * (b - a);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  const suppliers = [];
  const contracts = [];
  const deliveries = [];
  const evaluations = [];
  const violations = [];

  let po = 4000;
  const t0 = +now - 365 * DAY;

  PROFILES.forEach((p, i) => {
    const sid = oid();
    const first = p.name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
    suppliers.push({
      _id: sid,
      code: `SUP-${String(i + 1).padStart(3, '0')}`,
      name: p.name,
      category: p.category,
      tier: p.tier,
      status: 'Active',
      contactName: pick(['Rohan Mehta', 'Anita Sharma', 'Gurpreet Singh', 'Kavita Nair', 'Imran Qureshi', 'Deepa Iyer']),
      email: `accounts@${first}.example.in`,
      phone: `+91 9${Math.floor(between(100000000, 999999999))}`,
      city: p.city,
      country: 'India',
      taxId: `${Math.floor(between(3, 29))}AAB${String.fromCharCode(65 + (i % 26))}${Math.floor(between(1000, 9999))}F1Z${i % 9}`,
      onboardedOn: new Date(+now - between(400, 1500) * DAY),
      notes: '',
    });

    const end = new Date(+now + p.endOffset * DAY);
    const term = pick([12, 24, 36]);
    const start = new Date(+end - term * 30.4 * DAY);
    const cid = oid();
    const annualValue = Math.round(between(p.val[0], p.val[1]) * 12 / 1000) * 1000;
    contracts.push({
      _id: cid,
      supplier: sid,
      contractNumber: `CT-${2024 + (i % 3)}-${String(100 + i * 7)}`,
      title: `${p.category} supply agreement`,
      type: p.category === 'IT services' ? 'Licensing' : ['Facility services', 'Maintenance', 'Logistics'].includes(p.category) ? 'Service' : 'Supply',
      state: 'Active',
      startDate: start,
      endDate: end,
      annualValue,
      paymentTerms: pick(['Net 30', 'Net 45', 'Net 60']),
      autoRenew: rand() < 0.3,
      renewalNoticeDays: pick([30, 45, 60, 90]),
      sla: sla(rand, p.category),
      notes: '',
      createdAt: start,
      updatedAt: start,
    });
    const contract = contracts[contracts.length - 1];

    // Orders across the last 12 months
    const total = Math.round(p.perMonth * 12 * between(0.9, 1.1));
    for (let n = 0; n < total; n++) {
      const orderDate = new Date(t0 + rand() * 360 * DAY);
      const lead = Math.round(between(4, 24));
      const promisedDate = new Date(+orderDate + lead * DAY);
      const progress = (+orderDate - t0) / (365 * DAY);
      const reliability = Math.min(0.99, Math.max(0.35, p.rel + p.slope * (progress - 0.5) * 4 + (rand() - 0.5) * 0.06));
      const amount = Math.round(between(p.val[0], p.val[1]) / 1000) * 1000;
      const qty = Math.round(between(80, 4000) / 10) * 10;

      const delivery = {
        _id: oid(),
        poNumber: `PO-${++po}`,
        supplier: sid,
        contract: cid,
        item: pick(p.item),
        orderDate,
        promisedDate,
        status: 'Ordered',
        quantityOrdered: qty,
        quantityReceived: 0,
        defectiveQty: 0,
        amount,
        delayDays: 0,
        notes: '',
        createdAt: orderDate,
        updatedAt: orderDate,
      };

      if (+promisedDate > +now - 2 * DAY) {
        delivery.status = rand() < 0.5 ? 'In transit' : 'Ordered';
      } else if (rand() < 0.015) {
        delivery.status = 'In transit'; // stuck order, shows as overdue
      } else if (rand() < 0.01) {
        delivery.status = 'Cancelled';
      } else {
        let delay;
        if (rand() < reliability) delay = rand() < 0.55 ? 0 : -Math.round(between(1, 3));
        else delay = 1 + Math.floor(Math.pow(rand(), 1.6) * (3 + (1 - reliability) * 22));
        const deliveredDate = new Date(+promisedDate + delay * DAY);
        if (+deliveredDate > +now) {
          delivery.status = 'In transit';
        } else {
          const spike = rand() < 0.07 ? between(2, 3.5) : 1;
          const rate = Math.max(0, p.defect * between(0.3, 1.8) * spike);
          const received = qty - (rand() < 0.1 ? Math.round(qty * between(0.01, 0.06)) : 0);
          Object.assign(delivery, {
            status: 'Delivered',
            deliveredDate,
            delayDays: delay,
            quantityReceived: received,
            defectiveQty: Math.round((received * rate) / 100),
            updatedAt: deliveredDate,
          });
        }
      }
      deliveries.push(delivery);

      // SLA violations are derived from the contract, same as when a user records a delivery
      for (const v of evaluateDelivery(delivery, contract)) {
        const age = (+now - +delivery.deliveredDate) / DAY;
        const roll = rand();
        const status = age > 75 ? (roll < 0.8 ? 'Resolved' : roll < 0.9 ? 'Waived' : 'Open')
          : age > 25 ? (roll < 0.45 ? 'Resolved' : roll < 0.7 ? 'Acknowledged' : 'Open')
          : roll < 0.2 ? 'Acknowledged' : 'Open';
        violations.push({
          _id: oid(),
          supplier: sid,
          contract: cid,
          delivery: delivery._id,
          ...v,
          auto: true,
          status,
          detectedAt: delivery.deliveredDate,
          resolvedAt: ['Resolved', 'Waived'].includes(status) ? new Date(+delivery.deliveredDate + between(2, 20) * DAY) : undefined,
          createdAt: delivery.deliveredDate,
          updatedAt: delivery.deliveredDate,
        });
      }
    }

    // A manual response-time breach for the weakest suppliers
    if (p.rel < 0.8 && rand() < 0.9) {
      violations.push({
        _id: oid(), supplier: sid, contract: cid, type: 'Response time', severity: 'Minor', status: 'Open',
        detail: 'Support tickets took longer than the contracted response window during the month-end close',
        penalty: contract.sla.penaltyPerBreach, auto: false, detectedAt: new Date(+now - between(5, 40) * DAY),
        createdAt: now, updatedAt: now,
      });
    }

    // Quarterly reviews, last four quarters
    const q = Math.floor(now.getUTCMonth() / 3) + 1;
    for (let k = 1; k <= 4; k++) {
      let qq = q - k, yy = now.getUTCFullYear();
      while (qq <= 0) { qq += 4; yy -= 1; }
      const drift = p.slope * (1 - k * 0.5) * 4;
      const clamp = (v) => Math.min(5, Math.max(1, Math.round(v * 2) / 2));
      const base = 1 + (p.rel + drift) * 4;
      const scores = {
        delivery: clamp(base + (rand() - 0.5)),
        quality: clamp(1 + (1 - p.defect / 6) * 4 + (rand() - 0.5)),
        pricing: clamp(between(3, 4.6)),
        communication: clamp(between(2.8, 4.8)),
        compliance: clamp(between(3.2, 5)),
      };
      const overall = overallFrom(scores);
      evaluations.push({
        _id: oid(),
        supplier: sid,
        period: `${yy}-Q${qq}`,
        scores,
        overall,
        recommendation: overall >= 4.2 ? 'Expand' : overall >= 3.4 ? 'Maintain' : overall >= 2.7 ? 'Improve' : 'Review for exit',
        comments: overall >= 4.2 ? 'Consistently dependable. Candidate for a larger share of volume.'
          : overall >= 3.4 ? 'Meets expectations. Keep monitoring delivery dates.'
          : 'Below target on delivery or quality. Agree a recovery plan before renewal.',
        evaluatedBy: 'Procurement team',
        evaluatedOn: new Date(Date.UTC(yy, qq * 3, 5)),
        createdAt: now,
        updatedAt: now,
      });
    }
  });

  return { suppliers, contracts, deliveries, evaluations, violations };
}
