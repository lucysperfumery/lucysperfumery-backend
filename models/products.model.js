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
    options: [
      {
        name: {
          type: String,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        stock: {
          type: Number,
          required: true,
          default: 0,
        },
        sku: {
          type: String,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],
  },
  { timestamps: true }
);

// Virtual property to check if product has options
productSchema.virtual("hasOptions").get(function () {
  return this.options && this.options.length > 0;
});

// Ensure virtuals are included in JSON output
productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Product", productSchema);
