
const express = require("express");
const mongoose = require("mongoose");
const Supplier = require("../models/Supplier");

const router = express.Router();

// Validate MongoDB document ID
const isValidId = (id) => mongoose.isValidObjectId(id);

// GET /api/suppliers
// Get all suppliers, with optional search and filters
router.get("/", async (req, res) => {
  try {
    const { search, category, status } = req.query;
    const filter = {};

    if (search && search.trim()) {
      const searchRegex = new RegExp(
        search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );

      filter.$or = [
        { supplierName: searchRegex },
        { companyName: searchRegex },
        { email: searchRegex },
        { category: searchRegex },
      ];
    }

    if (category && category !== "All") {
      filter.category = category;
    }

    if (status && status !== "All") {
      filter.status = status;
    }

    const suppliers = await Supplier.find(filter).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: suppliers.length,
      data: suppliers,
    });
  } catch (error) {
    console.error("Fetch suppliers error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch suppliers.",
    });
  }
});

// GET /api/suppliers/:id
// Get one supplier
router.get("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier ID.",
      });
    }

    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: supplier,
    });
  } catch (error) {
    console.error("Fetch supplier error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch supplier.",
    });
  }
});

// POST /api/suppliers
// Create a supplier
router.post("/", async (req, res) => {
  try {
    const {
      supplierName,
      companyName,
      email,
      phone,
      category,
      address,
      status,
      performanceScore,
      notes,
    } = req.body || {};

    if (
      !supplierName?.trim() ||
      !companyName?.trim() ||
      !email?.trim() ||
      !category
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Supplier name, company name, email, and category are required.",
      });
    }

    const supplier = await Supplier.create({
      supplierName,
      companyName,
      email: email.trim().toLowerCase(),
      phone,
      category,
      address,
      status,
      performanceScore:
        performanceScore === "" || performanceScore == null
          ? null
          : performanceScore,
      notes,
    });

    return res.status(201).json({
      success: true,
      message: "Supplier created successfully.",
      data: supplier,
    });
  } catch (error) {
    console.error("Create supplier error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A supplier with this email already exists.",
      });
    }

    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create supplier.",
    });
  }
});

// PUT /api/suppliers/:id
// Update an existing supplier
router.put("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier ID.",
      });
    }

    const allowedFields = [
      "supplierName",
      "companyName",
      "email",
      "phone",
      "category",
      "address",
      "status",
      "performanceScore",
      "notes",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one valid field to update.",
      });
    }

    if (typeof updates.email === "string") {
      updates.email = updates.email.trim().toLowerCase();
    }

    if (
      updates.performanceScore === "" ||
      updates.performanceScore === null
    ) {
      updates.performanceScore = null;
    }

    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Supplier updated successfully.",
      data: supplier,
    });
  } catch (error) {
    console.error("Update supplier error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A supplier with this email already exists.",
      });
    }

    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update supplier.",
    });
  }
});

// DELETE /api/suppliers/:id
// Delete a supplier
router.delete("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier ID.",
      });
    }

    const supplier = await Supplier.findByIdAndDelete(req.params.id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Supplier deleted successfully.",
    });
  } catch (error) {
    console.error("Delete supplier error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to delete supplier.",
    });
  }
});

module.exports = router;
