import mongoose from 'mongoose';

const DAY = 86400000;

const deliverySchema = new mongoose.Schema(
  {
    poNumber: { type: String, required: [true, 'PO number is required'], unique: true, trim: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
    contract: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract' },
    item: { type: String, required: true, trim: true },
    orderDate: { type: Date, required: true },
    promisedDate: { type: Date, required: true },
    deliveredDate: { type: Date },
    status: { type: String, enum: ['Ordered', 'In transit', 'Delivered', 'Cancelled'], default: 'Ordered' },
    quantityOrdered: { type: Number, required: true, min: 1 },
    quantityReceived: { type: Number, default: 0, min: 0 },
    defectiveQty: { type: Number, default: 0, min: 0 },
    amount: { type: Number, required: true, min: 0 },
    // signed whole days: negative = early, 0 = on the day, positive = late
    delayDays: { type: Number, default: 0 },
    notes: { type: String, trim: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

deliverySchema.pre('validate', function (next) {
  if (this.status === 'Delivered' && !this.deliveredDate) this.deliveredDate = new Date();
  if (this.deliveredDate && this.promisedDate) {
    this.delayDays = Math.round((this.deliveredDate.getTime() - this.promisedDate.getTime()) / DAY);
  } else {
    this.delayDays = 0;
  }
  if (this.defectiveQty > this.quantityReceived) {
    this.invalidate('defectiveQty', 'Defective units cannot exceed units received');
  }
  next();
});

deliverySchema.virtual('defectRate').get(function () {
  return this.quantityReceived ? (this.defectiveQty / this.quantityReceived) * 100 : 0;
});

deliverySchema.virtual('overdueDays').get(function () {
  if (this.status === 'Delivered' || this.status === 'Cancelled' || !this.promisedDate) return 0;
  return Math.max(0, Math.floor((Date.now() - this.promisedDate.getTime()) / DAY));
});

export default mongoose.model('Delivery', deliverySchema);
