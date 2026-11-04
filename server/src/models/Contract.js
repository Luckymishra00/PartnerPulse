import mongoose from 'mongoose';

const DAY = 86400000;

const contractSchema = new mongoose.Schema(
  {
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
    contractNumber: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ['Supply', 'Service', 'Maintenance', 'Licensing'], default: 'Supply' },
    state: { type: String, enum: ['Draft', 'Active', 'Terminated'], default: 'Active' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    annualValue: { type: Number, required: true, min: 0 },
    paymentTerms: { type: String, default: 'Net 45' },
    autoRenew: { type: Boolean, default: false },
    renewalNoticeDays: { type: Number, default: 60, min: 0 },
    sla: {
      onTimeTarget: { type: Number, default: 95 },
      maxDelayDays: { type: Number, default: 3 },
      maxDefectRate: { type: Number, default: 2 },
      responseHours: { type: Number, default: 24 },
      penaltyPerBreach: { type: Number, default: 10000 },
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

contractSchema.pre('validate', function (next) {
  if (this.startDate && this.endDate && this.endDate <= this.startDate) {
    this.invalidate('endDate', 'End date must be after the start date');
  }
  next();
});

contractSchema.virtual('daysLeft').get(function () {
  if (!this.endDate) return null;
  return Math.ceil((this.endDate.getTime() - Date.now()) / DAY);
});

contractSchema.virtual('lifecycle').get(function () {
  if (this.state === 'Draft') return 'Draft';
  if (this.state === 'Terminated') return 'Terminated';
  const d = this.daysLeft;
  if (d < 0) return 'Lapsed';
  if (d <= 30) return 'Renew within 30 days';
  if (d <= 60) return 'Renew within 60 days';
  if (d <= 90) return 'Renew within 90 days';
  return 'Active';
});

export default mongoose.model('Contract', contractSchema);
