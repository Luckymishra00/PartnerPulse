
const mongoose = require("mongoose");

const deliverySchema = new mongoose.Schema(
  {
    // Unique delivery or order reference.
    deliveryNumber: {
      type: String,
      required: [true, "Delivery number is required"],
      unique: true,
      trim: true,
    },

    // Supplier responsible for the delivery.
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: [true, "Please select a supplier"],
      index: true,
    },

    // Associated contract, if applicable.
    contract: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contract",
      default: null,
    },

    // Description of the goods or services ordered.
    itemDescription: {
      type: String,
      required: [true, "Item description is required"],
      trim: true,
    },

    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0.01, "Quantity must be greater than zero"],
    },

    orderValue: {
      type: Number,
      required: [true, "Order value cannot be negative"],
      min: [0, "Order value cannot be negative"],
    },

    orderDate: {
      type: Date,
      required: [true, "Order date is required"],
    },

    expectedDeliveryDate: {
      type: Date,
      required: [true, "Expected delivery date is required"],
    },

    actualDeliveryDate: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: [
        "Ordered",
        "In Transit",
        "Delivered",
        "Delayed",
        "Cancelled",
      ],
      default: "Ordered",
    },

    trackingNumber: {
      type: String,
      trim: true,
      default: "",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Validate delivery dates and delivered-order requirements.
deliverySchema.pre("validate", function () {
  if (
    this.orderDate &&
    this.expectedDeliveryDate &&
    this.expectedDeliveryDate < this.orderDate
  ) {
    this.invalidate(
      "expectedDeliveryDate",
      "Expected delivery date cannot be before the order date"
    );
  }

  if (
    this.actualDeliveryDate &&
    this.orderDate &&
    this.actualDeliveryDate < this.orderDate
  ) {
    this.invalidate(
      "actualDeliveryDate",
      "Actual delivery date cannot be before the order date"
    );
  }

  if (
    this.status === "Delivered" &&
    !this.actualDeliveryDate
  ) {
    this.invalidate(
      "actualDeliveryDate",
      "Enter the actual delivery date for a delivered order"
    );
  }
});

// Indexes for faster supplier searches and delivery filtering.
deliverySchema.index({ expectedDeliveryDate: 1, status: 1 });

module.exports = mongoose.model("Delivery", deliverySchema);
