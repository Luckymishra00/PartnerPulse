import mongoose from 'mongoose';

export const CATEGORIES = [
  'Raw materials',
  'Packaging',
  'Logistics',
  'IT services',
  'Facility services',
  'Electronics',
  'Chemicals',
  'Maintenance',
];

const supplierSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true },
    name: { type: String, required: [true, 'Supplier name is required'], trim: true },
    category: { type: String, enum: CATEGORIES, required: true },
    tier: { type: String, enum: ['Strategic', 'Preferred', 'Approved', 'Probation'], default: 'Approved' },
    status: { type: String, enum: ['Active', 'On hold', 'Offboarded'], default: 'Active' },
    contactName: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    city: { type: String, trim: true },
    country: { type: String, trim: true, default: 'India' },
    taxId: { type: String, trim: true },
    onboardedOn: { type: Date, default: Date.now },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

supplierSchema.pre('validate', async function (next) {
  if (!this.code) {
    const last = await this.constructor.findOne({}, { code: 1 }).sort({ code: -1 }).lean();
    const n = last?.code ? parseInt(last.code.replace(/\D/g, ''), 10) + 1 : 1;
    this.code = `SUP-${String(n).padStart(3, '0')}`;
  }
  next();
});

export default mongoose.model('Supplier', supplierSchema);
