
require("dotenv").config();
const mongoose = require("mongoose");

const Supplier = require("./models/Supplier");
const Contract = require("./models/Contract");
const Delivery = require("./models/Delivery");
const Evaluation = require("./models/Evaluation");

async function checkRelationships() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("\n========== PARTNERPULSE DATABASE AUDIT ==========\n");

    const suppliers = await Supplier.find().sort({ companyName: 1 });

    console.log(`Total suppliers: ${suppliers.length}\n`);

    let suppliersWithoutContracts = 0;
    let suppliersWithoutDeliveries = 0;
    let suppliersWithoutEvaluations = 0;

    for (const supplier of suppliers) {
      const [contracts, deliveries, evaluations] = await Promise.all([
        Contract.countDocuments({ supplier: supplier._id }),
        Delivery.countDocuments({ supplier: supplier._id }),
        Evaluation.countDocuments({ supplier: supplier._id }),
      ]);

      if (contracts === 0) suppliersWithoutContracts++;
      if (deliveries === 0) suppliersWithoutDeliveries++;
      if (evaluations === 0) suppliersWithoutEvaluations++;

      console.log(`Supplier: ${supplier.companyName}`);
      console.log(`  Contracts: ${contracts}`);
      console.log(`  Deliveries: ${deliveries}`);
      console.log(`  Evaluations: ${evaluations}`);
      console.log("-----------------------------------------------");
    }

    console.log("\n========== SUMMARY ==========");
    console.log(`Suppliers without contracts: ${suppliersWithoutContracts}`);
    console.log(`Suppliers without deliveries: ${suppliersWithoutDeliveries}`);
    console.log(`Suppliers without evaluations: ${suppliersWithoutEvaluations}`);

    const [contractCount, deliveryCount, evaluationCount] =
      await Promise.all([
        Contract.countDocuments(),
        Delivery.countDocuments(),
        Evaluation.countDocuments(),
      ]);

    console.log(`\nTotal contracts: ${contractCount}`);
    console.log(`Total deliveries: ${deliveryCount}`);
    console.log(`Total evaluations: ${evaluationCount}`);
  } catch (error) {
    console.error("Database audit failed:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkRelationships();
