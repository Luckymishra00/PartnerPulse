
const express = require("express");
const mongoose = require("mongoose");

const Evaluation = require("../models/Evaluation");
const Supplier = require("../models/Supplier");

const router = express.Router();

const ALLOWED_FIELDS = [
  "supplier",
  "evaluationDate",
  "qualityScore",
  "deliveryScore",
  "costScore",
  "communicationScore",
  "comments",
];

const POPULATE_SUPPLIER = {
  path: "supplier",
  select: "supplierName companyName email category status performanceScore",
};

function validId(id) {
  return (
    typeof id === "string" &&
    mongoose.isValidObjectId(id)
  );
}

function pickFields(body) {
  const source =
    body &&
    typeof body === "object" &&
    !Array.isArray(body)
      ? body
      : {};

  const data = {};

  for (const field of ALLOWED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(source, field)) {
      data[field] = source[field];
    }
  }

  return data;
}

function handleError(res, error) {
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "A duplicate record was detected.",
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

  console.error("Evaluation API error:", error);

  return res.status(500).json({
    success: false,
    message: "An unexpected server error occurred.",
  });
}

async function validateSupplier(supplierId) {
  if (!validId(supplierId)) {
    const error = new Error("Please select a valid supplier.");
    error.name = "ValidationError";
    throw error;
  }

  const supplier = await Supplier.findById(supplierId);

  if (!supplier) {
    const error = new Error("Selected supplier was not found.");
    error.name = "ValidationError";
    throw error;
  }

  return supplier;
}

// GET /api/evaluations
// Supports search, supplier filtering, and pagination.
router.get("/", async (req, res) => {
  try {
    const {
      search = "",
      supplier = "",
      page = "1",
      limit = "10",
    } = req.query;

    const currentPage = Math.max(
      1,
      Number.parseInt(page, 10) || 1
    );

    const pageSize = Math.min(
      100,
      Math.max(1, Number.parseInt(limit, 10) || 10)
    );

    const filter = {};

    if (supplier) {
      if (!validId(supplier)) {
        return res.status(400).json({
          success: false,
          message: "Invalid supplier ID.",
        });
      }

      filter.supplier = supplier;
    }

    const searchText =
      typeof search === "string" ? search.trim() : "";

    if (searchText) {
      const escapedSearch = searchText.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const regex = new RegExp(escapedSearch, "i");

      const matchingSuppliers = await Supplier.find({
        $or: [
          { supplierName: regex },
          { companyName: regex },
          { email: regex },
        ],
      }).select("_id");

      filter.$or = [
        {
          supplier: {
            $in: matchingSuppliers.map((item) => item._id),
          },
        },
        { comments: regex },
      ];
    }

    const [total, evaluations] = await Promise.all([
      Evaluation.countDocuments(filter),

      Evaluation.find(filter)
        .populate(POPULATE_SUPPLIER)
        .sort({ evaluationDate: -1, createdAt: -1 })
        .skip((currentPage - 1) * pageSize)
        .limit(pageSize),
    ]);

    return res.json({
      success: true,
      count: evaluations.length,
      total,
      page: currentPage,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize),
      data: evaluations,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// GET /api/evaluations/:id
router.get("/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid evaluation ID.",
      });
    }

    const evaluation = await Evaluation.findById(req.params.id)
      .populate(POPULATE_SUPPLIER);

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: "Evaluation not found.",
      });
    }

    return res.json({
      success: true,
      data: evaluation,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// POST /api/evaluations
router.post("/", async (req, res) => {
  try {
    const data = pickFields(req.body);

    await validateSupplier(data.supplier);

    // The model calculates overallScore automatically.
    const evaluation = await Evaluation.create(data);

    await evaluation.populate(POPULATE_SUPPLIER);

    return res.status(201).json({
      success: true,
      message: "Supplier evaluation created successfully.",
      data: evaluation,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// PUT /api/evaluations/:id
router.put("/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid evaluation ID.",
      });
    }

    const evaluation = await Evaluation.findById(req.params.id);

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: "Evaluation not found.",
      });
    }

    const data = pickFields(req.body);

    if (data.supplier !== undefined) {
      await validateSupplier(data.supplier);
    }

    // Save through the document so validation and score
    // calculation run when an evaluation is updated.
    evaluation.set(data);

    await evaluation.save();
    await evaluation.populate(POPULATE_SUPPLIER);

    return res.json({
      success: true,
      message: "Supplier evaluation updated successfully.",
      data: evaluation,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// DELETE /api/evaluations/:id
router.delete("/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid evaluation ID.",
      });
    }

    const evaluation = await Evaluation.findByIdAndDelete(
      req.params.id
    );

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: "Evaluation not found.",
      });
    }

    return res.json({
      success: true,
      message: "Supplier evaluation deleted successfully.",
    });
  } catch (error) {
    return handleError(res, error);
  }
});

module.exports = router;
