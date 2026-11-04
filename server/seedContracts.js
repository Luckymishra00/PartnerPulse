
require("dotenv").config();

const mongoose = require("mongoose");
const Supplier = require("./models/Supplier");
const Contract = require("./models/Contract");

const sampleContracts = [
  {
    contractNumber: "PP-CON-101",
    contractName: "IT Support Agreement",
    contractType: "Service Agreement",
    contractValue: 250000,
    startDate: "2026-01-01",
    expiryDate: "2027-12-31",
    status: "Active",
    renewalNoticeDays: 60,
    description: "Technical support and IT maintenance services."
  },
  {
    contractNumber: "PP-CON-102",
    contractName: "Packaging Supply Agreement",
    contractType: "Supply Agreement",
    contractValue: 180000,
    startDate: "2026-02-01",
    expiryDate: "2027-02-01",
    status: "Active",
    renewalNoticeDays: 30,
    description: "Regular supply of packaging materials."
  },
  {
    contractNumber: "PP-CON-103",
    contractName: "Logistics Service Contract",
    contractType: "Service Agreement",
    contractValue: 320000,
    startDate: "2026-01-15",
    expiryDate: "2026-11-15",
    status: "Active",
    renewalNoticeDays: 30,
    description: "Transportation and logistics services."
  },
  {
    contractNumber: "PP-CON-104",
    contractName: "Cloud Services Agreement",
    contractType: "Service Agreement",
    contractValue: 450000,
    startDate: "2026-03-01",
    expiryDate: "2027-03-01",
    status: "Active",
    renewalNoticeDays: 60,
    description: "Cloud hosting and infrastructure services."
  },
  {
    contractNumber: "PP-CON-105",
    contractName: "Office Materials Contract",
    contractType: "Supply Agreement",
    contractValue: 90000,
    startDate: "2025-01-01",
    expiryDate: "2026-01-01",
    status: "Expired",
    renewalNoticeDays: 30,
    description: "Supply of routine office materials."
  },
  {
    contractNumber: "PP-CON-106",
    contractName: "Manufacturing Supply Agreement",
    contractType: "Supply Agreement",
    contractValue: 500000,
    startDate: "2026-10-01",
    expiryDate: "2027-10-01",
    status: "Draft",
    renewalNoticeDays: 30,
    description: "Proposed manufacturing materials agreement."
  },
  {
    contractNumber: "PP-CON-107",
    contractName: "Equipment Maintenance Contract",
    contractType: "Maintenance",
    contractValue: 220000,
    startDate: "2026-04-01",
    expiryDate: "2027-04-01",
    status: "Active",
    renewalNoticeDays: 30,
    description: "Scheduled equipment maintenance services."
  },
  {
    contractNumber: "PP-CON-108",
    contractName: "Raw Materials Supply Contract",
    contractType: "Supply Agreement",
    contractValue: 375000,
    startDate: "2026-05-01",
    expiryDate: "2027-05-01",
    status: "Active",
    renewalNoticeDays: 45,
    description: "Supply of raw materials for production."
  },
  {
    contractNumber: "PP-CON-109",
    contractName: "Technology Partnership Agreement",
    contractType: "Partnership",
    contractValue: 600000,
    startDate: "2026-01-01",
    expiryDate: "2028-01-01",
    status: "Active",
    renewalNoticeDays: 60,
    description: "Technology collaboration and partnership."
  },
  {
    contractNumber: "PP-CON-110",
    contractName: "Warehouse Maintenance Agreement",
    contractType: "Maintenance",
    contractValue: 150000,
    startDate: "2026-06-01",
    expiryDate: "2027-06-01",
    status: "Active",
    renewalNoticeDays: 30,
    description: "Warehouse maintenance and repair services."
  },
  {
    contractNumber: "PP-CON-111",
    contractName: "Transport Services Agreement",
    contractType: "Service Agreement",
    contractValue: 280000,
    startDate: "2026-02-15",
    expiryDate: "2027-02-15",
    status: "Active",
    renewalNoticeDays: 30,
    description: "Transport and delivery service agreement."
  },
  {
    contractNumber: "PP-CON-112",
    contractName: "Office Equipment Supply",
    contractType: "Supply Agreement",
    contractValue: 125000,
    startDate: "2026-10-20",
    expiryDate: "2027-10-20",
    status: "Draft",
    renewalNoticeDays: 30,
    description: "Proposed supply of office equipment."
  },
  {
    contractNumber: "PP-CON-113",
    contractName: "Software Maintenance Contract",
    contractType: "Maintenance",
    contractValue: 310000,
    startDate: "2026-07-01",
    expiryDate: "2027-07-01",
    status: "Active",
    renewalNoticeDays: 45,
    description: "Software maintenance and technical updates."
  },
  {
    contractNumber: "PP-CON-114",
    contractName: "Business Partnership Contract",
    contractType: "Partnership",
    contractValue: 425000,
    startDate: "2025-01-01",
    expiryDate: "2028-01-01",
    status: "Renewed",
    renewalNoticeDays: 60,
    description: "Renewed business partnership agreement."
  },
  {
    contractNumber: "PP-CON-115",
    contractName: "Facility Services Agreement",
    contractType: "Other",
    contractValue: 200000,
    startDate: "2026-01-01",
    expiryDate: "2027-01-01",
    status: "Terminated",
    renewalNoticeDays: 30,
    description: "Facility support services agreement."
  }
];

async function seedContracts() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from server/.env");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected:", mongoose.connection.name);

    const suppliers = await Supplier.find().sort({ _id: 1 });

    if (suppliers.length === 0) {
      throw new Error(
        "No suppliers found. Add at least one supplier before seeding."
      );
    }

    console.log(`Found ${suppliers.length} existing suppliers.`);

    let added = 0;
    let skipped = 0;

    for (let i = 0; i < sampleContracts.length; i++) {
      const data = sampleContracts[i];

      const existing = await Contract.findOne({
        contractNumber: data.contractNumber
      });

      if (existing) {
        console.log(`Skipped existing: ${data.contractNumber}`);
        skipped++;
        continue;
      }

      // Link each contract to a real supplier in your database.
      const supplier = suppliers[i % suppliers.length];

      await Contract.create({
        ...data,
        supplier: supplier._id
      });

      console.log(
        `Added ${data.contractNumber} -> ${
          supplier.supplierName || supplier.companyName
        }`
      );

      added++;
    }

    const total = await Contract.countDocuments();

    console.log("\n========== SEED SUMMARY ==========");
    console.log(`New contracts added: ${added}`);
    console.log(`Already-existing contracts skipped: ${skipped}`);
    console.log(`Total contracts in database: ${total}`);
    console.log("==================================");
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedContracts();
