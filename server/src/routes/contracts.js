import { crud } from './crud.js';
import Contract from '../models/Contract.js';

export default crud(Contract, {
  populate: [{ path: 'supplier', select: 'name code category' }],
  search: ['contractNumber', 'title'],
  sort: { endDate: 1 },
});
