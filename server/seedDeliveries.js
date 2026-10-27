
require("dotenv").config();

const mongoose = require("mongoose");
const Supplier = require("./models/Supplier");
const Contract = require("./models/Contract");
const Delivery = require("./models/Delivery");

const sampleDeliveries = [
  {
    deliveryNumber: "PP-DEL-101",
    itemDescription: "Office stationery supplies",
    quantity: 200,
    orderValue: 25000,
    orderDate: "2026-10-01",
    expectedDeliveryDate: "2026-10-08",
    actualDeliveryDate: "2026-10-07",
    status: "Delivered",
    trackingNumber: "TRK-DEL-101",
    notes: "Delivered one day early."
  },
  {
    deliveryNumber: "PP-DEL-102",
    itemDescription: "Packaging boxes",
    quantity: 500,
    orderValue: 45000,
    orderDate: "2026-10-03",
    expectedDeliveryDate: "2026-10-12",
    actualDeliveryDate: "2026-10-12",
    status: "Delivered",
    trackingNumber: "TRK-DEL-102",
    notes: "Delivered on schedule."
  },
  {
    deliveryNumber: "PP-DEL-103",
    itemDescription: "Computer accessories",
    quantity: 40,
    orderValue: 60000,
    orderDate: "2026-10-05",
    expectedDeliveryDate: "2026-10-15",
    actualDeliveryDate: null,
    status: "In Transit",
    trackingNumber: "TRK-DEL-103",
    notes: "Shipment in transit."
  },
  {
    deliveryNumber: "PP-DEL-104",
    itemDescription: "Raw manufacturing materials",
    quantity: 300,
    orderValue: 85000,
    orderDate: "2026-10-06",
    expectedDeliveryDate: "2026-10-14",
    actualDeliveryDate: null,
    status: "Delayed",
    trackingNumber: "TRK-DEL-104",
    notes: "Supplier reported a transport delay."
  },
  {
    deliveryNumber: "PP-DEL-105",
    itemDescription: "Network equipment",
    quantity: 15,
    orderValue: 95000,
    orderDate: "2026-10-08",
    expectedDeliveryDate: "2026-10-20",
    actualDeliveryDate: null,
    status: "Ordered",
    trackingNumber: "TRK-DEL-105",
    notes: "Awaiting dispatch."
  },
  {
    deliveryNumber: "PP-DEL-106",
    itemDescription: "Warehouse safety equipment",
    quantity: 80,
    orderValue: 38000,
    orderDate: "2026-10-09",
    expectedDeliveryDate: "2026-10-18",
    actualDeliveryDate: "2026-10-17",
    status: "Delivered",
    trackingNumber: "TRK-DEL-106",
    notes: "Completed ahead of schedule."
  },
  {
    deliveryNumber: "PP-DEL-107",
    itemDescription: "Printer paper cartons",
    quantity: 150,
    orderValue: 18000,
    orderDate: "2026-10-10",
    expectedDeliveryDate: "2026-10-19",
    actualDeliveryDate: null,
    status: "In Transit",
    trackingNumber: "TRK-DEL-107",
    notes: "Shipment dispatched."
  },
  {
    deliveryNumber: "PP-DEL-108",
    itemDescription: "Industrial spare parts",
    quantity: 60,
    orderValue: 72000,
    orderDate: "2026-10-11",
    expectedDeliveryDate: "2026-10-17",
    actualDeliveryDate: null,
    status: "Delayed",
    trackingNumber: "TRK-DEL-108",
    notes: "Delivery is behind schedule."
  },
  {
    deliveryNumber: "PP-DEL-109",
    itemDescription: "Cloud server hardware",
    quantity: 8,
    orderValue: 120000,
    orderDate: "2026-10-12",
    expectedDeliveryDate: "2026-10-25",
    actualDeliveryDate: null,
    status: "Ordered",
    trackingNumber: "TRK-DEL-109",
    notes: "Order confirmed."
  },
  {
    deliveryNumber: "PP-DEL-110",
    itemDescription: "Cleaning and facility supplies",
    quantity: 100,
    orderValue: 22000,
    orderDate: "2026-10-13",
    expectedDeliveryDate: "2026-10-20",
    actualDeliveryDate: "2026-10-20",
    status: "Delivered",
    trackingNumber: "TRK-DEL-110",
    notes: "Delivered on the expected date."
  },
  {
    deliveryNumber: "PP-DEL-111",
    itemDescription: "Transport packaging materials",
    quantity: 250,
    orderValue: 32000,
    orderDate: "2026-10-14",
    expectedDeliveryDate: "2026-10-23",
    actualDeliveryDate: null,
    status: "In Transit",
    trackingNumber: "TRK-DEL-111",
    notes: "Shipment moving to destination."
  },
  {
    deliveryNumber: "PP-DEL-112",
    itemDescription: "Electrical components",
    quantity: 90,
    orderValue: 54000,
    orderDate: "2026-10-15",
    expectedDeliveryDate: "2026-10-22",
    actualDeliveryDate: null,
    status: "Delayed",
    trackingNumber: "TRK-DEL-112",
    notes: "Awaiting updated delivery schedule."
  },
  {
    deliveryNumber: "PP-DEL-113",
    itemDescription: "Software installation equipment",
    quantity: 12,
    orderValue: 68000,
    orderDate: "2026-10-16",
    expectedDeliveryDate: "2026-10-26",
    actualDeliveryDate: null,
    status: "Ordered",
    trackingNumber: "TRK-DEL-113",
    notes: "Pending dispatch."
  },
  {
    deliveryNumber: "PP-DEL-114",
    itemDescription: "Maintenance tool kits",
    quantity: 35,
    orderValue: 41000,
    orderDate: "2026-10-17",
    expectedDeliveryDate: "2026-10-24",
    actualDeliveryDate: "2026-10-23",
    status: "Delivered",
    trackingNumber: "TRK-DEL-114",
    notes: "Delivered one day early."
  },
  {
    deliveryNumber: "PP-DEL-115",
    itemDescription: "Bulk raw materials",
    quantity: 400,
    orderValue: 110000,
    orderDate: "2026-10-18",
    expectedDeliveryDate: "2026-10-30",
    actualDeliveryDate: null,
    status: "Cancelled",
    trackingNumber: "TRK-DEL-115",
    notes: "Sample cancelled order."
  }
];

async function seedDeliveries() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from server/.env");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected:", mongoose.connection.name);

    const suppliers = await Supplier.find().sort({ _id: 1 });
    const contracts = await Contract.find().sort({ _id: 1 });

    if (suppliers.length === 0) {
      throw new Error("No suppliers found. Add suppliers first.");
    }

    console.log(`Found ${suppliers.length} suppliers.`);
    console.log(`Found ${contracts.length} contracts.`);

    let added = 0;
    let skipped = 0;

    for (let i = 0; i < sampleDeliveries.length; i++) {
      const data = sampleDeliveries[i];

      const existing = await Delivery.findOne({
        deliveryNumber: data.deliveryNumber
      });

      if (existing) {
        console.log(`Skipped existing: ${data.deliveryNumber}`);
        skipped++;
        continue;
      }

      const supplier = suppliers[i % suppliers.length];

      // Associate a contract belonging to the same supplier, if available.
      const matchingContracts = contracts.filter(
        (contract) =>
          String(contract.supplier) === String(supplier._id) ||
          String(contract.supplier?._id) === String(supplier._id)
      );

      const contract =
        matchingContracts.length > 0
          ? matchingContracts[i % matchingContracts.length]
          : null;

      await Delivery.create({
        ...data,
        supplier: supplier._id,
        contract: contract ? contract._id : null
      });

      console.log(
        `Added ${data.deliveryNumber} -> ${
          supplier.supplierName || supplier.companyName
        }`
      );

      added++;
    }

    console.log("\n======= DELIVERY SEED SUMMARY =======");
    console.log(`New deliveries added: ${added}`);
    console.log(`Existing deliveries skipped: ${skipped}`);
    console.log(`Total deliveries in database: ${await Delivery.countDocuments()}`);
    console.log("=====================================");
  } catch (error) {
    console.error("Delivery seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedDeliveries();
