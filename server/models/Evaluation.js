
const mongoose = require("mongoose");

const evaluationSchema = new mongoose.Schema(
  {
    // Supplier being evaluated.
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: [true, "Please select a supplier"],
      index: true,
    },

    // Date on which the supplier is evaluated.
    evaluationDate: {
      type: Date,
      required: [true, "Evaluation date is required"],
      default: Date.now,
    },

    // Quality score: 1 to 5.
    qualityScore: {
      type: Number,
      required: [true, "Quality score is required"],
      min: [1, "Score must be between 1 and 5"],
      max: [5, "Score must be between 1 and 5"],
    },

    // Delivery performance score: 1 to 5.
    deliveryScore: {
      type: Number,
      required: [true, "Delivery score is required"],
      min: [1, "Score must be between 1 and 5"],
      max: [5, "Score must be between 1 and 5"],
    },

    // Cost competitiveness score: 1 to 5.
    costScore: {
      type: Number,
      required: [true, "Cost score is required"],
      min: [1, "Score must be between 1 and 5"],
      max: [5, "Score must be between 1 and 5"],
    },

    // Communication score: 1 to 5.
    communicationScore: {
      type: Number,
      required: [true, "Communication score is required"],
      min: [1, "Score must be between 1 and 5"],
      max: [5, "Score must be between 1 and 5"],
    },

    // Automatically calculated overall score: 20 to 100.
    overallScore: {
      type: Number,
      min: 20,
      max: 100,
    },

    // Optional evaluator comments.
    comments: {
      type: String,
      trim: true,
      maxlength: [1000, "Comments cannot exceed 1000 characters"],
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Automatically calculate the weighted overall score.
evaluationSchema.pre("validate", function () {
  const scores = [
    this.qualityScore,
    this.deliveryScore,
    this.costScore,
    this.communicationScore,
  ];

  // Calculate only when all four scores are valid.
  const validScores = scores.every(
    (score) =>
      typeof score === "number" &&
      Number.isFinite(score) &&
      score >= 1 &&
      score <= 5
  );

  if (validScores) {
    const weightedScore =
      this.qualityScore * 0.30 +
      this.deliveryScore * 0.30 +
      this.costScore * 0.20 +
      this.communicationScore * 0.20;

    // Convert the weighted score from a 1–5 scale to a 20–100 scale.
    this.overallScore =
      Math.round(weightedScore * 20 * 100) / 100;
  }
});

// Index for supplier evaluation history.
evaluationSchema.index({
  supplier: 1,
  evaluationDate: -1,
});

module.exports = mongoose.model("Evaluation", evaluationSchema);
