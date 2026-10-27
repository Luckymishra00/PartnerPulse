
const express = require("express");
const cors = require("cors");

const supplierRoutes = require("./routes/supplierRoutes");
const contractRoutes = require("./routes/contractRoutes");
const deliveryRoutes = require("./routes/deliveryRoutes");
const evaluationRoutes = require("./routes/evaluationRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  })
);

app.use(express.json({ limit: "1mb" }));

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to PartnerPulse API",
    status: "running",
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "PartnerPulse backend is working!",
    timestamp: new Date().toISOString(),
  });
});

// Supplier management routes
app.use("/api/suppliers", supplierRoutes);

// Contract management routes
app.use("/api/contracts", contractRoutes);

// Delivery management routes
app.use("/api/deliveries", deliveryRoutes);

// Supplier evaluation routes - Phase 4
app.use("/api/evaluations", evaluationRoutes);

// Business analytics routes - Phase 5
app.use("/api/analytics", analyticsRoutes);

// Handle unknown API endpoints
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found.",
  });
});
module.exports = app;
