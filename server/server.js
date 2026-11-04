require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`PartnerPulse API: http://localhost:${PORT}`);
    console.log("Health check: http://localhost:5000/api/health");
  });
};

startServer();