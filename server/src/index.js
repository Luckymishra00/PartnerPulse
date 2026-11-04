import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { connectDB } from './config/db.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/error.js';
import auth from './routes/auth.js';
import suppliers from './routes/suppliers.js';
import contracts from './routes/contracts.js';
import deliveries from './routes/deliveries.js';
import evaluations from './routes/evaluations.js';
import violations from './routes/violations.js';
import analytics from './routes/analytics.js';
import exportsRoute from './routes/exports.js';

const app = express();
app.use(cors({ origin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',') }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'partnerpulse' }));
app.use('/api/auth', auth);

app.use('/api/suppliers', requireAuth, suppliers);
app.use('/api/contracts', requireAuth, contracts);
app.use('/api/deliveries', requireAuth, deliveries);
app.use('/api/evaluations', requireAuth, evaluations);
app.use('/api/violations', requireAuth, violations);
app.use('/api/analytics', requireAuth, analytics);
app.use('/api/exports', requireAuth, exportsRoute);

// After `npm run build`, the API also serves the React app, so one process runs everything
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (fs.existsSync(path.join(dist, 'index.html'))) {
  app.use(express.static(dist));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 5000;
connectDB()
  .then(() => app.listen(port, () => console.log(`PartnerPulse API listening on http://localhost:${port}`)))
  .catch(() => process.exit(1));
