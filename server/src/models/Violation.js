import mongoose from 'mongoose';

const violationSchema = new mongoose.Schema(
  {
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
    contract: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract' },
    delivery: { type: mongoose.Schema.Types.ObjectId, ref: 'Delivery', index: true },
    type: { type: String, enum: ['Late delivery', 'Quality defect', 'Response time', 'Other'], required: true },
    severity: { type: String, enum: ['Minor', 'Major', 'Critical'], default: 'Minor' },
    status: { type: String, enum: ['Open', 'Acknowledged', 'Resolved', 'Waived'], default: 'Open' },
    detail: { type: String, trim: true },
    penalty: { type: Number, default: 0, min: 0 },
    auto: { type: Boolean, default: false },
    detectedAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

violationSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    this.resolvedAt = ['Resolved', 'Waived'].includes(this.status) ? new Date() : undefined;
  }
  next();
});

export default mongoose.model('Violation', violationSchema);
