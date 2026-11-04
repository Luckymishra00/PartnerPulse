import { crud } from './crud.js';
import Violation from '../models/Violation.js';

export default crud(Violation, {
  populate: [
    { path: 'supplier', select: 'name code' },
    { path: 'contract', select: 'contractNumber' },
    { path: 'delivery', select: 'poNumber' },
  ],
  search: ['detail'],
  sort: { detectedAt: -1 },
});
