// Weighted overall score for a supplier review (1-5). Kept free of database imports
// so the seed generator and the self-test can use it directly.
export const EVAL_WEIGHTS = { delivery: 0.3, quality: 0.3, pricing: 0.15, communication: 0.15, compliance: 0.1 };

export function overallFrom(scores) {
  let total = 0;
  for (const [k, w] of Object.entries(EVAL_WEIGHTS)) total += (scores?.[k] ?? 0) * w;
  return Math.round(total * 100) / 100;
}
