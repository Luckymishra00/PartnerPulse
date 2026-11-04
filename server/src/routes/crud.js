import { Router } from 'express';
import { asyncH, requireRole } from '../middleware/auth.js';

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Generic list / create / read / update / delete router.
// Writes need the admin or manager role; analysts get read-only access.
export function crud(Model, { populate = [], search = [], sort = { createdAt: -1 }, afterSave, beforeDelete } = {}) {
  const r = Router();
  const write = requireRole('admin', 'manager');

  r.get(
    '/',
    asyncH(async (req, res) => {
      const { q, limit = 500, ...filters } = req.query;
      const query = {};
      for (const [k, v] of Object.entries(filters)) {
        if (v !== '' && Model.schema.path(k)) query[k] = v;
      }
      if (q && search.length) query.$or = search.map((f) => ({ [f]: new RegExp(escapeRe(String(q)), 'i') }));
      const [items, total] = await Promise.all([
        Model.find(query).populate(populate).sort(sort).limit(Math.min(+limit || 500, 2000)),
        Model.countDocuments(query),
      ]);
      res.json({ items, total });
    })
  );

  r.get(
    '/:id',
    asyncH(async (req, res) => {
      const doc = await Model.findById(req.params.id).populate(populate);
      if (!doc) return res.status(404).json({ message: 'Record not found' });
      res.json(doc);
    })
  );

  r.post(
    '/',
    write,
    asyncH(async (req, res) => {
      const doc = new Model(req.body);
      await doc.save();
      if (afterSave) await afterSave(doc, req);
      await doc.populate(populate);
      res.status(201).json(doc);
    })
  );

  r.put(
    '/:id',
    write,
    asyncH(async (req, res) => {
      const doc = await Model.findById(req.params.id);
      if (!doc) return res.status(404).json({ message: 'Record not found' });
      doc.set(req.body);
      await doc.save();
      if (afterSave) await afterSave(doc, req);
      await doc.populate(populate);
      res.json(doc);
    })
  );

  r.delete(
    '/:id',
    write,
    asyncH(async (req, res) => {
      const doc = await Model.findById(req.params.id);
      if (!doc) return res.status(404).json({ message: 'Record not found' });
      if (beforeDelete) await beforeDelete(doc);
      await doc.deleteOne();
      res.json({ ok: true });
    })
  );

  return r;
}
