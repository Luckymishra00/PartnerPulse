import { crud } from './crud.js';
import Evaluation from '../models/Evaluation.js';

export default crud(Evaluation, {
  populate: [{ path: 'supplier', select: 'name code category' }],
  search: ['period', 'comments'],
  sort: { period: -1, createdAt: -1 },
  afterSave: async (doc, req) => {
    if (!doc.evaluatedBy && req.user) {
      doc.evaluatedBy = req.user.name;
      await doc.save();
    }
  },
});
