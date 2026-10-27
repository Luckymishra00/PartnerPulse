
const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema(
  {
    supplierName: {
      type: String,
      required: [true, "Supplier name is required"],
      trim: true,
      minlength: [2, "Supplier name must be at least 2 characters"],
      maxlength: [100, "Supplier name cannot exceed 100 characters"],
    },

    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      minlength: [2, "Company name must be at least 2 characters"],
      maxlength: [150, "Company name cannot exceed 150 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [150, "Email cannot exceed 150 characters"],
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },

    phone: {
      type: String,
      trim: true,
      default: "",
      maxlength: [20, "Phone number cannot exceed 20 characters"],
    },

    category: {
      type: String,
      required: [true, "Supplier category is required"],
      enum: {
        values: [
          "Raw Materials",
          "Technology",
          "Logistics",
          "Packaging",
          "Maintenance",
          "Other",
        ],
        message: "Please select a valid supplier category",
      },
    },

    address: {
      type: String,
      trim: true,
      default: "",
      maxlength: [300, "Address cannot exceed 300 characters"],
    },

    status: {
      type: String,
      enum: {
        values: ["Active", "Inactive", "Under Review"],
        message: "Please select a valid supplier status",
      },
      default: "Active",
    },

    performanceScore: {
      type: Number,
      min: [0, "Performance score cannot be below 0"],
      max: [100, "Performance score cannot exceed 100"],
      default: null,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },
  },
  {
    timestamps: true,
  }
);

// Create the Supplier model.
const Supplier = mongoose.model("Supplier", supplierSchema);

module.exports = Supplier;
