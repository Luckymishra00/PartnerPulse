import { asyncH } from '../middleware/auth.js';
import { crud } from './crud.js';
import Supplier from '../models/Supplier.js';
import Contract from '../models/Contract.js';
import Delivery from '../models/Delivery.js';
import Evaluation from '../models/Evaluation.js';
import Violation from '../models/Violation.js';
import { monthlySeries, supplierMetrics } from '../lib/metrics.js';

const router = crud(Supplier, {
  search: ['name', 'code', 'city', 'contactName'],
  sort: { name: 1 },
  beforeDelete: async (s) => {
    const used = await Delivery.countDocuments({ supplier: s._id });
    if (used) {
      const e = new Error('This supplier has delivery history. Set its status to Offboarded instead of deleting it.');
      e.name = 'ValidationError';
      e.errors = { supplier: { message: e.message } };
      throw e;
    }
    await Contract.deleteMany({ supplier: s._id });
    await Evaluation.deleteMany({ supplier: s._id });
    await Violation.deleteMany({ supplier: s._id });
  },
});

// Everything the supplier profile page needs in one call
router.get(
  '/:id/profile',
  asyncH(async (req, res) => {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    const [contracts, deliveries, evaluations, violations] = await Promise.all([
      Contract.find({ supplier: supplier._id }).sort({ endDate: -1 }),
      Delivery.find({ supplier: supplier._id }).sort({ orderDate: -1 }),
      Evaluation.find({ supplier: supplier._id }).sort({ period: -1 }),
      Violation.find({ supplier: supplier._id }).sort({ detectedAt: -1 }),
    ]);
    const plain = (docs) => docs.map((d) => d.toObject());
    const data = {
      suppliers: [supplier.toObject()],
      contracts: plain(contracts),
      deliveries: plain(deliveries),
      evaluations: plain(evaluations),
      violations: plain(violations),
    };
    const now = new Date();
    const [metrics] = supplierMetrics(data, { from: new Date(+now - 365 * 86400000), to: now }, now);
    res.json({
      supplier,
      metrics,
      trend: monthlySeries(data.deliveries, data.violations, now, 12),
      contracts,
      deliveries: deliveries.slice(0, 25),
      evaluations,
      violations: violations.slice(0, 25),
    });
  })
);

export default router;
