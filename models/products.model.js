const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a product name"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Please add a description"],
    },
    price: {
      type: Number,
      required: [true, "Please add a price"],
    },
    category: {
      type: String,
      required: [true, "Please specify a category"],
    },
    brand: {
      type: String,
      required: [true, "Please specify a brand"],
      trim: true,
    },
    image: {
      type: String,
      default: "no-image.jpg",
    },
    stock: {
      type: Number,
      required: [true, "Please add stock count"],
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
