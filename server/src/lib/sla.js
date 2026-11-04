// SLA rule engine. Pure functions: given a delivery and the contract's SLA terms,
// decide which breaches (if any) the delivery caused.

const MULT = { Minor: 1, Major: 2, Critical: 3 };

export function evaluateDelivery(delivery, contract) {
  const sla = contract?.sla || {};
  const maxDelay = sla.maxDelayDays ?? 3;
  const maxDefect = sla.maxDefectRate ?? 2;
  const base = sla.penaltyPerBreach ?? 0;
  const out = [];

  if (delivery.status !== 'Delivered') return out;

  // Late beyond the grace window written into the contract
  if (delivery.delayDays > maxDelay) {
    const ratio = delivery.delayDays / Math.max(maxDelay, 1);
    const severity = ratio > 4 ? 'Critical' : ratio > 2 ? 'Major' : 'Minor';
    out.push({
      type: 'Late delivery',
      severity,
      detail: `${delivery.poNumber} arrived ${delivery.delayDays} days after the promised date (grace: ${maxDelay} days)`,
      penalty: base * MULT[severity],
    });
  }

  // Defect rate above the contract ceiling
  const received = delivery.quantityReceived || 0;
  const rate = received ? ((delivery.defectiveQty || 0) / received) * 100 : 0;
  if (rate > maxDefect) {
    const ratio = rate / Math.max(maxDefect, 0.1);
    const severity = ratio > 3 ? 'Critical' : ratio > 1.75 ? 'Major' : 'Minor';
    out.push({
      type: 'Quality defect',
      severity,
      detail: `${delivery.poNumber} had ${rate.toFixed(1)}% defective units (limit: ${maxDefect}%)`,
      penalty: base * MULT[severity],
    });
  }

  return out;
}

// Keeps the violations collection in step with a delivery. Safe to call repeatedly.
export async function syncDeliveryViolations({ delivery, contract, Violation }) {
  const found = evaluateDelivery(delivery, contract);
  const existing = await Violation.find({ delivery: delivery._id, auto: true });

  for (const f of found) {
    const match = existing.find((e) => e.type === f.type);
    if (match) {
      Object.assign(match, { severity: f.severity, detail: f.detail, penalty: f.penalty });
      await match.save();
    } else {
      await Violation.create({
        ...f,
        auto: true,
        supplier: delivery.supplier,
        contract: delivery.contract,
        delivery: delivery._id,
        detectedAt: delivery.deliveredDate || new Date(),
      });
    }
  }

  // A corrected delivery can clear an old breach, but only remove it if nobody acted on it yet
  for (const e of existing) {
    if (!found.some((f) => f.type === e.type) && e.status === 'Open') await e.deleteOne();
  }
}
