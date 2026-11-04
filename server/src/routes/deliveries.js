import { crud } from './crud.js';
import Delivery from '../models/Delivery.js';
import Contract from '../models/Contract.js';
import Violation from '../models/Violation.js';
import { syncDeliveryViolations } from '../lib/sla.js';

// Every save re-checks the delivery against the contract's SLA terms and raises or clears violations.
async function checkSla(delivery) {
  let contract = delivery.contract ? await Contract.findById(delivery.contract) : null;
  if (!contract) {
    contract = await Contract.findOne({ supplier: delivery.supplier, state: 'Active' }).sort({ endDate: -1 });
    if (contract && !delivery.contract) {
      delivery.contract = contract._id;
      await delivery.save();
    }
  }
  await syncDeliveryViolations({ delivery, contract, Violation });
}

export default crud(Delivery, {
  populate: [{ path: 'supplier', select: 'name code category' }],
  search: ['poNumber', 'item'],
  sort: { orderDate: -1 },
  afterSave: checkSla,
  beforeDelete: async (d) => {
    await Violation.deleteMany({ delivery: d._id, auto: true });
  },
});
