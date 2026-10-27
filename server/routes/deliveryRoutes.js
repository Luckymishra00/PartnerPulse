
const express = require("express");
const mongoose = require("mongoose");

const Delivery = require("../models/Delivery");
const Supplier = require("../models/Supplier");
const Contract = require("../models/Contract");

const router = express.Router();

const ALLOWED_FIELDS = [
  "deliveryNumber",
  "supplier",
  "contract",
  "itemDescription",
  "quantity",
  "orderValue",
  "orderDate",
  "expectedDeliveryDate",
  "actualDeliveryDate",
  "status",
  "trackingNumber",
  "notes",
];

const ALLOWED_STATUSES = [
  "Ordered",
  "In Transit",
  "Delivered",
  "Delayed",
  "Cancelled",
];

const POPULATE_FIELDS = [
  { path: "supplier", select: "supplierName companyName email" },
  { path: "contract", select: "contractNumber contractName" },
];

function validId(id) {
  return (
    typeof id === "string" &&
    mongoose.isValidObjectId(id)
  );
}

// Safely select only permitted fields from the request body.
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

  // An empty contract selection means no linked contract.
  if (data.contract === "") {
    data.contract = null;
  }

  return data;
}

function handleError(res, error) {
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "That delivery number already exists.",
    });
  }

  if (
    error.name === "ValidationError" ||
    error.name === "CastError" ||
    error.name === "StrictModeError"
  ) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  console.error("Delivery API error:", error);

  return res.status(500).json({
    success: false,
    message: "An unexpected server error occurred.",
  });
}

// Validate supplier and optional contract references.
async function validateReferences(data, existingDelivery = null) {
  const supplierId =
    data.supplier !== undefined
      ? data.supplier
      : existingDelivery?.supplier?.toString();

  if (data.supplier !== undefined) {
    if (!validId(data.supplier)) {
      const error = new Error("Please select a valid supplier.");
      error.name = "ValidationError";
      throw error;
    }

    const supplier = await Supplier.findById(data.supplier);

    if (!supplier) {
      const error = new Error("Selected supplier was not found.");
      error.name = "ValidationError";
      throw error;
    }
  }

  const contractId =
    data.contract !== undefined
      ? data.contract
      : existingDelivery?.contract?.toString() || null;

  if (contractId === null || contractId === "") {
    return;
  }

  if (!validId(contractId)) {
    const error = new Error("Please select a valid contract.");
    error.name = "ValidationError";
    throw error;
  }

  const contract = await Contract.findById(contractId);

  if (!contract) {
    const error = new Error("Selected contract was not found.");
    error.name = "ValidationError";
    throw error;
  }

  if (
    supplierId &&
    contract.supplier.toString() !== supplierId.toString()
  ) {
    const error = new Error(
      "The selected contract belongs to a different supplier."
    );
    error.name = "ValidationError";
    throw error;
  }
}

// GET /api/deliveries
router.get("/", async (req, res) => {
  try {
    const {
      search = "",
      status = "",
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

    if (status) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid delivery status.",
        });
      }

      filter.status = status;
    }

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

      const [matchingSuppliers, matchingContracts] =
        await Promise.all([
          Supplier.find({
            $or: [
              { supplierName: regex },
              { companyName: regex },
            ],
          }).select("_id"),

          Contract.find({
            $or: [
              { contractNumber: regex },
              { contractName: regex },
            ],
          }).select("_id"),
        ]);

      filter.$or = [
        { deliveryNumber: regex },
        { itemDescription: regex },
        { trackingNumber: regex },
        {
          supplier: {
            $in: matchingSuppliers.map((item) => item._id),
          },
        },
        {
          contract: {
            $in: matchingContracts.map((item) => item._id),
          },
        },
      ];
    }

    const [total, deliveries] = await Promise.all([
      Delivery.countDocuments(filter),

      Delivery.find(filter)
        .populate(POPULATE_FIELDS)
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * pageSize)
        .limit(pageSize),
    ]);

    return res.json({
      success: true,
      count: deliveries.length,
      total,
      page: currentPage,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize),
      data: deliveries,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// GET /api/deliveries/:id
router.get("/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery ID.",
      });
    }

    const delivery = await Delivery.findById(req.params.id)
      .populate(POPULATE_FIELDS);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: "Delivery not found.",
      });
    }

    return res.json({
      success: true,
      data: delivery,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// POST /api/deliveries
router.post("/", async (req, res) => {
  try {
    const data = pickFields(req.body);

    await validateReferences(data);

    const delivery = await Delivery.create(data);

    await delivery.populate(POPULATE_FIELDS);

    return res.status(201).json({
      success: true,
      message: "Delivery created successfully.",
      data: delivery,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// PUT /api/deliveries/:id
router.put("/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery ID.",
      });
    }

    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: "Delivery not found.",
      });
    }

    const data = pickFields(req.body);

    await validateReferences(data, delivery);

    delivery.set(data);

    await delivery.save();
    await delivery.populate(POPULATE_FIELDS);

    return res.json({
      success: true,
      message: "Delivery updated successfully.",
      data: delivery,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// DELETE /api/deliveries/:id
router.delete("/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery ID.",
      });
    }

    const delivery = await Delivery.findByIdAndDelete(req.params.id);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: "Delivery not found.",
      });
    }

    return res.json({
      success: true,
      message: "Delivery deleted successfully.",
    });
  } catch (error) {
    return handleError(res, error);
  }
});

module.exports = router;
