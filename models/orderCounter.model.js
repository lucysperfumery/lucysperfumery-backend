const mongoose = require("mongoose");

/**
 * OrderCounter Schema
 * Maintains sequential order numbers for each year
 * Used to generate human-readable order IDs like LP-2024-001234
 */
const orderCounterSchema = new mongoose.Schema(
  {
    year: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    sequenceNumber: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { timestamps: true }
);

/**
 * Get the next sequence number for the given year
 * Uses findOneAndUpdate with $inc for atomic increment to prevent race conditions
 * @param {Number} year - The year for which to get the next sequence
 * @returns {Promise<Number>} The next sequence number
 */
orderCounterSchema.statics.getNextSequence = async function (year) {
  const counter = await this.findOneAndUpdate(
    { year },
    { $inc: { sequenceNumber: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return counter.sequenceNumber;
};

module.exports = mongoose.model("OrderCounter", orderCounterSchema);
