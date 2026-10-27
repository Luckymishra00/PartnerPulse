
const mongoose = require("mongoose");

const contractSchema = new mongoose.Schema(
  {
    contractNumber: {
      type: String,
      required: [true, "Contract number is required"],
      unique: true,
      trim: true,
    },

    contractName: {
      type: String,
      required: [true, "Contract name is required"],
      trim: true,
    },

    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: [true, "Please select a supplier"],
      index: true,
    },

    contractType: {
      type: String,
      enum: [
        "Supply Agreement",
        "Service Agreement",
        "Maintenance",
        "Partnership",
        "Other",
      ],
      default: "Supply Agreement",
    },

    contractValue: {
      type: Number,
      required: [true, "Contract value is required"],
      min: [0, "Contract value cannot be negative"],
    },

    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },

    expiryDate: {
      type: Date,
      required: [true, "Expiry date is required"],
      validate: {
        validator: function (value) {
          return !this.startDate || value >= this.startDate;
        },
        message: "Expiry date must be on or after the start date",
      },
    },

    status: {
      type: String,
      enum: ["Draft", "Active", "Expired", "Renewed", "Terminated"],
      default: "Draft",
    },

    renewalNoticeDays: {
      type: Number,
      default: 30,
      min: [0, "Renewal notice days cannot be negative"],
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for faster searches and analytics.

contractSchema.index({ expiryDate: 1 });
contractSchema.index({ status: 1 });

// Calculate days remaining until expiry.
contractSchema.virtual("daysUntilExpiry").get(function () {
  if (!this.expiryDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(this.expiryDate);
  expiry.setHours(0, 0, 0, 0);

  return Math.ceil(
    (expiry.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
  );
});

// Calculate renewal status for reporting and dashboards.
contractSchema.virtual("renewalStatus").get(function () {
  const days = this.daysUntilExpiry;

  if (days === null) return "Unknown";
  if (this.status === "Terminated") return "Terminated";
  if (this.status === "Renewed") return "Renewed";
  if (this.status === "Draft") return "Draft";

  // An expired date takes priority over an Active status.
  if (days < 0) return "Expired";

  if (days <= (this.renewalNoticeDays ?? 30)) {
    return "Renewal Due";
  }

  return "Up to Date";
});

// Export the Contract model.
module.exports = mongoose.model("Contract", contractSchema);
