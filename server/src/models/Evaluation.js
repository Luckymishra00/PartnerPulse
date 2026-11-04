import mongoose from 'mongoose';

import { overallFrom } from '../lib/evalScore.js';

const score = { type: Number, min: 1, max: 5, required: true };

const evaluationSchema = new mongoose.Schema(
  {
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
    period: { type: String, required: true, match: [/^\d{4}-Q[1-4]$/, 'Use a period like 2026-Q3'] },
    scores: { delivery: score, quality: score, pricing: score, communication: score, compliance: score },
    overall: { type: Number },
    recommendation: { type: String, enum: ['Expand', 'Maintain', 'Improve', 'Review for exit'], default: 'Maintain' },
    comments: { type: String, trim: true },
    evaluatedBy: { type: String, trim: true },
    evaluatedOn: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

evaluationSchema.index({ supplier: 1, period: 1 }, { unique: true });

evaluationSchema.pre('validate', function (next) {
  if (this.scores) this.overall = overallFrom(this.scores);
  next();
});

export default mongoose.model('Evaluation', evaluationSchema);
