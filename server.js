const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
require("dotenv").config();

const app = express();

// Connect Database
connectDB();

// Middleware
app.use(
  cors({
    origin: "*",
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  })
);

app.use(express.json());

// Routes
app
  .get("/", (req, res) => {
    res.json({
      message: "lucysperfumery",
    });
  })
  .get("/health", (req, res) => {
    res.json({
      status: "OK",
    });
  });

// Import routes
const ordersRoutes = require("./routes/orders.routes");
const productsRoutes = require("./routes/products.routes");
const uploadRoutes = require("./routes/upload.routes");

// Use routes
app.use("/api/orders", ordersRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/upload", uploadRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`lucysperfumery-backend on port ${PORT}`));
