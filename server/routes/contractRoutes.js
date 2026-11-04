
const express = require("express");
const mongoose = require("mongoose");
const Contract = require("../models/Contract");

const router = express.Router();

const ALLOWED_STATUSES = [
  "Draft",
  "Active",
  "Expired",
  "Renewed",
  "Terminated",
];

const ALLOWED_TYPES = [
  "Supply Agreement",
  "Service Agreement",
  "Maintenance",
  "Partnership",
  "Other",
];

const ALLOWED_FIELDS = [
  "contractNumber",
  "contractName",
  "supplier",
  "contractType",
  "contractValue",
  "startDate",
  "expiryDate",
  "status",
  "renewalNoticeDays",
  "description",
];

const SUPPLIER_FIELDS = "supplierName companyName email";

function validateId(id) {
  return mongoose.isValidObjectId(id);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function handleError(res, error) {
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "That contract number is already registered.",
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

  console.error("Contract API error:", error);

  return res.status(500).json({
    success: false,
    message: "An unexpected server error occurred.",
  });
}

// GET /api/contracts
// Search, filter, paginate and calculate renewal information.
router.get("/", async (req, res) => {
  try {
    const {
      search = "",
      status = "",
      contractType = "",
      supplier = "",
      page = "1",
      limit = "10",
    } = req.query;

    const pageNumber = Math.max(
      1,
      Number.parseInt(page, 10) || 1
    );

    const pageSize = Math.min(
      100,
      Math.max(1, Number.parseInt(limit, 10) || 10)
    );

    const filter = {};

    if (status) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid contract status.",
        });
      }

      filter.status = status;
    }

    if (contractType) {
      if (!ALLOWED_TYPES.includes(contractType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid contract type.",
        });
      }

      filter.contractType = contractType;
    }

    if (supplier) {
      if (!validateId(supplier)) {
        return res.status(400).json({
          success: false,
          message: "Invalid supplier ID.",
        });
      }

      filter.supplier = supplier;
    }

    if (search.trim()) {
      const regex = new RegExp(
        escapeRegex(search.trim()),
        "i"
      );

      filter.$or = [
        { contractNumber: regex },
        { contractName: regex },
        { description: regex },
      ];
    }

    const [contracts, total] = await Promise.all([
      Contract.find(filter)
        .populate("supplier", SUPPLIER_FIELDS)
        .sort({ createdAt: -1 })
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize)
        .lean({ virtuals: true }),

      Contract.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      count: contracts.length,
      total,
      page: pageNumber,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize),
      data: contracts,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// GET /api/contracts/:id
router.get("/:id", async (req, res) => {
  try {
    if (!validateId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid contract ID.",
      });
    }

    const contract = await Contract.findById(req.params.id)
      .populate("supplier", SUPPLIER_FIELDS)
      .lean({ virtuals: true });

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found.",
      });
    }

    return res.json({
      success: true,
      data: contract,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// POST /api/contracts
router.post("/", async (req, res) => {
  try {
    const body = req.body || {};
    const contractData = {};

    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) {
        contractData[field] = body[field];
      }
    }

    if (
      !contractData.supplier ||
      !validateId(contractData.supplier)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid supplier ID.",
      });
    }

    const contract = await Contract.create(contractData);

    const savedContract = await Contract.findById(contract._id)
      .populate("supplier", SUPPLIER_FIELDS)
      .lean({ virtuals: true });

    return res.status(201).json({
      success: true,
      message: "Contract created successfully.",
      data: savedContract,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// PUT /api/contracts/:id
router.put("/:id", async (req, res) => {
  try {
    if (!validateId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid contract ID.",
      });
    }

    const body = req.body || {};
    const updates = {};

    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one valid field to update.",
      });
    }

    if (
      updates.supplier !== undefined &&
      !validateId(updates.supplier)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier ID.",
      });
    }

    const existingContract = await Contract.findById(
      req.params.id
    );

    if (!existingContract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found.",
      });
    }

    Object.assign(existingContract, updates);
    await existingContract.save();

    const updatedContract = await Contract.findById(
      existingContract._id
    )
      .populate("supplier", SUPPLIER_FIELDS)
      .lean({ virtuals: true });

    return res.json({
      success: true,
      message: "Contract updated successfully.",
      data: updatedContract,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// DELETE /api/contracts/:id
router.delete("/:id", async (req, res) => {
  try {
    if (!validateId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid contract ID.",
      });
    }

    const contract = await Contract.findByIdAndDelete(
      req.params.id
    );

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found.",
      });
    }

    return res.json({
      success: true,
      message: "Contract deleted successfully.",
      data: { _id: contract._id },
    });
  } catch (error) {
    return handleError(res, error);
  }
});

module.exports = router;
