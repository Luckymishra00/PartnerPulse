
require("dotenv").config();

const mongoose = require("mongoose");
const Supplier = require("./models/Supplier");
const Evaluation = require("./models/Evaluation");

const sampleEvaluations = [
  {
    evaluationDate: "2026-10-01",
    qualityScore: 5,
    deliveryScore: 5,
    costScore: 4,
    communicationScore: 5,
    comments: "Excellent product quality and timely deliveries."
  },
  {
    evaluationDate: "2026-10-02",
    qualityScore: 4,
    deliveryScore: 4,
    costScore: 5,
    communicationScore: 4,
    comments: "Competitive pricing and reliable service."
  },
  {
    evaluationDate: "2026-10-03",
    qualityScore: 3,
    deliveryScore: 2,
    costScore: 4,
    communicationScore: 3,
    comments: "Delivery delays need improvement."
  },
  {
    evaluationDate: "2026-10-04",
    qualityScore: 5,
    deliveryScore: 4,
    costScore: 4,
    communicationScore: 5,
    comments: "High-quality supplies and good communication."
  },
  {
    evaluationDate: "2026-10-05",
    qualityScore: 4,
    deliveryScore: 3,
    costScore: 5,
    communicationScore: 4,
    comments: "Good value, with occasional delivery delays."
  },
  {
    evaluationDate: "2026-10-06",
    qualityScore: 3,
    deliveryScore: 4,
    costScore: 3,
    communicationScore: 4,
    comments: "Acceptable performance with room for improvement."
  },
  {
    evaluationDate: "2026-10-07",
    qualityScore: 5,
    deliveryScore: 5,
    costScore: 5,
    communicationScore: 4,
    comments: "Consistently dependable supplier."
  },
  {
    evaluationDate: "2026-10-08",
    qualityScore: 4,
    deliveryScore: 3,
    costScore: 4,
    communicationScore: 3,
    comments: "Product quality is good; communication could improve."
  },
  {
    evaluationDate: "2026-10-09",
    qualityScore: 2,
    deliveryScore: 3,
    costScore: 4,
    communicationScore: 2,
    comments: "Quality consistency and communication need attention."
  },
  {
    evaluationDate: "2026-10-10",
    qualityScore: 4,
    deliveryScore: 5,
    costScore: 4,
    communicationScore: 5,
    comments: "Responsive supplier with excellent delivery performance."
  },
  {
    evaluationDate: "2026-10-11",
    qualityScore: 3,
    deliveryScore: 3,
    costScore: 3,
    communicationScore: 4,
    comments: "Average performance across most evaluation criteria."
  },
  {
    evaluationDate: "2026-10-12",
    qualityScore: 5,
    deliveryScore: 4,
    costScore: 3,
    communicationScore: 5,
    comments: "Strong quality and communication; review pricing."
  },
  {
    evaluationDate: "2026-10-13",
    qualityScore: 4,
    deliveryScore: 4,
    costScore: 4,
    communicationScore: 4,
    comments: "Consistent performance across all categories."
  },
  {
    evaluationDate: "2026-10-14",
    qualityScore: 2,
    deliveryScore: 2,
    costScore: 3,
    communicationScore: 3,
    comments: "Improvement required in quality and delivery."
  },
  {
    evaluationDate: "2026-10-15",
    qualityScore: 5,
    deliveryScore: 4,
    costScore: 5,
    communicationScore: 5,
    comments: "Excellent overall performance and competitive costs."
  }
];

async function seedEvaluations() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from server/.env");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected:", mongoose.connection.name);

    const suppliers = await Supplier.find().sort({ _id: 1 });

    if (suppliers.length === 0) {
      throw new Error("No suppliers found. Add suppliers first.");
    }

    console.log(`Found ${suppliers.length} suppliers.`);

    let added = 0;
    let skipped = 0;

    for (let i = 0; i < sampleEvaluations.length; i++) {
      const data = sampleEvaluations[i];

      // Give every sample evaluation a deterministic supplier/date pair.
      const supplier = suppliers[i % suppliers.length];

      const existing = await Evaluation.findOne({
        supplier: supplier._id,
        evaluationDate: new Date(data.evaluationDate)
      });

      if (existing) {
        console.log(
          `Skipped existing evaluation for ${
            supplier.supplierName || supplier.companyName
          } on ${data.evaluationDate}`
        );
        skipped++;
        continue;
      }

      const evaluation = await Evaluation.create({
        ...data,
        supplier: supplier._id
      });

      console.log(
        `Added evaluation for ${
          supplier.supplierName || supplier.companyName
        } | Score: ${evaluation.overallScore}/100`
      );

      added++;
    }

    console.log("\n====== EVALUATION SEED SUMMARY ======");
    console.log(`New evaluations added: ${added}`);
    console.log(`Existing evaluations skipped: ${skipped}`);
    console.log(
      `Total evaluations in database: ${await Evaluation.countDocuments()}`
    );
    console.log("=====================================");
  } catch (error) {
    console.error("Evaluation seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedEvaluations();
