const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customer: {
      name: { type: String, required: true },
      email: { type: String, required: false, default: "lucysperfumery@gmail.com" },
      phone: { type: String, required: true },
    },
    items: [
      {
        productId: { type: String, required: true },
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        selectedOption: {
          optionId: { type: String },
          optionName: { type: String },
          optionPrice: { type: Number },
        },
      },
    ],
    totalAmount: { type: Number, required: true },
    currency: { type: String, default: "GHS" },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    paystackReference: { type: String, required: false, unique: true },
    metadata: { type: Object },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
