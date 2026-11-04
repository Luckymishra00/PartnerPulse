
require("dotenv").config();

const mongoose = require("mongoose");

const Supplier = require("./models/Supplier");
const Contract = require("./models/Contract");
const Delivery = require("./models/Delivery");
const Evaluation = require("./models/Evaluation");

async function seedRelationships() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from your server/.env file");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB successfully.\n");

    const suppliers = await Supplier.find().sort({ supplierName: 1 });

    if (suppliers.length === 0) {
      console.log("No suppliers found. Seed suppliers first.");
      return;
    }

    let contractsCreated = 0;
    let deliveriesCreated = 0;
    let evaluationsCreated = 0;

    const now = new Date();

    const orderDate = new Date(now);
    orderDate.setDate(orderDate.getDate() - 2);

    const expectedDeliveryDate = new Date(now);
    expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + 14);

    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 30);

    const expiryDate = new Date(now);
    expiryDate.setDate(expiryDate.getDate() + 365);

    for (const supplier of suppliers) {
      const supplierId = supplier._id;
      const id = supplierId.toString();

      console.log(`\nProcessing: ${supplier.supplierName}`);

      // 1. Find an existing contract or create one.
      let contract = await Contract.findOne({
        supplier: supplierId,
      }).sort({ createdAt: 1 });

      if (!contract) {
        contract = await Contract.create({
          contractNumber: `PP-AUTO-CON-${id}`,
          contractName: `${supplier.companyName} Supply Agreement`,
          supplier: supplierId,
          contractType: "Supply Agreement",
          contractValue: 100000,
          startDate,
          expiryDate,
          status: "Active",
          renewalNoticeDays: 30,
          description:
            "Sample contract created to establish supplier relationships.",
        });

        contractsCreated++;
        console.log("  + Contract created");
      } else {
        console.log("  = Contract already exists");
      }

      // 2. Find an existing delivery or create one.
      const existingDelivery = await Delivery.findOne({
        supplier: supplierId,
      });

      if (!existingDelivery) {
        await Delivery.create({
          deliveryNumber: `PP-AUTO-DEL-${id}`,
          supplier: supplierId,
          contract: contract._id,
          itemDescription: `Sample goods or services from ${supplier.companyName}`,
          quantity: 10,
          orderValue: 10000,
          orderDate,
          expectedDeliveryDate,
          status: "Ordered",
          trackingNumber: `TRACK-${id.slice(-8).toUpperCase()}`,
          notes:
            "Sample delivery created to establish supplier relationships.",
        });

        deliveriesCreated++;
        console.log("  + Delivery created");
      } else {
        console.log("  = Delivery already exists");
      }

      // 3. Find an existing evaluation or create one.
      const existingEvaluation = await Evaluation.findOne({
        supplier: supplierId,
      });

      if (!existingEvaluation) {
        await Evaluation.create({
          supplier: supplierId,
          evaluationDate: now,
          qualityScore: 4,
          deliveryScore: 4,
          costScore: 4,
          communicationScore: 5,
          comments:
            "Sample evaluation for testing supplier performance analytics.",
        });

        evaluationsCreated++;
        console.log("  + Evaluation created");
      } else {
        console.log("  = Evaluation already exists");
      }
    }

    console.log("\n========== SEED SUMMARY ==========");
    console.log(`Suppliers processed: ${suppliers.length}`);
    console.log(`Contracts created: ${contractsCreated}`);
    console.log(`Deliveries created: ${deliveriesCreated}`);
    console.log(`Evaluations created: ${evaluationsCreated}`);

    console.log("\nExisting records were preserved.");
  } catch (error) {
    console.error("\nSeeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("\nMongoDB connection closed.");
  }
}

seedRelationships();
