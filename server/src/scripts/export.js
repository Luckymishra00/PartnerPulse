// Writes the Tableau-ready CSV files to ../tableau-data (run: npm run export:tableau)
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { loadData } from '../routes/analytics.js';
import { buildDatasets, toCsv } from '../lib/exporter.js';

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../tableau-data');

await connectDB();
const sets = buildDatasets(await loadData());
fs.mkdirSync(outDir, { recursive: true });
for (const [name, rows] of Object.entries(sets)) {
  fs.writeFileSync(path.join(outDir, `partnerpulse_${name}.csv`), toCsv(rows));
  console.log(`  ${String(rows.length).padStart(5)} rows  partnerpulse_${name}.csv`);
}
console.log(`\nWritten to ${outDir}\n`);
await mongoose.disconnect();
