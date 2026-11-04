import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { generateDataset } from '../lib/demoData.js';
import User from '../models/User.js';
import Supplier from '../models/Supplier.js';
import Contract from '../models/Contract.js';
import Delivery from '../models/Delivery.js';
import Evaluation from '../models/Evaluation.js';
import Violation from '../models/Violation.js';

const DEMO = { name: 'Lucky Mishra', email: 'admin@partnerpulse.test', password: 'Pulse@2026' };

async function run() {
  await connectDB();
  const data = generateDataset(new Date());

  await Promise.all([Supplier, Contract, Delivery, Evaluation, Violation].map((m) => m.deleteMany({})));
  await Supplier.insertMany(data.suppliers);
  await Contract.insertMany(data.contracts);
  await Delivery.insertMany(data.deliveries);
  await Evaluation.insertMany(data.evaluations);
  await Violation.insertMany(data.violations);

  if (!(await User.findOne({ email: DEMO.email }))) {
    await User.create({ name: DEMO.name, email: DEMO.email, role: 'admin', passwordHash: await User.hash(DEMO.password) });
  }

  console.log('\nSeeded PartnerPulse demo data');
  console.log(`  suppliers    ${data.suppliers.length}`);
  console.log(`  contracts    ${data.contracts.length}`);
  console.log(`  deliveries   ${data.deliveries.length}`);
  console.log(`  evaluations  ${data.evaluations.length}`);
  console.log(`  violations   ${data.violations.length}`);
  console.log(`\nSign in with  ${DEMO.email}  /  ${DEMO.password}\n`);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
