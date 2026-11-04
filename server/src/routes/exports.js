import { Router } from 'express';
import { asyncH } from '../middleware/auth.js';
import { loadData } from './analytics.js';
import { buildDatasets, toCsv } from '../lib/exporter.js';

const r = Router();

r.get(
  '/',
  asyncH(async (_req, res) => {
    const sets = buildDatasets(await loadData());
    res.json(Object.entries(sets).map(([name, rows]) => ({ name, rows: rows.length, columns: rows[0] ? Object.keys(rows[0]).length : 0 })));
  })
);

r.get(
  '/:name.csv',
  asyncH(async (req, res) => {
    const sets = buildDatasets(await loadData());
    const rows = sets[req.params.name];
    if (!rows) return res.status(404).json({ message: 'Unknown dataset' });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="partnerpulse_${req.params.name}.csv"`);
    res.send(toCsv(rows));
  })
);

export default r;
